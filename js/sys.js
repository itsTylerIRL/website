/* SYS, the home page's settings panel (the gear in the top bar): what the page does on its own, kept in this
   browser (localStorage 'tirl_sys'), plus a live readout of the session and buttons to forget what it remembers.
   Each setting is a class on <html> (set before first paint by the snippet in index.html's <head>, so a switched
   off background never flashes) that the page's CSS and scripts check:
   - sys-bg-off: no WebGL background (js/background.js stops drawing; css/objects.css hides the canvas)
   - sys-calm: motion cut to the minimum, as the system's reduced motion setting would (css/objects.css; js/objects.js)
   - sys-mute: no interface sounds (js/sounds.js plays them muted)
   - sys-no-ambient: the page doesn't start touring on its own when left idle (js/objects.js)
   - sys-no-ticker / sys-no-pet: the status bar's live feed crawl / RadGotchi hidden
   - sys-no-greet: no welcome back or alerts from the visit memory (js/now.js)
   boot ('session' | 'always' | 'never') is read by the boot screen script in index.html. */
(function () {
    'use strict';
    const btn = document.getElementById('g-sys-btn');
    const host = document.getElementById('gotham');
    if (!btn || !host) return;
    const KEY = 'tirl_sys';
    const root = document.documentElement;
    const DEFAULTS = { bg: true, calm: false, sound: true, ambient: true, ticker: true, pet: true, greet: true, boot: 'session' };
    let sys = { ...DEFAULTS };
    try { sys = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (_) {}
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---------- Apply ----------
    function apply() {
        root.classList.toggle('sys-bg-off', !sys.bg);
        root.classList.toggle('sys-calm', sys.calm);
        root.classList.toggle('sys-mute', !sys.sound);
        root.classList.toggle('sys-no-ambient', !sys.ambient);
        root.classList.toggle('sys-no-ticker', !sys.ticker);
        root.classList.toggle('sys-no-pet', !sys.pet);
        root.classList.toggle('sys-no-greet', !sys.greet);
        if (window.SoundFX) Object.values(window.SoundFX.sounds).forEach((a) => { a.muted = !sys.sound; });
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(sys)); } catch (_) {}
    }
    apply();

    // ---------- Panel ----------
    // [key, label, what it does, options ([value, text]); none: an on/off switch]
    const ROWS = [
        ['DISPLAY', [
            ['bg', 'Background', 'the drifting isoline field behind everything'],
            ['calm', 'Calm motion', 'cut animations to a minimum (panels, decodes, pulses)'],
            ['boot', 'Boot screen', 'the handshake splash before the workspace', [['session', 'ONCE'], ['always', 'ALWAYS'], ['never', 'NEVER']]]
        ]],
        ['BEHAVIOUR', [
            ['ambient', 'Ambient mode', 'tour the previews on its own after 90 s idle'],
            ['sound', 'Interface sounds', 'soft clicks and hovers'],
            ['greet', 'Greetings', 'welcome back, and news like losing the crown']
        ]],
        ['STATUS BAR', [
            ['ticker', 'Live feed', 'the crawl of what the live sources know'],
            ['pet', 'RadGotchi', 'the pet in the corner']
        ]]
    ];
    // [what, storage, label]: forget buttons; reloads after, so every panel starts clean
    const FORGET = [
        ['history', 'Recently viewed', () => localStorage.removeItem('tirl_objects_viewed')],
        ['visit', 'Visit memory', () => { localStorage.removeItem('tirl_visit'); sessionStorage.removeItem('tirl_visit_prev'); sessionStorage.removeItem('tirl_greeted'); }],
        ['signals', 'Signal log', () => sessionStorage.removeItem('tirl_signal')],
        ['settings', 'These settings', () => localStorage.removeItem(KEY)]
    ];

    const el = document.createElement('div');
    el.className = 'g-sys';
    el.id = 'g-sys';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'System settings');
    host.append(el);

    const control = ([key, , , opts]) => opts
        ? `<span class="g-seg" role="radiogroup">${opts.map(([v, t]) => `<button type="button" role="radio" aria-checked="${sys[key] === v}" data-key="${key}" data-val="${v}">${t}</button>`).join('')}</span>`
        : `<button type="button" class="g-switch" role="switch" aria-checked="${!!sys[key]}" data-key="${key}"><i></i><span>${sys[key] ? 'ON' : 'OFF'}</span></button>`;
    function render() {
        el.innerHTML = `<div class="g-sys-head"><span><i class="g-dot tone-green"></i>SYS // SETTINGS</span><button type="button" class="g-sys-x" aria-label="Close" data-close>&times;</button></div>
            <div class="g-sys-read" id="g-sys-read"></div>
            ${ROWS.map(([group, rows]) => `<div class="g-sys-group"><div class="g-sys-label">${group}</div>
                ${rows.map((r) => `<div class="g-sys-row"><span class="g-sys-text"><b>${r[1]}</b><small>${esc(r[2])}</small></span>${control(r)}</div>`).join('')}
            </div>`).join('')}
            <div class="g-sys-group"><div class="g-sys-label">MEMORY <span>kept in this browser</span></div>
                <div class="g-sys-forget">${FORGET.map(([id, label]) => `<button type="button" class="g-btn" data-forget="${id}">${label}</button>`).join('')}</div>
            </div>`;
        readout();
    }

    // Live readout: session, visit, sources answering, storage used
    const started = performance.timing ? performance.timing.navigationStart : Date.now() - performance.now();
    function readout() {
        const box = el.querySelector('#g-sys-read');
        if (!box) return;
        const s = Math.floor((Date.now() - started) / 1000);
        const live = window.TirlObjects ? Object.keys(window.TirlObjects.live).length : 0;
        let visit = '';
        try { visit = JSON.parse(localStorage.getItem('tirl_visit')).visits; } catch (_) {}
        let bytes = 0;
        try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); bytes += k.length + (localStorage.getItem(k) || '').length; } } catch (_) {}
        const cell = (v, l) => `<span><b>${v}</b><small>${l}</small></span>`;
        box.innerHTML = cell(s < 3600 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m`, 'session')
            + cell(visit ? '#' + visit : '—', 'visit')
            + cell(live, 'live sources')
            + cell(`${(bytes * 2 / 1024).toFixed(1)}k`, 'stored');
    }
    let readTimer = null;

    let back = null;
    function open() {
        if (!el.hidden) return close();
        back = document.activeElement;
        render();
        // Under the gear, right edges lined up (phones: a sheet across the top, css/objects.css)
        const r = btn.getBoundingClientRect();
        const wide = matchMedia('(min-width: 900px)').matches;
        el.style.top = wide ? `${Math.round(r.bottom + 8)}px` : '';
        el.style.right = wide ? `${Math.round(document.documentElement.clientWidth - r.right)}px` : '';
        el.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        el.querySelector('[data-key]')?.focus({ preventScroll: true });
        readTimer = setInterval(readout, 1000);
    }
    function close() {
        if (el.hidden) return;
        el.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        clearInterval(readTimer);
        if (back && document.contains(back)) back.focus({ preventScroll: true });
        back = null;
    }
    btn.addEventListener('click', open);
    el.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) return close();
        const b = e.target.closest('[data-key]');
        if (b) {
            const key = b.dataset.key;
            sys[key] = 'val' in b.dataset ? b.dataset.val : !sys[key];
            save();
            apply();
            // Redraw just the control, keeping focus on it
            const row = DEFAULTS[key] === undefined ? null : ROWS.flatMap((g) => g[1]).find((r) => r[0] === key);
            const wrap = document.createElement('div');
            wrap.innerHTML = control(row);
            const next = wrap.firstElementChild;
            const old = b.closest('.g-seg') || b;
            old.replaceWith(next);
            (next.matches('[data-key]') ? next : next.querySelector(`[data-val="${CSS.escape(String(sys[key]))}"]`))?.focus({ preventScroll: true });
            window.tirlLog?.add({ src: 'sys', text: `${row[1].toLowerCase()} · ${typeof sys[key] === 'boolean' ? (sys[key] ? 'on' : 'off') : sys[key]}`, tone: 'blue' });
            return;
        }
        // Forget: a second press confirms
        const f = e.target.closest('[data-forget]');
        if (!f) return;
        if (!f.classList.contains('is-armed')) {
            el.querySelectorAll('.is-armed').forEach((x) => { x.classList.remove('is-armed'); x.textContent = FORGET.find((y) => y[0] === x.dataset.forget)[1]; });
            f.classList.add('is-armed');
            f.textContent = 'SURE? PRESS AGAIN';
            return;
        }
        try { FORGET.find((x) => x[0] === f.dataset.forget)[2](); } catch (_) {}
        location.reload();
    });
    // Escape or a click outside closes it
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) { e.stopPropagation(); close(); } }, true);
    document.addEventListener('pointerdown', (e) => { if (!el.hidden && !el.contains(e.target) && !btn.contains(e.target)) close(); });

    window.TirlSys = { open, close, get: (k) => sys[k] };
})();
