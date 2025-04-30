/**
 * Emucord Core - Discord customization framework
 * Runs in page context, isolated from extension APIs
 */
class Emucord {
    constructor(extensionId) {
        this.extensionId = extensionId;
        this.plugins = [];
        this.themes = [];
        this.settings = {
            autoUpdatePlugins: false,
            enableDevTools: false,
            injectAPI: true
        };
        
        this.messageQueue = [];
        this.isExtensionConnected = false;
        this.pluginAPIInjected = false;
        
        this.init();
        this.setupMessageHandlers();
        this.setupMutationObserver();
        this.injectBaseStyles();
    }

    async init() {
        console.log('[Emucord] Initializing...');
        await this.loadSettings();
        this.loadPlugins();
        this.loadThemes();
        
        if (this.settings.enableDevTools) {
            this.setupDevTools();
        }
        
        if (this.settings.injectAPI) {
            this.injectPluginAPI();
        }
    }

    // ========================
    // MESSAGE HANDLING SYSTEM
    // ========================
    
    setupMessageHandlers() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            // Handle messages from the extension bridge
            if (event.data.type === 'EMUCORD_FROM_EXTENSION') {
                this.handleExtensionMessage(event.data.payload);
            }
            
            // Handle messages from plugins
            if (event.data.emucord) {
                this.handlePluginMessage(event.data.emucord);
            }
        });
    }

    handleExtensionMessage(message) {
        console.debug('[Emucord] Extension message:', message);
        
        switch (message.action) {
            case 'initResponse':
                this.isExtensionConnected = true;
                this.processMessageQueue();
                break;
                
            case 'settingsResponse':
                this.settings = { ...this.settings, ...message.settings };
                this.applySettingsChanges();
                break;
                
            case 'pluginsResponse':
                this.plugins = message.plugins;
                this.executePlugins();
                break;
                
            case 'themesResponse':
                this.themes = message.themes;
                this.applyThemes();
                break;
                
            case 'showToast':
                this.showToast(message.text, message.type);
                break;
        }
    }

    handlePluginMessage(message) {
        console.debug('[Emucord] Plugin message:', message);
        
        switch (message.action) {
            case 'registerCommand':
                this.registerCommand(message.command, message.callback);
                break;
                
            case 'showToast':
                this.showToast(message.message, message.type);
                break;
                
            case 'getAPI':
                this.sendAPIResponse(message.requestId);
                break;
        }
    }

    sendToExtension(message) {
        const messageData = {
            type: 'EMUCORD_TO_EXTENSION',
            payload: message
        };
        
        if (this.isExtensionConnected) {
            window.postMessage(messageData, '*');
        } else {
            this.messageQueue.push(messageData);
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            window.postMessage(message, '*');
        }
    }

    // ========================
    // DATA LOADING/SAVING
    // ========================
    
    async loadSettings() {
        return new Promise((resolve) => {
            const requestId = Date.now().toString();
            
            const listener = (event) => {
                if (event.data.type === 'EMUCORD_FROM_EXTENSION' && 
                    event.data.payload.action === 'settingsResponse' &&
                    event.data.payload.requestId === requestId) {
                    window.removeEventListener('message', listener);
                    resolve();
                }
            };
            
            window.addEventListener('message', listener);
            this.sendToExtension({
                action: 'getSettings',
                requestId: requestId
            });
        });
    }

    loadPlugins() {
        this.sendToExtension({
            action: 'getPlugins'
        });
    }

    loadThemes() {
        this.sendToExtension({
            action: 'getThemes'
        });
    }

    saveSettings() {
        this.sendToExtension({
            action: 'saveSettings',
            settings: this.settings
        });
    }

    savePlugins() {
        this.sendToExtension({
            action: 'savePlugins',
            plugins: this.plugins
        });
    }

    saveThemes() {
        this.sendToExtension({
            action: 'saveThemes',
            themes: this.themes
        });
    }

    // ========================
    // PLUGIN SYSTEM
    // ========================
    
    executePlugins() {
        // Clean up old plugins
        document.querySelectorAll('script.emucord-plugin').forEach(el => el.remove());
        document.querySelectorAll('style.emucord-plugin-style').forEach(el => el.remove());
        
        // Execute all plugins
        this.plugins.forEach(plugin => {
            try {
                if (plugin.type === 'js') {
                    this.executeJsPlugin(plugin);
                } else if (plugin.type === 'json') {
                    this.executeJsonPlugin(plugin);
                } else if (plugin.type === 'css') {
                    this.executeCssPlugin(plugin);
                }
            } catch (e) {
                console.error(`[Emucord] Error loading plugin ${plugin.name}:`, e);
            }
        });
    }

    executeJsPlugin(plugin) {
        const script = document.createElement('script');
        script.className = 'emucord-plugin';
        script.textContent = `
            //# sourceURL=${plugin.name}.js
            (function(EmucordAPI) {
                try {
                    ${plugin.code}
                } catch(e) {
                    console.error('[Emucord] Plugin ${plugin.name} error:', e);
                }
            })(window.EmucordAPI);
        `;
        document.head.appendChild(script);
    }

    executeJsonPlugin(plugin) {
        try {
            const config = JSON.parse(plugin.code);
            
            if (config.css) {
                const style = document.createElement('style');
                style.className = 'emucord-plugin-style';
                style.textContent = config.css;
                document.head.appendChild(style);
            }
            
            if (config.js) {
                this.executeJsPlugin({
                    ...plugin,
                    type: 'js',
                    code: config.js
                });
            }
        } catch (e) {
            console.error(`[Emucord] Error parsing JSON plugin ${plugin.name}:`, e);
        }
    }

    executeCssPlugin(plugin) {
        const style = document.createElement('style');
        style.className = 'emucord-plugin-style';
        style.textContent = plugin.code;
        document.head.appendChild(style);
    }

    registerCommand(command, callback) {
        this.sendToExtension({
            action: 'registerCommand',
            command: command,
            callback: callback.toString()
        });
    }

    // ========================
    // THEME SYSTEM
    // ========================
    
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

    // ========================
    // PLUGIN API
    // ========================
    
    injectPluginAPI() {
        if (this.pluginAPIInjected) return;
        this.pluginAPIInjected = true;
        
        const script = document.createElement('script');
        script.id = 'emucord-plugin-api';
        script.textContent = `
            (function() {
                const requestId = Date.now();
                const callbacks = {};
                
                window.EmucordAPI = {
                    VERSION: '1.2.0',
                    
                    // Core API
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
                    },
                    
                    // Discord state access
                    getCurrentUser: function() {
                        return window._state?.user;
                    },
                    
                    getGuilds: function() {
                        return window._state?.guilds;
                    },
                    
                    getChannels: function() {
                        return window._state?.channels;
                    },
                    
                    // Promise-based API calls
                    call: function(method, ...args) {
                        return new Promise((resolve, reject) => {
                            const id = requestId + '-' + Math.random().toString(36).substr(2, 9);
                            callbacks[id] = { resolve, reject };
                            
                            window.postMessage({
                                emucord: {
                                    action: 'apiCall',
                                    callId: id,
                                    method: method,
                                    args: args
                                }
                            }, '*');
                        });
                    }
                };
                
                // Handle responses
                window.addEventListener('message', (event) => {
                    if (event.data.emucordResponse) {
                        const { callId, result, error } = event.data.emucordResponse;
                        if (callbacks[callId]) {
                            if (error) {
                                callbacks[callId].reject(error);
                            } else {
                                callbacks[callId].resolve(result);
                            }
                            delete callbacks[callId];
                        }
                    }
                });
            })();
        `;
        document.head.appendChild(script);
    }

    sendAPIResponse(requestId) {
        window.postMessage({
            emucordResponse: {
                callId: requestId,
                result: this.getPluginAPI()
            }
        }, '*');
    }

    getPluginAPI() {
        return {
            version: '1.2.0',
            showToast: (message, type) => this.showToast(message, type),
            getCurrentUser: () => this.getDiscordState().user,
            getGuilds: () => this.getDiscordState().guilds,
            getChannels: () => this.getDiscordState().channels,
            addStyle: (css) => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                return style;
            }
        };
    }

    getDiscordState() {
        try {
            return {
                user: window._state?.user || {},
                guilds: window._state?.guilds || {},
                channels: window._state?.channels || {},
                settings: window._state?.settings || {}
            };
        } catch (e) {
            console.warn('[Emucord] Error accessing Discord state:', e);
            return {};
        }
    }

    // ========================
    // UI COMPONENTS
    // ========================
    
    injectBaseStyles() {
        const style = document.createElement('style');
        style.className = 'emucord-base-styles';
        style.textContent = `
            .emucord-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 4px;
                color: white;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: emucord-toast-fadein 0.3s;
            }
            
            .emucord-toast-info {
                background: #7289da;
            }
            
            .emucord-toast-success {
                background: #43b581;
            }
            
            .emucord-toast-error {
                background: #f04747;
            }
            
            .emucord-toast-warning {
                background: #faa61a;
            }
            
            @keyframes emucord-toast-fadein {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .emucord-toolbar {
                position: fixed;
                bottom: 10px;
                right: 60px;
                z-index: 9999;
                background: #36393f;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: flex;
                gap: 4px;
            }
            
            .emucord-btn {
                background: #7289da;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .emucord-btn:hover {
                background: #677bc4;
            }
            
            .emucord-btn-danger {
                background: #f04747;
            }
            
            .emucord-btn-danger:hover {
                background: #d84040;
            }
        `;
        document.head.appendChild(style);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `emucord-toast emucord-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'emucord-toast-fadein 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setupDevTools() {
        if (document.getElementById('emucord-devtools')) return;
        
        const toolbar = document.createElement('div');
        toolbar.id = 'emucord-devtools';
        toolbar.className = 'emucord-toolbar';
        toolbar.innerHTML = `
            <button class="emucord-btn" id="emucord-reload">Reload</button>
            <button class="emucord-btn" id="emucord-open-options">Options</button>
            <button class="emucord-btn emucord-btn-danger" id="emucord-clear">Clear</button>
        `;
        document.body.appendChild(toolbar);
        
        document.getElementById('emucord-reload').addEventListener('click', () => {
            this.loadPlugins();
            this.loadThemes();
            this.showToast('Emucord reloaded!', 'success');
        });
        
        document.getElementById('emucord-open-options').addEventListener('click', () => {
            this.sendToExtension({ action: 'openOptionsPage' });
        });
        
        document.getElementById('emucord-clear').addEventListener('click', () => {
            if (confirm('Clear all Emucord plugins and themes?')) {
                this.sendToExtension({ action: 'clearAll' });
                this.showToast('Cleared all plugins and themes', 'success');
            }
        });
    }

    applySettingsChanges() {
        if (this.settings.enableDevTools) {
            this.setupDevTools();
        } else {
            const devTools = document.getElementById('emucord-devtools');
            if (devTools) devTools.remove();
        }
        
        if (this.settings.injectAPI && !this.pluginAPIInjected) {
            this.injectPluginAPI();
        } else if (!this.settings.injectAPI && this.pluginAPIInjected) {
            const apiScript = document.getElementById('emucord-plugin-api');
            if (apiScript) apiScript.remove();
            this.pluginAPIInjected = false;
        }
    }

    // ========================
    // MUTATION OBSERVER
    // ========================
    
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            // Re-inject API if needed
            if (this.settings.injectAPI && !document.getElementById('emucord-plugin-api')) {
                this.injectPluginAPI();
            }
            
            // Re-apply themes if head changes
            if (mutations.some(m => m.target.nodeName === 'HEAD')) {
                this.applyThemes();
            }
        });
        
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }
}

// Initialize Emucord safely
if (!window.EmucordInitialized) {
    window.EmucordInitialized = true;
    
    const initListener = (event) => {
        if (event.data.type === 'EMUCORD_INIT') {
            window.removeEventListener('message', initListener);
            window.Emucord = new Emucord(event.data.payload.extensionId);
        }
    };
    
    window.addEventListener('message', initListener);
}
