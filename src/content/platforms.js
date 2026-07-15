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

  global.LazyScroll = global.LazyScroll || {};
  global.LazyScroll.register = register;
  global.LazyScroll.getCurrent = getCurrent;
})(window);
