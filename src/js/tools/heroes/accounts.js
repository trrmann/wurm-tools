import { HEROES_SESSION_KEY, HEROES_LOGOUT_KEY, identityRequest } from './session.js';
import { createHeroesClient } from './helper-client.js';

export function mountHeroesAccounts(
  container,
  mode = 'account',
  { onAccessChange = () => {} } = {}
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
      )
        window.location.replace('/site/heroes/login/');
      else report(error.message, true);
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
  const form = (label, fields, action) => {
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
          try {
            await action(Object.fromEntries(new FormData(panel)), panel);
          } finally {
            submit.disabled = false;
          }
        });
      },
      { signal }
    );
    content.append(panel);
    return panel;
  };
  const showRecovery = (codes) => {
    content.replaceChildren(
      text(
        'p',
        'Save these single-use recovery codes offline now. They are shown only once. Losing your authenticator and all recovery codes can lock you out.'
      )
    );
    content.append(
      text('pre', codes.join('\n')),
      link('I saved my recovery codes - continue', '/site/heroes/')
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
        'Download the LTS version of Node.js (22 or newer) using the button below. Open the downloaded installer and follow its prompts. On Windows, leave npm and Add to PATH selected. npm comes with Node.js; it is not a separate download. Close and reopen your terminal after installation.'
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
      text('pre', 'npm install')
    );
    guide.append(installation);
    const steps = document.createElement('ol');
    for (const [title, detail, command] of [
      [
        'Start the helper',
        'Open a command window in your WurmTools folder (see installation help above). Copy this command into it and press Enter. Leave the helper running. If it is already running, skip this step.',
        'npm run helper',
      ],
      [
        'Get your setup code',
        'Open another command window in the same folder. Copy this command into it and press Enter. Copy the setup code it prints, not the command itself. Keep the code private. It lasts ten minutes; run the command again if it expires.',
        'npm run heroes:setup-code',
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
        'If npm is not recognized: install Node.js using the link above, then close and reopen your command window. If it still fails, run the installer again with npm and Add to PATH selected. On a managed computer, ask your system administrator if installation is blocked.'
      ),
      text(
        'p',
        'If PowerShell says npm.ps1 cannot run: use Command Prompt (cmd) as described above, or use npm.cmd in place of npm (for example npm.cmd install). Do not change your security policy.'
      ),
      text(
        'p',
        'If package.json is missing: open the extracted wurm-tools-main folder, not the ZIP or its scripts subfolder, and open a new command window there.'
      ),
      text(
        'p',
        'If the connection still fails: in the project command window, run npm run helper:stop, then npm run helper. This restarts the helper after an update without deleting your data. Then select Check connection again. Read any error in the command window; an older helper may not have account setup support.'
      ),
      text(
        'p',
        'For macOS or Linux: use the Node.js download page instructions for your system, extract the ZIP, then open Terminal in the extracted project folder and run the same npm commands.'
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
            : 'Cannot connect to account setup on this computer. In your WurmTools command window, run npm run helper:stop, wait for it to stop, then run npm run helper. Return here and select Check connection again. This does not delete your data.',
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
        showRecovery(response.recoveryCodes);
      });
    });
  };
  const afterLogin = (result) => {
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
          window.location.replace('/site/heroes/');
        }
      );
      return;
    }
    window.location.replace('/site/heroes/');
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
      content.append(setupLink);
      const state = await identityRequest('status');
      setupLink.hidden = !state.setupRequired;
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
      form(mode === 'login' ? 'Log in' : 'Create account', fields, async (data) => {
        const result = await identityRequest(mode, data);
        if (mode === 'login') {
          sessionStorage.setItem(HEROES_SESSION_KEY, result.token);
          sessionStorage.removeItem(HEROES_LOGOUT_KEY);
          afterLogin(result);
        } else {
          content.replaceChildren(text('p', result.message), link('Log in', '/site/heroes/login/'));
        }
      });
      content.append(
        link('Log in', '/site/heroes/login/'),
        link('Register as visitor', '/site/heroes/register/')
      );
      if (state.setupRequired)
        content.append(link('Set up first administrator', '/site/heroes/setup/'));
      return;
    }
    const current = await identityRequest('me');
    if (current.mfaRequired || current.enrollmentRequired) return afterLogin(current);
    heading.textContent = `${current.user.username} - ${current.user.roles.join(', ')}`;
    content.append(link('Logout', '/site/heroes/logout/'));
    if (mode !== 'admin') {
      form(
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
      if (!current.user.mfaEnabled) {
        form('Enable two-factor authentication', [], async () => enroll());
      } else
        content.append(
          text(
            'p',
            'Authenticator two-factor authentication is enabled. Use saved single-use recovery codes if your authenticator is unavailable.'
          )
        );
      return;
    }
    const admin = await identityRequest('admin/list');
    const request = createHeroesClient({ signal });
    const state = await request('/heroes/management');
    const library = await request('/heroes/library');
    const users = admin.users.map((user) => [
      user.id,
      `${user.username} (${user.roles.join(', ')})${user.disabled ? ' - disabled' : ''}`,
    ]);
    content.append(
      text(
        'p',
        'New accounts are Visitors and cannot create data until granted Player or Game Master. Roles do not grant access to existing resources; use explicit read/write ACLs. Administrators have full access and require TOTP. Legacy profiles are organizational records, never accounts.'
      )
    );
    for (const user of admin.users)
      content.append(
        text(
          'p',
          `${user.username}: ${user.roles.join(', ')}; MFA: ${user.mfaEnabled ? 'enabled' : 'not enrolled'}; last login: ${user.lastLoginAt || 'never'}`
        )
      );
    const roleForm = form(
      'Save account roles',
      [
        ['userId', 'Account', 'text', users],
        ...['visitor', 'player', 'game-master', 'admin'].map((role) => [role, role, 'checkbox']),
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
          window.location.replace('/site/heroes/login/');
        } else
          report('Account updated; its sessions were revoked. Reload to refresh the account list.');
      }
    );
    const selectUser = () => {
      const user = admin.users.find((user) => user.id === roleForm.elements.userId.value);
      for (const role of ['visitor', 'player', 'game-master', 'admin'])
        roleForm.elements[role].checked = user.roles.includes(role);
      roleForm.elements.disabled.checked = user.disabled;
    };
    roleForm.elements.userId.addEventListener('change', selectUser, { signal });
    selectUser();
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
