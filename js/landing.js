/* Landing (index.html): a fresh visit to / shows only the Host panel; OPEN WORKSPACE (or Enter) brings up the
   Objects workspace around it. html.landing is set before first paint by the inline script in <head>, which
   skips it for #deep-links and for a reload of the workspace. css/landing.css has the layout.

   Opening is a same-document view transition: the Host glides from the centre into its slot while the other
   panels assemble (html.ws-reveal, css/index.css). It pushes a history entry, so Back returns to the landing
   and a reload stays in the workspace. Coming in from a sub page opens the workspace straight away (the check is in
   index.html's <head>), with a landing entry behind it. No transition for reduced motion, SYS calm, or browsers without one. */
(function () {
    const root = document.documentElement;
    const btn = document.getElementById('g-land-open');
    if (!btn) return;

    const LANDING = 'landing', WORKSPACE = 'workspace';
    // Where the page is headed, set the moment open/close is asked for: the class itself only changes once the
    // view transition has captured the old state, so a second click, a held Enter or a quick second [X] in that
    // gap would otherwise act twice (an extra history entry, or Back twice and off the site)
    let landing = root.classList.contains('landing');
    let backPending = false;
    const isLanding = () => landing;
    const still = () => root.classList.contains('sys-calm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mark this entry so Back to it from the workspace finds the landing again. Arriving straight in the workspace
    // (from a sub page, or a #deep-link) puts a landing entry behind it, so Back from the workspace is always the
    // way to the landing, and Back again leaves. js/objects.js and js/player.js have already taken any #hash off
    // the address (they run first), so the landing entry doesn't carry it.
    const marked = history.state && history.state.tirl;
    try {
        if (isLanding()) history.replaceState(Object.assign({}, history.state, { tirl: LANDING }), '');
        else if (!marked) {
            history.replaceState(Object.assign({}, history.state, { tirl: LANDING }), '');
            history.pushState({ tirl: WORKSPACE }, '');
        }
    } catch (_) {}

    // then: runs once the change is applied (inside the transition's update, so the page is already showing)
    function swap(toLanding, then) {
        landing = toLanding;
        const run = () => {
            root.classList.toggle('landing', toLanding);
            if (window.bracketContentArea) window.bracketContentArea.scrollTop = 0;
            if (toLanding && document.activeElement && document.activeElement.closest('.g-topbar')) btn.focus({ preventScroll: true });
            if (!toLanding && !still()) {
                root.classList.add('ws-reveal');
                clearTimeout(swap.t);
                swap.t = setTimeout(() => root.classList.remove('ws-reveal'), 1400);
            }
            if (then) then();
        };
        if (still() || !document.startViewTransition || document.hidden) { run(); return; }
        root.classList.add('ws-morph');
        const vt = document.startViewTransition(run);
        vt.finished.finally(() => root.classList.remove('ws-morph'));
    }

    function open(push, then) {
        if (!isLanding()) return;
        if (push) {
            try { history.pushState({ tirl: WORKSPACE }, ''); } catch (_) {}
        }
        swap(false, then);
        window.dispatchEvent(new CustomEvent('tirl:workspace', { detail: { open: true } }));
    }
    function close() {
        if (isLanding()) return;
        swap(true);
        window.dispatchEvent(new CustomEvent('tirl:workspace', { detail: { open: false } }));
    }

    btn.addEventListener('click', () => open(true));

    // ---------- The boot splash's hand-over on the landing (index.html's boot script calls these) ----------
    // The handshake has been running inside the Host card. pulse(): at "link established" a ring runs out from
    // the card through the background, brightening the field as it passes. handoff(): each channel row flies
    // into its comms button, the progress bar travels down and becomes the OPEN WORKSPACE button, and a scan
    // line sweeps down the card, wiping the handshake off above it and bringing the Host up behind it.
    // Everything is measured before the card's contents are shown (they only lose opacity while booting, so
    // their boxes are already in place), then animated with the Web Animations API from that one moment.
    const rectOf = (el) => el.getBoundingClientRect();
    const px = (r) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    window.TirlLandingBoot = {
        pulse(card) {
            if (!card || !Element.prototype.animate) return;
            const r = rectOf(card);
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 60;
            const ring = document.createElement('i');
            ring.className = 'boot-pulse';
            Object.assign(ring.style, { left: cx - R + 'px', top: cy - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px' });
            document.body.append(ring);
            ring.animate([{ transform: 'scale(0.12)', opacity: 1 }, { opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 0 }],
                { duration: 1500, easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)' }).finished.then(() => ring.remove(), () => ring.remove());
        },

        handoff({ panel, skip, card, lines, fast, start }) {
            const home = panel.parentNode;
            const cta = card && card.querySelector('.g-land-cta');
            if (!Element.prototype.animate || !card || !cta || !home.classList.contains('g-home')) return false;
            const k = fast ? 0.75 : 1;
            const hr = rectOf(home);
            if (!hr.height) return false;

            // Measure everything first
            const S0 = 160 * k, SWEEP = 760 * k;            // the scan line: delay, time to cross the card
            const FLY = 560 * k, STAGGER = 55 * k;          // rows into buttons
            const B0 = 80 * k, BAR = 680 * k;               // progress bar into the button
            const bar = panel.querySelector('.boot-progress');
            const hint = cta.querySelector('.g-land-hint');
            const flights = lines.map((line, i) => {
                const tile = card.querySelector(`.g-chan[data-dossier="${line.id}"]`);
                if (!tile) return null;
                const on = line.row.classList.contains('on');
                return { line, tile, on, from: on && rectOf(line.row), to: rectOf(tile), chan: getComputedStyle(tile).getPropertyValue('--chan').trim() || '139,233,253', d: i * STAGGER };
            }).filter(Boolean);
            const flown = new Set(flights.filter((f) => f.on).map((f) => f.tile));
            const wiped = [...home.querySelectorAll(':scope > .g-op-fx, :scope > .g-op-subject, .g-home-links > :not(.g-chans), .g-chans > .g-chan')]
                .filter((el) => !flown.has(el))
                .map((el) => ({ el, r: rectOf(el) }));
            const barFrom = bar && rectOf(bar), btnTo = rectOf(btn);
            const btnRadius = getComputedStyle(btn).borderRadius;

            start(); // the contents are shown from here: everything below hides them until its moment, in this same task

            const ghosts = [];
            const ghost = (cls, r) => {
                const g = document.createElement('div');
                g.className = 'boot-ghost ' + cls;
                Object.assign(g.style, px(r));
                document.body.append(g);
                ghosts.push(g);
                return g;
            };

            // 1. Rows fly into their buttons: a lock-on box carries each row's colour to its button, which lights up as it lands
            flights.forEach((f) => {
                if (!f.on) return;
                const c = f.chan;
                const g = ghost('is-chan', f.from);
                g.textContent = f.line.row.querySelector('.boot-label').textContent;
                f.line.row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: f.d, fill: 'forwards' });
                g.animate([
                    Object.assign(px(f.from), { opacity: 0, color: `rgba(${c}, 1)`, background: `rgba(${c}, 0.06)`, borderColor: `rgba(${c}, 0.35)`, boxShadow: `0 0 0 rgba(${c}, 0)` }),
                    { opacity: 1, offset: 0.12 },
                    { color: `rgba(${c}, 0)`, offset: 0.45 },
                    Object.assign(px(f.to), { opacity: 1, color: `rgba(${c}, 0)`, background: `rgba(${c}, 0.18)`, borderColor: `rgba(${c}, 0.8)`, boxShadow: `0 0 22px rgba(${c}, 0.55)` })
                ], { duration: FLY, delay: f.d, easing: 'cubic-bezier(0.45, 0, 0.15, 1)', fill: 'both' });
                g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: f.d + FLY, fill: 'forwards', composite: 'replace' });
                f.tile.animate([{ opacity: 0, filter: 'brightness(2.2)' }, { opacity: 1, filter: 'brightness(1)' }],
                    { duration: 340, delay: f.d + FLY - 60, easing: 'ease-out', fill: 'backwards' });
            });

            // 2. The progress bar runs down to the strip, then opens up into the button's outline
            if (barFrom && barFrom.width) {
                const mid = { left: btnTo.left, top: btnTo.top + btnTo.height / 2 - 1.5, width: btnTo.width, height: 3 };
                bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, delay: B0, fill: 'forwards' });
                const g = ghost('is-bar', barFrom);
                g.animate([
                    Object.assign(px(barFrom), { borderRadius: '2px', borderColor: 'rgba(139, 233, 253, 0)' }),
                    Object.assign(px(mid), { borderRadius: '2px', borderColor: 'rgba(139, 233, 253, 0)', offset: 0.55 }),
                    Object.assign(px(btnTo), { borderRadius: btnRadius, borderColor: 'rgba(139, 233, 253, 0.6)' })
                ], { duration: BAR, delay: B0, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'both' });
                g.append(document.createElement('i')); // the bar's gradient, fading as the outline takes over
                g.firstChild.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: BAR, delay: B0, fill: 'both' });
                g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: B0 + BAR, fill: 'forwards', composite: 'replace' });
            }
            btn.animate([{ opacity: 0, filter: 'brightness(1.8)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 320, delay: B0 + BAR - 80, fill: 'backwards' });
            if (hint) hint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: B0 + BAR + 120, fill: 'backwards' });
            skip.classList.add('handoff');

            // 3. The scan line: the handshake is wiped off above it, the Host revealed behind it
            const line = document.createElement('i');
            line.className = 'boot-scanline';
            home.append(line);
            line.animate([
                { transform: 'translateY(0)', opacity: 0 },
                { opacity: 1, offset: 0.05 },
                { opacity: 1, offset: 0.9 },
                { transform: `translateY(${hr.height}px)`, opacity: 0 }
            ], { duration: SWEEP, delay: S0, easing: 'linear', fill: 'both' });
            panel.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }], { duration: SWEEP, delay: S0, easing: 'linear', fill: 'forwards' });
            const clamp = (v) => Math.max(0, Math.min(1, v));
            wiped.forEach(({ el, r }) => {
                const a = clamp((r.top - hr.top) / hr.height), b = clamp((r.bottom - hr.top) / hr.height);
                const at = S0 + SWEEP * a, dur = Math.max(40, SWEEP * (b - a));
                el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: dur, delay: at, easing: 'linear', fill: 'backwards' });
                el.animate([{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }], { duration: 420, delay: at, easing: 'ease-out', fill: 'backwards' });
            });

            const end = Math.max(S0 + SWEEP, B0 + BAR + 260, ...flights.map((f) => f.d + FLY + 280)) + 40;
            setTimeout(() => {
                panel.remove();
                skip.remove();
                line.remove();
                ghosts.forEach((g) => g.remove());
                const trace = card.querySelector('.boot-trace');
                if (trace) trace.remove();
            }, end);
            return true;
        }
    };

    // [X] in the workspace's top bar: back to the landing. When the landing is the entry before this one, go Back
    // to it (popstate below closes), so Back/Forward stay in step; otherwise (a #deep-link) close in place.
    const closeBtn = document.getElementById('g-ws-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        if (isLanding() || backPending) return;
        if (history.state && history.state.tirl === WORKSPACE) {
            backPending = true;
            setTimeout(() => { backPending = false; }, 1000); // in case Back never lands
            history.back();
            return;
        }
        close();
        try { history.replaceState(Object.assign({}, history.state, { tirl: LANDING }), ''); } catch (_) {}
    });
    // popstate: Back/Forward between the landing and the workspace, and a #deep-link followed while on the landing
    // (same page, so no reload), which opens the workspace on that object. popstate comes before hashchange, so
    // the hash is still there; js/objects.js takes it back off the address on hashchange.
    window.addEventListener('popstate', (e) => {
        backPending = false;
        const s = e.state && e.state.tirl;
        if (isLanding() && location.hash.length > 1) open(false);
        else if (s === LANDING) close();
        else if (s === WORKSPACE) open(false);
    });

    // Keys on the landing: Enter opens the workspace; / and Ctrl+K open it and then the command palette (which lives
    // in the workspace, hidden here, so it opens once the workspace shows: an input can't take focus while hidden);
    // arrows have nothing to switch here. Runs ahead of the workspace's own keys (capture), after the boot splash.
    document.addEventListener('keydown', (e) => {
        if (!isLanding() || e.defaultPrevented || document.getElementById('boot-overlay')) return;
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, [contenteditable="true"], [role="dialog"], dialog')) return;
        const palette = () => window.TirlPalette && window.TirlPalette.open();
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
            e.preventDefault();
            e.stopPropagation();
            open(true, palette);
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Enter' && !(el && el.closest('a, button'))) {
            e.preventDefault();
            e.stopPropagation();
            open(true);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.stopPropagation();
        }
    }, true);
})();
