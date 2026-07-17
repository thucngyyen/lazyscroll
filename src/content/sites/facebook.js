// Facebook post detector
// Current Facebook no longer wraps the home news feed in a role="feed"
// landmark — that role now appears on each post's COMMENT list, which is why
// feed-landmark detection locks onto comments instead of posts. Home-feed
// stories are instead marked with aria-posinset (position in the virtualized
// feed), so that's the primary hook. Group feeds still expose a real
// role="feed" landmark whose direct children are stories (fallback #1);
// permalink pages have a lone role="article" (fallback #2).
// Selector intel via zbluebugz/facebook-clean-my-feeds, which tracks FB's
// markup churn.

(function (global) {
  'use strict';

  const ARTICLE_SELECTOR = 'div[role="article"]';

  function getScopeRoot() {
    // Scope to the main column so right-rail / chat widgets never match
    return document.querySelector('div[role="main"]') || document.body;
  }

  function getPosts() {
    const root = getScopeRoot();

    // Home news feed: one aria-posinset per story. The stories/reels tray can
    // also carry posinset on its narrow cards, so keep only column-spanning
    // elements (feed posts are by far the widest candidates).
    const marked = Array.from(root.querySelectorAll('div[aria-posinset]'));
    if (marked.length) {
      const maxWidth = Math.max(...marked.map(el => el.getBoundingClientRect().width));
      return marked.filter(el => el.getBoundingClientRect().width >= maxWidth * 0.6);
    }

    // Group feeds: a real feed landmark whose direct children are stories.
    // Exclude comment lists (feeds living inside a post/article).
    const feeds = Array.from(root.querySelectorAll('div[role="feed"]'))
      .filter(f => !f.closest(ARTICLE_SELECTOR) && !f.closest('div[aria-posinset]'));
    if (feeds.length) {
      const feed = feeds.reduce((a, b) =>
        b.getBoundingClientRect().width > a.getBoundingClientRect().width ? b : a);
      return Array.from(feed.children);
    }

    // Single post / permalink pages: top-level articles only
    return Array.from(root.querySelectorAll(ARTICLE_SELECTOR)).filter(el =>
      !(el.parentElement && el.parentElement.closest(ARTICLE_SELECTOR)));
  }

  function isValidPost(el) {
    if (el.offsetParent === null) return false;
    // Sponsored label sits near the author header at the top of the post
    if (/sponsored/i.test(el.textContent.slice(0, 400))) return false;
    return true;
  }

  function getPostTop(el) {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  function getPostId(el) {
    // The feed is virtualized (FB empties far-offscreen stories), so a stable
    // ID matters. aria-posinset is unique per story and survives recycling.
    const pos = el.getAttribute('aria-posinset');
    if (pos) return 'posinset:' + pos;
    const a = el.querySelector('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"], a[href*="/videos/"]');
    return a ? a.getAttribute('href') : null;
  }

  function getHeaderOffset() {
    // Comfort padding: keeps the selected post clear of the sticky top nav's
    // shadow line
    return global.LazyScroll.detectHeaderOffset() + 12;
  }

  const FacebookPlatform = {
    name: 'facebook',
    getPosts,
    isValidPost,
    getPostTop,
    getPostId,
    getHeaderOffset
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('facebook.com', FacebookPlatform);
})(window);
