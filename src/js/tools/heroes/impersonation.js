import { identityRequest, HEROES_ROLE_LABELS } from './session.js';
import { heroesRoleLocation } from './preferences.js';

export function mountHeroesImpersonation(container, { user }) {
  let disposed = false;
  let loading = false;
  const node = (tag, text = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  const status = node('p');
  status.setAttribute('role', 'status');
  const body = node('div');
  container.className = 'heroes-impersonation-controls';
  container.append(status, body);
  async function act(action, payload) {
    try {
      await identityRequest(action, payload);
      await load();
    } catch (error) {
      if (!disposed) status.textContent = error.message;
    }
  }
  const button = (text, action) => {
    const value = node('button', text);
    value.type = 'button';
    value.className = 'btn';
    value.addEventListener('click', action);
    return value;
  };
  if (user.roles.includes('admin') && !user.impersonation) {
    const panel = node('details');
    panel.append(node('summary', 'Disposable role preview & impersonation audit'));
    const label = node('label', 'Preview role ');
    const roles = node('select');
    for (const [value, text] of Object.entries(HEROES_ROLE_LABELS))
      roles.append(new Option(text, value));
    label.append(roles);
    panel.append(
      label,
      node(
        'p',
        'Role-only previews use an empty isolated workspace. Release discards every change. Choose an account in the directory to impersonate a real user instead.'
      ),
      button('Start disposable preview', async () => {
        try {
          await identityRequest('impersonation/start', { role: roles.value });
          window.location.replace(heroesRoleLocation(roles.value));
        } catch (error) {
          status.textContent = error.message;
        }
      })
    );
    const audit = node('div');
    panel.append(audit);
    container.append(panel);
    container.audit = audit;
  }
  async function load() {
    if (loading || disposed) return;
    loading = true;
    try {
      const data = await identityRequest('impersonation/status');
      if (disposed) return;
      body.replaceChildren();
      for (const approval of data.approvals || []) {
        const row = node('article');
        row.className = 'heroes-editor-panel';
        row.append(
          node('h3', 'Administrator update awaiting your approval'),
          node(
            'p',
            `${approval.summary}. No response automatically approves after ${new Date(approval.expiresAt).toLocaleTimeString()}.`
          ),
          node('pre', approval.preview || ''),
          button('Approve update', () =>
            act('impersonation/respond', { id: approval.id, decision: 'approve' })
          ),
          button('Reject update', () =>
            act('impersonation/respond', { id: approval.id, decision: 'reject' })
          )
        );
        body.append(row);
      }
      for (const approval of data.outgoing || []) {
        const row = node('p', `${approval.summary}: awaiting approval (five-minute timeout). `);
        row.append(
          button('Cancel pending update', () => act('impersonation/cancel', { id: approval.id }))
        );
        body.append(row);
      }
      if (container.audit) {
        container.audit.replaceChildren();
        for (const item of (data.audit || []).slice(-50).reverse())
          container.audit.append(
            node(
              'p',
              `${item.at}: actor ${item.actorId} → ${item.targetId || 'disposable preview'}; ${item.action} ${item.method || ''} ${item.route || ''} ${item.outcome || ''}`
            )
          );
      }
    } catch (error) {
      if (!disposed)
        status.textContent = `Unable to check impersonation approvals: ${error.message}`;
    } finally {
      loading = false;
    }
  }
  load();
  const timer = setInterval(load, 5000);
  return () => {
    disposed = true;
    clearInterval(timer);
  };
}
