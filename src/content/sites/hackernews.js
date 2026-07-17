// Hacker News post detector
// Story rows on list pages (front/new/best) and comment rows on item pages
// both use <tr class="athing">, so Space steps through either.

(function (global) {
  'use strict';

  function getPosts() {
    return Array.from(document.querySelectorAll('tr.athing'));
  }

  function isValidPost(row) {
    // Skip collapsed comments (HN hides them with .noshow) and anything not rendered
    if (row.classList.contains('noshow')) return false;
    return row.offsetParent !== null;
  }

  function getPostTop(row) {
    const rect = row.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  function getPostId(row) {
    return row.id || null; // the row id IS the HN item id
  }

  function getHeaderOffset() {
    return 0; // HN's orange bar scrolls away; nothing sticky
  }

  const HNPlatform = {
    name: 'hackernews',
    getPosts,
    isValidPost,
    getPostTop,
    getPostId,
    getHeaderOffset
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('news.ycombinator.com', HNPlatform);
})(window);
