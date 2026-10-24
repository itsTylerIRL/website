/* Arrivals: live data lands with a little ceremony instead of popping in. Text scrambles into place (like the
   boot wordmark), numbers count up, and slots still waiting show "acquiring" (css/objects.css .g-acquire).
   - Dossier cards (#g-dossier) and the status line under the hologram arrive the first time they appear;
     clocks and progress times are left to their own tickers
   - Others call window.tirlArrive: arrive(el) (numbers count up, the rest decodes) or countUp(el)
   Reduced motion: everything lands as is. */
(function () {
    'use strict';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
    const SKIP = '.g-presence-time, .g-presence-clock, .g-soc-dim';
    const NUMBER = /^([\d,]*\.?\d+)([kKmM]?)$/;
    const busy = new WeakSet();
    const ease = k => 1 - Math.pow(1 - k, 3);

    // Scramble a text node into its current text, left to right; stops if something else rewrites it
    function decode(node, ms = 480) {
        const final = node.data;
        if (!final.trim() || busy.has(node)) return;
        busy.add(node);
        const start = performance.now();
        let shown = final, glyphAt = 0;
        const scramble = n => final.slice(0, n) + [...final.slice(n)].map(c => (/\s/.test(c) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
        requestAnimationFrame(function step(now) {
            if (node.data !== shown) { busy.delete(node); return; }
            const k = Math.min(1, Math.max(0, (now - start) / ms)); // a frame's timestamp can predate start
            // New glyphs every 50 ms rather than every frame, so it reads as decoding, not flicker
            if (k >= 1 || now - glyphAt > 50) {
                glyphAt = now;
                shown = k >= 1 ? final : scramble(Math.floor(k * final.length)); // a steady left-to-right sweep
                node.data = shown;
            }
            if (k < 1) requestAnimationFrame(step); else busy.delete(node);
        });
    }

    // Count an element's number up from zero, keeping its decimals, thousands commas and k/M suffix.
    // False when its text isn't a plain number.
    function countUp(el, ms = 700) {
        const m = el.textContent.trim().match(NUMBER);
        if (!m) return false;
        if (reduced || busy.has(el)) return true;
        const raw = m[1], suffix = m[2];
        const target = parseFloat(raw.replace(/,/g, ''));
        const dec = (raw.split('.')[1] || '').length;
        const fmt = v => (raw.includes(',') ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + suffix;
        const final = el.textContent;
        busy.add(el);
        const start = performance.now();
        let shown = fmt(0);
        el.textContent = shown;
        requestAnimationFrame(function step(now) {
            if (el.textContent !== shown) { busy.delete(el); return; }
            const k = Math.min(1, Math.max(0, (now - start) / ms)); // a frame's timestamp can predate start
            shown = k >= 1 ? final : fmt(target * ease(k));
            el.textContent = shown;
            if (k < 1) requestAnimationFrame(step); else busy.delete(el);
        });
        return true;
    }

    // Every piece of text inside root (root included): numbers count up, words decode
    function arrive(root) {
        if (reduced || !root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            const t = walker.currentNode;
            if (t.data.trim() && !t.parentElement.closest(SKIP)) nodes.push(t);
        }
        nodes.forEach(t => {
            const el = t.parentElement;
            if (el.childNodes.length === 1 && countUp(el)) return;
            decode(t);
        });
    }

    window.tirlArrive = { arrive, countUp };

    // First appearance of each dossier card and of the status line under the hologram
    const seen = new WeakSet();
    document.querySelectorAll('#g-dossier > [data-slide]:not(#reminet-stats), #g-presence-seen').forEach(el => {
        if (!el.hidden) seen.add(el); // already showing: nothing to arrive
        new MutationObserver(() => {
            if (!el.hidden && !seen.has(el)) { seen.add(el); arrive(el); }
        }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
    });
})();
