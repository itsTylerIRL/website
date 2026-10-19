/* Page script for cornhub.html: click-to-copy for the $CORN contract address. */
(function() {
    const btn = document.querySelector('.corn-ca');
    if (!btn) return;
    const label = btn.querySelector('.corn-ca-copy');
    const copied = () => {
        btn.classList.add('copied');
        label.textContent = 'COPIED';
        setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'COPY'; }, 1500);
    };
    // Fallback: temporary textarea + execCommand (non-secure contexts, or the clipboard API refusing)
    const legacyCopy = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { if (document.execCommand('copy')) copied(); } catch (e) { console.error('Copy failed:', e); }
        ta.remove();
    };
    btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied, () => legacyCopy(text));
        else legacyCopy(text);
    });
})();
