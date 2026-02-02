// Simple SPA Navigation - intercepts page navigation to keep URL unchanged
// Author: Tyler (in real life)

class SimpleNavigation {
    constructor() {
        this.isLoading = false;
        this.init();
    }

    init() {
        // Bind navigation events
        this.bindNavigationEvents();
    }

    bindNavigationEvents() {
        // Intercept all navigation clicks
        document.addEventListener('click', (e) => {
            // Check for navigation links (but exclude external links)
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.href.startsWith('http') && !link.target) {
                e.preventDefault();
                
                const href = link.getAttribute('href');
                this.loadPage(href);
            }

            // Handle floating home button
            if (e.target.closest('.floating-home')) {
                e.preventDefault();
                this.loadPage('index.html');
            }
        });
    }

    async loadPage(pageUrl) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            this.showLoadingState();
            
            // Fetch the page content
            const response = await fetch(pageUrl);
            const html = await response.text();
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the body content
            const newBody = doc.body;
            const newTitle = doc.title;
            
            // Update the page title
            document.title = newTitle;
            
            // Replace body content with smooth transition
            this.replaceContent(newBody);
            
            // Update meta tags
            this.updateMetaTags(doc);
            
            // Reinitialize scripts after content change
            setTimeout(() => {
                this.reinitializeScripts();
            }, 100);
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        } catch (error) {
            console.error('Failed to load page:', error);
        } finally {
            this.hideLoadingState();
            this.isLoading = false;
        }
    }

    replaceContent(newBody) {
        // Fade out current content
        document.body.style.transition = 'opacity 0.2s ease';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            // Replace content
            document.body.innerHTML = newBody.innerHTML;
            
            // Add back the transition and fade in
            document.body.style.transition = 'opacity 0.3s ease';
            document.body.style.opacity = '1';
            
            // Remove transition after animation
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        }, 200);
    }

    updateMetaTags(doc) {
        // Update meta description
        const newMetaDesc = doc.querySelector('meta[name="description"]');
        const currentMetaDesc = document.querySelector('meta[name="description"]');
        if (newMetaDesc && currentMetaDesc) {
            currentMetaDesc.content = newMetaDesc.content;
        }

        // Update og:title
        const newOgTitle = doc.querySelector('meta[property="og:title"]');
        const currentOgTitle = document.querySelector('meta[property="og:title"]');
        if (newOgTitle && currentOgTitle) {
            currentOgTitle.content = newOgTitle.content;
        }

        // Update og:description
        const newOgDesc = doc.querySelector('meta[property="og:description"]');
        const currentOgDesc = document.querySelector('meta[property="og:description"]');
        if (newOgDesc && currentOgDesc) {
            currentOgDesc.content = newOgDesc.content;
        }

        // Update og:url (keep it as base URL)
        const currentOgUrl = document.querySelector('meta[property="og:url"]');
        if (currentOgUrl) {
            currentOgUrl.content = 'https://tylerirl.com/';
        }
    }

    reinitializeScripts() {
        // Reinitialize effects
        if (typeof createScanline === 'function') {
            createScanline();
        }

        // Reinitialize interactions
        if (typeof initializeInteractions === 'function') {
            initializeInteractions();
        }

        // Reinitialize any page-specific JavaScript that might be inline
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
            try {
                eval(script.textContent);
            } catch (e) {
                console.log('Script execution skipped:', e);
            }
        });
    }

    showLoadingState() {
        // Add subtle loading indicator
        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, #8be9fd, #ff79c6, #8be9fd);
                background-size: 200% 100%;
                animation: loadingBar 1s ease-in-out infinite;
                z-index: 10001;
            "></div>
            <style>
                @keyframes loadingBar {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            </style>
        `;
        document.body.appendChild(loader);
    }

    hideLoadingState() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.animation = 'none';
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 200);
        }
    }
}

// Initialize simple navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the main domain
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.simpleNav = new SimpleNavigation();
    }
});