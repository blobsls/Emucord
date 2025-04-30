document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-plugin').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'openPluginModal'});
        });
    });

    document.getElementById('add-theme').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'openThemeModal'});
        });
    });

    // Load and display current plugins and themes
    chrome.storage.sync.get(['emucordPlugins', 'emucordThemes'], (result) => {
        const pluginList = document.getElementById('plugin-list');
        const themeList = document.getElementById('theme-list');
        
        if (result.emucordPlugins) {
            result.emucordPlugins.forEach(plugin => {
                const div = document.createElement('div');
                div.textContent = plugin.name;
                pluginList.appendChild(div);
            });
        }
        
        if (result.emucordThemes) {
            result.emucordThemes.forEach(theme => {
                const div = document.createElement('div');
                div.textContent = theme.name;
                themeList.appendChild(div);
            });
        }
    });
});
