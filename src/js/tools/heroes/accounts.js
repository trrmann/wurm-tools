import {
  HEROES_SESSION_KEY,
  HEROES_LOGOUT_KEY,
  HEROES_ROLE_LABELS,
  heroesAccountLabel,
  identityRequest,
} from './session.js';
import { createHeroesClient } from './helper-client.js';
import { heroesRoleLocation } from './preferences.js';
import { ACCOUNT_NAME_FIELDS } from '../../modules/objects/heroes/account-name.mjs';

export function mountHeroesAccounts(
  container,
  mode = 'account',
  { onAccessChange = () => {}, accessDenied = false } = {}
) {
  const controller = new AbortController();
  const { signal } = controller;
  const section = document.createElement('section');
  section.className = 'heroes-workspace';
  const heading = document.createElement('h2');
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const content = document.createElement('div');
  section.append(heading, status, content);
  container.append(section);
  let busy = false;
  const report = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  };
  const run = async (action) => {
    if (busy) return;
    busy = true;
    try {
      await action();
    } catch (error) {
      if (
        error.status === 401 &&
        !['login', 'register', 'setup', 'logout', 'logout-success'].includes(mode)
      ) {
        sessionStorage.removeItem(HEROES_SESSION_KEY);
        onAccessChange({ stage: 'anonymous' });
        report(
          'Your session expired or was revoked. This action was not completed. Sign in again, then retry.',
          true
        );
        content.replaceChildren(link('Sign in again', '/site/heroes/login/'));
      } else report(error.message, true);
    } finally {
      busy = false;
    }
  };
  const text = (tag, value) => {
    const node = document.createElement(tag);
    node.textContent = value;
    return node;
  };
  const link = (label, href) => {
    const node = text('a', label);
    node.href = href;
    node.className = 'btn btn-secondary';
    return node;
  };
  const form = (label, fields, action, parent = content) => {
    const panel = document.createElement('form');
    panel.className = 'heroes-editor-panel';
    panel.append(text('h3', label));
    for (const [name, label, type = 'text', options] of fields) {
      const wrapper = text('label', label);
      wrapper.className = 'heroes-field';
      const input = document.createElement(options ? 'select' : 'input');
      input.name = name;
      input.setAttribute('aria-label', label);
      if (options) for (const [value, title] of options) input.add(new Option(title, value));
      else {
        input.type = type;
        input.required = type !== 'checkbox';
        input.maxLength = type === 'password' ? 256 : 200;
        if (type === 'password')
          input.autocomplete =
            name === 'currentPassword' || (mode === 'login' && name === 'password')
              ? 'current-password'
              : 'new-password';
        if (name === 'username') input.autocomplete = 'username';
        if (name === 'code' || name === 'setupCode') input.autocomplete = 'one-time-code';
      }
      wrapper.append(input);
      panel.append(wrapper);
    }
    const submit = text('button', label);
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    panel.append(submit);
    panel.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        run(async () => {
          submit.disabled = true;
          report(`${label} - contacting your local helper...`);
          try {
            await action(Object.fromEntries(new FormData(panel)), panel);
          } finally {
            submit.disabled = false;
          }
        });
      },
      { signal }
    );
    parent.append(panel);
    return panel;
  };
  const disclosure = (parent, summary) => {
    const details = document.createElement('details');
    details.append(text('summary', summary));
    parent.append(details);
    return details;
  };
  const roleLocation = (user) => {
    const role = user.activeRole || user.roles?.[0];
    return heroesRoleLocation(role, user.preferences?.locations?.[role]);
  };
  const releaseGuidance = (impersonation) =>
    text(
      'p',
      `Impersonation is active. Use Release in the header to return to your administrator account. Logout, password changes, two-factor authentication, account closure, and role requests are unavailable until you release impersonation. ${
        impersonation?.preview === true
          ? 'Administrator settings are available only when previewing the System administrator role; those settings are isolated and disposable, and are discarded when you release the preview.'
          : 'Administrator security controls are unavailable while impersonating a real user.'
      }`
    );
  const showRecovery = (codes, user) => {
    content.replaceChildren(
      text(
        'p',
        'Save these single-use recovery codes offline now. They are shown only once. Losing your authenticator and all recovery codes can lock you out.'
      )
    );
    content.append(
      text('pre', codes.join('\n')),
      link('I saved my recovery codes - continue', roleLocation(user))
    );
    report('Two-factor authentication enabled. Do not share the secret or recovery codes.');
  };
  const setupGuide = () => {
    const guide = document.createElement('section');
    guide.append(text('h3', 'Need a setup code? Start here'));
    const installation = document.createElement('details');
    installation.append(
      text('summary', 'First time on this computer? Open installation help'),
      text(
        'p',
        'You only need to do this once. Use the computer where you want to keep your HERO data. This website cannot install the local helper (the small program that saves your data) for you.'
      ),
      text('h4', 'A. Install Node.js'),
      text(
        'p',
        'Install Node.js 24.22.1 LTS using the button below. On Windows, leave npm and Add to PATH selected. Then run npm.cmd install --global pnpm@12.15.0 to install the project package manager. pnpm is a separate tool, not included with Node.js. On Fedora/Linux, follow the project README to activate Node through nvm first. Close and reopen your terminal after installation.'
      ),
      link('Download Node.js', 'https://nodejs.org/en/download'),
      text('h4', 'B. Download the HERO helper'),
      text(
        'p',
        'Download the ZIP below. In your Downloads folder, right-click it and choose Extract All. Open the extracted wurm-tools-main folder. Keep this folder; you will use it to start the helper. If you already have WurmTools, use your existing folder instead.'
      ),
      link(
        'Download HERO helper ZIP',
        'https://github.com/trrmann/wurm-tools/archive/refs/heads/main.zip'
      ),
      text('h4', 'C. Open a command window in that folder'),
      text(
        'p',
        'On Windows, open the extracted folder in File Explorer. Click the address bar at the top (where the folder path appears), type cmd and press Enter. A command window opens. It must be in the folder containing package.json, not inside the ZIP.'
      ),
      text('h4', 'D. Install the helper files'),
      text(
        'p',
        'Copy this command into that window and press Enter. Wait until it finishes and the command prompt returns. You need an internet connection.'
      ),
      text('pre', 'pnpm install --frozen-lockfile')
    );
    guide.append(installation);
    const steps = document.createElement('ol');
    for (const [title, detail, command] of [
      [
        'Start the helper',
        'Open a command window in your WurmTools folder (see installation help above). Copy this command into it and press Enter. Leave the helper running. If it is already running, skip this step.',
        'pnpm run helper',
      ],
      [
        'Get your setup code',
        'Open another command window in the same folder. Copy this command into it and press Enter. Copy the setup code it prints, not the command itself. Keep the code private. It lasts ten minutes; run the command again if it expires.',
        'pnpm run heroes:setup-code',
      ],
      [
        'Paste the code in the form above',
        'Select Check connection again above. When the helper is connected, paste the code into Paste setup code here. Choose a username and password, then select Create my administrator account. Next, we will help you sign in and protect your account.',
      ],
    ]) {
      const step = document.createElement('li');
      step.append(text('h4', title), text('p', detail));
      if (command) step.append(text('pre', command));
      steps.append(step);
    }
    guide.append(steps);
    const troubleshooting = document.createElement('details');
    troubleshooting.append(
      text('summary', 'Something not working? Open troubleshooting'),
      text(
        'p',
        'If pnpm is not recognized: first verify Node.js is installed, then run npm.cmd install --global pnpm@12.15.0 on Windows (npm install --global pnpm@12.15.0 on Linux/macOS). Close and reopen your command window. On a managed computer, ask your system administrator if installation is blocked.'
      ),
      text(
        'p',
        'If PowerShell says pnpm.ps1 cannot run: use Command Prompt (cmd) as described above, or use pnpm.cmd in place of pnpm (for example pnpm.cmd install). Do not change your security policy.'
      ),
      text(
        'p',
        'If package.json is missing: open the extracted wurm-tools-main folder, not the ZIP or its scripts subfolder, and open a new command window there.'
      ),
      text(
        'p',
        'If the connection still fails: in the project command window, run pnpm run helper:stop, then pnpm run helper. This restarts the helper after an update without deleting your data. Then select Check connection again. Read any error in the command window; an older helper may not have account setup support.'
      ),
      text(
        'p',
        'For macOS or Linux: use the Node.js download page instructions for your system, extract the ZIP, then open Terminal in the extracted project folder and run the same pnpm commands.'
      ),
      text(
        'p',
        'Accounts and codes belong to the helper on this computer, not a central website. Keep the same helper installation and data settings when generating your code. Do not expose the helper to the public internet.'
      )
    );
    guide.append(troubleshooting);
    return guide;
  };
  const setupPage = async () => {
    heading.textContent = 'Create your first administrator';
    content.append(
      text(
        'p',
        'Already have your setup code? Paste it below. If not, follow the three steps underneath the form.'
      )
    );
    let ready = false;
    const panel = form(
      'Create my administrator account',
      [
        ['setupCode', 'Paste setup code here', 'password'],
        ['username', 'Choose a username'],
        ['password', 'Choose a password (at least 12 characters)', 'password'],
      ],
      async (data) => {
        if (!ready)
          throw new Error('Connect to your local helper first. Select Check connection again.');
        await identityRequest('setup', data);
        onAccessChange({ stage: 'anonymous' });
        report('Your administrator account has been created.');
        content.replaceChildren(
          text('h3', 'Next: sign in and protect your account'),
          text(
            'p',
            'Use your new username and password to sign in. We will then help you add a free authenticator app, which gives you a six-digit sign-in code, and save your emergency recovery codes. You must finish this before opening your saved data.'
          ),
          link('Continue to sign in', '/site/heroes/login/')
        );
      }
    );
    const submit = panel.querySelector('button[type="submit"]');
    submit.disabled = true;
    panel.append(
      text(
        'p',
        'Username: 3-64 characters, starting with a letter or number; letters, numbers, dots, underscores and hyphens only. Use a new password, not your email or work password. The setup code is not a Wurm pairing code.'
      )
    );
    const retry = text('button', 'Check connection again');
    retry.type = 'button';
    retry.className = 'btn btn-secondary';
    content.append(retry);
    const guide = setupGuide();
    content.append(guide);
    const connectionDetails = text('p', '');
    content.append(connectionDetails);
    const check = async () => {
      ready = false;
      submit.disabled = true;
      retry.disabled = true;
      connectionDetails.textContent = '';
      report('Checking the helper on this computer...');
      try {
        const state = await identityRequest('status');
        if (!state.setupRequired) {
          let current;
          try {
            current = await identityRequest('me');
          } catch (error) {
            if (error.status !== 401) throw error;
          }
          if (current) {
            onAccessChange({
              stage: current.mfaRequired || current.enrollmentRequired ? 'mfa' : 'ready',
              user: current.user,
            });
            window.location.replace('/site/heroes/account/');
            return;
          }
          onAccessChange({ stage: 'anonymous' });
          panel.hidden = true;
          content.children[0].hidden = true;
          guide.hidden = true;
          retry.hidden = true;
          report('An administrator has already been created on this computer.');
          content.append(
            text(
              'p',
              'You do not need another setup code. Sign in with that account to finish authenticator setup, or open Account & security.'
            ),
            link('Log in', '/site/heroes/login/'),
            link('Account & security', '/site/heroes/account/')
          );
          return;
        }
        ready = true;
        submit.disabled = false;
        report('Connected. Paste your setup code in the form below to create your administrator.');
      } catch (error) {
        report(
          error.code === 'HEROES_HELPER_OUTDATED'
            ? error.message
            : 'Cannot connect to account setup on this computer. In your WurmTools command window, run pnpm run helper:stop, wait for it to stop, then run pnpm run helper. Return here and select Check connection again. This does not delete your data.',
          true
        );
        connectionDetails.textContent = `Connection details: ${error.message}`;
      } finally {
        retry.disabled = false;
      }
    };
    retry.addEventListener('click', () => run(check), { signal });
    await check();
  };
  const enroll = () => {
    heading.textContent = 'Protect your account';
    content.replaceChildren(
      text(
        'p',
        'One more step: protect your account. An authenticator app on your phone (such as Microsoft Authenticator or Google Authenticator) gives you a six-digit sign-in code. Install one if needed. Select Generate authenticator secret below, then follow the instructions. You must finish this before opening your saved data.'
      )
    );
    form('Generate authenticator secret', [], async () => {
      const result = await identityRequest('mfa/start', {});
      content.replaceChildren(
        text(
          'p',
          'In your authenticator app, choose Add account, then enter a setup key manually (instead of scanning a QR code). Name the account Heros Tools and paste the key below. Choose Time based if asked. Keep this key private.'
        ),
        text('pre', result.secret),
        text(
          'p',
          'The app will now show a six-digit code that changes regularly. Type its current code below, then select Confirm authenticator. If the app asks for advanced settings, use TOTP, SHA-1, 6 digits, 30 seconds.'
        ),
        text(
          'p',
          'Next, we will show emergency recovery codes. Save them somewhere safe offline. There is no email reset if you lose both your authenticator and recovery codes.'
        )
      );
      form('Confirm authenticator', [['code', 'Authentication code']], async (data) => {
        const response = await identityRequest('mfa/confirm', data);
        const current = await identityRequest('me');
        showRecovery(response.recoveryCodes, current.user);
      });
    });
  };
  const afterLogin = async (result) => {
    if (result.enrollmentRequired || result.mfaRequired)
      onAccessChange({ stage: 'mfa', user: result.user });
    if (result.enrollmentRequired) return enroll();
    if (result.mfaRequired) {
      heading.textContent = 'Verify your sign-in';
      content.replaceChildren();
      form(
        'Verify two-factor authentication',
        [['code', 'Authenticator or recovery code']],
        async (data) => {
          await identityRequest('mfa/verify', data);
          const current = await identityRequest('me');
          window.location.replace(roleLocation(current.user));
        }
      );
      return;
    }
    const user = result.user || (await identityRequest('me')).user;
    window.location.replace(roleLocation(user));
  };
  async function init() {
    if (mode === 'logout-success') {
      heading.textContent = 'Logout';
      if (sessionStorage.getItem(HEROES_LOGOUT_KEY) === 'confirmed') {
        sessionStorage.removeItem(HEROES_LOGOUT_KEY);
        heading.textContent = 'Successfully logged out';
        report('Your local HERO session was invalidated on the server.');
      } else
        report('No logout confirmation is available. Use Logout to invalidate your session.', true);
      content.append(link('Log in', '/site/heroes/login/'));
      return;
    }
    if (mode === 'logout') {
      const current = await identityRequest('me');
      if (current.user.impersonation) {
        heading.textContent = 'Release impersonation';
        content.append(releaseGuidance(current.user.impersonation));
        return;
      }
      heading.textContent = 'Log out';
      form('Confirm logout', [], async () => {
        await identityRequest('logout', {});
        sessionStorage.removeItem(HEROES_SESSION_KEY);
        sessionStorage.setItem(HEROES_LOGOUT_KEY, 'confirmed');
        window.location.replace('/site/heroes/logout-success/');
      });
      return;
    }
    if (mode === 'setup') return setupPage();
    if (['login', 'register'].includes(mode)) {
      heading.textContent = {
        login: 'Log in',
        register: 'Register',
      }[mode];
      const setupLink = link('First-time setup instructions', '/site/heroes/setup/');
      const accountLink =
        mode === 'login'
          ? link('Register as visitor', '/site/heroes/register/')
          : link('Log in', '/site/heroes/login/');
      content.append(accountLink, setupLink);
      const state = await identityRequest('status');
      if (
        mode === 'login' &&
        !state.setupRequired &&
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem?.(HEROES_SESSION_KEY)
      ) {
        try {
          const current = await identityRequest('me');
          content.replaceChildren();
          return afterLogin(current);
        } catch (error) {
          if (error.status !== 401) throw error;
          sessionStorage.removeItem(HEROES_SESSION_KEY);
        }
      }
      setupLink.hidden = !state.setupRequired;
      if (mode === 'login' && state.setupRequired) {
        accountLink.href = '/site/heroes/setup/';
        accountLink.textContent = 'Register first administrator';
      }
      content.append(
        text(
          'p',
          'Accounts belong to this local helper, not a central website. External identity and passkeys are not configured. Never reuse your main email or work password.'
        )
      );
      const fields = [
        ['username', 'Username'],
        ['password', 'Password (12-256 characters)', 'password'],
      ];
      if (mode === 'register' && state.accountFeatures?.invitations) {
        content.append(
          text(
            'p',
            'Have a private administrator invitation? Enter its code below to receive its approved roles. Leave it blank to register as a Visitor. Codes belong to this helper, expire after 24 hours, and work once. Administrators must enroll in two-factor authentication after signing in.'
          )
        );
        fields.push(['code', 'Invitation code (optional)', 'password']);
      }
      const registration = form(
        mode === 'login' ? 'Log in' : 'Create account',
        fields,
        async (data) => {
          const result = await identityRequest(
            mode === 'register' && data.code?.trim() ? 'invite/redeem' : mode,
            data
          );
          if (mode === 'login') {
            sessionStorage.setItem(HEROES_SESSION_KEY, result.token);
            sessionStorage.removeItem(HEROES_LOGOUT_KEY);
            await afterLogin(result);
          } else {
            content.replaceChildren(
              text('p', result.message),
              link('Log in', '/site/heroes/login/')
            );
            report(result.message);
          }
        }
      );
      if (registration.elements.code) {
        registration.elements.code.required = false;
        registration.elements.code.autocomplete = 'one-time-code';
      }
      if (state.setupRequired)
        content.append(link('Set up first administrator', '/site/heroes/setup/'));
      return;
    }
    const current = await identityRequest('me');
    const impersonating = Boolean(current.user.impersonation);
    if (!impersonating && (current.mfaRequired || current.enrollmentRequired))
      return afterLogin(current);
    const membershipRoles = (user) => user.assignedRoles || user.roles || [];
    const activeRole = current.user.activeRole || current.user.roles?.[0];
    const hasActiveRole = (role) =>
      current.user.activeRole
        ? current.user.activeRole === role
        : current.user.roles?.includes(role) === true;
    const adminModes = ['admin', 'admin-invitations', 'admin-roles', 'admin-cultures'];
    if (impersonating && current.user.impersonation.preview !== true && adminModes.includes(mode)) {
      heading.textContent = 'Release impersonation';
      content.append(
        releaseGuidance(current.user.impersonation),
        link('Profile', '/site/heroes/account/')
      );
      return;
    }
    if (adminModes.includes(mode) && !hasActiveRole('admin')) {
      heading.textContent = 'Administrator access required';
      content.append(link('Profile', '/site/heroes/account/'));
      report('Select the System administrator role to use this page.', true);
      return;
    }
    heading.textContent =
      mode === 'account'
        ? 'Profile'
        : {
            admin: 'System administrators',
            'admin-invitations': 'Account invitations',
            'admin-roles': 'Account roles and permissions',
            'admin-cultures': 'Culture configuration',
          }[mode] || 'Profile';
    if (accessDenied)
      report(
        'That HERO page is not available to your account. No workspace was opened. Ask a system administrator about the required role or resource permissions.',
        true
      );
    const logoutLink = link('Logout', '/site/heroes/logout/');
    if (!impersonating) content.append(logoutLink);
    const nameConfig = ['account', 'admin-cultures'].includes(mode)
      ? await identityRequest('name-config')
      : null;
    if (mode === 'admin-cultures') {
      content.append(
        text(
          'p',
          'These settings control name formatting for every account. Users choose a culture, not an individual order. Preferred names take precedence; usernames remain visible.'
        )
      );
      const orders = [
        ['given-first', 'Given name first'],
        ['family-first', 'Family name first'],
      ];
      const saveConfig = async (cultures) => {
        const result = await identityRequest('admin/name-config', { cultures });
        onAccessChange({ stage: 'ready', user: result.user });
        content.replaceChildren();
        await init();
        report('Culture configuration saved for all accounts.');
      };
      const configForm = form(
        'Save culture name ordering',
        nameConfig.cultures.map((culture, index) => [
          `culture-${index}`,
          `${culture.label} (${culture.code || 'default'})`,
          'text',
          orders,
        ]),
        async (data) =>
          saveConfig(
            nameConfig.cultures.map((culture, index) => ({
              ...culture,
              nameOrder: data[`culture-${index}`],
            }))
          ),
        content
      );
      for (const [index, culture] of nameConfig.cultures.entries())
        configForm.elements[`culture-${index}`].value = culture.nameOrder;
      form(
        'Add selectable culture',
        [
          ['code', 'Culture/language code (e.g. it-IT)'],
          ['label', 'Culture label'],
          ['nameOrder', 'Name order', 'text', orders],
        ],
        async (data) => saveConfig([...nameConfig.cultures, data]),
        content
      );
      return;
    }
    if (mode === 'account') {
      const hasRelationshipRole = ['player', 'game-master'].includes(activeRole);
      const profileFeatures = hasRelationshipRole
        ? disclosure(content, 'Play relationships and requests')
        : null;
      const loadRelationships = async () => {
        if (!hasRelationshipRole) return;
        profileFeatures.append(
          text(
            'p',
            'Request to play under a Game Master using sign-in accounts, not workspace profiles. An approved relationship does not join a world, share data, approve objects, or grant resource permissions. Either participant can end it; existing resource ACLs are unchanged.'
          )
        );
        const play = await identityRequest('directory/status');
        const accounts = new Map(play.users.map((user) => [user.id, user]));
        profileFeatures.append(
          link(
            activeRole === 'game-master' ? 'Manage Player relationships' : 'Browse Game Masters',
            activeRole === 'game-master' ? '/site/heroes/people/' : '/site/heroes/people/players/'
          )
        );
        form(
          'Refresh play relationships',
          [],
          async () => {
            content.replaceChildren();
            await init();
            report('Available Game Masters and your play relationships refreshed.');
          },
          profileFeatures
        );
        const refreshPlay = async (action, data, message) => {
          await identityRequest(action, data);
          content.replaceChildren();
          await init();
          report(message);
        };
        if (activeRole === 'game-master') {
          profileFeatures.append(
            text(
              'p',
              'Your Game Master listing is hidden by default. Listing makes your preferred/formatted name and @username visible to Player accounts on this helper. Unlisting stops new requests; it does not erase existing requests or relationships. Players who request you also share their displayed name and username with you.'
            )
          );
          const listing = form(
            'Save Game Master listing',
            [['visible', 'List my name for players seeking a Game Master', 'checkbox']],
            async (_data, panel) => {
              const visible = panel.elements.visible.checked;
              await refreshPlay(
                'directory/listing',
                { role: 'game-master', visible },
                visible
                  ? 'Your Game Master name is now listed for Player accounts.'
                  : 'Your Game Master name is hidden from the directory. Existing relationships are unchanged.'
              );
            },
            profileFeatures
          );
          listing.elements.visible.checked = play.listing.gameMaster === true;
        }
        if (activeRole === 'player') {
          profileFeatures.append(
            text(
              'p',
              'Only Game Masters who opt in appear below. Sending a request shares your displayed name and @username with that Game Master. A Game Master can also play under another Game Master when their account has both roles.'
            )
          );
          const listed = await identityRequest('play/status');
          const available = listed.directory.filter(
            (gm) =>
              !play.relationships.some(
                (relationship) =>
                  relationship.playerId === current.user.id &&
                  accounts.get(relationship.gameMasterId)?.username === gm.username &&
                  ['pending', 'approved'].includes(relationship.status)
              )
          );
          if (available.length)
            form(
              'Request to play',
              [
                [
                  'username',
                  'Listed Game Master',
                  'text',
                  available.map((gm) => [gm.username, heroesAccountLabel(gm)]),
                ],
              ],
              async (data) =>
                refreshPlay(
                  'play/request',
                  { username: data.username },
                  'Play request sent. Only the addressed Game Master can approve it. Your data permissions are unchanged.'
                ),
              profileFeatures
            );
          else
            profileFeatures.append(
              text(
                'p',
                'No listed Game Masters are available for a new request. Game Masters must opt in; those with a pending or approved relationship with you are omitted.'
              )
            );
        }
        profileFeatures.append(text('h4', 'My requests and relationships'));
        const activeRelationships = play.relationships.filter(
          (relationship) =>
            (relationship.playerId === current.user.id ? 'player' : 'game-master') === activeRole
        );
        if (!activeRelationships.length)
          profileFeatures.append(text('p', 'No play requests or relationships yet.'));
        for (const relationship of activeRelationships) {
          const initiatedByGameMaster = relationship.initiatedBy === 'game-master';
          const isPlayer = relationship.playerId === current.user.id;
          const sideRole = isPlayer ? 'player' : 'game-master';
          const outgoing = initiatedByGameMaster ? !isPlayer : isPlayer;
          const counterpartId = isPlayer ? relationship.gameMasterId : relationship.playerId;
          const counterpart = accounts.has(counterpartId)
            ? heroesAccountLabel(accounts.get(counterpartId))
            : 'Former or private account';
          profileFeatures.append(
            text(
              'p',
              `${activeRole === 'player' ? 'As Player' : 'As Game Master'} — ${counterpart}: ${relationship.status}. Requested ${new Date(relationship.createdAt).toLocaleString()}.${relationship.resolvedAt ? ` Updated ${new Date(relationship.resolvedAt).toLocaleString()}.` : ''}`
            )
          );
          const actions =
            relationship.status === 'pending'
              ? outgoing
                ? [
                    [
                      'cancel',
                      initiatedByGameMaster
                        ? 'Cancel Game Master invitation'
                        : 'Cancel play request',
                    ],
                  ]
                : initiatedByGameMaster && sideRole === 'player'
                  ? [
                      ['approve', 'Accept Game Master invitation'],
                      ['reject', 'Decline Game Master invitation'],
                    ]
                  : [
                      ['approve', 'Approve play request'],
                      ['reject', 'Reject play request'],
                    ]
              : relationship.status === 'approved'
                ? [['end', 'End play relationship']]
                : [];
          for (const [decision, label] of actions)
            form(
              `${label}: ${counterpart}`,
              [],
              async () =>
                refreshPlay(
                  'play/respond',
                  { id: relationship.id, decision },
                  `${label} completed. World membership, object approvals, and resource ACLs are unchanged.`
                ),
              profileFeatures
            );
        }
      };
      let roleRequestDetails;
      if (
        !impersonating &&
        (membershipRoles(current.user).includes('visitor') || current.user.roleRequest)
      ) {
        roleRequestDetails = disclosure(content, 'Request Player / Game Master roles');
        roleRequestDetails.append(
          text(
            'p',
            'Visitors can ask a system administrator to approve Player, Game Master, or both roles. Approval replaces Visitor status and requires signing in again. It does not join a game or grant access to existing data; those permissions are separate.'
          )
        );
        const roleRequest = current.user.roleRequest;
        if (roleRequest) {
          roleRequestDetails.append(
            text(
              'p',
              `Your role request: ${roleRequest.status} - ${roleRequest.roles.map((role) => HEROES_ROLE_LABELS[role]).join(', ')}. Submitted ${new Date(roleRequest.createdAt).toLocaleString()}.${roleRequest.resolvedAt ? ` Resolved ${new Date(roleRequest.resolvedAt).toLocaleString()}.` : ''}`
            )
          );
        }
        if (roleRequest?.status === 'pending') {
          form(
            'Cancel role request',
            [],
            async () => {
              await identityRequest('roles/cancel', { requestId: roleRequest.id });
              content.replaceChildren();
              await init();
              report('Role request cancelled. Your roles and permissions are unchanged.');
            },
            roleRequestDetails
          );
        } else if (
          membershipRoles(current.user).includes('visitor') &&
          !membershipRoles(current.user).includes('admin')
        ) {
          form(
            'Submit role request',
            ['player', 'game-master']
              .filter((role) => !membershipRoles(current.user).includes(role))
              .map((role) => [role, HEROES_ROLE_LABELS[role], 'checkbox']),
            async (_data, panel) => {
              const roles = ['player', 'game-master'].filter(
                (role) => panel.elements[role]?.checked
              );
              await identityRequest('roles/request', { roles });
              content.replaceChildren();
              await init();
              report(
                'Role request submitted for system-administrator approval. Your access is unchanged until approval.'
              );
            },
            roleRequestDetails
          );
        }
      }
      const passwordForm = impersonating
        ? releaseGuidance(current.user.impersonation)
        : form(
            'Change password',
            [
              ['currentPassword', 'Current password', 'password'],
              ['password', 'New password', 'password'],
            ],
            async (data, panel) => {
              await identityRequest('password', data);
              panel.reset();
              report('Password changed; other sessions revoked.');
            }
          );
      const emailStatus = document.createElement('section');
      emailStatus.className = 'heroes-editor-panel';
      emailStatus.append(
        text('h3', 'Email verification'),
        text(
          'p',
          'Email verification is not available yet. This helper does not collect an email address or send verification messages, and no address is verified.'
        )
      );
      content.append(emailStatus);
      const nameDetails = disclosure(content, 'Edit personal name');
      nameDetails.append(
        text(
          'p',
          'Your personal name is optional and separate from your sign-in username. It is visible to system administrators and in your signed-in identity. Other users see it only when you opt into the Game Master directory or participate in a play request/relationship. Leave unused components blank; a single name is supported. Select a culture; the system administrator configures its name order. Your preferred name is displayed first when provided, otherwise your formatted full name is used.'
        )
      );
      const nameForm = form(
        'Save personal name',
        [
          [
            'culture',
            'Culture',
            'text',
            nameConfig.cultures.map((culture) => [culture.code, culture.label]),
          ],
          ...ACCOUNT_NAME_FIELDS,
        ],
        async (data) => {
          const result = await identityRequest('profile/name', { personalName: data });
          onAccessChange({ stage: 'ready', user: result.user });
          report('Personal name saved. Your sign-in username is unchanged.');
        },
        nameDetails
      );
      for (const key of ['culture', ...ACCOUNT_NAME_FIELDS.map(([key]) => key)]) {
        const input = nameForm.elements[key];
        input.required = false;
        input.maxLength = 120;
        input.value = current.user.personalName?.[input.name] || '';
      }
      nameForm.elements.firstName.autocomplete = 'given-name';
      nameForm.elements.middleName.autocomplete = 'additional-name';
      nameForm.elements.familyName.autocomplete = 'family-name';
      nameForm.elements.title.autocomplete = 'honorific-prefix';
      nameForm.elements.suffixName.autocomplete = 'honorific-suffix';
      let securityDetails;
      let closureDetails;
      if (!impersonating) {
        securityDetails = disclosure(content, 'Two-factor authentication');
        if (!current.user.mfaEnabled) {
          form('Enable two-factor authentication', [], async () => enroll(), securityDetails);
        } else
          securityDetails.append(
            text(
              'p',
              'Authenticator two-factor authentication is enabled. Use saved single-use recovery codes if your authenticator is unavailable.'
            )
          );
        const closure = await identityRequest('closure/status');
        closureDetails = disclosure(content, 'Delete or transfer account');
        closureDetails.append(
          text(
            'p',
            `Tracked owned resources: ${closure.ownedCount}. Ownership is recorded separately from read/write permissions. Legacy data without recorded ownership is never deleted by this action.`
          ),
          text(
            'p',
            'Retain deactivates your account for system-administrator recovery after identity verification. Delete permanently removes your credentials and only unshared owned data; shared data and connected contexts stay with system administrators. Transfer keeps your account active until the named recipient accepts all resources you own at acceptance, then permanently deletes your credentials. You cannot close the last active system-administrator account.'
          )
        );
        for (const transfer of closure.outgoing) {
          closureDetails.append(
            text('p', `Awaiting acceptance by ${transfer.username}. Your account is still active.`)
          );
          form(
            'Cancel ownership transfer',
            [],
            async () => {
              await identityRequest('closure/cancel', { id: transfer.id });
              content.replaceChildren();
              await init();
              report('Transfer cancelled. Your account and data are unchanged.');
            },
            closureDetails
          );
        }
        for (const transfer of closure.incoming) {
          closureDetails.append(
            text(
              'p',
              `${transfer.username} requests transfer of all their owned resources (currently ${transfer.ownedCount}) to you. Accepting permanently closes their account and grants you ownership and write access to those resources; other users keep their existing access.`
            )
          );
          form(
            `Accept transfer from ${transfer.username}`,
            [],
            async () => {
              const result = await identityRequest('closure/accept', { id: transfer.id });
              content.replaceChildren();
              await init();
              report(
                `Transfer accepted. ${result.transferred} resource ownership records transferred; the sender's account was closed.`
              );
            },
            closureDetails
          );
          form(
            `Decline transfer from ${transfer.username}`,
            [],
            async () => {
              await identityRequest('closure/reject', { id: transfer.id });
              content.replaceChildren();
              await init();
              report('Transfer declined. The sender account remains active.');
            },
            closureDetails
          );
        }
        const closeForm = form(
          'Confirm account closure',
          [
            [
              'choice',
              'What should happen to my data?',
              'text',
              [
                ['retain', 'Retain my account and data for future recovery'],
                ['delete', 'Delete my credentials and unshared owned data'],
                [
                  'transfer',
                  'Transfer owned resources, then delete my credentials after acceptance',
                ],
              ],
            ],
            ['recipient', 'Recipient username (transfer only)'],
            ['confirmation', 'Type your exact username to confirm'],
            ['password', 'Current password', 'password'],
          ],
          async (data) => {
            const result = await identityRequest('closure/request', data);
            if (result.closed) {
              sessionStorage.removeItem(HEROES_SESSION_KEY);
              sessionStorage.removeItem(HEROES_LOGOUT_KEY);
              onAccessChange({ stage: 'anonymous' });
              content.replaceChildren(link('Log in with another account', '/site/heroes/login/'));
            } else {
              content.replaceChildren();
              await init();
            }
            report(result.message);
          },
          closureDetails
        );
        closeForm.elements.recipient.required = false;
        closeForm.elements.password.autocomplete = 'current-password';
      }
      content.replaceChildren(
        passwordForm,
        emailStatus,
        nameDetails,
        ...(profileFeatures ? [profileFeatures] : []),
        ...(roleRequestDetails ? [roleRequestDetails] : []),
        ...(!impersonating ? [securityDetails, logoutLink, closureDetails] : [])
      );
      try {
        await loadRelationships();
      } catch (error) {
        if (error.status === 401) throw error;
        profileFeatures.replaceChildren(
          text('summary', 'Play relationships and requests'),
          text('p', `Play relationships are temporarily unavailable: ${error.message}`),
          link('Open Game Masters', '/site/heroes/people/'),
          link('Open Players', '/site/heroes/people/players/')
        );
        form(
          'Retry play relationships',
          [],
          async () => {
            content.replaceChildren();
            await init();
          },
          profileFeatures
        );
      }
      return;
    }
    const admin = await identityRequest('admin/list');
    const accountRoleList = (user) => user.assignedRoles || user.roles || [];
    if (mode === 'admin') {
      const administrators = admin.users.filter(
        (user) => user.closure !== 'deleted' && accountRoleList(user).includes('admin')
      );
      const administratorList = document.createElement('ul');
      for (const user of administrators)
        administratorList.append(
          text(
            'li',
            `${heroesAccountLabel(user)}${user.disabled ? ' — disabled' : ' — active'}${user.id === current.user.id ? ' (you)' : ''}`
          )
        );
      content.append(
        text('p', `System administrators (${administrators.length})`),
        administratorList,
        text('p', 'Choose a focused administration page:')
      );
      content.append(
        link('Create and manage invitations', '/site/heroes/people/admins/invitations/'),
        link('Manage account roles and permissions', '/site/heroes/people/admins/roles/'),
        link('Configure name cultures', '/site/heroes/people/admins/cultures/')
      );
      return;
    }
    if (mode === 'admin-invitations') {
      content.append(
        text(
          'p',
          'Create a private single-use code for an approved account role. Give it only to the intended person, who chooses their username and password on Register using this same helper. Codes expire after 24 hours and stop working if their issuing administrator loses access. Roles do not share existing data; use resource ACLs separately.'
        )
      );
      form(
        'Create invitation',
        Object.entries(HEROES_ROLE_LABELS).map(([role, label]) => [role, label, 'checkbox']),
        async (_data, panel) => {
          const roles = Object.keys(HEROES_ROLE_LABELS).filter(
            (role) => panel.elements[role].checked
          );
          const result = await identityRequest('admin/invite', { roles });
          content.replaceChildren();
          await init();
          const output = text('input', '');
          output.value = result.code;
          output.readOnly = true;
          output.setAttribute('aria-label', 'Private invitation code');
          output.autocomplete = 'off';
          content.append(
            text('h3', 'Save this private invitation now'),
            text(
              'p',
              `Shown only once. Expires ${new Date(result.invitation.expiresAt).toLocaleString()}. Approved roles: ${result.invitation.roles.map((role) => HEROES_ROLE_LABELS[role]).join(', ')}. Do not post this code publicly.`
            ),
            output
          );
          report('Invitation created. Copy the private code shown below before leaving this page.');
        }
      );
      const invitations = admin.invitations || [];
      content.append(text('h3', `Pending invitations (${invitations.length})`));
      for (const invitation of invitations) {
        const row = document.createElement('div');
        row.append(
          text(
            'p',
            `${invitation.roles.map((role) => HEROES_ROLE_LABELS[role]).join(', ')} — expires ${new Date(invitation.expiresAt).toLocaleString()}`
          )
        );
        const revoke = text('button', 'Revoke invitation');
        revoke.type = 'button';
        revoke.className = 'btn btn-secondary';
        revoke.addEventListener(
          'click',
          () =>
            run(async () => {
              report('Revoking invitation...');
              await identityRequest('admin/invite/revoke', { invitationId: invitation.id });
              content.replaceChildren();
              await init();
              report('Invitation revoked. Its code can no longer create an account.');
            }),
          { signal }
        );
        row.append(revoke);
        content.append(row);
      }
      return;
    }
    const request = createHeroesClient({ signal });
    const state = await request('/heroes/management');
    const library = await request('/heroes/library');
    const users = admin.users
      .filter((user) => user.closure !== 'deleted')
      .map((user) => [
        user.id,
        `${heroesAccountLabel(user)} (${accountRoleList(user)
          .map((role) => HEROES_ROLE_LABELS[role] || role)
          .join(', ')})${user.disabled ? ' - disabled' : ''}`,
      ]);
    content.append(
      text(
        'p',
        'Self-registered accounts start as Visitors and cannot create data until granted Player or Game Master. Invited accounts receive their approved roles. Roles do not grant access to existing resources; use explicit read/write ACLs. Administrators have full access and require TOTP. Legacy profiles are organizational records, never accounts.'
      )
    );
    content.append(
      text(
        'p',
        'These are sign-in accounts, not workspace profiles. One account may have multiple roles and appears in each applicable list. Disable an account to remove access without deleting its identity or game records.'
      )
    );
    const pendingRoles = admin.users.filter(
      (user) => !user.disabled && user.roleRequest?.status === 'pending'
    );
    content.append(
      text('h3', `Pending role requests (${pendingRoles.length})`),
      text(
        'p',
        "Approve all roles in a request or reject it. Approval replaces Visitor status and revokes the requester's sessions; resource ACLs remain unchanged. Manual account-role edits or disabling an account cancel its pending request."
      )
    );
    for (const user of pendingRoles) {
      const request = user.roleRequest;
      content.append(
        text('h4', heroesAccountLabel(user)),
        text(
          'p',
          `Requested: ${request.roles.map((role) => HEROES_ROLE_LABELS[role]).join(', ')}. Submitted ${new Date(request.createdAt).toLocaleString()}.`
        )
      );
      for (const [decision, label] of [
        ['approve', 'Approve'],
        ['reject', 'Reject'],
      ]) {
        form(`${label} role request from ${heroesAccountLabel(user)}`, [], async () => {
          await identityRequest('admin/roles/review', {
            userId: user.id,
            requestId: request.id,
            decision,
          });
          content.replaceChildren();
          await init();
          report(
            decision === 'approve'
              ? 'Role request approved. The account must sign in again; existing data permissions are unchanged.'
              : 'Role request rejected. The account can view the decision in Account & security; its access is unchanged.'
          );
        });
      }
    }
    const toolbar = document.createElement('div');
    toolbar.className = 'heroes-account-toolbar';
    const searchLabel = text('label', 'Search accounts');
    const search = document.createElement('input');
    search.type = 'search';
    search.setAttribute('aria-label', 'Search accounts');
    searchLabel.append(search);
    const stateLabel = text('label', 'Account status');
    const accountState = document.createElement('select');
    accountState.setAttribute('aria-label', 'Account status');
    for (const [value, label] of [
      ['all', 'All accounts'],
      ['active', 'Active'],
      ['disabled', 'Disabled or retained'],
    ])
      accountState.add(new Option(label, value));
    stateLabel.append(accountState);
    toolbar.append(searchLabel, stateLabel);
    content.append(toolbar);
    const rosters = [];
    for (const [role, label] of Object.entries(HEROES_ROLE_LABELS)) {
      const group = document.createElement('section');
      const title = text('h3', '');
      const summary = text('p', '');
      summary.setAttribute('aria-live', 'polite');
      const list = document.createElement('ul');
      list.className = 'heroes-account-list';
      const controls = document.createElement('div');
      controls.className = 'heroes-account-toolbar';
      const previous = text('button', 'Previous');
      const next = text('button', 'Next');
      for (const [button, action] of [
        [previous, 'Previous'],
        [next, 'Next'],
      ]) {
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.setAttribute('aria-label', `${action} ${label} accounts page`);
      }
      let page = 0;
      const render = () => {
        const query = (search.value || '').trim().toLocaleLowerCase();
        const all = admin.users.filter((user) => accountRoleList(user).includes(role));
        const members = all
          .filter(
            (user) =>
              (!query ||
                `${heroesAccountLabel(user)} ${user.username}`
                  .toLocaleLowerCase()
                  .includes(query)) &&
              (accountState.value === 'all' ||
                (accountState.value === 'active' ? !user.disabled : user.disabled))
          )
          .sort(
            (left, right) =>
              heroesAccountLabel(left).localeCompare(heroesAccountLabel(right)) ||
              left.id.localeCompare(right.id)
          );
        const size = 10;
        const pages = Math.max(1, Math.ceil(members.length / size));
        page = Math.min(page, pages - 1);
        title.textContent = `${label} accounts (${members.length})`;
        summary.textContent = members.length
          ? `Showing ${page * size + 1}-${Math.min((page + 1) * size, members.length)} of ${members.length}; page ${page + 1} of ${pages}.`
          : all.length
            ? 'No accounts match these filters.'
            : 'No accounts with this role.';
        list.replaceChildren();
        for (const user of members.slice(page * size, (page + 1) * size))
          list.append(
            text(
              'li',
              `${heroesAccountLabel(user)}${user.id === current.user.id ? ' (you)' : ''} - ${user.closure === 'retained' ? 'Deactivated for recovery (verify identity before restoring)' : user.disabled ? 'Disabled' : 'Active'}; MFA: ${user.mfaEnabled ? 'enabled' : 'not enrolled'}; created: ${user.createdAt || 'unknown'}; last sign-in: ${user.lastLoginAt || 'never'}`
            )
          );
        previous.disabled = page === 0;
        next.disabled = page + 1 >= pages;
        controls.hidden = pages === 1;
      };
      previous.addEventListener(
        'click',
        () => {
          page--;
          render();
        },
        { signal }
      );
      next.addEventListener(
        'click',
        () => {
          page++;
          render();
        },
        { signal }
      );
      rosters.push(() => {
        page = 0;
        render();
      });
      controls.append(previous, next);
      group.append(title, summary, list, controls);
      content.append(group);
      render();
    }
    search.addEventListener('input', () => rosters.forEach((render) => render()), { signal });
    accountState.addEventListener('change', () => rosters.forEach((render) => render()), {
      signal,
    });
    const roleForm = form(
      'Save account roles',
      [
        ['userId', 'Account', 'text', users],
        ...['visitor', 'player', 'game-master', 'admin'].map((role) => [
          role,
          HEROES_ROLE_LABELS[role],
          'checkbox',
        ]),
        ['disabled', 'Disable account', 'checkbox'],
      ],
      async (data, panel) => {
        const roleNames = ['visitor', 'player', 'game-master', 'admin'].filter(
          (role) => panel.elements[role].checked
        );
        await identityRequest('admin/user', {
          userId: data.userId,
          roles: roleNames,
          disabled: panel.elements.disabled.checked,
        });
        if (data.userId === current.user.id) {
          sessionStorage.removeItem(HEROES_SESSION_KEY);
          onAccessChange({ stage: 'anonymous' });
          content.replaceChildren(link('Sign in again', '/site/heroes/login/'));
          report('Your account was updated and your session revoked. Sign in again to continue.');
        } else {
          content.replaceChildren();
          await init();
          report('Account updated. The account lists are refreshed; its sessions were revoked.');
        }
      }
    );
    const selectUser = () => {
      const user = admin.users.find((user) => user.id === roleForm.elements.userId.value);
      for (const role of ['visitor', 'player', 'game-master', 'admin'])
        roleForm.elements[role].checked = accountRoleList(user).includes(role);
      roleForm.elements.disabled.checked = user.disabled;
    };
    roleForm.elements.userId.addEventListener('change', selectUser, { signal });
    selectUser();
    const wurmForm = form(
      'Save Wurm tools delegation',
      [
        ['userId', 'Account', 'text', users],
        ['allowed', 'Allow all Wurm tools, including local server/client launch', 'checkbox'],
      ],
      async (data, panel) => {
        await identityRequest('admin/wurm-access', {
          userId: data.userId,
          allowed: panel.elements.allowed.checked,
        });
        if (data.userId === current.user.id) {
          sessionStorage.removeItem(HEROES_SESSION_KEY);
          onAccessChange({ stage: 'anonymous' });
          content.replaceChildren(link('Sign in again', '/site/heroes/login/'));
          report('Wurm delegation saved; your session was revoked. Sign in again.');
        } else {
          content.replaceChildren();
          await init();
          report(
            'Wurm delegation saved. The account must sign in again; browser pairing is still required for local helper features.'
          );
        }
      }
    );
    const selectWurmUser = () => {
      const user = admin.users.find((user) => user.id === wurmForm.elements.userId.value);
      wurmForm.elements.allowed.checked = user.wurmAccess === true;
    };
    wurmForm.elements.userId.addEventListener('change', selectWurmUser, { signal });
    selectWurmUser();
    content.append(
      text(
        'p',
        'System administrators have Wurm access automatically. Other accounts require this explicit delegation; Player/Game Master roles and HERO resource ACLs do not grant it. All local Wurm APIs require both a complete account session and a paired browser.'
      )
    );
    const targets = [
      ...state.worlds.map((world) => [`world:${world.id}`, `World: ${world.name}`]),
      ...state.objects.map((object) => [`object:${object.id}`, `Object: ${object.name}`]),
      ...state.records.map((record) => [
        `record:${record.id}`,
        `${record.kind}: ${record.data.name}`,
      ]),
      ...library.entries.map((entry) => [`library:${entry.id}`, `Library: ${entry.name}`]),
    ];
    if (targets.length)
      form(
        'Save resource ACL',
        [
          ['userId', 'Account', 'text', users],
          ['target', 'Resource', 'text', targets],
          [
            'access',
            'Access',
            'text',
            [
              ['none', 'None (revoke)'],
              ['read', 'Read'],
              ['write', 'Read and write'],
            ],
          ],
        ],
        async (data) => {
          const [resourceType, resourceId] = data.target.split(':');
          await identityRequest('admin/grant', {
            userId: data.userId,
            resourceType,
            resourceId,
            access: data.access,
          });
          if (data.userId === current.user.id) {
            sessionStorage.removeItem(HEROES_SESSION_KEY);
            onAccessChange({ stage: 'anonymous' });
            content.replaceChildren(link('Sign in again', '/site/heroes/login/'));
            report('Permissions saved. Your session was revoked; sign in again to continue.');
            return;
          }
          content.replaceChildren();
          await init();
          report(
            'ACL saved. Changes apply to the next request; affected user sessions were revoked.'
          );
        }
      );
    content.append(text('h3', 'Current ACL entries'));
    for (const grant of admin.grants)
      content.append(
        text(
          'p',
          `${admin.users.find((user) => user.id === grant.userId)?.username}: ${grant.resourceType} ${grant.resourceId} - ${grant.access}`
        )
      );
    content.append(
      text(
        'p',
        'Grant linked context separately: object, world, management records, referenced profiles/campaigns/genres and library definitions. Bulk imports/exports and cascading world/library deletions are administrator-only. Availability links do not grant access.'
      )
    );
  }
  run(init);
  return () => controller.abort();
}
