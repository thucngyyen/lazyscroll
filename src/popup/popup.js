// Popup settings UI
const STORAGE_KEY = 'lazyscroll_settings';
const DEFAULT_SETTINGS = {
  hotkey: ' ',
  reverseModifier: 'Shift',
  enabled: true,
  scrollDuration: 400
};

const FEEDBACK_EMAIL = 'thucngyyen@gmail.com';
const COFFEE_URL = 'https://buymeacoffee.com/thucnguyen';

let settings = { ...DEFAULT_SETTINGS };
let capturing = false;

const els = {
  hotkeyDisplay: document.getElementById('hotkey-display'),
  captureBtn: document.getElementById('capture-btn'),
  captureHint: document.getElementById('capture-hint'),
  reverseToggle: document.getElementById('reverse-toggle'),
  enabledToggle: document.getElementById('enabled-toggle'),
  durationSelect: document.getElementById('duration-select'),
  resetBtn: document.getElementById('reset-btn'),
  status: document.getElementById('status'),
  feedbackLink: document.getElementById('feedback-link'),
  coffeeLink: document.getElementById('coffee-link')
};

function displayKey(key) {
  if (!key || key === ' ') return 'Space';
  if (key === 'Escape') return 'Esc';
  return key.length === 1 ? key.toUpperCase() : key;
}

async function load() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
  } catch (e) {
    showStatus('Failed to load settings', true);
  }
  render();
}

function render() {
  els.hotkeyDisplay.textContent = displayKey(settings.hotkey);
  els.reverseToggle.checked = settings.reverseModifier === 'Shift';
  els.enabledToggle.checked = settings.enabled;
  els.durationSelect.value = String(settings.scrollDuration);
}

async function save() {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    showStatus('Saved');
  } catch (e) {
    showStatus('Failed to save', true);
  }
}

function showStatus(msg, error = false) {
  els.status.textContent = msg;
  els.status.hidden = false;
  els.status.classList.toggle('error', error);
  setTimeout(() => { els.status.hidden = true; }, 2000);
}

function startCapture() {
  capturing = true;
  els.captureBtn.textContent = 'Cancel';
  els.captureHint.hidden = false;
  document.addEventListener('keydown', onCaptureKey, { capture: true });
}

function stopCapture() {
  capturing = false;
  els.captureBtn.textContent = 'Change';
  els.captureHint.hidden = true;
  document.removeEventListener('keydown', onCaptureKey, { capture: true });
}

function onCaptureKey(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Escape') {
    stopCapture();
    return;
  }
  settings.hotkey = e.key;
  save();
  render();
  stopCapture();
}

els.captureBtn.addEventListener('click', () => {
  if (capturing) stopCapture();
  else startCapture();
});

els.reverseToggle.addEventListener('change', () => {
  settings.reverseModifier = els.reverseToggle.checked ? 'Shift' : null;
  save();
});

els.enabledToggle.addEventListener('change', () => {
  settings.enabled = els.enabledToggle.checked;
  save();
});

els.durationSelect.addEventListener('change', () => {
  settings.scrollDuration = Number(els.durationSelect.value);
  save();
});

// mailto: is unreliable inside MV3 popups — open both links via tabs.create
els.feedbackLink.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Lazy Scroll feedback')}`;
els.coffeeLink.href = COFFEE_URL;
[els.feedbackLink, els.coffeeLink].forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: link.href });
  });
});

els.resetBtn.addEventListener('click', async () => {
  settings = { ...DEFAULT_SETTINGS };
  await save();
  render();
  showStatus('Reset to defaults');
});

load();
