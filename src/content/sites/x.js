// X (Twitter) post detector
// Detects only top-level tweets in the main timeline, excluding:
// - Promoted tweets
// - Reply threads nested under tweets
//
// Strategy: query all tweet articles on the page, then filter out
// promoted tweets and nested replies using isValidPost.

(function (global) {
  'use strict';

  function getPosts() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  }

  function isValidPost(article) {
    // Exclude promoted tweets
    const socialContext = article.querySelector('span[data-testid="socialContext"]');
    if (socialContext && socialContext.textContent.toLowerCase().includes('promoted')) {
      return false;
    }
    // Exclude nested replies — if this article lives inside another tweet article, it's a reply
    const parentTweet = article.parentElement && article.parentElement.closest('article[data-testid="tweet"]');
    if (parentTweet) {
      return false;
    }
    return true;
  }

  function getPostTop(article) {
    const rect = article.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  let cachedOffset = null;
  let cachedWidth = null;
  let cachedHeight = null;

  function getHeaderOffset() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (cachedOffset !== null && cachedWidth === w && cachedHeight === h) {
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
      if (rectTop > 200) return; // element is not visually near the top
      const rect = el.getBoundingClientRect();
      const spansCenter = rect.left < w / 2 && rect.right > w / 2;
      if (!spansCenter) return;
      headers.push(el);
    }

    // Likely candidates first
    document.querySelectorAll('header, [role="banner"], nav, [data-testid="primaryColumn"] > div')
      .forEach(collect);

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
    return total;
  }

  window.addEventListener('resize', () => {
    cachedOffset = null;
  });

  const XPlatform = {
    name: 'x',
    matches: ['twitter.com', 'x.com'],
    getPosts,
    isValidPost,
    getPostTop,
    getHeaderOffset
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('x.com', XPlatform);
  global.LazyScroll.register('twitter.com', XPlatform);
})(window);
