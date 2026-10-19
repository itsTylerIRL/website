/* Page scripts for index.html: the homepage is the Objects index, a catalog of every system page on the site
   with a live preview of the selected one. The tylerirl.com object (key 'home') is the default; it's this page,
   so instead of a preview it spotlights featured pages (FEATURED). The Host panel (#g-home) is static markup. */

// ---------- Catalog (edit here to add / update pages) ----------
// type: 'collection' | 'program' | 'tool' | 'page' | 'external'
// workspace: true once the page is on the DEEPDISH workspace template (css/workspace.css)
// icon: small icon from assets/object-icons/ (leave empty to show the name's initial)
// hidden: true keeps an entry archived here but out of results, search, navigation and counts.
const OBJECTS = [
    { key: 'home', name: 'tylerirl.com', url: '/', type: 'page', workspace: true, icon: '/assets/object-icons/home.webp', desc: 'home base: remilio enjoyer, contact links and this index of every page on the site' },
    { key: 'gallery', name: 'NFT Gallery', url: '/pages/gallery.html', type: 'collection', workspace: true, icon: '/assets/object-icons/gallery.webp', desc: 'non fungible tylers: PFPs, schizoposters and remilia pieces with a zoomable viewer' },
    { key: 'likes', name: 'Things I Like', url: '/pages/likes.html', type: 'collection', workspace: true, icon: '/assets/object-icons/likes-full.webp', desc: 'crypto, tech and fun, catalogued around a 3D icon cloud' },
    { key: 'rocketry', name: 'Missile Program', url: '/pages/rocketry.html', type: 'program', workspace: true, icon: '/assets/object-icons/rocketry.webp', desc: 'high power rocketry: vehicle builds, milestones, flight footage and launch status' },
    { key: 'deepdish', name: 'DeepDish', url: '/pages/deepdish.html', type: 'program', icon: '/assets/object-icons/deepdish.webp', desc: 'custom computer build, monitoring and the projects that run on it' },
    { key: 'ocs', name: 'DeepDish OCS', url: '/pages/deepdish_ocs.html', type: 'program', workspace: true, icon: '/assets/object-icons/ocs-sentinel.webp', desc: 'optical control system: a face-tracking animated eye for the Gakken Worldeye, with technical docs' },
    { key: 'ocs-demo', hidden: true, name: 'OCS Web UI Demo', url: '/pages/OCS-web-ui-demo.html', type: 'program', icon: '/assets/object-icons/ocs-demo.webp', desc: 'interactive demo of the DeepDish OCS web interface' },
    { key: 'top', name: 'DeepDish TOP', url: '/pages/deepdish_top.html', type: 'program', icon: '/assets/object-icons/top.webp', desc: 'terminal operations panel: real-time infrastructure monitoring dashboard' },
    { key: 'sin', name: 'RADactedBot', url: '/pages/deepdish_sin.html', type: 'program', workspace: true, icon: '/assets/object-icons/sin-defcon4.webp', desc: 'Discord and Telegram bot: economy, games, relays, LLM agents and moderation' },
    { key: 'radgotchi', name: 'RadGotchi', url: '/pages/deepdish_rg.html', type: 'program', workspace: true, icon: '/assets/object-icons/radgotchi.webp', desc: 'desktop + web pixel-art companion: system telemetry, local-AI chat with tools, XP and a LAN mesh, with technical docs' },
    { key: 'grep', hidden: true, name: 'grep dojo', url: '/pages/grep.html', type: 'tool', icon: '/assets/object-icons/grep.webp', desc: 'master grep through interactive terminal challenges' },
    { key: 'digiflip', name: 'DigiFlip', url: '/pages/digimon.html', type: 'tool', workspace: true, icon: '/assets/object-icons/digiflip.webp', desc: 'digimon ver.20th virtual pet for the flipper zero, in your browser' },
    { key: 'timer', name: 'speedcube timer', url: '/pages/timer.html', type: 'tool', workspace: true, icon: '/assets/object-icons/timer.webp', desc: 'minimal speedcube timer with session stats saved in your browser' },
    { key: 'markets', name: 'Neochibi Markets', url: '/pages/markets.html', type: 'tool', workspace: true, icon: '/assets/object-icons/markets.webp', desc: 'live floor, volume and price trends for the neochibi collections, plus the CULT chart' },
    { key: 'guest-book', name: 'Guest Book', url: '/pages/guest-book.html', type: 'page', workspace: true, icon: '/assets/object-icons/guest-book.webp', desc: 'leave a message and connect via urbit' },
    { key: 'cornhub', hidden: true, name: 'CornHub', url: '/pages/cornhub.html', type: 'page', icon: '/assets/object-icons/cornhub.webp', desc: 'cornhub intl inc. - yet another shitcoin' },
    { key: 'cancel', name: 'the cancel is coming', url: 'https://cancel.tylerirl.com', type: 'external', icon: '/assets/object-icons/cancel.webp', desc: 'neochibi roguelite autobattler' },
    { key: 'nosfyl', name: '~nosfyl', url: 'https://nosfyl.tylerirl.com', type: 'external', icon: '/assets/object-icons/nosfyl.webp', desc: 'urbit star' },
    { key: 'raddem', name: '~raddem-tidwyt', url: 'http://urbit.tylerirl.com', type: 'external', icon: '/assets/object-icons/raddem.webp', desc: 'urbit planet' }
];

