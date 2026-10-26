/* NOW, on the home object (js/objects.js renderHeader mounts it while tylerirl.com is selected, between the
   description and the player cards): what's live right now in one row (status, music, the cancel crown, the
   Kingdom, both ships) and, when you've been here before, what changed since your last visit.
   - The row is the live lines of those objects' Results rows ('tirl:live', from js/objects.js ObjectsLive); a
     click selects the object.
   - Visit memory: sources hand in what they've just read with window.tirlVisit.seen(id, value, describe). The
     values are kept in this browser (localStorage), and each session compares against what the last visit left
     there: describe(was, now) says what changed (a string, or { text, tone, key, alert }) or nothing.
     alert: { mood, status } is news worth telling at once (the status-bar RadGotchi, the ticker).
   - Greeting: once a session, a few seconds in, the RadGotchi and the ticker welcome you back (by name when
     you're signed in to the games, js/player.js) with the gist of what changed.
   Load it before the live sources (js/live-rows.js reads its likes cache straight away). */
(function () {
    'use strict';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ago = (t) => {
        const m = Math.max(0, Math.round((Date.now() - t) / 60000));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const tell = (it) => { window.tirlTicker?.push(it); window.tirlLog?.add({ src: 'tylerirl', ...it }); };

    // ---------- Visit memory ----------
    const KEY = 'tirl_visit';
    const PREV = 'tirl_visit_prev';
    let mine = null;
    try { mine = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!mine || typeof mine !== 'object' || !mine.snap) mine = { at: 0, visits: 0, snap: {} };
    // The last visit as this session found it (kept for the session, so a reload compares against the same)
    let prev = null;
    try { prev = JSON.parse(sessionStorage.getItem(PREV)); } catch (_) {}
    if (!prev) {
        prev = { at: mine.at || 0, visits: mine.visits || 0, snap: { ...mine.snap } };
        mine.visits = prev.visits + 1;
        try { sessionStorage.setItem(PREV, JSON.stringify(prev)); } catch (_) {}
    }
    const visit = prev.visits + 1;
    const save = () => {
        mine.at = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (_) {}
    };
    save();
    setInterval(() => { if (!document.hidden) save(); }, 60000);
    window.addEventListener('pagehide', save);

    const since = new Map(); // id -> { text, tone, key }
    const alerted = new Set();
    function seen(id, value, describe) {
        if (value === undefined || value === null) return;
        const was = prev.snap[id];
        mine.snap[id] = value;
        save();
        if (was === undefined || !prev.at) return;
        let d = null;
        try { d = describe(was, value); } catch (_) {}
        if (typeof d === 'string') d = { text: d };
        if (d) since.set(id, d); else if (!since.delete(id)) return;
        renderSince(true);
        if (d && d.alert && !alerted.has(id)) {
            alerted.add(id);
            if (typeof RG !== 'undefined') RG.setMood(d.alert.mood || 'intense', { anim: 'rg-shake', status: d.alert.status, duration: 5000, priority: true });
            tell({ text: d.text, tone: d.tone || 'red', key: d.key });
        }
    }
    window.tirlVisit = { seen };
    // For the boot screen (index.html)
    window.dispatchEvent(new CustomEvent('tirl:boot', { detail: prev.at
        ? { id: 'visit', status: ago(prev.at).toUpperCase() }
        : { id: 'visit', status: 'FIRST VISIT', tone: 'idle' } }));

    // ---------- The strip ----------
    const CELLS = [
        ['live-discord', 'STATUS'],
        ['live-music', 'AUDIO'],
        ['cancel', 'CROWN'],
        ['kol', 'KINGDOM'],
        ['nosfyl', '~NOSFYL'],
        ['raddem', '~RADDEM-TIDWYT']
    ];
    let box = null;
    const live = () => (window.TirlObjects && window.TirlObjects.live) || {};
    const player = () => window.TirlPlayer?.user() || null;
    const handle = (u) => (u.handle[0] === '~' ? u.handle : '~' + u.handle);

    function cellHtml([key, label]) {
        const l = live()[key];
        return `<button type="button" class="g-now-cell" data-key="${key}"${l ? ` title="${esc(l.text)}"` : ''}>
                <small>${label}</small>
                ${l ? `<span><i class="g-live-dot tone-${esc(l.tone || 'green')}"></i><b>${esc(l.text)}</b></span>`
                    : '<span class="g-acquire">acquiring&hellip;</span>'}
            </button>`;
    }
    function helloHtml() {
        const u = player();
        const who = u ? `, <b>${esc(handle(u))}</b>` : '';
        return prev.at
            ? `<span class="g-now-hello">WELCOME BACK${who}</span><span class="g-now-visit">visit #${visit} &middot; last here ${ago(prev.at)}</span>`
            : `<span class="g-now-hello">FIRST CONTACT${who}</span><span class="g-now-visit">welcome in &middot; look around</span>`;
    }
    function sinceHtml() {
        if (!since.size) return '';
        const list = [...since.values()].sort((x, y) => !!y.alert - !!x.alert); // the bad news first
        return `<span class="g-now-since-label">SINCE THEN</span>${list.map((d) =>
            `<${d.key ? `button type="button" data-key="${esc(d.key)}"` : 'span'} class="g-since tone-${esc(d.tone || 'blue')}">${esc(d.text)}</${d.key ? 'button' : 'span'}>`).join('')}`;
    }
    function render() {
        if (!box || !box.isConnected) return;
        box.innerHTML = `<div class="g-now-head"><span class="g-now-label"><i class="g-dot tone-green"></i>NOW</span>${helloHtml()}</div>
            <div class="g-now-since"${since.size ? '' : ' hidden'}>${sinceHtml()}</div>
            <div class="g-now-grid">${CELLS.map(cellHtml).join('')}</div>`;
    }
    function renderSince(arrived) {
        const el = box && box.isConnected && box.querySelector('.g-now-since');
        if (!el) return;
        el.hidden = !since.size;
        el.innerHTML = sinceHtml();
        if (arrived) el.querySelectorAll('.g-since').forEach((s) => window.tirlArrive?.arrive(s));
    }
    window.addEventListener('tirl:live', (e) => {
        const cell = box && box.isConnected && box.querySelector(`.g-now-cell[data-key="${CSS.escape(e.detail.key)}"]`);
        if (!cell) return;
        const def = CELLS.find((c) => c[0] === e.detail.key);
        const first = !!cell.querySelector('.g-acquire');
        const tmp = document.createElement('div');
        tmp.innerHTML = cellHtml(def);
        const next = tmp.firstElementChild;
        if (next.outerHTML === cell.outerHTML) return;
        cell.replaceWith(next);
        if (first) window.tirlArrive?.arrive(next.querySelector('b'));
    });
    // Signing in or out changes the greeting
    window.addEventListener('tirl:player', () => {
        const head = box && box.isConnected && box.querySelector('.g-now-head');
        if (head) head.innerHTML = `<span class="g-now-label"><i class="g-dot tone-green"></i>NOW</span>${helloHtml()}`;
    });
    function mount(el) {
        box = el;
        render();
        box.addEventListener('click', (e) => {
            const b = e.target.closest('[data-key]');
            if (b) window.TirlObjects?.select(b.dataset.key);
        });
    }
    window.TirlNow = { mount };

    // ---------- Greeting ----------
    // Once a session, after the sources have had a few seconds to answer; not for a quick return
    let greeted = false;
    try { greeted = sessionStorage.getItem('tirl_greeted') === '1'; } catch (_) {}
    if (!greeted && (!prev.at || Date.now() - prev.at > 20 * 60000)) {
        setTimeout(() => {
            try { sessionStorage.setItem('tirl_greeted', '1'); } catch (_) {}
            const u = player();
            const name = u ? handle(u) : '';
            const gist = [...since.values()].filter((d) => !d.alert).slice(0, 3).map((d) => d.text).join(', ');
            if (typeof RG !== 'undefined') RG.setMood(prev.at ? 'grateful' : 'excited', {
                anim: 'rg-bounce', duration: 4500, priority: true,
                status: (prev.at ? `WELCOME BACK ${name}` : 'FIRST CONTACT').trim().toUpperCase().slice(0, 28)
            });
            tell(prev.at
                ? { text: `welcome back${name ? ' ' + name : ''} · last here ${ago(prev.at)}${gist ? ' · since then: ' + gist : ''}`, tone: 'green' }
                : { text: 'first contact · welcome to tylerirl.com, have a look around', tone: 'green' });
        }, 5000);
    }
})();
