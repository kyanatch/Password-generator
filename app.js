/* =============================================
   PassVault OS - app.js
   ============================================= */

// ── State ──────────────────────────────────────
const state = {
  vault: JSON.parse(localStorage.getItem('passvault_entries') || '[]'),
  vaultUnlocked: false,
  masterPin: localStorage.getItem('passvault_pin') || '123456',
  checkedPassword: '',
  dragTarget: null,
  dragOffX: 0,
  dragOffY: 0,
};

// ── Boot Sequence ───────────────────────────────
const bootMessages = [
  'Initializing secure kernel...',
  'Loading encryption modules...',
  'Mounting vault filesystem...',
  'Starting biometric drivers...',
  'PassVault OS ready!',
];

window.addEventListener('DOMContentLoaded', () => {
  let i = 0;
  const textEl = document.getElementById('boot-text');
  const interval = setInterval(() => {
    if (i < bootMessages.length) {
      textEl.textContent = bootMessages[i++];
    } else {
      clearInterval(interval);
    }
  }, 500);

  setTimeout(() => {
    document.getElementById('boot-screen').style.opacity = '0';
    document.getElementById('boot-screen').style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.getElementById('boot-screen').classList.add('hidden');
      document.getElementById('desktop').classList.remove('hidden');
      positionWindows();
      showWindow('checker');
    }, 500);
  }, 3000);

  // Clock
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Window Management ───────────────────────────
function positionWindows() {
  const wins = [
    { id: 'win-checker',   top: 60, left: 60  },
    { id: 'win-generator', top: 60, left: 160 },
    { id: 'win-vault',     top: 80, left: 200 },
  ];
  wins.forEach(({ id, top, left }) => {
    const el = document.getElementById(id);
    el.style.top  = top + 'px';
    el.style.left = left + 'px';
    el.style.width  = '520px';
  });
}

function showWindow(name) {
  const ids = { checker: 'win-checker', generator: 'win-generator', vault: 'win-vault' };
  const el = document.getElementById(ids[name]);
  if (!el) return;
  el.classList.remove('hidden');
  bringToFront(el);
}

function closeWindow(id) {
  document.getElementById(id).classList.add('hidden');
}

function minimizeWindow(id) {
  document.getElementById(id).classList.add('hidden');
}

function bringToFront(el) {
  document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
  el.style.zIndex = 20;
}

// ── Drag ────────────────────────────────────────
function dragStart(e, id) {
  const el = document.getElementById(id);
  bringToFront(el);
  state.dragTarget = el;
  state.dragOffX = e.clientX - el.getBoundingClientRect().left;
  state.dragOffY = e.clientY - el.getBoundingClientRect().top;

  document.onmousemove = (e) => {
    if (!state.dragTarget) return;
    let x = e.clientX - state.dragOffX;
    let y = e.clientY - state.dragOffY;
    x = Math.max(0, Math.min(window.innerWidth - 100, x));
    y = Math.max(0, Math.min(window.innerHeight - 100, y));
    state.dragTarget.style.left = x + 'px';
    state.dragTarget.style.top  = y + 'px';
  };

  document.onmouseup = () => {
    state.dragTarget = null;
    document.onmousemove = null;
    document.onmouseup = null;
  };
}

// ── Password Checker ────────────────────────────
function checkPassword() {
  const pw = document.getElementById('pw-input').value;
  state.checkedPassword = pw;

  const criteria = {
    len:   pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num:   /[0-9]/.test(pw),
    sym:   /[^A-Za-z0-9]/.test(pw),
    long:  pw.length >= 16,
  };

  // Update criteria
  Object.entries(criteria).forEach(([key, pass]) => {
    const el = document.getElementById('crit-' + key);
    if (!el) return;
    const labels = {
      len:   'Min 8 characters',
      upper: 'Uppercase letter',
      lower: 'Lowercase letter',
      num:   'Number',
      sym:   'Special character',
      long:  '16+ characters (bonus)',
    };
    el.textContent = (pass ? '✓ ' : '✗ ') + labels[key];
    el.classList.toggle('pass', pass);
  });

  // Score (0–100)
  let score = 0;
  if (pw.length > 0)   score += 10;
  if (criteria.len)    score += 20;
  if (criteria.upper)  score += 15;
  if (criteria.lower)  score += 15;
  if (criteria.num)    score += 15;
  if (criteria.sym)    score += 20;
  if (criteria.long)   score += 5;
  score = Math.min(score, 100);

  // Extra length bonus
  if (pw.length >= 20) score = Math.min(score + 5, 100);

  let level, color, barColor;
  if (pw.length === 0) {
    level = 'Waiting for input...';
    color = 'var(--text-dim)';
    barColor = 'var(--border)';
    score = 0;
  } else if (score < 35) {
    level = '⚠️ WEAK';
    color = 'var(--weak)';
    barColor = 'var(--weak)';
  } else if (score < 70) {
    level = '⚡ MEDIUM';
    color = 'var(--medium)';
    barColor = 'var(--medium)';
  } else {
    level = '✅ STRONG';
    color = 'var(--strong)';
    barColor = 'var(--strong)';
  }

  document.getElementById('strength-label').textContent = level;
  document.getElementById('strength-label').style.color = color;
  document.getElementById('strength-bar').style.width = score + '%';
  document.getElementById('strength-bar').style.background = barColor;
  document.getElementById('strength-score').textContent = pw.length > 0 ? `Score: ${score}/100` : '';

  // Entropy
  let charSpace = 0;
  if (/[a-z]/.test(pw)) charSpace += 26;
  if (/[A-Z]/.test(pw)) charSpace += 26;
  if (/[0-9]/.test(pw)) charSpace += 10;
  if (/[^A-Za-z0-9]/.test(pw)) charSpace += 32;
  const entropy = pw.length > 0 ? Math.round(pw.length * Math.log2(charSpace || 1)) : 0;
  document.getElementById('entropy-val').textContent = entropy;
  document.getElementById('crack-time').textContent = estimateCrackTime(entropy);

  // Save btn
  const saveBtn = document.getElementById('save-checked-btn');
  saveBtn.style.display = pw.length > 0 ? 'block' : 'none';
}

