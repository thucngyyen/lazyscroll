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

    function collect(el) {
      const style = window.getComputedStyle(el);
      const pos = style.position;
      if (pos !== 'fixed' && pos !== 'sticky') return;
      const topVal = parseFloat(style.top);
      if (isNaN(topVal) || topVal > 5) return;
      if (el.offsetHeight <= 0) return;
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
      for (let i = 0; i < Math.min(all.length, 400); i++) {
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
