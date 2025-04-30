class Emucord {
    constructor() {
        this.plugins = [];
        this.themes = [];
        this.init();
    }

    init() {
        console.log('[Emucord] Initializing...');
        this.loadSavedPlugins();
        this.loadSavedThemes();
        this.setupMutationObserver();
    }

    loadSavedPlugins() {
        // Load plugins from storage
        chrome.storage.sync.get(['emucordPlugins'], (result) => {
            if (result.emucordPlugins) {
                this.plugins = result.emucordPlugins;
                this.executePlugins();
            }
        });
    }

    loadSavedThemes() {
        // Load themes from storage
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
        });
        observer.observe(document, { childList: true, subtree: true });
    }

    executePlugins() {
        this.plugins.forEach(plugin => {
            try {
                if (plugin.type === 'js') {
                    const script = document.createElement('script');
                    script.textContent = plugin.code;
                    document.head.appendChild(script);
                } else if (plugin.type === 'json') {
                    // Handle JSON plugin configuration
                    console.log('Loaded JSON plugin:', plugin);
                }
            } catch (e) {
                console.error(`[Emucord] Error loading plugin ${plugin.name}:`, e);
            }
        });
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

    savePlugins() {
        chrome.storage.sync.set({ emucordPlugins: this.plugins });
    }

    saveThemes() {
        chrome.storage.sync.set({ emucordThemes: this.themes });
    }
}

// Initialize Emucord
window.Emucord = new Emucord();