function estimateCrackTime(bits) {
  if (bits === 0) return '—';
  const combinations = Math.pow(2, bits);
  const guessesPerSec = 1e10; // modern GPU
  const seconds = combinations / guessesPerSec;
  if (seconds < 1) return 'Instant';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds/60)} min`;
  if (seconds < 86400) return `${Math.round(seconds/3600)} hrs`;
  if (seconds < 31536000) return `${Math.round(seconds/86400)} days`;
  if (seconds < 3153600000) return `${Math.round(seconds/31536000)} yrs`;
  return `${(seconds/3153600000).toExponential(1)} centuries`;
}

function toggleVisibility() {
  const inp = document.getElementById('pw-input');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function saveCheckedPassword() {
  if (!state.checkedPassword) return;
  if (!state.vaultUnlocked) {
    openVault(true);
    return;
  }
  promptSaveToVault(state.checkedPassword);
}

// ── Password Generator ──────────────────────────
function updateLength() {
  const v = document.getElementById('len-slider').value;
  document.getElementById('len-display').textContent = v;
}

function updateCount() {
  const v = document.getElementById('count-slider').value;
  document.getElementById('count-display').textContent = v;
}

function generatePasswords() {
  const len    = parseInt(document.getElementById('len-slider').value);
  const count  = parseInt(document.getElementById('count-slider').value);
  const upper  = document.getElementById('opt-upper').checked;
  const lower  = document.getElementById('opt-lower').checked;
  const num    = document.getElementById('opt-num').checked;
  const sym    = document.getElementById('opt-sym').checked;
  const noAmb  = document.getElementById('opt-noamb').checked;

  let chars = '';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (num)   chars += '0123456789';
  if (sym)   chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (noAmb) {
    chars = chars.replace(/[0O1lI]/g, '');
  }

  if (!chars) {
    showToast('⚠️ Select at least one character type!');
    return;
  }

  const list = document.getElementById('gen-list');
  list.innerHTML = '';

  for (let i = 0; i < count; i++) {
    let pw = '';
    for (let j = 0; j < len; j++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }

    const strength = getStrengthLevel(pw);
    const item = document.createElement('div');
    item.className = 'gen-item';
    item.innerHTML = `
      <span class="gen-pw-text">${pw}</span>
      <span class="gen-strength-badge badge-${strength.toLowerCase()}">${strength}</span>
      <div class="gen-actions">
        <button class="gen-copy-btn" onclick="copyText('${pw}', this)">📋 Copy</button>
        <button class="gen-save-btn" onclick="saveGenPassword('${pw}')">💾 Save</button>
      </div>
    `;
    list.appendChild(item);
  }
}

function getStrengthLevel(pw) {
  let score = 0;
  if (pw.length >= 8)             score += 20;
  if (/[A-Z]/.test(pw))          score += 15;
  if (/[a-z]/.test(pw))          score += 15;
  if (/[0-9]/.test(pw))          score += 15;
  if (/[^A-Za-z0-9]/.test(pw))   score += 20;
  if (pw.length >= 16)            score += 15;
  if (score < 35) return 'Weak';
  if (score < 70) return 'Medium';
  return 'Strong';
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
  showToast('📋 Copied to clipboard!');
}

function saveGenPassword(pw) {
  if (!state.vaultUnlocked) {
    openVault(false, pw);
    return;
  }
  promptSaveToVault(pw);
}

// ── Vault Auth ─────────────────────────────────
let _pendingVaultPw = null;

function openVault(fromChecker = false, pendingPw = null) {
  if (pendingPw) _pendingVaultPw = pendingPw;
  if (fromChecker) _pendingVaultPw = state.checkedPassword;

  if (state.vaultUnlocked) {
    showWindow('vault');
    renderVault();
    return;
  }
  document.getElementById('vault-lock').classList.remove('hidden');
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('pin-input').value = '';
}

function closeVaultLock() {
  document.getElementById('vault-lock').classList.add('hidden');
}

function biometricAuth() {
  const btn = document.getElementById('bio-btn');
  btn.classList.add('bio-scanning');
  btn.querySelector('.bio-icon').textContent = '🔍';

  // Simulate biometric scan
  setTimeout(() => {
    btn.classList.remove('bio-scanning');
    btn.querySelector('.bio-icon').textContent = '✅';

    // Use WebAuthn if available, else simulate
    if (window.PublicKeyCredential) {
      simulateBiometric();
    } else {
      simulateBiometric();
    }
  }, 1500);
}

function simulateBiometric() {
  // Simulate successful biometric after scan animation
  setTimeout(() => {
    unlockVault();
  }, 500);
}

function checkPinInput() {
  const pin = document.getElementById('pin-input').value;
  if (pin.length === 6) pinAuth();
}

function pinAuth() {
  const pin = document.getElementById('pin-input').value;
  if (pin === state.masterPin) {
    unlockVault();
  } else {
    document.getElementById('auth-error').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
    const inp = document.getElementById('pin-input');
    inp.style.borderColor = 'var(--weak)';
    setTimeout(() => inp.style.borderColor = '', 1500);
  }
}

function unlockVault() {
  state.vaultUnlocked = true;
  document.getElementById('vault-lock').classList.add('hidden');
  showToast('🔓 Vault unlocked!');

  if (_pendingVaultPw) {
    setTimeout(() => {
      promptSaveToVault(_pendingVaultPw);
      _pendingVaultPw = null;
    }, 300);
  } else {
    showWindow('vault');
    renderVault();
  }
}

function lockVault() {
  state.vaultUnlocked = false;
  closeWindow('win-vault');
  showToast('🔒 Vault locked!');
}

// ── Vault CRUD ─────────────────────────────────
function promptSaveToVault(pw) {
  showWindow('vault');
  renderVault();
  const labelInput = document.getElementById('vault-label');
  const pwInput    = document.getElementById('vault-pw');
  pwInput.value = pw;
  labelInput.focus();
  showToast('💡 Enter a label and click + Add!');
}

function addToVault() {
  const label = document.getElementById('vault-label').value.trim();
  const pw    = document.getElementById('vault-pw').value.trim();
  if (!label || !pw) {
    showToast('⚠️ Fill in both label and password!');
    return;
  }
  state.vault.push({ id: Date.now(), label, pw, hidden: true, date: new Date().toLocaleDateString() });
  saveVault();
  renderVault();
  document.getElementById('vault-label').value = '';
  document.getElementById('vault-pw').value = '';
  showToast('✅ Saved to vault!');
}

function removeFromVault(id) {
  state.vault = state.vault.filter(e => e.id !== id);
  saveVault();
  renderVault();
  showToast('🗑️ Removed from vault');
}

function toggleVaultEntry(id) {
  const entry = state.vault.find(e => e.id === id);
  if (entry) {
    entry.hidden = !entry.hidden;
    renderVault();
  }
}

function copyVaultEntry(pw) {
  navigator.clipboard.writeText(pw);
  showToast('📋 Password copied!');
}

function saveVault() {
  localStorage.setItem('passvault_entries', JSON.stringify(state.vault));
}

function filterVault() {
  const q = document.getElementById('vault-search').value.toLowerCase();
  renderVault(q);
}

function renderVault(filter = '') {
  const list = document.getElementById('vault-list');
  const entries = filter
    ? state.vault.filter(e => e.label.toLowerCase().includes(filter) || e.pw.includes(filter))
    : state.vault;

  document.getElementById('vault-count').textContent = `${state.vault.length} password${state.vault.length !== 1 ? 's' : ''} stored`;

  if (entries.length === 0) {
    list.innerHTML = `<div class="vault-empty">${filter ? 'No results found.' : 'No passwords saved yet. Add some!'}</div>`;
    return;
  }

  list.innerHTML = entries.map(entry => `
    <div class="vault-entry">
      <span class="vault-entry-label" title="${entry.label}">${entry.label}</span>
      <span class="vault-entry-pw ${entry.hidden ? 'hidden-pw' : ''}"
            id="vpw-${entry.id}">
        ${entry.hidden ? '••••••••••' : entry.pw}
      </span>
      <div class="vault-entry-actions">
        <button class="ve-btn" onclick="toggleVaultEntry(${entry.id})">${entry.hidden ? '👁' : '🙈'}</button>
        <button class="ve-btn" onclick="copyVaultEntry('${entry.pw.replace(/'/g,"\\'")}')">📋</button>
        <button class="ve-btn del" onclick="removeFromVault(${entry.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function exportVault() {
  const data = state.vault.map(e => `${e.label}: ${e.pw}`).join('\n');
  const blob = new Blob([data], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'passvault_export.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Vault exported!');
}

// ── Toast ───────────────────────────────────────
function showToast(msg, duration = 2500) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── Window click-to-focus ───────────────────────
document.addEventListener('mousedown', (e) => {
  const win = e.target.closest('.window');
  if (win) bringToFront(win);
});
