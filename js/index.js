/* Page scripts for index.html (extracted from inline <script> blocks, in original order) */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

// Live RemiliaNET profile stats in the Host dossier
(function() {
    const box = document.getElementById('reminet-stats');
    if (!box) return;

    const fmt = (n) => {
        if (typeof n !== 'number' || !isFinite(n)) return '—';
        if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
        return String(n);
    };

    fetch('https://www.remilia.net/api/v1/users/tyler')
        .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
        .then((data) => {
            const u = data && data.user;
            if (!u) throw new Error('no user');
            let any = false;
            box.querySelectorAll('[data-stat]').forEach((el) => {
                const v = u[el.dataset.stat];
                if (typeof v === 'number') { el.textContent = fmt(v); any = true; }
            });
            if (any) {
                box.hidden = false;
                requestAnimationFrame(() => box.classList.add('ready'));
            }
        })
        .catch((e) => {
            box.classList.add('offline');
            console.log('RemiliaNET stats unavailable:', e.message);
        });
})();
