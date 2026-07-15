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

  const XPlatform = {
    name: 'x',
    matches: ['twitter.com', 'x.com'],
    getPosts,
    isValidPost,
    getPostTop
  };

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register('x.com', XPlatform);
  global.LazyScroll.register('twitter.com', XPlatform);
})(window);
