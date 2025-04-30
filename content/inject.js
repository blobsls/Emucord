// This runs in the content script context (has access to chrome APIs)
function injectEmucord() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/emucord-core.js');
    script.onload = function() {
        // Send initialization data to the page context
        window.postMessage({
            type: 'EMUCORD_INIT',
            payload: {
                extensionId: chrome.runtime.id
            }
        }, '*');
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from the page context
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type && event.data.type === 'EMUCORD_TO_EXTENSION') {
        chrome.runtime.sendMessage(event.data.payload);
    }
});

// Start injection
injectEmucord();
