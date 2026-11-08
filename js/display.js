/* On display: while the home page's idle tour has this page up (js/embed.js TirlEmbed.display, 'tirl:display'),
   it plays a small demo of itself through its own controls, so the tour shows pages in use rather than still.
   Loaded only the first time a page is put on display. Each recipe is picked by what the page has:
   - step through a list (things I like, the gallery, missile program, markets, a docs page's contents, the cancel's
     hall of fame, the network's boards): click the next item every so often
   - RadGotchi's docs: play the idle routines one after another in the §01 chamber (js/rg-docs.js window.rgChamber)
   - OCS's docs: step through the §03 preset gallery (the Render panel on the home page follows)
   - RADactedBot's docs: the §09 DEFCON console steps from 5 down to 1 and back (js/sin-docs.js window.sinDefcon)
   - otherwise scroll the main column slowly down and back to the top, like a teleprompter (KoL, the ship pages)
   Clicks here are synthetic, so the home page doesn't count them as someone coming back. Column panels have moved
   to the home page by now (js/embed.js), so lookups include them. */
(function () {
    'use strict';
    if (window.__tirlDisplayLoaded) return;
    window.__tirlDisplayLoaded = true;
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('sys-calm');
    const roots = () => [document, ...((window.TirlEmbed && [...window.TirlEmbed.side, ...window.TirlEmbed.rail]) || [])];
    const all = (sel) => roots().flatMap((r) => Array.from(r.querySelectorAll(sel)));
    const usable = (el) => el.isConnected && !el.disabled && el.getClientRects().length > 0;

    // [what the page has, the items to step through, ms between, order]
    const STEPS = [
        ['#iconCloudCanvas', '#g-results .g-res', 5000, 'random'],
        ['#g-thumbs, .g-thumbs', '.g-thumb', 6000, 'random'],
        ['#g-milestones', '.g-explorer .g-obj-btn[data-index]', 8000, 'next'],
        ['#g-colls', '.g-coll', 6000, 'next'],
        ['.oc-presets', '.oc-preset', 4500, 'next'],
        ['#g-toc', '.g-toc-item', 6000, 'next'],
        ['.g-hall-host', '.g-cancel-cell[data-hall-id]', 2500, 'next'],
        ['#n-tabs', '#n-tabs [data-board]', 5000, 'next']
    ];

    let timer = null, frame = null;
    function stepper(sel, ms, order) {
        let i = -1;
        const tick = () => {
            const items = all(sel).filter(usable);
            if (items.length) {
                const at = items.findIndex((el) => el.getAttribute('aria-current') === 'true' || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true');
                if (i === -1) i = at;
                if (order === 'random') {
                    let j = Math.floor(Math.random() * items.length);
                    if (items.length > 1 && j === at) j = (j + 1) % items.length;
                    i = j;
                } else i = (i + 1) % items.length;
                items[i].click();
                reveal(items[i]);
            }
            timer = setTimeout(tick, ms);
        };
        timer = setTimeout(tick, 1500);
    }

    // Bring an item in this page's own columns into view (moved panels scroll with the home page's columns). Done by
    // hand: scrollIntoView from inside a frame can scroll the home page around it too.
    function reveal(el) {
        if (el.ownerDocument !== document || !document.contains(el)) return;
        const box = scroller();
        if (!box || !box.contains(el)) return;
        const r = el.getBoundingClientRect();
        const b = box === document.scrollingElement ? { top: 0, bottom: innerHeight } : box.getBoundingClientRect();
        const pad = 40;
        if (r.top < b.top + pad || r.bottom > b.bottom - pad) {
            box.scrollTo({ top: box.scrollTop + (r.top - b.top) - (b.bottom - b.top) / 3, behavior: 'smooth' });
        }
    }

    // The column that scrolls: the main column in the one-screen layout, else the page
    function scroller() {
        const cands = [document.getElementById('g-main'), document.getElementById('g-docs-scroll'), document.querySelector('.bracket-content-area'), document.scrollingElement];
        return cands.find((el) => el && el.scrollHeight - el.clientHeight > 40);
    }
    function prompter() {
        const el = scroller();
        if (!el) return;
        const SPEED = 18; // px per second
        let last = 0, pause = performance.now() + 2500, pos = el.scrollTop;
        const run = (now) => {
            frame = requestAnimationFrame(run);
            if (now < pause) { last = now; return; }
            const dt = last ? Math.min(100, now - last) / 1000 : 0;
            last = now;
            pos += SPEED * dt;
            if (pos >= el.scrollHeight - el.clientHeight - 1) {
                // Hold at the bottom, then glide back to the top
                pause = now + 4000;
                setTimeout(() => { el.scrollTo({ top: 0, behavior: 'smooth' }); pos = 0; }, 3000);
                return;
            }
            el.scrollTop = pos;
        };
        frame = requestAnimationFrame(run);
    }

    // RadGotchi: the chamber at the top of the docs plays each idle routine in turn (RG_ROUTINES: js/rg-docs.js)
    function chamber() {
        const box = document.getElementById('g-docs-scroll');
        if (box) box.scrollTo({ top: 0, behavior: 'smooth' });
        let i = 0;
        const next = () => {
            const [name, steps, ms] = RG_ROUTINES[i++ % RG_ROUTINES.length];
            window.rgChamber.play(name);
            timer = setTimeout(next, steps.length * ms + 2500);
        };
        timer = setTimeout(next, 1500);
    }

    // RADactedBot: bring the DEFCON console into view, then a level every few seconds
    function defcon() {
        const box = document.getElementById('g-docs-scroll');
        const sec = document.getElementById('s-defcon');
        if (box && sec) box.scrollTo({ top: sec.offsetTop - box.offsetTop, behavior: 'smooth' });
        const next = () => { window.sinDefcon.step(); timer = setTimeout(next, 3200); };
        timer = setTimeout(next, 2000);
    }

    function start() {
        stop();
        if (calm()) return; // the tour still visits; the page just stays put
        if (window.rgChamber && typeof RG_ROUTINES !== 'undefined') return chamber();
        if (window.sinDefcon) return defcon();
        const recipe = STEPS.find(([has]) => roots().some((r) => r.querySelector(has)));
        if (recipe) stepper(recipe[1], recipe[2], recipe[3]);
        else prompter();
    }
    function stop() {
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        timer = frame = null;
    }
    window.addEventListener('tirl:display', (e) => (e.detail.on ? start() : stop()));
    if (window.__tirlDisplay) start();
})();
