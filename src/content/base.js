// Shared scroll engine, key listener, and storage sync
// Works with any Platform module registered in platforms.js

(function (global) {
  'use strict';

  const STORAGE_KEY = 'lazyscroll_settings';
  const DEFAULT_SETTINGS = {
    hotkey: ' ',           // Space
    reverseModifier: 'Shift',
    enabled: true,
    scrollDuration: 400    // ms; 0 = instant
  };

  const INDICATOR_COLOR = '#7EB8A2'; // soft sage teal — easy on the eyes

  let settings = { ...DEFAULT_SETTINGS };
  let activeScrollRaf = null;
  let currentHighlight = null;
  let currentPostId = null;

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

  function getPostId(post) {
    const platform = getPlatform();
    if (!platform || typeof platform.getPostId !== 'function') return null;
    return platform.getPostId(post);
  }

  function injectStyles() {
    if (document.getElementById('lazyscroll-styles')) return;
    const style = document.createElement('style');
    style.id = 'lazyscroll-styles';
    style.textContent = `.lazyscroll-current {
      box-shadow: inset 4px 0 0 0 ${INDICATOR_COLOR} !important;
      transition: box-shadow 0.2s ease !important;
    }
    /* box-shadow doesn't render on table rows (Hacker News) — paint the first cell instead */
    tr.lazyscroll-current {
      box-shadow: none !important;
    }
    tr.lazyscroll-current > td:first-child {
      box-shadow: inset 4px 0 0 0 ${INDICATOR_COLOR} !important;
      transition: box-shadow 0.2s ease !important;
    }
    /* Overlay bar for posts whose children paint opaque backgrounds over an
       inset shadow (Bluesky) — requires the post element to be positioned */
    .lazyscroll-current.lazyscroll-overlay {
      box-shadow: none !important;
    }
    .lazyscroll-current.lazyscroll-overlay::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: ${INDICATOR_COLOR};
      z-index: 9999;
      pointer-events: none;
    }`;
    document.head.appendChild(style);
  }

  function clearHighlight() {
    if (currentHighlight) {
      currentHighlight.classList.remove('lazyscroll-current', 'lazyscroll-overlay');
      currentHighlight = null;
    }
  }

  function setHighlight(el) {
    clearHighlight();
    if (el) {
      el.classList.add('lazyscroll-current');
      const platform = getPlatform();
      if (platform && platform.indicatorStyle === 'overlay') {
        el.classList.add('lazyscroll-overlay');
      }
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

    // Clamp to what the page can actually scroll — animating toward an
    // unreachable target (past the page bottom) just burns frames
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetTop = Math.min(Math.max(0, targetTop), maxScroll);

    const startY = window.scrollY || window.pageYOffset;
    const diff = targetTop - startY;
    if (Math.abs(diff) < 1) return; // already there — skip the animation

    const duration = settings.scrollDuration;
    if (!duration || duration <= 0) {
      window.scrollTo(0, targetTop);
      return;
    }
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
    currentPostId = getPostId(posts[index]);
  }

  // Virtualized feeds (X, Bluesky) unmount off-screen posts, so a bare index is
  // unstable across keypresses. Prefer the remembered post ID — but only if that
  // post is still near the viewport top, so manual scrolling falls back cleanly
  // to position-based detection.
  const ID_MATCH_TOLERANCE = 40; // px

  // Near the end of the page, scrolling clamps and the target post can never
  // reach the viewport top — position checks would stall there forever.
  function isScrollClampedAtBottom() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return (window.scrollY || window.pageYOffset) >= maxScroll - 2;
  }

  function resolveCurrentIndex(posts) {
    if (currentPostId) {
      const i = posts.findIndex(p => getPostId(p) === currentPostId);
      if (i !== -1) {
        const visualTop = (window.scrollY || window.pageYOffset) + getHeaderOffset();
        const nearTop = Math.abs(getPostTop(posts[i]) - visualTop) <= ID_MATCH_TOLERANCE;
        if (nearTop || isScrollClampedAtBottom()) {
          if (posts[i] !== currentHighlight) {
            setHighlight(posts[i]); // element was recycled; re-apply
          }
          return i;
        }
      }
    }
    return getCurrentPostIndex(posts);
  }

  function goNext() {
    const posts = getPosts();
    if (!posts.length) return;
    const idx = resolveCurrentIndex(posts);
    const next = Math.min(idx + 1, posts.length - 1);
    scrollToIndex(next, posts);
  }

  function goPrev() {
    const posts = getPosts();
    if (!posts.length) return;
    const idx = resolveCurrentIndex(posts);
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
