// Instagram post detector
// Home feed posts are each wrapped in a top-level <article>. Profile/grid
// pages wrap the whole grid in one <article> instead of one per post, which
// harmlessly yields zero or one scroll step there rather than misbehaving.

(function (global) {
  'use strict';

  function getPosts() {
    return Array.from(document.querySelectorAll('article'));
  }

  function isValidPost(el) {
    // Exclude nested articles (e.g. a post rendered inside a comments/lightbox overlay)
    const parent = el.parentElement && el.parentElement.closest('article');
    if (parent) return false;
    // Sponsored label sits near the author header at the top of the post
    if (/sponsored/i.test(el.textContent.slice(0, 300))) return false;
    return el.offsetParent !== null;
  }

  function getPostTop(el) {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  function getPostId(el) {
    const a = el.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    return a ? a.getAttribute('href') : null;
  }

  function getHeaderOffset() {
    // Comfort padding: keeps the selected post from sitting flush under
    // Instagram's sticky top nav
    return global.LazyScroll.detectHeaderOffset() + 12;
  }

  const InstagramPlatform = {
    name: 'instagram',
    getPosts,
    isValidPost,
    getPostTop,
    getPostId,
    getHeaderOffset
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('instagram.com', InstagramPlatform);
})(window);
