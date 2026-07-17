// Bluesky post detector
// Feed rows carry data-testid="feedItem-by-<handle>"; thread pages use
// "postThreadItem-by-<handle>". The feed is virtualized, so the engine's
// post-ID tracking (permalink href) keeps position stable across recycling.

(function (global) {
  'use strict';

  const POST_SELECTOR = 'div[data-testid^="feedItem-by-"], div[data-testid^="postThreadItem-by-"]';

  function getPosts() {
    return Array.from(document.querySelectorAll(POST_SELECTOR));
  }

  function isValidPost(el) {
    // Exclude nested matches (e.g. embedded/quoted posts inside a feed item)
    const parent = el.parentElement && el.parentElement.closest(POST_SELECTOR);
    if (parent) return false;
    return el.offsetParent !== null;
  }

  function getPostTop(el) {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  function getPostId(el) {
    // Permalink looks like /profile/<handle>/post/<rkey>
    const a = el.querySelector('a[href*="/post/"]');
    return a ? a.getAttribute('href') : null;
  }

  function getHeaderOffset() {
    return global.LazyScroll.detectHeaderOffset();
  }

  const BlueskyPlatform = {
    name: 'bluesky',
    getPosts,
    isValidPost,
    getPostTop,
    getPostId,
    getHeaderOffset,
    // Post children paint opaque backgrounds that hide an inset box-shadow;
    // feed items are position:relative, so an absolute overlay bar works
    indicatorStyle: 'overlay'
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('bsky.app', BlueskyPlatform);
})(window);
