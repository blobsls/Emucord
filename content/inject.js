// Load Emucord core into Discord's page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/emucord-core.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);