// ---------- Featured pages (shown while tylerirl.com is selected; edit here to change the spotlight) ----------
// key: an OBJECTS key (name, link and description come from there); art: image (round: ringed circle);
// sprites: [frame names, ms per frame] plays RadGotchi sprites from assets/rg/sprites/ instead of art;
// accent: r,g,b; cta: button label; blurb: the card's short subtext (the full desc stays in the header)
const FEATURED = [
    { key: 'cancel', art: '/assets/featured/cancel.webp', accent: '255,222,23', cta: 'PLAY', blurb: 'roguelite autobattler' },
    { key: 'radgotchi', sprites: [['awake', 'look_l', 'awake', 'look_r', 'look_r_happy', 'happy', 'cool', 'cool', 'smart', 'debug', 'smart', 'excited',
        'upload', 'upload1', 'upload2', 'upload1', 'happy', 'bored', 'sleep', 'sleep2', 'sleep', 'awake'], 900], accent: '139,233,253', cta: 'MEET', blurb: 'desktop local-AI chat' },
    { key: 'digiflip', art: '/assets/featured/digiflip.webp', accent: '255,85,85', cta: 'PLAY', blurb: 'flipper zero digimon' },
    { key: 'rocketry', art: '/assets/object-icons/rocketry.webp', accent: '255,184,108', cta: 'EXPLORE', blurb: 'high power rocketry' },
    { key: 'likes', art: '/assets/object-icons/likes-full.webp', accent: '189,147,249', cta: 'BROWSE', blurb: 'crypto, tech and fun' },
    { key: 'guest-book', art: '/assets/featured/guest-book.webp', round: true, accent: '80,250,123', cta: 'SIGN', blurb: 'leave a message' }
];

