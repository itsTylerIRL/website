/* Page script for deepdish_sin.html (RADactedBot): the DEFCON console in §09, which the §01 threat badge mirrors.
   Escalating goes toward DEFCON 1. The level's colour (sampled from its profile picture) tints the console and the
   section numbers. Contents, search, copy buttons and the dense layout's scroll-in come from js/docs.js. */
(function() {
    'use strict';
    const con = document.getElementById('sin-defcon');
    if (!con) return;
    const doc = document.getElementById('doc');
    const $ = (id) => document.getElementById(id);
    // Ring colours of assets/redacted/defcon/DEFCON<n>.webp (5's deep blue lifted so it reads on the dark panel)
    const COLOR = { 5: '#4b5bff', 4: '#2bff2b', 3: '#f9cd00', 2: '#fa6901', 1: '#ff2a2a' };
    const STATE = { 5: 'ALL CLEAR', 1: 'MAXIMUM ALERT' };
    const img = (n) => `/assets/redacted/defcon/DEFCON${n}.webp`;
    let level = 5;

    function set(n, quiet) {
        n = Math.min(5, Math.max(1, n));
        const prev = level;
        const changed = n !== prev;
        level = n;
        con.dataset.level = n;
        doc.style.setProperty('--dc', COLOR[n]);
        $('sin-dc-img').src = img(n);
        $('sin-dc-img').alt = `DEFCON ${n} profile picture`;
        $('sin-dc-n').textContent = n;
        $('sin-dc-state').textContent = STATE[n] || `LEVEL ${n} OF 5`;
        const threat = $('sin-threat-img');
        if (threat) {
            threat.src = img(n);
            $('sin-threat-n').textContent = `DEFCON ${n}`;
        }
        con.querySelectorAll('.sin-dc-step').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.level === n)));
        con.querySelector('[data-step="-1"]').disabled = n === 1;
        con.querySelector('[data-step="1"]').disabled = n === 5;
        doc.querySelectorAll('.sin-badges a').forEach((a) => a.classList.toggle('is-on', +a.dataset.level === n));
        if (changed && !quiet) {
            // The badge lands with a jolt, harder going up than down
            con.classList.remove('is-up', 'is-down');
            void con.offsetWidth;
            con.classList.add(n < prev ? 'is-up' : 'is-down');
        }
    }
    // Preload, so the badge swaps without a flash
    [1, 2, 3, 4, 5].forEach((n) => { new Image().src = img(n); });

    con.addEventListener('click', (e) => {
        const step = e.target.closest('.sin-dc-step');
        if (step) return set(+step.dataset.level);
        const btn = e.target.closest('[data-step]');
        if (btn) set(level + +btn.dataset.step);
    });
    set(5, true);

    // For the home page's idle tour (js/display.js): one step at a time, 5 down to 1 and back up
    let dir = -1;
    window.sinDefcon = {
        step() {
            if (level === 1) dir = 1;
            else if (level === 5) dir = -1;
            set(level + dir);
        }
    };
})();
