/* DeepDish (pages/deepdish.html): the Urbit apps' COPY buttons put their |install line on the clipboard, or
   select it to copy by hand where the clipboard isn't available. */
(function () {
    'use strict';
    const list = document.getElementById('dd-apps');
    if (!list) return;
    list.addEventListener('click', async (e) => {
        const b = e.target.closest('.dd-copy');
        if (!b) return;
        let ok = false;
        try { await navigator.clipboard.writeText(b.dataset.cmd); ok = true; } catch (_) {
            const code = b.parentElement.querySelector('code');
            const range = document.createRange();
            range.selectNodeContents(code);
            const sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        b.textContent = ok ? 'COPIED' : 'SELECTED';
        b.classList.toggle('is-done', ok);
        clearTimeout(b._t);
        b._t = setTimeout(() => { b.textContent = 'COPY'; b.classList.remove('is-done'); }, 1600);
    });
})();
