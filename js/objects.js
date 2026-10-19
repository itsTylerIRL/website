/* Page scripts for index.html: the homepage is the Objects index, a catalog of every system page on the site
   with a live preview of the selected one. The tylerirl.com object (key 'home') is the default; it's this page,
   so instead of a preview it spotlights featured pages (FEATURED). The Host panel (#g-home) is static markup. */

// ---------- Catalog (edit here to add / update pages) ----------
// type: 'collection' | 'program' | 'tool' | 'page' | 'external'
// workspace: true once the page is on the DEEPDISH workspace template (css/workspace.css)
// icon: small icon from assets/object-icons/ (leave empty to show the name's initial)
// hidden: true keeps an entry archived here but out of results, search, navigation and counts.
const OBJECTS = [
    { key: 'home', name: 'tylerirl.com', url: '/', type: 'page', workspace: true, icon: '/assets/object-icons/vip.webp', desc: 'home base: welcome to my personal website' },
    { key: 'gallery', name: 'NFT Gallery', url: '/pages/gallery.html', type: 'collection', workspace: true, icon: '/assets/object-icons/oh-ive-seen.webp', desc: 'non fungible tylers: PFPs, schizoposters and remilia pieces with a zoomable viewer' },
    { key: 'cancel', name: 'the cancel is coming', url: 'https://cancel.tylerirl.com', type: 'external', icon: '/assets/object-icons/cancel.webp', desc: 'neochibi roguelite autobattler' },
    { key: 'likes', name: 'Things I Like', url: '/pages/likes.html', type: 'collection', workspace: true, icon: '/assets/object-icons/likes-full.webp', desc: 'crypto, tech and fun, catalogued around a 3D icon cloud' },
    { key: 'kol', name: 'Kingdom of Loathing', url: '/pages/kol.html', type: 'collection', workspace: true, icon: '/assets/object-icons/kol.webp', desc: 'TylerIRL in the Kingdom: live moons and calendar, display case with mall prices and what\'s new in KoLmafia' },
    { key: 'rocketry', name: 'Missile Program', url: '/pages/rocketry.html', type: 'program', workspace: true, icon: '/assets/object-icons/rocketry.webp', desc: 'high power rocketry: vehicle builds, milestones, flight footage and launch status' },
    { key: 'deepdish', hidden: true, name: 'DeepDish', url: '/pages/deepdish.html', type: 'program', icon: '/assets/object-icons/deepdish.webp', desc: 'custom computer build, monitoring and the projects that run on it' },
    { key: 'ocs', name: 'DeepDish OCS', url: '/pages/deepdish_ocs.html', type: 'program', workspace: true, icon: '/assets/object-icons/ocs-sentinel.webp', desc: 'optical control system: a face-tracking animated eye for the Gakken Worldeye, with technical docs' },
    { key: 'ocs-demo', hidden: true, name: 'OCS Web UI Demo', url: '/pages/OCS-web-ui-demo.html', type: 'program', icon: '/assets/object-icons/ocs-demo.webp', desc: 'interactive demo of the DeepDish OCS web interface' },
    { key: 'top', name: 'DeepDish TOP', url: '/pages/deepdish_top.html', type: 'program', workspace: true, icon: '/assets/object-icons/top.webp', desc: 'terminal operations panel: host and cluster monitoring, Docker, OCS and a technical reference' },
    { key: 'sin', name: 'RADactedBot', url: '/pages/deepdish_sin.html', type: 'program', workspace: true, icon: '/assets/object-icons/sin-defcon4.webp', desc: 'Discord and Telegram bot: economy, games, relays, LLM agents and moderation' },
    { key: 'radgotchi', name: 'RadGotchi', url: '/pages/deepdish_rg.html', type: 'program', workspace: true, icon: '/assets/object-icons/radgotchi-shades.webp', desc: 'desktop + web pixel-art companion: system telemetry, local-AI chat with tools, XP and a LAN mesh, with technical docs' },
    { key: 'grep', hidden: true, name: 'grep dojo', url: '/pages/grep.html', type: 'tool', icon: '/assets/object-icons/grep.webp', desc: 'master grep through interactive terminal challenges' },
    { key: 'digiflip', name: 'DigiFlip', url: '/pages/digimon.html', type: 'tool', workspace: true, icon: '/assets/object-icons/digiflip.webp', desc: 'digimon ver.20th virtual pet for the flipper zero, in your browser' },
    { key: 'timer', name: 'speedcube timer', url: '/pages/timer.html', type: 'tool', workspace: true, icon: '/assets/object-icons/timer.webp', desc: 'minimal speedcube timer with session stats saved in your browser' },
    { key: 'markets', name: 'Neochibi Markets', url: '/pages/markets.html', type: 'tool', workspace: true, icon: '/assets/object-icons/markets.webp', desc: 'live floor, volume and price trends for the neochibi collections, plus the CULT chart' },
    { key: 'guest-book', name: 'Guest Book', url: '/pages/guest-book.html', type: 'page', workspace: true, icon: '/assets/object-icons/guest-book.webp', desc: 'leave a message and connect via urbit' },
    { key: 'cornhub', hidden: true, name: 'CornHub', url: '/pages/cornhub.html', type: 'page', icon: '/assets/object-icons/cornhub.webp', desc: 'cornhub intl inc. - yet another shitcoin' },
    { key: 'nosfyl', name: '~nosfyl', url: 'https://nosfyl.tylerirl.com', type: 'external', icon: '/assets/object-icons/nosfyl.webp', desc: 'urbit star' },
    { key: 'raddem', name: '~raddem-tidwyt', url: 'http://urbit.tylerirl.com', type: 'external', icon: '/assets/object-icons/raddem.webp', desc: 'urbit planet' }
];

