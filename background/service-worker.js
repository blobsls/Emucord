chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectPlugin') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'addPlugin',
                plugin: request.plugin
            });
        });
    }
    
    if (request.action === 'injectTheme') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'addTheme',
                theme: request.theme
            });
        });
    }
});
