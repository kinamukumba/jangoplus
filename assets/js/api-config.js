/**
 * Jango+ API Configuration & Session Helper
 *
 * This module patches window.fetch globally to:
 *  1. Resolve any relative `backend/api/` URL into an absolute URL that works
 *     regardless of which sub-directory the page lives in (root, /utente/, /admin/).
 *  2. Always send session cookies (credentials: 'include') so PHP $_SESSION works
 *     for both same-origin (localhost) and cross-origin (production) requests.
 *
 * URL resolution strategy:
 *  - On localhost / 127.0.0.1  → build an absolute URL using window.location.origin
 *    and the known root path of the project (/jangoplus/).
 *  - On production              → build an absolute URL using window.location.origin
 *    (assumes the project lives at the domain root, e.g. https://jangoplus.com/).
 *
 * All JS files should call fetch() with a path relative to the project root,
 * e.g. `../backend/api/users/me.php` or `backend/api/auth/login.php`.
 * This interceptor strips everything before `backend/api/` and re-resolves it.
 */
(function () {
    const PROD_API_BASE = ''; // Leave empty if backend lives at the same domain root

    /**
     * Derive the project root prefix on localhost.
     * For http://localhost/jangoplus/utente/dashboard.html → '/jangoplus/'
     */
    function getLocalhostRoot() {
        const segments = window.location.pathname.split('/').filter(Boolean);
        // The first segment after the domain is the XAMPP project folder name
        if (segments.length > 0) {
            return '/' + segments[0] + '/';
        }
        return '/';
    }

    /**
     * Given any URL that contains `backend/api/`, return an absolute URL
     * pointing to the correct server regardless of page depth.
     */
    function resolveApiUrl(url) {
        // Already absolute — don't touch it (except to add credentials later)
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Only process paths that are (or contain) backend/api/
        if (!url.includes('backend/api/')) {
            return url; // Not an API call — leave as-is
        }

        // Extract the `backend/api/...` portion, discarding any leading `../` or `./`
        const apiIndex = url.indexOf('backend/api/');
        const apiPath = url.substring(apiIndex); // e.g. "backend/api/users/me.php"

        const isLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        if (isLocalhost) {
            // e.g. http://localhost/jangoplus/backend/api/users/me.php
            const root = getLocalhostRoot();
            return window.location.origin + root + apiPath;
        } else {
            // Production: project lives at domain root
            // e.g. https://jangoplus.com/backend/api/users/me.php
            return window.location.origin + (PROD_API_BASE || '') + '/' + apiPath;
        }
    }

    const originalFetch = window.fetch;

    window.fetch = async function (resource, init) {
        let url = typeof resource === 'string' ? resource : resource.url;

        // Resolve the URL
        const resolvedUrl = resolveApiUrl(url);

        // Always send session cookies for our own backend
        init = init || {};
        if (!init.credentials) {
            init.credentials = 'include';
        }

        if (typeof resource === 'string') {
            return originalFetch(resolvedUrl, init);
        } else {
            // resource is a Request object — rebuild it with resolved URL
            return originalFetch(new Request(resolvedUrl, { ...resource, credentials: 'include' }), init);
        }
    };
})();
