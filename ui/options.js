document.addEventListener('DOMContentLoaded', () => {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Load plugins and themes
    loadPlugins();
    loadThemes();
    
    // Plugin management
    document.getElementById('add-plugin').addEventListener('click', addPlugin);
    document.getElementById('load-plugin-url').addEventListener('click', loadPluginFromURL);
    
    // Theme management
    document.getElementById('add-theme').addEventListener('click', addTheme);
    document.getElementById('load-theme-url').addEventListener('click', loadThemeFromURL);
    
    // Settings
    document.getElementById('export-settings').addEventListener('click', exportSettings);
    document.getElementById('import-settings').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importSettings);
    document.getElementById('reset-all').addEventListener('click', resetSettings);
    
    // Load settings
    loadSettings();
    
    // Functions
    function loadPlugins() {
        chrome.storage.sync.get(['emucordPlugins'], (result) => {
            const pluginList = document.getElementById('plugin-list');
            pluginList.innerHTML = '';
            
            if (result.emucordPlugins && result.emucordPlugins.length > 0) {
                result.emucordPlugins.forEach((plugin, index) => {
                    const pluginDiv = document.createElement('div');
                    pluginDiv.className = 'plugin';
                    
                    pluginDiv.innerHTML = `
                        <h3>${plugin.name}</h3>
                        <div class="plugin-actions">
                            <button class="danger" data-index="${index}">Remove</button>
                        </div>
                        <p>Type: ${plugin.type}</p>
                    `;
                    
                    pluginList.appendChild(pluginDiv);
                });
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.plugin-actions button').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        removePlugin(index);
                    });
                });
            } else {
                pluginList.innerHTML = '<p>No plugins installed.</p>';
            }
        });
    }
    
    function loadThemes() {
        chrome.storage.sync.get(['emucordThemes'], (result) => {
            const themeList = document.getElementById('theme-list');
            themeList.innerHTML = '';
            
            if (result.emucordThemes && result.emucordThemes.length > 0) {
                result.emucordThemes.forEach((theme, index) => {
                    const themeDiv = document.createElement('div');
                    themeDiv.className = 'theme';
                    
                    themeDiv.innerHTML = `
                        <h3>${theme.name}</h3>
                        <div class="theme-actions">
                            <button class="danger" data-index="${index}">Remove</button>
                        </div>
                        <p><small>${theme.css.length} characters</small></p>
                    `;
                    
                    themeList.appendChild(themeDiv);
                });
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.theme-actions button').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        removeTheme(index);
                    });
                });
            } else {
                themeList.innerHTML = '<p>No themes installed.</p>';
            }
        });
    }
    
    function loadSettings() {
        chrome.storage.sync.get(['emucordSettings'], (result) => {
            if (result.emucordSettings) {
                document.getElementById('auto-update-plugins').checked = 
                    result.emucordSettings.autoUpdatePlugins || false;
            }
        });
    }
    
    function addPlugin() {
        const code = document.getElementById('plugin-code').value.trim();
        const name = document.getElementById('plugin-name').value.trim() || 'Unnamed Plugin';
        
        if (!code) {
            alert('Please enter plugin code');
            return;
        }
        
        // Determine plugin type
        let type = 'js';
        try {
            JSON.parse(code);
            type = 'json';
        } catch (e) {}
        
        const plugin = {
            name,
            type,
            code
        };
        
        chrome.storage.sync.get(['emucordPlugins'], (result) => {
            const plugins = result.emucordPlugins || [];
            plugins.push(plugin);
            
            chrome.storage.sync.set({ emucordPlugins: plugins }, () => {
                document.getElementById('plugin-code').value = '';
                document.getElementById('plugin-name').value = '';
                loadPlugins();
                
                // Notify content script to reload plugins
                chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: 'reloadPlugins'});
                    });
                });
            });
        });
    }
    
    function loadPluginFromURL() {
        const url = document.getElementById('plugin-url').value.trim();
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        
        fetch(url)
            .then(response => {
                if (response.ok) return response.text();
                throw new Error('Network response was not ok');
            })
            .then(text => {
                document.getElementById('plugin-code').value = text;
                
                // Try to extract name from URL
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                document.getElementById('plugin-name').value = fileName.split('.')[0] || 'Imported Plugin';
            })
            .catch(error => {
                alert('Error loading plugin: ' + error.message);
            });
    }
    
    function removePlugin(index) {
        chrome.storage.sync.get(['emucordPlugins'], (result) => {
            const plugins = result.emucordPlugins || [];
            plugins.splice(index, 1);
            
            chrome.storage.sync.set({ emucordPlugins: plugins }, () => {
                loadPlugins();
                
                // Notify content script to reload plugins
                chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: 'reloadPlugins'});
                    });
                });
            });
        });
    }
    
    function addTheme() {
        const css = document.getElementById('theme-css').value.trim();
        const name = document.getElementById('theme-name').value.trim() || 'Unnamed Theme';
        
        if (!css) {
            alert('Please enter CSS');
            return;
        }
        
        const theme = {
            name,
            css
        };
        
        chrome.storage.sync.get(['emucordThemes'], (result) => {
            const themes = result.emucordThemes || [];
            themes.push(theme);
            
            chrome.storage.sync.set({ emucordThemes: themes }, () => {
                document.getElementById('theme-css').value = '';
                document.getElementById('theme-name').value = '';
                loadThemes();
                
                // Notify content script to reload themes
                chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: 'reloadThemes'});
                    });
                });
            });
        });
    }
    
    function loadThemeFromURL() {
        const url = document.getElementById('theme-url').value.trim();
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        
        fetch(url)
            .then(response => {
                if (response.ok) return response.text();
                throw new Error('Network response was not ok');
            })
            .then(text => {
                document.getElementById('theme-css').value = text;
                
                // Try to extract name from URL
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                document.getElementById('theme-name').value = fileName.split('.')[0] || 'Imported Theme';
            })
            .catch(error => {
                alert('Error loading theme: ' + error.message);
            });
    }
    
    function removeTheme(index) {
        chrome.storage.sync.get(['emucordThemes'], (result) => {
            const themes = result.emucordThemes || [];
            themes.splice(index, 1);
            
            chrome.storage.sync.set({ emucordThemes: themes }, () => {
                loadThemes();
                
                // Notify content script to reload themes
                chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: 'reloadThemes'});
                    });
                });
            });
        });
    }
    
    function exportSettings() {
        chrome.storage.sync.get(null, (result) => {
            const data = {
                plugins: result.emucordPlugins || [],
                themes: result.emucordThemes || [],
                settings: result.emucordSettings || {}
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'emucord-backup.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    
    function importSettings() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const toSave = {};
                
                if (data.plugins) toSave.emucordPlugins = data.plugins;
                if (data.themes) toSave.emucordThemes = data.themes;
                if (data.settings) toSave.emucordSettings = data.settings;
                
                chrome.storage.sync.set(toSave, () => {
                    alert('Settings imported successfully!');
                    loadPlugins();
                    loadThemes();
                    loadSettings();
                    
                    // Notify content script to reload everything
                    chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {action: 'reloadAll'});
                        });
                    });
                });
            } catch (error) {
                alert('Error importing settings: ' + error.message);
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    }
    
    function resetSettings() {
        if (confirm('Are you sure you want to reset all Emucord settings? This cannot be undone.')) {
            chrome.storage.sync.clear(() => {
                alert('All settings have been reset.');
                loadPlugins();
                loadThemes();
                loadSettings();
                
                // Notify content script to clear everything
                chrome.tabs.query({url: "*://*.discord.com/*"}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: 'clearAll'});
                    });
                });
            });
        }
    }
    
    // Save settings when they change
    document.getElementById('auto-update-plugins').addEventListener('change', (e) => {
        chrome.storage.sync.set({
            emucordSettings: {
                autoUpdatePlugins: e.target.checked
            }
        });
    });
});