// ---------- Workspace ----------
(function() {
    const header = document.getElementById('g-objhead');
    if (!header) return;

    const TYPES = {
        collection: { name: 'Collection', tone: 'blue' },
        program: { name: 'Program', tone: 'green' },
        tool: { name: 'Tool', tone: 'orange' },
        page: { name: 'Page', tone: 'muted' },
        external: { name: 'External', tone: 'red' }
    };
    const typeName = (t) => (TYPES[t] || {}).name || t;
    const toneOf = (t) => (TYPES[t] || {}).tone || 'muted';
    const HOME = 'home'; // this page: shows the hero instead of a live preview
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Virtual viewport the live preview renders pages at before scaling down
    const VIEW_W = 1440;
    const VIEW_H = 900;

    const els = {
        types: document.getElementById('g-types'),
        count: document.getElementById('g-count'),
        activity: document.getElementById('g-activity'),
        results: document.getElementById('g-results'),
        resultsMeta: document.getElementById('g-results-meta'),
        search: document.getElementById('g-search'),
        crumb: document.getElementById('g-crumb'),
        crumbType: document.getElementById('g-crumb-type'),
        preview: document.getElementById('g-preview'),
        previewTitle: document.getElementById('g-preview-title'),
        featured: document.getElementById('g-featured'),
        screen: document.getElementById('g-preview-screen'),
        previewMeta: document.getElementById('g-preview-meta'),
        statusObjects: document.getElementById('g-status-objects'),
        statusFilter: document.getElementById('g-status-filter'),
        clock: document.getElementById('g-clock')
    };

    const objects = OBJECTS.map((o, i) => {
        const external = o.type === 'external';
        let host = 'tylerirl.com';
        try { host = new URL(o.url, location.href).host.replace(/^www\./, '') || host; } catch (_) {}
        return {
            ...o,
            id: 'OBJ-' + String(i + 1).padStart(4, '0'),
            external,
            host: external ? host : 'tylerirl.com',
            format: external ? 'external' : (o.workspace ? 'workspace' : 'legacy')
        };
    }).filter((o) => !o.hidden);
    const types = Object.keys(TYPES).filter((t) => objects.some((o) => o.type === t));

    let type = 'all';
    let query = '';
    let current = null;
    // Recently viewed, newest first: [{ o, t }] with t in ms. Kept in localStorage so it survives
    // leaving the page (opening an object, reloads, coming back later).
    const HISTORY_KEY = 'tirl_objects_viewed';
    const HISTORY_MAX = 12;
    const viewed = [];
    try {
        (JSON.parse(localStorage.getItem(HISTORY_KEY)) || []).forEach(({ key, t }) => {
            const o = objects.find((x) => x.key === key);
            if (o && !viewed.some((h) => h.o === o)) viewed.push({ o, t: Number(t) || Date.now() });
        });
        viewed.length = Math.min(viewed.length, HISTORY_MAX);
    } catch (_) {}

    const matches = (o) => !query || [o.name, o.desc, o.url, typeName(o.type)].some((f) => f.toLowerCase().includes(query));
    const visible = () => objects.filter((o) => (type === 'all' || o.type === type) && matches(o));
    const countOf = (t) => t === 'all' ? objects.length : objects.filter((o) => o.type === t).length;
    const iconHtml = (o, cls) => o.icon
        ? `<img class="${cls}" src="${esc(o.icon)}" alt="" loading="lazy" decoding="async">`
        : `<span class="${cls} g-noimg">${esc(o.name.charAt(0).toUpperCase())}</span>`;

    // ---------- Explorer (by type) ----------
    function renderTypes() {
        els.types.innerHTML = ['all', ...types].map((t) => `<li><button type="button" class="g-obj-btn" data-type="${t}" aria-current="${t === type}">
            <i class="g-dot tone-${t === 'all' ? 'muted' : toneOf(t)}"></i><span>${t === 'all' ? 'All' : typeName(t)}</span><span class="g-id">${countOf(t)}</span></button></li>`).join('');
        els.count.textContent = objects.length;
    }
    els.types.addEventListener('click', (e) => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        type = b.dataset.type;
        refresh();
    });

    // ---------- Results ----------
    function renderResults() {
        const list = visible();
        els.resultsMeta.textContent = `${list.length} object${list.length === 1 ? '' : 's'}`;
        els.results.innerHTML = list.length ? list.map((o) => `<li><button type="button" class="g-res" data-key="${o.key}" aria-current="${o === current}">
                ${iconHtml(o, 'g-res-icon')}
                <span class="g-res-text"><span class="g-res-title">${esc(o.name)}</span>
                    <span class="g-res-desc">${esc(o.external ? o.host : o.url)}</span></span>
                <i class="g-dot tone-${toneOf(o.type)}" title="${esc(typeName(o.type))}"></i>
            </button></li>`).join('')
            : '<li class="g-no-results">No matching objects</li>';
    }
    els.results.addEventListener('click', (e) => {
        const b = e.target.closest('.g-res');
        if (b) select(objects.find((o) => o.key === b.dataset.key));
    });

    function refresh() {
        renderTypes();
        renderResults();
        updateStatus();
        if (current) renderHeader(current);
    }

    // ---------- Object header ----------
    const openAttrs = (o) => o.external ? ' target="_blank" rel="noopener"' : '';
    function renderHeader(o) {
        const list = visible();
        const idx = list.indexOf(o);
        const tone = toneOf(o.type);
        const formatLabel = { workspace: 'DEEPDISH WORKSPACE', legacy: 'LEGACY TEMPLATE', external: 'EXTERNAL HOST' }[o.format];
        header.innerHTML = `<div class="g-objrow">
                <div class="g-objicon g-objicon-img">${iconHtml(o, 'g-objimg')}</div>
                <div class="g-objtitle">
                    <div class="g-objtype">OBJECT &middot; ${esc(typeName(o.type).toUpperCase())} &middot; ${o.id}</div>
                    <h1>${esc(o.name)}</h1>
                </div>
                <span class="g-chip tone-${tone}"><i class="g-dot tone-${tone}"></i>${esc(typeName(o.type))}</span>
                <div class="g-objnav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous object" ${list.length < 2 ? 'disabled' : ''}>&lsaquo;</button>
                    <span>${idx === -1 ? '&ndash;' : idx + 1} / ${list.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next object" ${list.length < 2 ? 'disabled' : ''}>&rsaquo;</button>
                    ${o.key === HOME ? '' : `<a class="g-btn g-visit" href="${esc(o.url)}"${openAttrs(o)}>OPEN &nearr;</a>`}
                </div>
            </div>
            <p class="g-summary">${esc(o.desc)}</p>
            <div class="g-objmeta">
                <span>PATH</span><b>${esc(o.url)}</b>
                <span>FORMAT</span><b class="tone-${o.format === 'workspace' ? 'green' : o.format === 'legacy' ? 'orange' : 'red'} g-format">${formatLabel}</b>
                <span>HOST</span><b>${esc(o.host)}</b>
            </div>`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
    }

    // ---------- Live preview ----------
    // Internal pages render in a scaled-down iframe (VIEW_W x VIEW_H virtual viewport); external hosts
    // may refuse to be framed, so they get a "preview disabled" screen. Loading waits a beat so
    // arrowing through the list doesn't spin up every page.
    let previewTimer = null;
    function scalePreview() {
        const r = els.preview.getBoundingClientRect();
        const k = Math.max(0.05, Math.min((r.width - 28) / VIEW_W, (r.height - 28) / VIEW_H));
        els.screen.style.transform = `translate(-50%, -50%) scale(${k})`;
        return k;
    }
    function renderPreview(o) {
        clearTimeout(previewTimer);
        els.screen.classList.remove('ready');
        // tylerirl.com is this page (framing it would recurse): spotlight what's new instead
        const home = o.key === HOME;
        els.preview.hidden = home;
        els.featured.hidden = !home;
        els.previewTitle.textContent = home ? 'Featured' : 'Live Preview';
        if (home) {
            els.screen.replaceChildren(); // unload the last framed page
            renderFeatured();
            return;
        }
        if (o.external) {
            els.screen.classList.add('offline');
            els.screen.innerHTML = `<div class="g-preview-off">
                    ${iconHtml(o, 'g-preview-off-icon')}
                    <strong>[ EXTERNAL HOST &middot; PREVIEW DISABLED ]</strong>
                    <span>${esc(o.host)} is served outside tylerirl.com &mdash; open it to connect</span>
                    <a class="g-btn g-visit" href="${esc(o.url)}"${openAttrs(o)}>OPEN ${esc(o.host)} &nearr;</a>
                </div>`;
            els.previewMeta.textContent = 'EXTERNAL · NOT FRAMED';
            scalePreview();
            return;
        }
        els.screen.classList.remove('offline');
        els.screen.innerHTML = '<div class="g-preview-wait">ESTABLISHING LINK&hellip;</div>';
        els.previewMeta.textContent = 'CONNECTING…';
        const k = scalePreview();
        previewTimer = setTimeout(() => {
            if (current !== o) return;
            const frame = document.createElement('iframe');
            frame.src = o.url;
            frame.title = `${o.name} preview`;
            frame.tabIndex = -1;
            frame.setAttribute('aria-hidden', 'true');
            frame.addEventListener('load', () => {
                if (current !== o) return;
                els.screen.classList.add('ready');
                els.previewMeta.textContent = `LIVE · ${VIEW_W}×${VIEW_H} @ ${Math.round(k * 100)}%`;
            });
            // The preview is look-only: a click anywhere opens the real page
            const open = document.createElement('a');
            open.className = 'g-preview-open';
            open.href = o.url;
            open.setAttribute('aria-label', `Open ${o.name}`);
            open.innerHTML = '<span>OPEN &nearr;</span>';
            els.screen.replaceChildren(frame, open);
        }, 280);
    }
    const spriteSrc = (name) => `/assets/rg/sprites/${name.toUpperCase()}.png`;
    let spriteTimer = null;
    function renderFeatured() {
        const items = FEATURED.map((f) => ({ ...f, o: objects.find((x) => x.key === f.key) })).filter((f) => f.o);
        els.previewMeta.textContent = 'EXPLORE MORE IN RESULTS';
        const artHtml = ({ art, round, sprites }) => sprites
            ? `<span class="g-feat-art is-sprite"><img src="${spriteSrc(sprites[0][0])}" alt="" decoding="async" data-sprite></span>`
            : `<span class="g-feat-art${round ? ' is-round' : ''}"><img src="${esc(art)}" alt="" decoding="async"></span>`;
        els.featured.innerHTML = `<div class="g-feat-grid">${items.map((f) => `
                <a class="g-feat g-spot" href="${esc(f.o.url)}"${openAttrs(f.o)} style="--feat: ${esc(f.accent)}">
                    <span class="g-feat-body">
                        ${artHtml(f)}
                        <span class="g-feat-text">
                            <span class="g-feat-head"><strong class="g-feat-name">${esc(f.o.name)}</strong></span>
                            <span class="g-feat-desc">${esc(f.blurb || f.o.desc)}</span>
                        </span>
                        <span class="g-btn g-feat-cta">${esc(f.cta)} ${f.o.external ? '&nearr;' : '&rarr;'}</span>
                    </span>
                </a>`).join('')}
            </div>`;
        // Animated sprite cards step through their frames while the spotlight is showing
        clearInterval(spriteTimer);
        const anim = items.filter((f) => f.sprites);
        if (!anim.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        anim.forEach((f) => f.sprites[0].forEach((n) => { new Image().src = spriteSrc(n); })); // preload
        let step = 0;
        const imgs = els.featured.querySelectorAll('[data-sprite]');
        spriteTimer = setInterval(() => {
            if (els.featured.hidden) { clearInterval(spriteTimer); return; }
            step++;
            anim.forEach((f, i) => { if (imgs[i]) imgs[i].src = spriteSrc(f.sprites[0][step % f.sprites[0].length]); });
        }, anim[0].sprites[1]);
    }
    // The preview stretches with the layout, not just the window, so watch its own box
    new ResizeObserver(() => {
        if (!current || current.key === HOME) return;
        const k = scalePreview();
        if (els.screen.classList.contains('ready')) els.previewMeta.textContent = `LIVE · ${VIEW_W}×${VIEW_H} @ ${Math.round(k * 100)}%`;
    }).observe(els.preview);

    // ---------- Recently viewed ----------
    const pad2 = (n) => String(n).padStart(2, '0');
    // HH:MM:SS today; older entries lead with the date
    function stamp(t) {
        const d = new Date(t);
        const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(pad2).join(':');
        return d.toDateString() === new Date().toDateString() ? time : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${time}`;
    }
    function remember(o) {
        const prev = viewed.findIndex((h) => h.o === o);
        if (prev !== -1) viewed.splice(prev, 1);
        viewed.unshift({ o, t: Date.now() });
        viewed.length = Math.min(viewed.length, HISTORY_MAX);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(viewed.map((h) => ({ key: h.o.key, t: h.t })))); } catch (_) {}
        renderHistory();
    }
    function renderHistory() {
        els.activity.innerHTML = viewed.map((h) => `<li><i class="g-dot tone-${toneOf(h.o.type)}"></i><div>
            <time>${stamp(h.t)}</time><button type="button" class="g-act-link" data-key="${h.o.key}">${esc(h.o.name)}</button>
            <span class="g-act-cat">${esc(h.o.external ? h.o.host : h.o.url)}</span></div></li>`).join('');
    }
    els.activity.addEventListener('click', (e) => {
        const b = e.target.closest('.g-act-link');
        if (b) select(objects.find((o) => o.key === b.dataset.key));
    });

    // ---------- Selection ----------
    function select(o, opts = {}) {
        if (!o) return;
        const changed = o !== current;
        current = o;
        renderHeader(o);
        if (changed) renderPreview(o);
        els.crumb.textContent = o.name;
        els.crumbType.textContent = typeName(o.type);
        els.results.querySelectorAll('.g-res').forEach((b) => {
            const on = b.dataset.key === o.key;
            b.setAttribute('aria-current', on);
            if (on && !opts.noScroll) b.scrollIntoView({ block: 'nearest' });
        });
        remember(o);
    }
    function step(dir) {
        const list = visible();
        if (!list.length) return;
        const i = list.indexOf(current);
        select(list[(i + dir + list.length) % list.length]);
    }
    // Deep links (/#gallery) select an object once, then the hash is dropped so a later visit opens on home
    function fromHash() {
        const o = objects.find((x) => x.key === location.hash.slice(1));
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        return o;
    }
    window.addEventListener('hashchange', () => {
        const o = fromHash();
        if (o && o !== current) select(o);
    });
    // Back/forward cache restores the page as it was left: reset to home
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) select(objectByKey(HOME));
    });
    const objectByKey = (k) => objects.find((o) => o.key === k);

    // Opening an object (OPEN, a featured card, Enter, middle-click) logs it before the page is left
    const objectByHref = new Map(objects.map((o) => [new URL(o.url, location.href).href, o]));
    const logOpen = (e) => {
        const a = e.target instanceof Element && e.target.closest('a[href]');
        const o = a && objectByHref.get(a.href);
        if (o && o.key !== HOME) remember(o);
    };
    document.addEventListener('click', logOpen);
    document.addEventListener('auxclick', (e) => { if (e.button === 1) logOpen(e); });

    // The brand and the "tylerirl" crumb point at "/", which is this page: select home instead of reloading
    document.querySelectorAll('.g-topbar a[href="/"]').forEach((a) => a.addEventListener('click', (e) => {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        select(objectByKey(HOME));
    }));

    // ---------- Search + keyboard ----------
    els.search.addEventListener('input', () => {
        query = els.search.value.trim().toLowerCase();
        renderResults();
        updateStatus();
        if (current) renderHeader(current);
    });
    els.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = visible()[0];
            if (first) select(first);
        } else if (e.key === 'Escape') {
            els.search.value = '';
            els.search.dispatchEvent(new Event('input'));
            els.search.blur();
        }
    });
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, [contenteditable="true"]')) return;
        if (e.key === '/') { e.preventDefault(); els.search.focus(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
        else if (e.key === 'Enter' && current && !(el && el.closest('button, a'))) {
            const open = header.querySelector('.g-visit');
            if (open) open.click();
        }
    });

    // ---------- Status bar ----------
    function updateStatus() {
        els.statusObjects.textContent = `${objects.length} OBJECTS`;
        els.statusFilter.textContent = `TYPE: ${(type === 'all' ? 'ALL' : typeName(type)).toUpperCase()}`
            + (query ? ` · "${query}"` : '') + ` · ${visible().length} SHOWN`;
    }
    const tick = () => {
        const d = new Date();
        els.clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);

    // ---------- Hover light ----------
    // Panels and featured cards (.g-spot) carry a light that follows the pointer: one listener,
    // at most one style write per frame, and only to the .g-spot elements under the pointer.
    document.querySelectorAll('.g-explorer, .g-results-pane, .g-activity-pane, .g-home-pane, .g-objhead, .g-preview-pane')
        .forEach((el) => el.classList.add('g-spot'));
    let spotEvent = null;
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!spotEvent) requestAnimationFrame(() => {
            const { clientX, clientY, target } = spotEvent;
            spotEvent = null;
            for (let el = target instanceof Element && target.closest('.g-spot'); el; el = el.parentElement && el.parentElement.closest('.g-spot')) {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${clientX - r.left}px`);
                el.style.setProperty('--my', `${clientY - r.top}px`);
            }
        });
        spotEvent = e;
    }, { passive: true });

    // ---------- Boot ----------
    refresh();
    const initial = fromHash();
    select(initial || objectByKey(HOME), { noScroll: !initial });
})();
