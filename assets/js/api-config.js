/**
 * Jango+ API Configuration & CORS Helper
 * Overrides the global fetch to rewrite relative URLs and ensure credentials (session cookies) are sent.
 */
(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        let url = typeof resource === 'string' ? resource : resource.url;
        
        // Rewrite relative backend/api paths to the production backend on api.plucianoadvogados.com
        if (url.includes('backend/api/')) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                const index = url.indexOf('backend/api/');
                const path = url.substring(index);
                url = 'https://api.plucianoadvogados.com/' + path;
            }
        }
        
        // Ensure credentials are included for our backend domain to support PHP session cookies
        if (url.includes('api.plucianoadvogados.com') || url.includes('backend/api/')) {
            init = init || {};
            // Set credentials: 'include' to allow cookies in cross-origin requests
            init.credentials = 'include';
        }
        
        if (typeof resource === 'string') {
            return originalFetch(url, init);
        } else {
            const newRequest = new Request(url, resource);
            init = init || {};
            init.credentials = 'include';
            return originalFetch(newRequest, init);
        }
    };
})();
