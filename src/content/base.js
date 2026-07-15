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

  let settings = { ...DEFAULT_SETTINGS };

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

  function getPosts() {
    const platform = global.LazyScroll.getCurrent();
    if (!platform) return [];
    const posts = platform.getPosts();
    return posts.filter(p => platform.isValidPost(p));
  }

  function getPostTop(post) {
    const platform = global.LazyScroll.getCurrent();
    if (!platform) return 0;
    return platform.getPostTop(post);
  }

  function getCurrentPostIndex(posts) {
    const scrollY = window.scrollY || window.pageYOffset;
    const epsilon = 5;

    for (let i = 0; i < posts.length; i++) {
      const top = getPostTop(posts[i]);
      // If we're at or very near this post's top, the "current" post is this one
      if (Math.abs(top - scrollY) <= epsilon) {
        return i;
      }
      // If this post starts below the current scroll, we're viewing the previous one
      if (top > scrollY + epsilon) {
        return Math.max(i - 1, 0);
      }
    }
    return posts.length - 1;
  }

  function scrollToIndex(index, posts) {
    if (index < 0 || index >= posts.length) return;
    const top = getPostTop(posts[index]);
    window.scrollTo({ top, behavior: 'smooth' });
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
