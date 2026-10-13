// Action & Prayer Timers Module
export const toolMetadata = {
  id: 'action-timers',
  name: 'Action & Prayer Timers',
  category: 'Timers',
  icon: '⏳',
  description:
    'Interactive countdowns for prayer favor cycles, meditation path cooldowns, and custom alerts.',
};

let activeInterval = null;
let soundEnabled = true;

// Synthesize pleasant chime using Web Audio API
function playChime() {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.4); // E5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

function sendNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/images/favicon.svg',
    });
  }
}

export function mount(container) {
  let timerState = {
    totalSeconds: 20 * 60, // Default 20 mins (Prayer cycle)
    remainingSeconds: 20 * 60,
    isRunning: false,
    activeTitle: 'Prayer / Favor Gain Cycle',
  };

  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-header-block">
        <div>
          <h2><span>⏳</span> Action & Prayer Timers</h2>
          <p>Track priest favor gain ticks, meditation path abilities, or custom countdowns with sound alerts.</p>
        </div>
        <div>
          <button id="notify-perm-btn" class="btn btn-secondary btn-sm">🔔 Enable Notifications</button>
        </div>
      </div>

      <div class="chips-group timer-chip-group">
        <span class="timer-preset-label">Select Preset:</span>
        <button type="button" class="chip-btn active" data-timer-name="Prayer / Favor Cycle" data-seconds="1200">20m Prayer (Favor)</button>
        <button type="button" class="chip-btn" data-timer-name="Meditation Path Cooldown" data-seconds="1800">30m Meditation</button>
        <button type="button" class="chip-btn" data-timer-name="Path Ability (3 Hours)" data-seconds="10800">3h Path Ability</button>
        <button type="button" class="chip-btn" data-timer-name="Sleep Powder (2 Hours)" data-seconds="7200">2h Sleep Powder</button>
        <button type="button" class="chip-btn" data-timer-name="Custom 5 Min" data-seconds="300">5m Quick</button>
      </div>

      <div class="timer-display-box">
        <div id="timer-label" class="timer-label">
          ${timerState.activeTitle}
        </div>
        
        <div id="timer-display" class="timer-display-digits">
          20:00
        </div>

        <div class="timer-progress-track">
          <div id="timer-progress" class="timer-progress-bar"></div>
        </div>

        <div class="timer-btn-group">
          <button id="timer-toggle-btn" class="btn btn-primary timer-btn-start">▶ Start</button>
          <button id="timer-reset-btn" class="btn btn-secondary">↺ Reset</button>
          <button id="timer-test-sound" class="btn btn-secondary btn-sm" title="Test audio chime">🔊 Test Sound</button>
        </div>
      </div>

      <div class="form-grid timer-custom-grid">
        <div class="input-group">
          <label class="input-label" for="custom-minutes">Custom Duration (Minutes)</label>
          <div class="input-flex-row">
            <input type="number" id="custom-minutes" class="custom-input timer-custom-input" min="1" max="720" value="15">
            <button id="apply-custom-btn" class="btn btn-secondary">Set</button>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Audio & Alert Settings</label>
          <div class="timer-options-row">
            <label class="timer-checkbox-label">
              <input type="checkbox" id="sound-checkbox" checked> Play audio chime on completion
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  const displayEl = container.querySelector('#timer-display');
  const labelEl = container.querySelector('#timer-label');
  const progressEl = container.querySelector('#timer-progress');
  const toggleBtn = container.querySelector('#timer-toggle-btn');
  const resetBtn = container.querySelector('#timer-reset-btn');
  const soundCheck = container.querySelector('#sound-checkbox');
  const notifyBtn = container.querySelector('#notify-perm-btn');

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateUI() {
    displayEl.textContent = formatTime(timerState.remainingSeconds);
    const percent =
      timerState.totalSeconds > 0
        ? (timerState.remainingSeconds / timerState.totalSeconds) * 100
        : 0;
    progressEl.style.width = `${percent}%`;
    toggleBtn.textContent = timerState.isRunning ? '⏸ Pause' : '▶ Start';
    toggleBtn.className = timerState.isRunning ? 'btn btn-secondary' : 'btn btn-primary';
    labelEl.textContent = timerState.activeTitle;
  }

  function tick() {
    if (timerState.remainingSeconds > 0) {
      timerState.remainingSeconds--;
      updateUI();
    } else {
      clearInterval(activeInterval);
      activeInterval = null;
      timerState.isRunning = false;
      updateUI();
      playChime();
      sendNotification('Wurm Tools Timer Finished', `${timerState.activeTitle} has completed!`);
      alert(`${timerState.activeTitle} is ready!`);
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (timerState.isRunning) {
      clearInterval(activeInterval);
      activeInterval = null;
      timerState.isRunning = false;
      updateUI();
    } else {
      if (timerState.remainingSeconds <= 0) {
        timerState.remainingSeconds = timerState.totalSeconds;
      }
      timerState.isRunning = true;
      activeInterval = setInterval(tick, 1000);
      updateUI();
    }
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(activeInterval);
    activeInterval = null;
    timerState.isRunning = false;
    timerState.remainingSeconds = timerState.totalSeconds;
    updateUI();
  });

  soundCheck.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
  });

  container.querySelector('#timer-test-sound').addEventListener('click', () => {
    playChime();
  });

  notifyBtn.addEventListener('click', async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        notifyBtn.textContent = '✓ Notifications Active';
        notifyBtn.style.color = 'var(--accent-green)';
      }
    }
  });

  // Preset buttons
  container.querySelectorAll('[data-timer-name]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-timer-name]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      clearInterval(activeInterval);
      activeInterval = null;
      timerState.isRunning = false;

      const seconds = parseInt(btn.getAttribute('data-seconds'));
      timerState.totalSeconds = seconds;
      timerState.remainingSeconds = seconds;
      timerState.activeTitle = btn.getAttribute('data-timer-name');
      updateUI();
    });
  });

  // Custom minutes
  container.querySelector('#apply-custom-btn').addEventListener('click', () => {
    const mins = parseInt(container.querySelector('#custom-minutes').value) || 1;
    clearInterval(activeInterval);
    activeInterval = null;
    timerState.isRunning = false;
    timerState.totalSeconds = mins * 60;
    timerState.remainingSeconds = mins * 60;
    timerState.activeTitle = `Custom ${mins}m Timer`;
    updateUI();
  });

  updateUI();
}

export function unmount() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
}
