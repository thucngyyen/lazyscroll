// Shared scroll engine, key listener, and storage sync
// Works with any Platform module registered in platforms.js

(function (global) {
  'use strict';

  const STORAGE_KEY = 'lazyscroll_settings';
  const DEFAULT_SETTINGS = {
    hotkey: ' ',           // Space
    reverseModifier: 'Shift',
    enabled: true
  };

  const SCROLL_DURATION = 250; // ms
  const INDICATOR_COLOR = '#7EB8A2'; // soft sage teal — easy on the eyes

  let settings = { ...DEFAULT_SETTINGS };
  let activeScrollRaf = null;
  let currentHighlight = null;

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
      }
    } catch (e) {
      console.warn('[LazyScroll] Failed to load settings:', e);
    }
  }

  function getPlatform() {
    return global.LazyScroll.getCurrent();
  }

  function getPosts() {
    const platform = getPlatform();
    if (!platform) return [];
    const posts = platform.getPosts();
    return posts.filter(p => platform.isValidPost(p));
  }

  function getPostTop(post) {
    const platform = getPlatform();
    if (!platform) return 0;
    return platform.getPostTop(post);
  }

  function getHeaderOffset() {
    const platform = getPlatform();
    if (!platform || typeof platform.getHeaderOffset !== 'function') return 0;
    return platform.getHeaderOffset();
  }

  function injectStyles() {
    if (document.getElementById('lazyscroll-styles')) return;
    const style = document.createElement('style');
    style.id = 'lazyscroll-styles';
    style.textContent = `.lazyscroll-current {
      box-shadow: inset 4px 0 0 0 ${INDICATOR_COLOR} !important;
      transition: box-shadow 0.2s ease !important;
    }`;
    document.head.appendChild(style);
  }

  function clearHighlight() {
    if (currentHighlight) {
      currentHighlight.classList.remove('lazyscroll-current');
      currentHighlight = null;
    }
  }

  function setHighlight(el) {
    clearHighlight();
    if (el) {
      el.classList.add('lazyscroll-current');
      currentHighlight = el;
    }
  }

  function getCurrentPostIndex(posts) {
    const scrollY = window.scrollY || window.pageYOffset;
    const offset = getHeaderOffset();
    const visualTop = scrollY + offset;
    const epsilon = 5;

    for (let i = 0; i < posts.length; i++) {
      const top = getPostTop(posts[i]);
      // If we're at or very near this post's visual top, the "current" post is this one
      if (Math.abs(top - visualTop) <= epsilon) {
        return i;
      }
      // If this post starts below the visual top, we're viewing the previous one
      if (top > visualTop + epsilon) {
        return Math.max(i - 1, 0);
      }
    }
    return posts.length - 1;
  }

  function smoothScrollTo(targetTop) {
    if (activeScrollRaf) {
      cancelAnimationFrame(activeScrollRaf);
      activeScrollRaf = null;
    }

    const startY = window.scrollY || window.pageYOffset;
    const diff = targetTop - startY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION, 1);
      // easeOutQuad
      const eased = progress * (2 - progress);
      window.scrollTo(0, startY + diff * eased);

      if (progress < 1) {
        activeScrollRaf = requestAnimationFrame(step);
      } else {
        activeScrollRaf = null;
      }
    }

    activeScrollRaf = requestAnimationFrame(step);
  }

  function scrollToIndex(index, posts) {
    if (index < 0 || index >= posts.length) return;
    const top = getPostTop(posts[index]);
    const offset = getHeaderOffset();
    smoothScrollTo(top - offset);
    setHighlight(posts[index]);
  }

  function goNext() {
    const posts = getPosts();
    if (!posts.length) return;
    const idx = getCurrentPostIndex(posts);
    const next = Math.min(idx + 1, posts.length - 1);
    scrollToIndex(next, posts);
  }

  function goPrev() {
    const posts = getPosts();
    if (!posts.length) return;
    const idx = getCurrentPostIndex(posts);
    const prev = Math.max(idx - 1, 0);
    scrollToIndex(prev, posts);
  }

  function onKeyDown(e) {
    if (!settings.enabled) return;
    if (e.key !== settings.hotkey) return;

    // Don't intercept if user is typing in an input/textarea/contenteditable
    const target = e.target;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;

    const reverse = settings.reverseModifier === 'Shift' && e.shiftKey;

    e.preventDefault();
    e.stopPropagation();

    if (reverse) {
      goPrev();
    } else {
      goNext();
    }
  }

  function init() {
    injectStyles();
    loadSettings().then(() => {
      document.addEventListener('keydown', onKeyDown, { capture: true });
    });

    // Re-sync settings when they change
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) {
        settings = { ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue };
      }
    });
  }

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.ScrollEngine = {
    init,
    loadSettings,
    goNext,
    goPrev,
    getSettings: () => ({ ...settings })
  };
})(window);
