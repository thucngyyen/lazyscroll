// Site router — initializes the correct platform module and scroll engine
(function (global) {
  'use strict';

  function init() {
    const platform = global.LazyScroll.getCurrent();
    if (!platform) {
      console.log('[LazyScroll] No platform registered for', location.hostname);
      return;
    }
    console.log('[LazyScroll] Activated for', platform.name);
    global.LazyScroll.ScrollEngine.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
