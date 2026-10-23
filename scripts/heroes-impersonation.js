import crypto from 'node:crypto';
import { heroesRequestContext, updateHeroesIdentity } from './heroes-identity.js';
import { httpError } from './wurm-db.js';

export async function runImpersonatedMutation(context, request, operation) {
  const { file, bearer, origin, databaseFile } = context;
  const current = heroesRequestContext(bearer, origin, file, databaseFile);
  if (!current.impersonation) return operation();
  const { method, route, body, approvalId } = request;
  const fingerprint = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        method,
        route,
        body,
        role: current.impersonation.role,
        startedAt: current.impersonation.startedAt,
      })
    )
    .digest('hex');
  const decision = await updateHeroesIdentity(file, (state) => {
    state.impersonationApprovals ||= [];
    state.impersonationAudit ||= [];
    const audit = {
      id: crypto.randomUUID(),
      actorId: current.actorId,
      targetId: current.impersonation.userId,
      role: current.impersonation.role,
      preview: Boolean(current.impersonation.previewRoot),
      method,
      route,
      at: new Date().toISOString(),
    };
    let approval =
      approvalId &&
      state.impersonationApprovals.find(
        (item) =>
          item.id === approvalId &&
          item.actorId === current.actorId &&
          item.sessionHash === current.sessionHash &&
          item.fingerprint === fingerprint
      );
    if (approvalId && !approval)
      throw httpError(403, 'Approval does not match this session and exact update');
    if (approval?.status === 'completed') return { result: approval.result, completed: true };
    if (approval?.status === 'failed')
      throw httpError(409, 'This approved attempt failed. Submit a new request.');
    if (approval?.status === 'rejected')
      throw httpError(403, 'The account holder rejected this update');
    const live = state.sessions.some(
      (item) =>
        item.userId === current.impersonation.userId &&
        item.expiresAt > Date.now() &&
        !item.impersonation
    );
    if (!approval && live && !current.impersonation.previewRoot) {
      if (
        state.impersonationApprovals.filter(
          (item) => item.actorId === current.actorId && item.status === 'pending'
        ).length >= 50
      )
        throw httpError(
          429,
          'Too many pending impersonation updates. Release or resolve them first.'
        );
      approval = {
        id: crypto.randomUUID(),
        actorId: current.actorId,
        targetId: current.impersonation.userId,
        sessionHash: current.sessionHash,
        fingerprint,
        method,
        route,
        role: current.impersonation.role,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        status: 'pending',
        summary: `${method} ${route}`,
        preview: typeof body === 'object' && body ? JSON.stringify(body).slice(0, 4000) : '',
      };
      state.impersonationApprovals.push(approval);
      state.impersonationAudit.push({
        ...audit,
        action: 'approval-request',
        approvalId: approval.id,
      });
    }
    if (approval?.status === 'pending' && Date.now() < approval.expiresAt)
      return { pending: true, approvalId: approval.id, expiresAt: approval.expiresAt };
    if (approval) {
      if (approval.status === 'executing') throw httpError(409, 'This update is already executing');
      audit.approval =
        approval.status === 'pending' ? 'automatic-after-five-minutes' : 'account-holder';
      approval.status = 'executing';
    }
    state.impersonationAudit.push({ ...audit, action: 'mutation-start', approvalId: approval?.id });
    return { auditId: audit.id, approvalId: approval?.id };
  });
  if (decision.pending)
    return {
      statusCode: 202,
      body: {
        pendingApproval: decision.approvalId,
        expiresAt: decision.expiresAt,
        message:
          'Waiting for account-holder approval. Automatically approved after five minutes without a response.',
      },
    };
  if (decision.completed) return decision.result;
  try {
    const result = await operation();
    await updateHeroesIdentity(file, (state) => {
      const approval = state.impersonationApprovals?.find(
        (item) => item.id === decision.approvalId
      );
      if (approval) {
        approval.status = 'completed';
        approval.result = result;
      }
      const audit = state.impersonationAudit.find((item) => item.id === decision.auditId);
      audit.outcome = 'completed';
    });
    return result;
  } catch (error) {
    await updateHeroesIdentity(file, (state) => {
      const approval = state.impersonationApprovals?.find(
        (item) => item.id === decision.approvalId
      );
      if (approval) approval.status = 'failed';
      const audit = state.impersonationAudit.find((item) => item.id === decision.auditId);
      audit.outcome = 'failed';
      audit.error = error.message;
    });
    throw error;
  }
}
