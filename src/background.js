// Background service worker — minimal, mainly for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ ok: true });
  }
  return true;
});
