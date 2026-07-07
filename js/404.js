/* Page scripts for 404.html (extracted from inline <script> blocks, in original order) */
// Show the requested path
try {
    const path = (location.pathname || '/') + (location.search || '');
    document.getElementById('lost-path').textContent = path;
} catch (_) { /* ignore */ }

// Sequence: brackets collapse inward, then panel reveals
requestAnimationFrame(() => {
    document.body.classList.add('collapsed');
    setTimeout(() => {
        document.body.classList.add('revealed');
    }, 1700);
});

// Return portal: collapse the viewport back before navigating
document.getElementById('return-portal').addEventListener('click', function(e) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // let it navigate immediately
    e.preventDefault();
    const panel = document.querySelector('.panel-404');
    if (panel) {
        panel.style.transition = 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
        panel.style.opacity = '0';
        panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }
    setTimeout(() => { window.location.href = 'https://tylerirl.com/'; }, 450);
});