// ---------- Featured pages (shown while tylerirl.com is selected; edit here to change the spotlight) ----------
// key: an OBJECTS key (name, link and description come from there); art: image (round: ringed circle);
// sprites: [frame names, ms per frame] plays RadGotchi sprites from assets/rg/sprites/ instead of art;
// badge: art is a KoL avatar (black ink on white), cropped to the character, tinted and refreshed hourly;
// accent: r,g,b; cta: button label; blurb: the card's short subtext (the full desc stays in the header)
// info: the card selects the object here (its info view, which links out) instead of opening it
const FEATURED = [
    { key: 'cancel', art: '/assets/featured/cancel.webp', accent: '255,222,23', cta: 'INFO', info: true, blurb: 'roguelite autobattler' },
    { key: 'kol', art: 'https://sigs.kingdomofloathing.com/player_571951/mode_avatar/playerfeed_571951.gif', badge: true, accent: '139,233,253', cta: 'INFO', info: true, blurb: 'live moons, display case and KoLmafia' },
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
    // Live telemetry per row (set by js/live-rows.js through window.ObjectsLive): key -> { text, tone }.
    // A live row shows it under the name in place of the path, which moves to the tooltip.
    const live = {};
    const pathOf = (o) => (o.external ? o.host : o.url);
    const descHtml = (o) => live[o.key]
        ? `<i class="g-live-dot tone-${esc(live[o.key].tone || 'green')}"></i>${esc(live[o.key].text)}`
        : esc(pathOf(o));
    window.ObjectsLive = (key, text, tone) => {
        if (text) live[key] = { text, tone }; else delete live[key];
        const desc = els.results.querySelector(`.g-res[data-key="${CSS.escape(key)}"] .g-res-desc`);
        const o = objects.find((x) => x.key === key);
        if (!desc || !o) return;
        desc.classList.toggle('is-live', !!live[key]);
        desc.innerHTML = descHtml(o);
    };
    function renderResults() {
        const list = visible();
        els.resultsMeta.textContent = `${list.length} object${list.length === 1 ? '' : 's'}`;
        els.results.innerHTML = list.length ? list.map((o) => `<li><button type="button" class="g-res" data-key="${o.key}" aria-current="${o === current}">
                ${iconHtml(o, 'g-res-icon')}
                <span class="g-res-text"><span class="g-res-title">${esc(o.name)}</span>
                    <span class="g-res-desc${live[o.key] ? ' is-live' : ''}" title="${esc(pathOf(o))}">${descHtml(o)}</span></span>
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
    // may refuse to be framed, so they get a "preview disabled" screen. Objects in NATIVE draw their own
    // readable preview instead (Cancel's leaderboard, KoL at a glance). Loading waits a beat so
    // arrowing through the list doesn't spin up every page.
    const NATIVE = {
        cancel: { title: 'Monthly Leaderboard', renderer: () => window.CancelPreview },
        kol: { title: 'Today in the Kingdom', renderer: () => window.KolPreview }
    };
    let previewTimer = null;
    let clearNativePreview = null;
    function scalePreview() {
        if (els.screen.classList.contains('is-native')) return 1;
        const r = els.preview.getBoundingClientRect();
        const k = Math.max(0.05, Math.min((r.width - 28) / VIEW_W, (r.height - 28) / VIEW_H));
        els.screen.style.transform = `translate(-50%, -50%) scale(${k})`;
        return k;
    }
    function renderPreview(o) {
        clearTimeout(previewTimer);
        if (clearNativePreview) { clearNativePreview(); clearNativePreview = null; }
        const native = NATIVE[o.key]?.renderer() ? NATIVE[o.key] : null;
        const nativeClasses = ['is-native', ...Object.keys(NATIVE).map((k) => 'is-' + k)];
        els.preview.classList.remove(...nativeClasses);
        els.screen.classList.remove(...nativeClasses, 'ready');
        if (native) els.preview.classList.add('is-native', 'is-' + o.key);
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
        if (native) {
            els.previewTitle.textContent = native.title;
            els.screen.classList.remove('offline');
            els.screen.classList.add('is-native', 'is-' + o.key);
            els.screen.style.transform = '';
            clearNativePreview = native.renderer().render(els.screen, els.previewMeta, o.url);
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
        // An hourly key keeps KoL avatar outfit changes current
        const artHtml = ({ art, round, sprites, badge }) => sprites
            ? `<span class="g-feat-art is-sprite"><img src="${spriteSrc(sprites[0][0])}" alt="" decoding="async" data-sprite></span>`
            : badge
                ? `<span class="g-feat-art is-badge"><img src="${esc(art)}?_=${Math.floor(Date.now() / 3600000)}" alt="" decoding="async"></span>`
                : `<span class="g-feat-art${round ? ' is-round' : ''}"><img src="${esc(art)}" alt="" decoding="async"></span>`;
        els.featured.innerHTML = `<div class="g-feat-grid">${items.map((f) => `
                <a class="g-feat g-spot" ${f.info ? `href="/#${esc(f.o.key)}" data-key="${esc(f.o.key)}"` : `href="${esc(f.o.url)}"${openAttrs(f.o)}`} style="--feat: ${esc(f.accent)}">
                    <span class="g-feat-body">
                        ${artHtml(f)}
                        <span class="g-feat-text">
                            <span class="g-feat-head"><strong class="g-feat-name">${esc(f.o.name)}</strong></span>
                            <span class="g-feat-desc">${esc(f.blurb || f.o.desc)}</span>
                        </span>
                        <span class="g-btn g-feat-cta">${esc(f.cta)} ${f.o.external && !f.info ? '&nearr;' : '&rarr;'}</span>
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
    // Info cards open the object's view in place, same as picking it from Results
    els.featured.addEventListener('click', (e) => {
        const a = e.target.closest('.g-feat[data-key]');
        if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        select(objects.find((o) => o.key === a.dataset.key));
        header.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        if (!opts.quiet) remember(o); // ambient mode's tour stays out of Recently Viewed
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

    // ---------- Ambient mode ----------
    // For when this page is left up as an idle screen: after AMBIENT_AFTER ms with no input, run a
    // random effect every 7-15 s (touring the live previews, hover effects playing on their own,
    // titles re-decoding...). Any input ends it, undoes what's in flight and reselects what was showing.
    const AMBIENT_AFTER = 90000;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const ambientTag = document.getElementById('g-ambient');
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const shown = (el) => el && el.getClientRects().length > 0;
    const cleanups = new Set();
    let lastInput = Date.now();
    let ambient = false;
    let ambientFrom = null;
    let ambientTimer = null;
    let lastEffect = '';

    // Registers an undo for whatever an effect has in flight; returns a once-only finisher
    function track(undo) {
        const done = () => { if (cleanups.delete(done)) undo(); };
        cleanups.add(done);
        return done;
    }
    // Add a class for a while (the .is-ambient twins of the :hover rules in css/objects.css)
    function hold(el, cls, ms) {
        el.classList.add(cls);
        setTimeout(track(() => el.classList.remove(cls)), ms);
    }
    // setTimeout that ending ambient mode cancels
    function later(fn, ms) {
        const t = setTimeout(() => { cancel(); fn(); }, ms);
        const cancel = track(() => clearTimeout(t));
    }
    // Hold each element in turn
    function cascade(list, gap, ms) {
        list.forEach((el, i) => later(() => hold(el, 'is-ambient', ms), i * gap));
    }
    // Swap a text node through a terminal-style scramble back to the original
    function scramble(node, chars = '!@#$%^&*_+-=|;:<>?/~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const target = node.textContent;
        let n = 0;
        const done = track(() => { clearInterval(t); node.textContent = target; });
        const t = setInterval(() => {
            node.textContent = target.split('').map((c, i) => (/\s/.test(c) || i < n ? c : pick(chars))).join('');
            n += 0.4;
            if (n >= target.length) done();
        }, 45);
    }
    const panelLabel = (title) => {
        for (const c of title.childNodes) {
            if (c.nodeType === 3 && c.textContent.trim()) return c;
            if (c.nodeType === 1 && !c.classList.contains('g-meta') && c.firstChild) return c.firstChild;
        }
        return null;
    };
    const panels = () => Array.from(document.querySelectorAll('.g-rail > section, .g-side > section, .g-card, .g-objhead')).filter(shown);

    const EFFECTS = {
        // Step to the next page with a live preview (external hosts can't be framed), home included
        tour() {
            const list = objects.filter((o) => !o.external);
            select(list[(list.indexOf(current) + 1) % list.length], { noScroll: true, quiet: true });
        },
        // The hover light drifts across a panel on its own
        spot() {
            const el = pick(panels().filter((p) => p.classList.contains('g-spot')));
            if (!el) return;
            const r = el.getBoundingClientRect();
            const start = performance.now(), ms = 6000;
            const phase = Math.random() * Math.PI * 2;
            el.classList.add('is-ambient');
            let frame = requestAnimationFrame(function move(now) {
                const k = (now - start) / ms;
                el.style.setProperty('--mx', `${r.width * (0.5 + 0.42 * Math.sin(phase + k * Math.PI * 2))}px`);
                el.style.setProperty('--my', `${r.height * (0.5 + 0.38 * Math.sin(phase + k * Math.PI * 4))}px`);
                if (k < 1) frame = requestAnimationFrame(move);
                else done();
            });
            const done = track(() => { cancelAnimationFrame(frame); el.classList.remove('is-ambient'); });
        },
        // A scan line sweeps one panel
        scan() {
            const el = pick(panels());
            if (el) hold(el, 'g-ambient-scan', 2600);
        },
        // A panel title decodes itself again
        title() {
            const labels = panels().map((p) => p.querySelector(':scope > .g-panel-title')).filter(Boolean).map(panelLabel).filter(Boolean);
            if (labels.length) scramble(pick(labels));
        },
        // Comms channels light up left to right
        comms() {
            const chans = Array.from(document.querySelectorAll('.g-chan')).filter(shown);
            cascade(chans, 260, 700);
        },
        // Dossier stats light up one by one, numbers re-rolling
        dossier() {
            const stats = Array.from(document.querySelectorAll('.g-op-stat')).filter(shown);
            cascade(stats, 300, 900);
            stats.forEach((s) => {
                const b = s.querySelector('b');
                if (b && b.firstChild && /\d/.test(b.textContent)) scramble(b.firstChild, '0123456789');
            });
        },
        // The subject hologram glitches
        holo() {
            const el = document.querySelector('.g-home .hologram-container');
            if (shown(el)) hold(el, 'is-ambient', 2500);
        },
        // Featured cards (while home is showing) take a turn each
        featured() {
            if (els.featured.hidden) return EFFECTS.tour();
            cascade(Array.from(els.featured.querySelectorAll('.g-feat')), 700, 1400);
        },
        // The status-bar RadGotchi does something
        pet() {
            if (typeof RG === 'undefined') return;
            const [mood, anim, status] = pick([
                ['excited', 'rg-bounce', 'PERIMETER CLEAR'],
                ['cool', 'rg-wiggle', 'HOLDING THE FORT'],
                ['smart', 'rg-nod', 'INDEXING OBJECTS'],
                ['look_l', 'rg-nod', 'SCANNING SECTOR'],
                ['happy', 'rg-spin', 'STILL HERE']
            ]);
            RG.setMood(mood, { anim, status, duration: 3500 });
        }
    };
    // The tour comes up more often than any one effect; reduced motion keeps only the calm ones
    const BAG = ['tour', 'tour', 'tour', 'spot', 'spot', 'scan', 'title', 'comms', 'dossier', 'holo', 'featured', 'pet'];
    const CALM = ['tour', 'pet'];

    function nextEffect() {
        const names = (reduced.matches ? CALM : BAG).filter((n) => n !== lastEffect);
        lastEffect = pick(names);
        EFFECTS[lastEffect]();
        ambientTimer = setTimeout(nextEffect, 7000 + Math.random() * 8000);
    }
    function enterAmbient() {
        ambient = true;
        ambientFrom = current;
        if (ambientTag) ambientTag.hidden = false;
        ambientTimer = setTimeout(nextEffect, 1500);
    }
    function exitAmbient() {
        ambient = false;
        clearTimeout(ambientTimer);
        if (ambientTag) ambientTag.hidden = true;
        cleanups.forEach((done) => done());
        if (ambientFrom && current !== ambientFrom) select(ambientFrom, { noScroll: true, quiet: true });
    }
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => window.addEventListener(t, (e) => {
        if (!e.isTrusted) return;
        lastInput = Date.now();
        if (ambient) exitAmbient();
    }, { capture: true, passive: true }));
    setInterval(() => {
        if (!ambient && !document.hidden && Date.now() - lastInput > AMBIENT_AFTER) enterAmbient();
    }, 1000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) return;
        lastInput = Date.now();
        if (ambient) exitAmbient();
    });

    // ---------- Boot ----------
    refresh();
    const initial = fromHash();
    select(initial || objectByKey(HOME), { noScroll: !initial });
})();
