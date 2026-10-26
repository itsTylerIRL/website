/* Signal Log, under Results on the home page: a running record of what the live sources and the page in the
   live preview report, newest first, so what the ticker crawls past stays readable.
   - Every Results live line ('tirl:live', js/objects.js) is logged when it first arrives and whenever it says
     something new: lines whose only change is a number (a clock, an "ago", a drip score) aren't logged again.
   - window.tirlLog.add({ key, text, tone }) logs anything else: what happens in an embedded page
     (js/objects.js TirlEmbedHost.event), the player link (js/player.js), the greeting (js/now.js).
   The log lasts the session (sessionStorage), so a reload keeps it. A logged object's name selects it.
   Load it before the live sources. */
(function () {
    'use strict';
    const list = document.getElementById('g-signal');
    if (!list) return;
    const meta = document.getElementById('g-signal-meta');
    const KEY = 'tirl_signal';
    const MAX = 60;
    const SKIP = new Set(['home']); // its line repeats the Discord and TIDAL rows
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (t) => t.replace(/\d+(?:[.:,]\d+)*/g, '#').replace(/\s+/g, ' ').trim();
    const pad2 = (n) => String(n).padStart(2, '0');
    const stamp = (t) => { const d = new Date(t); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(pad2).join(':'); };
    const objectOf = (key) => (typeof OBJECTS !== 'undefined' && OBJECTS.find((o) => o.key === key && !o.hidden)) || null;

    let state = { items: [], last: {} };
    try {
        const s = JSON.parse(sessionStorage.getItem(KEY));
        if (s && Array.isArray(s.items) && s.last) state = s;
    } catch (_) {}
    const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} };

    function itemHtml(it, fresh) {
        const o = it.key && objectOf(it.key);
        const src = o ? `<button type="button" class="g-act-link g-sig-src" data-key="${esc(o.key)}">${esc(o.name)}</button>`
            : `<span class="g-sig-src">${esc(it.src || 'system')}</span>`;
        return `<li${fresh ? ' class="is-new"' : ''}><i class="g-dot tone-${esc(it.tone || 'muted')}"></i><div>
                <time>${stamp(it.t)}</time>${src}<span class="g-sig-text">${esc(it.text)}</span></div></li>`;
    }
    function render(fresh) {
        list.innerHTML = state.items.length
            ? state.items.map((it, i) => itemHtml(it, fresh && i === 0)).join('')
            : '<li class="g-sig-empty">listening&hellip;</li>';
        if (meta) meta.textContent = `${state.items.length} signal${state.items.length === 1 ? '' : 's'}`;
    }
    function add(it) {
        const text = String(it.text || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        state.items.unshift({ t: Date.now(), key: it.key || '', src: it.src || '', text, tone: it.tone || 'muted' });
        state.items.length = Math.min(state.items.length, MAX);
        save();
        render(true);
    }
    window.addEventListener('tirl:live', (e) => {
        const { key, text, tone } = e.detail;
        if (!text || SKIP.has(key)) return;
        const n = norm(text);
        if (state.last[key] === n) return;
        state.last[key] = n;
        add({ key, text, tone });
    });
    list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-key]');
        if (b) window.TirlObjects?.select(b.dataset.key);
    });
    window.tirlLog = { add };
    render(false);
})();
