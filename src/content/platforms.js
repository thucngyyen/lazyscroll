// Platform registry — maps hostnames to detector modules
// To add a new social media:
// 1. Create src/content/sites/<name>.js
// 2. Import/register it here

(function (global) {
  'use strict';

  const PLATFORMS = {};

  function register(hostname, platform) {
    PLATFORMS[hostname] = platform;
  }

  function getCurrent() {
    const host = location.hostname.replace(/^www\./, '');
    return PLATFORMS[host] || null;
  }

  // Generic fixed/sticky header auto-detect, shared by site modules whose
  // header height varies (X, Reddit, Bluesky). Sites with a static header
  // just return 0 from their own getHeaderOffset.
  let cachedOffset = null;
  let cachedWidth = null;
  let cachedHeight = null;
  let cachedAt = 0;

  // Short TTL: dedupes the several getHeaderOffset calls within one keypress,
  // but re-measures across presses — headers on Reddit/X hide and reappear as
  // you scroll, so a long-lived cache goes stale.
  const CACHE_TTL = 250; // ms

  function detectHeaderOffset(extraSelectors) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (cachedOffset !== null && cachedWidth === w && cachedHeight === h &&
        performance.now() - cachedAt < CACHE_TTL) {
      return cachedOffset;
    }

    const headers = [];

    function isViewportSticky(el) {
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        const style = window.getComputedStyle(cur);
        const overflow = style.overflow + style.overflowX + style.overflowY;
        if (/auto|scroll/.test(overflow) && cur.clientHeight < document.documentElement.clientHeight) {
          return false;
        }
        cur = cur.parentElement;
      }
      return true;
    }

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
    }

    function collect(el) {
      const style = window.getComputedStyle(el);
      if (!isVisible(el)) return;
      const pos = style.position;
      if (pos !== 'fixed' && pos !== 'sticky') return;
      if (pos === 'sticky' && !isViewportSticky(el)) return;
      let topVal = parseFloat(style.top);
      let rectTop = el.getBoundingClientRect().top;
      if (pos === 'fixed' && isNaN(topVal)) {
        topVal = rectTop;
      }
      if (isNaN(topVal)) return;
      if (topVal > 150) return; // allow stacked headers (tabs, sub-nav)
      if (el.offsetHeight <= 0) return;
      if (el.offsetHeight > h * 0.4) return; // full-viewport fixed overlays (Bluesky) are not headers
      if (rectTop > 200) return; // element is not visually near the top
      const rect = el.getBoundingClientRect();
      const spansCenter = rect.left < w / 2 && rect.right > w / 2;
      if (!spansCenter) return;
      headers.push(el);
    }

    // Likely candidates first
    const selectors = ['header', '[role="banner"]', 'nav'].concat(extraSelectors || []);
    document.querySelectorAll(selectors.join(', ')).forEach(collect);

    // Fallback broader scan near top of DOM
    if (headers.length === 0) {
      const all = document.body.querySelectorAll('*');
      for (let i = 0; i < Math.min(all.length, 800); i++) {
        collect(all[i]);
      }
    }

    // Remove nested elements to avoid double-counting
    const topLevel = headers.filter((el, _, arr) => {
      return !arr.some(other => other !== el && other.contains(el));
    });

    const total = topLevel.reduce((sum, el) => sum + el.offsetHeight, 0);

    cachedOffset = total;
    cachedWidth = w;
    cachedHeight = h;
    cachedAt = performance.now();
    return total;
  }

  window.addEventListener('resize', () => {
    cachedOffset = null;
  });

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register = register;
  global.LazyScroll.getCurrent = getCurrent;
  global.LazyScroll.detectHeaderOffset = detectHeaderOffset;
})(window);
