class PluginLoader {
    static loadFromURL(url) {
        return fetch(url)
            .then(response => {
                if (url.endsWith('.json')) {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                if (typeof data === 'object') {
                    return {
                        type: 'json',
                        name: data.name || 'Unnamed Plugin',
                        code: data
                    };
                } else {
                    return {
                        type: 'js',
                        name: 'Custom JS Plugin',
                        code: data
                    };
                }
            });
    }
}
