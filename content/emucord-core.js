class Emucord {
    constructor() {
        this.plugins = [];
        this.themes = [];
        this.settings = {
            autoUpdatePlugins: false,
            enableDevTools: false
        };
        
        this.init();
        this.setupMessageHandlers();
        this.setupMutationObserver();
        this.injectStyles();
    }

    init() {
        console.log('[Emucord] Initializing...');
        this.loadSettings().then(() => {
            this.loadSavedPlugins();
            this.loadSavedThemes();
            
            if (this.settings.enableDevTools) {
                this.setupDevTools();
            }
        });
    }

    setupMessageHandlers() {
        // Handle messages from the extension
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
        
        // Handle messages from the page
        window.addEventListener('message', (event) => {
            if (event.data && event.data.emucord) {
                this.handleMessage(event.data.emucord);
            }
        });
    }

    handleMessage(message) {
        console.log('[Emucord] Received message:', message);
        
        switch (message.action) {
            case 'addPlugin':
                this.addPlugin(message.plugin);
                break;
                
            case 'addTheme':
                this.addTheme(message.theme);
                break;
                
            case 'reloadPlugins':
                this.loadSavedPlugins();
                break;
                
            case 'reloadThemes':
                this.loadSavedThemes();
                break;
                
            case 'reloadAll':
                this.loadSavedPlugins();
                this.loadSavedThemes();
                break;
                
            case 'clearAll':
                this.clearAll();
                break;
                
            case 'updateSettings':
                this.updateSettings(message.settings);
                break;
                
            case 'getPluginAPI':
                return this.getPluginAPI();
        }
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['emucordSettings'], (result) => {
                if (result.emucordSettings) {
                    this.settings = {
                        ...this.settings,
                        ...result.emucordSettings
                    };
                }
                resolve();
            });
        });
    }

    loadSavedPlugins() {
        chrome.storage.sync.get(['emucordPlugins'], (result) => {
            if (result.emucordPlugins) {
                this.plugins = result.emucordPlugins;
                this.executePlugins();
            }
        });
    }

    loadSavedThemes() {
        chrome.storage.sync.get(['emucordThemes'], (result) => {
            if (result.emucordThemes) {
                this.themes = result.emucordThemes;
                this.applyThemes();
            }
        });
    }

    setupMutationObserver() {
        // Watch for DOM changes to reapply styles if needed
        const observer = new MutationObserver(() => {
            this.applyThemes();
            
            // Re-inject plugin API if needed
            if (document.getElementById('emucord-plugin-api')) {
                this.injectPluginAPI();
            }
        });
        
        observer.observe(document, { 
            childList: true, 
            subtree: true,
            attributes: true
        });
    }

    executePlugins() {
        // First clean up old plugins
        document.querySelectorAll('script.emucord-plugin').forEach(el => el.remove());
        
        // Execute all plugins
        this.plugins.forEach(plugin => {
            try {
                if (plugin.type === 'js') {
                    const script = document.createElement('script');
                    script.className = 'emucord-plugin';
                    script.textContent = `
                        (function() {
                            ${plugin.code}
                        })();
                    `;
                    document.head.appendChild(script);
                } else if (plugin.type === 'json') {
                    // Handle JSON plugin configuration
                    console.log('[Emucord] Loaded JSON plugin:', plugin.name);
                    this.handleJsonPlugin(plugin);
                }
            } catch (e) {
                console.error(`[Emucord] Error loading plugin ${plugin.name}:`, e);
            }
        });
    }

    handleJsonPlugin(plugin) {
        // Example JSON plugin handler - can be expanded based on your needs
        if (plugin.code.css) {
            const style = document.createElement('style');
            style.className = 'emucord-plugin-style';
            style.textContent = plugin.code.css;
            document.head.appendChild(style);
        }
        
        if (plugin.code.js) {
            const script = document.createElement('script');
            script.className = 'emucord-plugin';
            script.textContent = plugin.code.js;
            document.head.appendChild(script);
        }
    }

    applyThemes() {
        // Remove old theme styles
        document.querySelectorAll('style.emucord-theme').forEach(el => el.remove());
        
        // Apply all themes
        this.themes.forEach(theme => {
            const style = document.createElement('style');
            style.className = 'emucord-theme';
            style.textContent = theme.css;
            document.head.appendChild(style);
        });
    }

    injectStyles() {
        const style = document.createElement('style');
        style.className = 'emucord-base-styles';
        style.textContent = `
            /* Base styles for Emucord UI elements */
            .emucord-toolbar {
                position: fixed;
                bottom: 10px;
                right: 10px;
                z-index: 9999;
                background: #36393f;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .emucord-btn {
                background: #7289da;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    injectPluginAPI() {
        if (document.getElementById('emucord-plugin-api')) return;
        
        const script = document.createElement('script');
        script.id = 'emucord-plugin-api';
        script.textContent = `
            window.EmucordAPI = {
                version: '1.0',
                
                getCurrentUser: function() {
                    return window._state?.user;
                },
                
                getGuilds: function() {
                    return window._state?.guilds;
                },
                
                getChannels: function() {
                    return window._state?.channels;
                },
                
                showToast: function(message, type = 'info') {
                    window.postMessage({
                        emucord: {
                            action: 'showToast',
                            message: message,
                            type: type
                        }
                    }, '*');
                },
                
                registerCommand: function(command, callback) {
                    window.postMessage({
                        emucord: {
                            action: 'registerCommand',
                            command: command,
                            callback: callback.toString()
                        }
                    }, '*');
                },
                
                addStyle: function(css) {
                    const style = document.createElement('style');
                    style.textContent = css;
                    document.head.appendChild(style);
                    return style;
                }
            };
        `;
        document.head.appendChild(script);
    }

    getPluginAPI() {
        return {
            version: '1.0',
            showToast: (message, type) => this.showToast(message, type),
            getCurrentUser: () => this.getDiscordState().user,
            getGuilds: () => this.getDiscordState().guilds,
            getChannels: () => this.getDiscordState().channels
        };
    }

    getDiscordState() {
        // Try to access Discord's internal state
        return {
            user: window._state?.user || {},
            guilds: window._state?.guilds || {},
            channels: window._state?.channels || {}
        };
    }

    showToast(message, type = 'info') {
        // Implementation for showing toast notifications
        const toast = document.createElement('div');
        toast.className = `emucord-toast emucord-toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '10px 15px';
        toast.style.background = type === 'error' ? '#f04747' : '#7289da';
        toast.style.color = 'white';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '10000';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    addPlugin(plugin) {
        this.plugins.push(plugin);
        this.executePlugins([plugin]);
        this.savePlugins();
    }

    addTheme(theme) {
        this.themes.push(theme);
        this.applyThemes();
        this.saveThemes();
    }

    updateSettings(newSettings) {
        this.settings = {
            ...this.settings,
            ...newSettings
        };
        this.saveSettings();
        
        if (this.settings.enableDevTools) {
            this.setupDevTools();
        }
    }

    clearAll() {
        this.plugins = [];
        this.themes = [];
        this.savePlugins();
        this.saveThemes();
        document.querySelectorAll('style.emucord-theme, script.emucord-plugin').forEach(el => el.remove());
    }

    savePlugins() {
        chrome.storage.sync.set({ emucordPlugins: this.plugins });
    }

    saveThemes() {
        chrome.storage.sync.set({ emucordThemes: this.themes });
    }

    saveSettings() {
        chrome.storage.sync.set({ emucordSettings: this.settings });
    }

    setupDevTools() {
        if (!this.devToolsEnabled) {
            this.injectDevTools();
            this.devToolsEnabled = true;
        }
    }

    injectDevTools() {
        const toolbar = document.createElement('div');
        toolbar.className = 'emucord-toolbar';
        toolbar.innerHTML = `
            <button class="emucord-btn" id="emucord-reload">Reload</button>
            <button class="emucord-btn" id="emucord-open-options">Options</button>
        `;
        document.body.appendChild(toolbar);
        
        document.getElementById('emucord-reload').addEventListener('click', () => {
            this.loadSavedPlugins();
            this.loadSavedThemes();
            this.showToast('Emucord reloaded!');
        });
        
        document.getElementById('emucord-open-options').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openOptionsPage' });
        });
    }
}

// Initialize Emucord with enhanced safety
if (!window.EmucordInitialized) {
    window.EmucordInitialized = true;
    window.Emucord = new Emucord();
    
    // Inject plugin API after a short delay to ensure DOM is ready
    setTimeout(() => {
        window.Emucord.injectPluginAPI();
    }, 1000);
}
