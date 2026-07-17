// Reddit post detector — handles both UIs:
// - New Reddit (reddit.com, sh.reddit.com): <shreddit-post> web components;
//   ads are a separate <shreddit-ad-post> element so they're excluded for free
// - Old Reddit (old.reddit.com): #siteTable .thing rows

(function (global) {
  'use strict';

  function getPostTop(el) {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    return scrollY + rect.top;
  }

  const NewRedditPlatform = {
    name: 'reddit',
    getPosts() {
      return Array.from(document.querySelectorAll('shreddit-post'));
    },
    isValidPost(el) {
      if (el.closest('shreddit-ad-post')) return false;
      return el.offsetParent !== null;
    },
    getPostTop,
    getPostId(el) {
      return el.getAttribute('permalink') || el.id || null;
    },
    getHeaderOffset() {
      // Comfort padding: the search-bar header's drop shadow/border sits a few
      // px below its measured height and was clipping the selected post
      return global.LazyScroll.detectHeaderOffset(['reddit-header-large', 'reddit-header-small']) + 12;
    }
  };

  const OldRedditPlatform = {
    name: 'reddit-old',
    getPosts() {
      return Array.from(document.querySelectorAll('#siteTable > .thing.link'));
    },
    isValidPost(el) {
      return !el.classList.contains('promoted');
    },
    getPostTop,
    getPostId(el) {
      return el.getAttribute('data-fullname'); // e.g. "t3_abc123"
    },
    getHeaderOffset() {
      return 0; // old reddit's header is static
    }
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('reddit.com', NewRedditPlatform);
  global.LazyScroll.register('sh.reddit.com', NewRedditPlatform);
  global.LazyScroll.register('old.reddit.com', OldRedditPlatform);
})(window);
