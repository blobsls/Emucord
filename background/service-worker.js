// Message handling bridge between content script and page context
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.url && sender.url.includes('discord.com')) {
        // Forward messages to all Discord tabs
        chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id !== sender.tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'EMUCORD_FROM_EXTENSION',
                        payload: message
                    });
                }
            });
        });
        
        // Handle specific requests
        switch (message.action) {
            case 'getSettings':
                chrome.storage.sync.get(['emucordSettings'], (result) => {
                    sendResponse({
                        action: 'settingsResponse',
                        settings: result.emucordSettings || {}
                    });
                });
                return true; // Indicates we want to send a response asynchronously
                
            case 'getPlugins':
                chrome.storage.sync.get(['emucordPlugins'], (result) => {
                    sendResponse({
                        action: 'pluginsResponse',
                        plugins: result.emucordPlugins || []
                    });
                });
                return true;
                
            case 'getThemes':
                chrome.storage.sync.get(['emucordThemes'], (result) => {
                    sendResponse({
                        action: 'themesResponse',
                        themes: result.emucordThemes || []
                    });
                });
                return true;
        }
    }
});

// Send initialization response to all Discord tabs when extension starts
chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'EMUCORD_FROM_EXTENSION',
            payload: {
                action: 'initResponse'
            }
        });
    });
});
