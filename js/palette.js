/* Command palette for the home page: / or Ctrl/Cmd+K (or the top bar's search box) searches every object and
   what's inside them, and picking a result shows it in the live preview, deep-linked when it's inside a page
   (js/objects.js select with a hash: a gallery piece, a like, a vehicle, a docs section). Shift+Enter opens the
   page itself instead.
   The inside-page index is read from the pages the first time the palette opens and kept for an hour
   (sessionStorage). Each source mirrors how its page names its items, so the links land where the page expects. */
(function () {
    'use strict';
    const api = window.TirlObjects;
    const host = document.getElementById('gotham');
    if (!api || !host) return;

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const slugify = (s, fallback) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
    // Slugs the way js/gallery.js and js/likes.js make them: from the name, made unique by position
    function slugged(nodes, nameOf, fallback) {
        const seen = new Set();
        return nodes.map((n, i) => {
            let slug = slugify(nameOf(n), fallback);
            while (seen.has(slug)) slug += '-' + (i + 1);
            seen.add(slug);
            return { n, slug };
        });
    }
    const urlOf = (key) => (api.objects.find((o) => o.key === key) || {}).url;

    // ---------- Index ----------
    // key: the object; kind: what its items are; url: what to read (text: true reads it as text, not a page);
    // read: -> [{ hash, name, sub }]
    const SOURCES = [
        { key: 'gallery', kind: 'piece', read: (doc) => slugged(Array.from(doc.querySelectorAll('#gallery-data .pfp-card')), (c) => c.dataset.name || 'piece', 'piece')
            .map(({ n, slug }) => ({ hash: slug, name: n.dataset.name || 'Untitled', sub: n.dataset.artist || '' })) },
        { key: 'likes', kind: 'like', read: (doc) => {
            const title = (a) => (a.querySelector('.bento-content h3')?.textContent || '').trim();
            return slugged(Array.from(doc.querySelectorAll('#likes-data .bento-item')), title, 'item')
                .map(({ n, slug }) => ({ hash: slug, name: title(n), sub: (n.querySelector('.bento-content p')?.textContent || '').trim() }))
                .filter((x) => x.name);
        } },
        // Vehicles live in the page's script (VEHICLES), keyed for #<key>
        { key: 'rocketry', kind: 'vehicle', url: '/js/rocketry.js', text: true, read: (src) =>
            Array.from(src.matchAll(/key: '([a-z0-9-]+)',\s*designation: '([^']+)'/g), ([, hash, name]) => ({ hash, name, sub: 'high power rocket' })) },
        // Docs pages: their .doc-sec sections (js/docs.js opens #<section id>)
        ...['ocs', 'top', 'sin', 'radgotchi'].map((key) => ({ key, kind: 'section', read: (doc) =>
            Array.from(doc.querySelectorAll('.doc-sec[id]'), (s) => ({ hash: s.id, name: s.dataset.title || s.id, sub: s.querySelector('.doc-num')?.textContent || '' })) }))
    ];
    const CACHE = 'tirl_palette_index';
    let index = null;
    let loading = null;
    function load() {
        if (index) return Promise.resolve(index);
        try {
            const c = JSON.parse(sessionStorage.getItem(CACHE));
            if (c && Date.now() - c.at < 3600000) return Promise.resolve((index = c.items));
        } catch (_) {}
        if (loading) return loading;
        loading = Promise.all(SOURCES.map(async (src) => {
            try {
                const r = await fetch(src.url || urlOf(src.key));
                if (!r.ok) return [];
                const text = await r.text();
                const items = src.read(src.text ? text : new DOMParser().parseFromString(text, 'text/html'));
                return items.map((it) => ({ key: src.key, kind: src.kind, ...it }));
            } catch (_) { return []; }
        })).then((lists) => {
            index = lists.flat();
            try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), items: index })); } catch (_) {}
            return index;
        });
        return loading;
    }

    // ---------- Search ----------
    const objectRows = () => api.objects.map((o) => ({ key: o.key, kind: 'object', name: o.name, sub: o.tag || o.desc }));
    function search(q) {
        const objs = objectRows();
        if (!q) return objs;
        const words = q.split(/\s+/).filter(Boolean);
        const rows = objs.concat(index || []);
        const objName = (r) => (api.objects.find((o) => o.key === r.key) || {}).name || '';
        return rows.map((r) => {
            const name = r.name.toLowerCase();
            const hay = `${name} ${r.sub} ${objName(r)} ${r.kind}`.toLowerCase();
            if (!words.every((w) => hay.includes(w))) return null;
            // Name starts with it, then a word in the name does, then the name has it, then anything matched;
            // objects before what's inside them
            const wordStart = name.split(/[^a-z0-9]+/).some((w) => w && w.startsWith(q));
            const score = (name.startsWith(q) ? 0 : wordStart ? 1 : name.includes(q) ? 2 : 3) + (r.kind === 'object' ? 0 : 0.5);
            return { r, score };
        }).filter(Boolean).sort((a, b) => a.score - b.score || a.r.name.length - b.r.name.length).slice(0, 60).map((x) => x.r);
    }

    // ---------- UI ----------
    const el = document.createElement('div');
    el.className = 'g-pal';
    el.hidden = true;
    el.innerHTML = `<div class="g-pal-box" role="dialog" aria-modal="true" aria-label="Command palette">
            <label class="g-pal-search">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.7 10.3a6 6 0 1 0-1.4 1.4l3.6 3.6 1.4-1.4-3.6-3.6zM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
                <input type="text" placeholder="Search objects, pieces, likes, docs&hellip;" autocomplete="off" spellcheck="false"
                    role="combobox" aria-expanded="true" aria-controls="g-pal-list" aria-label="Search everything">
                <kbd>esc</kbd>
            </label>
            <div class="g-pal-meta"><span class="g-pal-count"></span><span class="g-pal-index"></span></div>
            <ol class="g-pal-list" id="g-pal-list" role="listbox"></ol>
            <div class="g-pal-foot">
                <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> move</span>
                <span><kbd>enter</kbd> preview</span>
                <span><kbd>shift</kbd>+<kbd>enter</kbd> open page</span>
            </div>
        </div>`;
    host.append(el);
    const input = el.querySelector('input');
    const list = el.querySelector('.g-pal-list');
    const count = el.querySelector('.g-pal-count');
    const indexMeta = el.querySelector('.g-pal-index');
    let rows = [];
    let active = 0;
    let back = null;

    function mark(text, q) {
        const at = q ? text.toLowerCase().indexOf(q) : -1;
        return at === -1 ? esc(text) : `${esc(text.slice(0, at))}<mark>${esc(text.slice(at, at + q.length))}</mark>${esc(text.slice(at + q.length))}`;
    }
    function render() {
        const q = input.value.trim().toLowerCase();
        rows = search(q);
        active = Math.min(active, Math.max(0, rows.length - 1));
        count.textContent = q ? `${rows.length}${rows.length === 60 ? '+' : ''} RESULT${rows.length === 1 ? '' : 'S'}` : `${rows.length} OBJECTS`;
        list.innerHTML = rows.length ? rows.map((r, i) => {
            const o = api.objects.find((x) => x.key === r.key);
            const chip = r.kind === 'object' ? api.typeName(o.type) : `${r.kind} · ${o.name}`;
            return `<li role="option" aria-selected="${i === active}"><button type="button" class="g-pal-item" data-i="${i}" tabindex="-1">
                    ${api.iconHtml(o, 'g-pal-icon')}
                    <span class="g-pal-text"><span class="g-pal-name">${mark(r.name, q)}</span><span class="g-pal-sub">${esc(r.sub || '')}</span></span>
                    <span class="g-pal-chip">${esc(chip)}</span>
                </button></li>`;
        }).join('') : '<li class="g-pal-empty">[ NO MATCH ] &middot; try a piece, a like or a docs section</li>';
        reveal();
    }
    function reveal() {
        list.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', i === active));
        const li = list.children[active];
        if (li) li.scrollIntoView({ block: 'nearest' });
    }
    function choose(i, full) {
        const r = rows[i];
        if (!r) return;
        const o = api.objects.find((x) => x.key === r.key);
        close();
        if (full) {
            const url = o.url + (r.hash ? '#' + encodeURIComponent(r.hash) : '');
            if (o.external) window.open(url, '_blank', 'noopener');
            else location.href = url;
            return;
        }
        api.select(o.key, r.hash);
        document.getElementById('g-objhead')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function open() {
        if (!el.hidden) { input.select(); return; }
        back = document.activeElement;
        el.hidden = false;
        input.value = '';
        active = 0;
        render();
        input.focus();
        if (!index) {
            indexMeta.textContent = `INDEXING ${SOURCES.length} SOURCES…`;
            load().then((items) => {
                indexMeta.textContent = `INDEX · ${items.length} ITEMS IN ${new Set(items.map((x) => x.key)).size} PAGES`;
                if (!el.hidden && input.value.trim()) render();
            });
        } else indexMeta.textContent = `INDEX · ${index.length} ITEMS IN ${new Set(index.map((x) => x.key)).size} PAGES`;
    }
    function close() {
        if (el.hidden) return;
        el.hidden = true;
        if (back && back !== document.body && document.contains(back)) back.focus({ preventScroll: true });
        back = null;
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (rows.length) active = (active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
            reveal();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(active, e.shiftKey || e.ctrlKey || e.metaKey);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'Tab') e.preventDefault(); // the palette keeps the keyboard until it closes
    });
    list.addEventListener('pointermove', (e) => {
        const b = e.target.closest('.g-pal-item');
        if (b && +b.dataset.i !== active) { active = +b.dataset.i; reveal(); }
    });
    list.addEventListener('click', (e) => {
        const b = e.target.closest('.g-pal-item');
        if (b) choose(+b.dataset.i, e.shiftKey || e.ctrlKey || e.metaKey);
    });
    // A click outside the box closes it
    el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });

    window.TirlPalette = { open, close };
})();
