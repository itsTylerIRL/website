/* Page scripts for index.html: the homepage is the Objects index, a catalog of every system page on the site
   with a live preview of the selected one. The tylerirl.com object (key 'home') is the default; it's this page,
   so instead of a preview it spotlights featured pages (FEATURED). The Host panel (#g-home) is static markup. */

// ---------- Catalog (edit here to add / update pages) ----------
// type: 'collection' | 'program' | 'tool' | 'page' | 'live' | 'external'
// live: a live connection (url: the profile); dossier: the Host dossier card it mirrors in the preview, and
// its row's status line comes from that card's script (js/presence.js, js/music.js, js/socials.js, js/index.js)
// workspace: true once the page is on the DEEPDISH workspace template (css/workspace.css)
// embed: the live preview frames the page in embed mode (js/embed.js): it's used in place at full size and
// its data-embed="side" panels show under Results (the page has to load js/embed.js first)
// icon: small icon from assets/object-icons/ (leave empty to show the name's initial)
// screen: the live preview pane's title while the object is showing (else 'Live Preview')
// tag: the Results subtitle when there's no live line for the object (js/live-rows.js); the path moves to its tooltip
// hidden: true keeps an entry archived here but out of results, search, navigation and counts.
const OBJECTS = [
    { key: 'home', name: 'Tyler (in real life)', url: '/', type: 'page', workspace: true, icon: '/assets/object-icons/vip.webp', desc: 'home base: welcome to my personal website', tag: 'you are here · home base' },
    { key: 'gallery', name: 'NFT Gallery', url: '/pages/gallery.html', type: 'collection', workspace: true, embed: true, icon: '/assets/object-icons/oh-ive-seen.webp', desc: 'non fungible tylers: PFPs, schizoposters and remilia pieces with a zoomable viewer', screen: 'Vault Viewer', tag: 'pfps, schizoposters + remilia · zoom in close' },
    { key: 'cancel', name: 'the cancel is coming', url: 'https://cancel.tylerirl.com', type: 'external', icon: '/assets/object-icons/cancel.webp', desc: 'neochibi roguelite autobattler', screen: 'Crown Leaderboard', tag: 'neochibi roguelite · fight for the crown' },
    { key: 'network', name: 'the network is growing', url: 'https://clicker.tylerirl.com', type: 'external', icon: '/assets/object-icons/network.webp', desc: 'neochibi idle clicker, sibling to the cancel is coming', screen: 'Clicker Uplink', tag: 'click, grow, repeat · it never stops growing' },
    { key: 'likes', name: 'Things I Like', url: '/pages/likes.html', type: 'collection', workspace: true, embed: true, icon: '/assets/object-icons/likes-full.webp', desc: 'crypto, tech and fun, catalogued around a 3D icon cloud', screen: 'Signal Cloud', tag: 'a spinning cloud of good taste' },
    { key: 'kol', name: 'Kingdom of Loathing', url: '/pages/kol.html', type: 'collection', workspace: true, embed: true, icon: '/assets/object-icons/kol.webp', desc: 'TylerIRL in the Kingdom: live moons and calendar, display case with mall prices and what\'s new in KoLmafia', screen: 'Kingdom Uplink', tag: 'radbro of the kingdom since 2005' },
    { key: 'rocketry', name: 'Missile Program', url: '/pages/rocketry.html', type: 'program', workspace: true, embed: true, icon: '/assets/object-icons/rocketry.webp', desc: 'high power rocketry: vehicle builds, milestones, flight footage and launch status', screen: 'Range Control', tag: 'builds, burns + flight footage · go for launch' },
    { key: 'deepdish', hidden: true, name: 'DeepDish', url: '/pages/deepdish.html', type: 'program', icon: '/assets/object-icons/deepdish.webp', desc: 'custom computer build, monitoring and the projects that run on it' },
    { key: 'ocs', name: 'DeepDish OCS', url: '/pages/deepdish_ocs.html', type: 'program', workspace: true, embed: true, icon: '/assets/object-icons/ocs-sentinel.webp', desc: 'optical control system: a face-tracking animated eye for the Gakken Worldeye, with technical docs', screen: 'Optic Feed', tag: 'a robot eye that watches you back' },
    { key: 'ocs-demo', hidden: true, name: 'OCS Web UI Demo', url: '/pages/OCS-web-ui-demo.html', type: 'program', icon: '/assets/object-icons/ocs-demo.webp', desc: 'interactive demo of the DeepDish OCS web interface' },
    { key: 'top', name: 'DeepDish TOP', url: '/pages/deepdish_top.html', type: 'program', workspace: true, embed: true, icon: '/assets/object-icons/top.webp', desc: 'terminal operations panel: host and cluster monitoring, Docker, OCS and a technical reference', screen: 'Ops Console', tag: 'host + cluster telemetry · all systems nominal' },
    { key: 'sin', name: 'RADactedBot', url: '/pages/deepdish_sin.html', type: 'program', workspace: true, embed: true, icon: '/assets/object-icons/sin-defcon4.webp', desc: 'Discord and Telegram bot: economy, games, relays, LLM agents and moderation', screen: 'Bot Intel', tag: 'economy, games + llm agents · discord / telegram' },
    { key: 'radgotchi', name: 'RadGotchi', url: '/pages/deepdish_rg.html', type: 'program', workspace: true, embed: true, icon: '/assets/object-icons/radgotchi-shades.webp', desc: 'desktop + web pixel-art companion: system telemetry, local-AI chat with tools, XP and a LAN mesh, with technical docs', screen: 'Companion Link', tag: 'a pixel radbro that lives on your desktop' },
    { key: 'grep', hidden: true, name: 'grep dojo', url: '/pages/grep.html', type: 'tool', icon: '/assets/object-icons/grep.webp', desc: 'master grep through interactive terminal challenges' },
    { key: 'digiflip', name: 'DigiFlip', url: '/pages/digimon.html', type: 'tool', workspace: true, embed: true, icon: '/assets/object-icons/digiflip.webp', desc: 'digimon ver.20th virtual pet for the flipper zero, in your browser', screen: 'Device Bay', tag: 'digimon v20th for the flipper zero · now in wasm' },
    { key: 'timer', name: 'speedcube timer', url: '/pages/timer.html', type: 'tool', workspace: true, embed: true, icon: '/assets/object-icons/timer.webp', desc: 'minimal speedcube timer with session stats saved in your browser', screen: 'Solve Station', tag: 'hold space · release · solve' },
    { key: 'markets', name: 'Neochibi Markets', url: '/pages/markets.html', type: 'tool', workspace: true, embed: true, icon: '/assets/object-icons/markets.webp', desc: 'live floor, volume and price trends for the neochibi collections, plus the CULT chart', screen: 'Market Terminal', tag: 'neochibi floors, volume + the CULT chart' },
    { key: 'cornhub', hidden: true, name: 'CornHub', url: '/pages/cornhub.html', type: 'page', icon: '/assets/object-icons/cornhub.webp', desc: 'cornhub intl inc. - yet another shitcoin' },
    { key: 'live-discord', name: 'Discord', url: 'https://discordapp.com/users/367487663990898689', type: 'live', dossier: 'discord', icon: '/assets/object-icons/live-discord.svg', desc: 'live status: online, idle or gaming, custom status, and when last seen', screen: 'Comms Channel', tag: 'dm open · say hi' },
    { key: 'live-music', name: 'TIDAL', url: 'https://www.last.fm/user/tylerIRL', type: 'live', dossier: 'music', icon: '/assets/object-icons/live-tidal.svg', desc: 'now playing, or the last track played, by way of Last.fm scrobbles', screen: 'Audio Feed', tag: 'what\'s in the headphones' },
    { key: 'live-steam', name: 'Steam', url: 'https://steamcommunity.com/id/11111x11111', type: 'live', dossier: 'steam', icon: '/assets/object-icons/live-steam.svg', desc: 'online or in-game, and recently played games with hours', screen: 'Game Feed', tag: 'what\'s on the second monitor' },
    { key: 'live-x', name: 'X', url: 'https://x.com/itsTylerIRL', type: 'live', dossier: 'x', icon: '/assets/object-icons/live-x.svg', desc: 'the latest post, with followers and post counts', screen: 'Broadcast Feed', tag: 'posting through it' },
    { key: 'live-github', name: 'GitHub', url: 'https://github.com/itstylerirl', type: 'live', dossier: 'github', icon: '/assets/object-icons/live-github.svg', desc: 'a year of contributions, with streaks and active days', screen: 'Commit Feed', tag: 'commits, streaks + green squares' },
    { key: 'live-reminet', name: 'RemiNET', url: 'https://remilia.net/~tyler', type: 'live', dossier: 'reminet', icon: '/assets/remilianet-symbol.svg', desc: 'social credit, frens, views, beetles and pokes on remilia.net', screen: 'Credit Feed', tag: 'social credit, frens + beetles' },
    { key: 'nosfyl', name: '~nosfyl', url: 'https://nosfyl.tylerirl.com', type: 'external', icon: '/assets/object-icons/nosfyl.webp', desc: 'urbit star', screen: 'Star Relay', tag: 'urbit star · the galaxy\'s middle child' },
    { key: 'raddem', name: '~raddem-tidwyt', url: 'http://urbit.tylerirl.com', type: 'external', icon: '/assets/object-icons/raddem.webp', desc: 'urbit planet', screen: 'Planet Relay', tag: 'urbit planet · home ship' },
    { key: 'guest-book', name: 'Guest Book', url: '/pages/guest-book.html', type: 'page', workspace: true, embed: true, icon: '/assets/object-icons/guest-book.webp', desc: 'leave a message and connect via urbit', screen: 'Comms Relay', tag: 'sign the book · uplink via urbit' }
];

// ---------- Featured pages (shown while tylerirl.com is selected; edit here to change the spotlight) ----------
// key: an OBJECTS key (name, link and description come from there); art: image (round: ringed circle);
// sprites: [frame names, ms per frame] plays RadGotchi sprites from assets/rg/sprites/ instead of art;
// badge: art is a KoL avatar (black ink on white), cropped to the character, tinted and refreshed hourly;
// accent: r,g,b; cta: button label; blurb: the card's short subtext (the full desc stays in the header)
// info: the card selects the object here (its info view, which links out) instead of opening it
// live: the card's subtext shows the object's live telemetry (js/live-rows.js) once it lands, else the blurb
const FEATURED = [
    { key: 'cancel', art: '/assets/featured/cancel.webp', accent: '255,222,23', cta: 'INFO', info: true, blurb: 'roguelite autobattler' },
    { key: 'network', art: '/assets/featured/network.webp', accent: '255,121,198', cta: 'PLAY', blurb: 'neochibi idle clicker' },
    { key: 'raddem', art: '/assets/featured/raddem.webp', round: true, accent: '98,160,255', cta: 'VISIT', live: true, blurb: 'urbit planet' },
    { key: 'kol', art: 'https://sigs.kingdomofloathing.com/player_571951/mode_avatar/playerfeed_571951.gif', badge: true, accent: '139,233,253', cta: 'INFO', info: true, blurb: 'live moons, display case and KoLmafia' },
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
        live: { name: 'Live', tone: 'cyan' },
        external: { name: 'External', tone: 'red' }
    };
    const typeName = (t) => (TYPES[t] || {}).name || t;
    const toneOf = (t) => (TYPES[t] || {}).tone || 'muted';
    const HOME = 'home'; // this page: shows the hero instead of a live preview
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Virtual viewport the live preview renders pages at before scaling down: always VIEW_W wide, and as
    // tall as the panel's shape makes it (scalePreview), so the page fills the panel edge to edge
    const VIEW_W = 1440;
    let viewH = 900;

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
        keys: document.getElementById('g-keys'),
        // Where an embedded page's column panels go: its side column under Results, its left column (rail)
        // between the explorer and Recently Viewed
        embedSlots: { side: document.getElementById('g-embed-side'), rail: document.getElementById('g-embed-rail') },
        statusObjects: document.getElementById('g-status-objects'),
        statusFilter: document.getElementById('g-status-filter'),
        clock: document.getElementById('g-clock')
    };

    const objects = OBJECTS.map((o, i) => {
        // Live connections open their profile on another site, like external hosts
        const external = o.type === 'external' || o.type === 'live';
        let host = 'tylerirl.com';
        try { host = new URL(o.url, location.href).host.replace(/^www\./, '') || host; } catch (_) {}
        return {
            ...o,
            id: 'OBJ-' + String(i + 1).padStart(4, '0'),
            external,
            host: external ? host : 'tylerirl.com',
            format: o.type === 'live' ? 'live' : external ? 'external' : (o.workspace ? 'workspace' : 'legacy')
        };
    }).filter((o) => !o.hidden);
    const types = Object.keys(TYPES).filter((t) => objects.some((o) => o.type === t));

    let type = 'all';
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

    const visible = () => objects.filter((o) => type === 'all' || o.type === type);
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
    // A live row shows it under the name in place of its tag (OBJECTS tag), else the path; the path is always the tooltip.
    // Rows with a live source say "acquiring signal" until it answers (or for 10 s, then fall back to the
    // tag), and their first line decodes in (js/arrive.js)
    const live = {};
    const LIVE_KEYS = new Set(['home', 'likes', 'kol', 'cancel', 'radgotchi', 'digiflip', 'timer', 'nosfyl', 'raddem',
        ...objects.filter((o) => o.type === 'live').map((o) => o.key)]);
    const waiting = new Set(LIVE_KEYS);
    setTimeout(() => {
        const late = [...waiting];
        waiting.clear();
        late.forEach((key) => window.ObjectsLive(key, null));
    }, 10000);
    const pathOf = (o) => (o.external ? o.host : o.url);
    const descHtml = (o) => live[o.key]
        ? `<i class="g-live-dot tone-${esc(live[o.key].tone || 'green')}"></i><span class="g-live-text">${esc(live[o.key].text)}</span>`
        : waiting.has(o.key) ? '<span class="g-acquire">acquiring signal&hellip;</span>' : esc(o.tag || pathOf(o));
    // Each line is also announced as 'tirl:live' (the home object's NOW strip, js/now.js; the Signal Log,
    // js/signals.js; the boot screen in index.html)
    window.ObjectsLive = (key, text, tone) => {
        if (text) live[key] = { text, tone }; else delete live[key];
        const first = !!text && waiting.delete(key);
        window.dispatchEvent(new CustomEvent('tirl:live', { detail: { key, text: text || null, tone } }));
        const desc = els.results.querySelector(`.g-res[data-key="${CSS.escape(key)}"] .g-res-desc`);
        const o = objects.find((x) => x.key === key);
        if (!desc || !o) return;
        desc.classList.toggle('is-live', !!live[key]);
        desc.innerHTML = descHtml(o);
        if (first) window.tirlArrive?.arrive(desc.querySelector('.g-live-text'));
        const featDesc = els.featured.querySelector(`.g-feat[data-live="${CSS.escape(key)}"] .g-feat-desc`);
        if (featDesc) featDesc.innerHTML = featDescHtml(FEATURED.find((f) => f.key === key), o);
    };
    const featDescHtml = (f, o) => f.live && live[o.key]
        ? `<i class="g-live-dot tone-${esc(live[o.key].tone || 'green')}"></i>${esc(live[o.key].text)}`
        : esc(f.blurb || o.desc);
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
        const formatLabel = { workspace: 'DEEPDISH WORKSPACE', legacy: 'LEGACY TEMPLATE', live: 'LIVE CONNECTION', external: 'EXTERNAL HOST' }[o.format];
        const info = `<p class="g-summary">${esc(o.desc)}</p>
            <div class="g-objmeta">
                <span>PATH</span><b>${esc(o.url)}</b>
                <span>FORMAT</span><b class="tone-${o.format === 'workspace' ? 'green' : o.format === 'legacy' ? 'orange' : o.format === 'live' ? 'cyan' : 'red'} g-format">${formatLabel}</b>
                <span>HOST</span><b>${esc(o.host)}</b>
            </div>`;
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
            ${o.key === HOME ? `<div class="g-objsplit"><div class="g-objinfo">${info}</div><div class="g-player-sso" id="g-player-sso"></div></div>
            <div class="g-now" id="g-now"></div>
            <div class="g-player" id="g-player"></div>` : info}`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
        // Home: the player link to the games (js/player.js): sign-in beside the description, stats under it; and
        // between them, what's live right now and what changed since your last visit (js/now.js)
        if (o.key === HOME) {
            window.TirlPlayer?.mount(header.querySelector('#g-player-sso'), header.querySelector('#g-player'));
            window.TirlNow?.mount(header.querySelector('#g-now'));
        }
    }

    // ---------- Live preview ----------
    // Internal pages render in a scaled-down iframe (VIEW_W x viewH virtual viewport); external hosts
    // may refuse to be framed, so they get a "preview disabled" screen. Objects in NATIVE draw their own
    // readable preview instead (Cancel's leaderboard). Embed pages (OBJECTS embed: true)
    // load unscaled and live, and hand their column panels over (mountPanels). Loading waits a beat so
    // arrowing through the list doesn't spin up every page.
    const NATIVE = {
        cancel: { title: 'Monthly Leaderboard', renderer: () => window.CancelPreview }
    };
    // Live connections preview their Host dossier card, enlarged and kept in step with it
    objects.filter((o) => o.type === 'live').forEach((o) => {
        NATIVE[o.key] = { title: 'Live Connection', renderer: () => ({ render: (screen, meta) => mirrorCard(o, screen, meta) }) };
    });
    // A copy of the dossier card that follows it: small changes (a ticking clock, a progress bar) are applied to
    // the matching node in the copy, so images and animations aren't restarted; a full redraw of the card is
    // copied whole, reusing the copy's images that are still there. Returns the cleanup.
    function mirrorCard(o, screen, meta) {
        const src = document.querySelector(`#g-dossier [data-slide="${o.dossier}"]`);
        screen.innerHTML = `<div class="g-live-mirror">
                <div class="g-live-mirror-card"></div>
                <a class="g-btn g-visit" href="${esc(o.url)}" target="_blank" rel="noopener">OPEN ${esc(o.host)} &nearr;</a>
            </div>`;
        const slot = screen.querySelector('.g-live-mirror-card');
        meta.textContent = 'LIVE · FROM THE HOST DOSSIER';
        let copy = null;
        function full() {
            if (!src || src.hidden) {
                copy = null;
                slot.innerHTML = '<div class="g-preview-wait">WAITING FOR SIGNAL&hellip;</div>';
                return;
            }
            const keep = new Map([...slot.querySelectorAll('img')].map((img) => [img.src, img]));
            copy = src.cloneNode(true);
            copy.removeAttribute('id');
            copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            copy.querySelectorAll('img').forEach((img) => {
                const old = keep.get(img.src);
                if (old) { img.replaceWith(old); keep.delete(img.src); }
            });
            slot.replaceChildren(copy);
        }
        const pathTo = (node) => {
            const path = [];
            while (node && node !== src) {
                if (!node.parentNode) return null;
                path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
                node = node.parentNode;
            }
            return node === src ? path : null;
        };
        const twinOf = (node) => {
            const path = pathTo(node);
            return path && copy && path.reduce((n, i) => n && n.childNodes[i], copy);
        };
        const watch = new MutationObserver((list) => {
            for (const m of list) {
                if (!copy || (m.target === src && m.type === 'childList') || (m.target === src && m.attributeName === 'hidden')) return full();
                const twin = twinOf(m.target);
                if (!twin) return full();
                if (m.type === 'characterData') twin.data = m.target.data;
                else if (m.type === 'childList') twin.replaceChildren(...[...m.target.childNodes].map((n) => n.cloneNode(true)));
                else if (m.attributeName !== 'id') {
                    const v = m.target.getAttribute(m.attributeName);
                    if (v === null) twin.removeAttribute(m.attributeName); else twin.setAttribute(m.attributeName, v);
                }
            }
        });
        if (src) watch.observe(src, { subtree: true, childList: true, characterData: true, attributes: true });
        full();
        return () => watch.disconnect();
    }
    let previewTimer = null;
    let clearNativePreview = null;
    let deepHash = null;
    // The embedded page showing, once framed (js/embed.js reports through TirlEmbedHost with its window), and
    // its latest status line
    let embedEl = null;
    let embedStatus = '';
    // Channel change (css/objects.css): static while the next object connects, then the screen switches on
    function tune() {
        els.preview.classList.remove('is-on');
        els.preview.classList.add('is-tuning');
    }
    function tuned() {
        els.preview.classList.remove('is-tuning', 'is-on');
        void els.preview.offsetWidth; // restart the switch-on
        els.preview.classList.add('is-on');
    }
    els.preview.addEventListener('animationend', (e) => { if (e.target === els.screen) els.preview.classList.remove('is-on'); });
    function scalePreview() {
        if (els.screen.classList.contains('is-native') || els.screen.classList.contains('is-embed')) return 1;
        const r = els.preview.getBoundingClientRect();
        const k = Math.max(0.05, r.width / VIEW_W);
        viewH = Math.max(1, Math.round(r.height / k));
        els.screen.style.height = `${viewH}px`;
        els.screen.style.setProperty('--view-h', `${viewH}px`);
        els.screen.style.transform = `translate(-50%, -50%) scale(${k})`;
        return k;
    }
    function renderPreview(o) {
        clearTimeout(previewTimer);
        if (clearNativePreview) { clearNativePreview(); clearNativePreview = null; }
        const native = NATIVE[o.key]?.renderer() ? NATIVE[o.key] : null;
        const nativeClasses = ['is-native', ...Object.keys(NATIVE).map((k) => 'is-' + k)];
        els.preview.classList.remove(...nativeClasses, 'is-embed');
        els.screen.classList.remove(...nativeClasses, 'is-embed', 'ready');
        if (native) els.preview.classList.add('is-native', 'is-' + o.key);
        embedEl = null;
        embedStatus = '';
        keys();
        tune();
        const embed = !!o.embed && !o.external;
        if (embed) {
            els.preview.classList.add('is-embed');
            els.screen.classList.add('is-embed');
            els.screen.style.transform = '';
            els.screen.style.height = '';
        }
        // tylerirl.com is this page (framing it would recurse): spotlight what's new instead
        const home = o.key === HOME;
        els.preview.hidden = home;
        els.featured.hidden = !home;
        // Each object names its screen; the name decodes in on the switch (js/arrive.js)
        const title = home ? 'Featured' : o.screen || native?.title || 'Live Preview';
        if (els.previewTitle.textContent !== title) {
            els.previewTitle.textContent = title;
            window.tirlArrive?.arrive(els.previewTitle);
        }
        if (home) {
            els.preview.classList.remove('is-tuning');
            els.screen.replaceChildren(); // unload the last framed page
            renderFeatured();
            return;
        }
        if (native) {
            els.screen.classList.remove('offline');
            els.screen.classList.add('is-native', 'is-' + o.key);
            els.screen.style.transform = '';
            els.screen.style.height = '';
            clearNativePreview = native.renderer().render(els.screen, els.previewMeta, o.url);
            tuned();
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
            tuned();
            return;
        }
        els.screen.classList.remove('offline');
        els.screen.innerHTML = '<div class="g-preview-wait">ESTABLISHING LINK&hellip;</div>';
        els.previewMeta.textContent = 'CONNECTING…';
        const k = scalePreview();
        previewTimer = setTimeout(() => {
            if (current !== o) return;
            const frame = document.createElement('iframe');
            frame.src = embed ? `${o.url}?embed${deepHash ? '#' + encodeURIComponent(deepHash) : ''}` : o.url;
            frame.title = `${o.name} preview`;
            if (embed) {
                embedFrame(o, frame);
                els.screen.replaceChildren(frame);
                embedEl = frame;
                return;
            }
            frame.tabIndex = -1;
            frame.setAttribute('aria-hidden', 'true');
            frame.addEventListener('load', () => {
                if (current !== o) return;
                els.screen.classList.add('ready');
                els.previewMeta.textContent = `LIVE · ${VIEW_W}×${viewH} @ ${Math.round(k * 100)}%`;
                tuned();
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
    // An embedded page is live: no click-through cover, it can take the keyboard, and once it has loaded its
    // side panels move under Results. This page's cursor stands aside over it while the page draws its own.
    function embedFrame(o, frame) {
        let unmount = null;
        const cursor = document.querySelector('.custom-cursor');
        const showCursor = (on) => { if (cursor) cursor.style.opacity = on ? '1' : '0'; };
        frame.addEventListener('pointerenter', () => showCursor(false));
        frame.addEventListener('pointerleave', () => showCursor(true));
        frame.addEventListener('load', () => {
            if (current !== o || unmount) return;
            els.screen.classList.add('ready');
            els.previewMeta.textContent = embedStatus || 'LIVE · IN PLACE';
            tuned();
            keys();
            unmount = mountPanels(o, frame) || (() => {});
            // Pages that ask for it take the keyboard straight away (space arms the timer) unless you're typing
            // here; ← → / and Escape still reach this page from inside them (js/embed.js)
            const el = document.activeElement;
            let wants = false;
            try { wants = !!frame.contentWindow.TirlEmbed?.focus; } catch (_) {}
            if (wants && !ambient && !(el && el.closest('input, textarea, select, [contenteditable="true"]'))) frame.contentWindow.focus();
        });
        clearNativePreview = () => {
            if (unmount) unmount();
            if (frame.matches(':hover')) showCursor(true); // switched away with the pointer still over it
        };
    }
    // Where the keyboard goes while a page is embedded: the chip in the preview's title bar says so and hands it
    // over on a click, and the preview's corners light up while the page has it
    function keys() {
        const on = !!embedEl && document.activeElement === embedEl;
        els.preview.classList.toggle('has-keys', on);
        els.keys.hidden = !embedEl || !els.screen.classList.contains('ready');
        els.keys.textContent = on ? 'KEYS ▸ PAGE' : 'KEYS ▸ HOME';
        els.keys.title = on ? 'The page has the keyboard (Escape goes home)' : 'Click to hand the keyboard to the page';
        els.keys.setAttribute('aria-pressed', on);
    }
    window.addEventListener('blur', () => setTimeout(keys));
    window.addEventListener('focus', keys);
    document.addEventListener('focusin', keys);
    els.keys.addEventListener('mousedown', (e) => e.preventDefault()); // leave focus where it is until the click decides
    els.keys.addEventListener('click', () => {
        if (!embedEl) return;
        if (document.activeElement === embedEl) embedEl.blur();
        else embedEl.contentWindow.focus();
        keys();
    });
    // The embedded page's column panels, moved (not copied) into shadow roots in this page's columns: its scripts
    // keep the elements they hold, and its stylesheets, loaded in each shadow root, style them without reaching
    // this page (css/workspace.css, .is-embed-side). Shown once those have loaded. Returns the cleanup.
    function mountPanels(o, frame) {
        let api = null;
        try { api = frame.contentWindow.TirlEmbed; } catch (_) {}
        if (!api) return null;
        let live = true;
        const filled = Object.entries(els.embedSlots).filter(([col]) => api[col] && api[col].length).map(([col, slot]) => {
            const host = slot.querySelector('.g-embed-host');
            const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
            const links = api.styles.map((href) => Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
            const wrap = document.createElement('div');
            wrap.className = 'gotham is-embed-side';
            const column = document.createElement('aside');
            column.className = col === 'rail' ? 'g-rail' : 'g-side';
            column.append(...api[col]);
            wrap.append(column);
            root.replaceChildren(...links, wrap);
            const label = slot.querySelector('.g-embed-label b');
            label.textContent = o.name;
            // Shown with the switch-on: the panels slide in and their titles decode (js/arrive.js)
            Promise.all(links.map((l) => new Promise((done) => { l.onload = l.onerror = done; }))).then(() => {
                if (!live) return;
                slot.hidden = false;
                window.tirlArrive?.arrive(label);
                column.querySelectorAll('.g-panel-title').forEach((t) => window.tirlArrive?.arrive(t));
            });
            return { slot, root };
        });
        return () => {
            live = false;
            filled.forEach(({ slot, root }) => { slot.hidden = true; root.replaceChildren(); });
        };
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
                <a class="g-feat g-spot" ${f.info ? `href="/#${esc(f.o.key)}" data-key="${esc(f.o.key)}"` : `href="${esc(f.o.url)}"${openAttrs(f.o)}`} style="--feat: ${esc(f.accent)}"${f.live ? ` data-live="${esc(f.o.key)}"` : ''}>
                    <span class="g-feat-body">
                        ${artHtml(f)}
                        <span class="g-feat-text">
                            <span class="g-feat-head"><strong class="g-feat-name">${esc(f.o.name)}</strong></span>
                            <span class="g-feat-desc">${featDescHtml(f, f.o)}</span>
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
        if (!current || current.key === HOME || els.screen.classList.contains('is-embed')) return;
        const k = scalePreview();
        if (els.screen.classList.contains('ready')) els.previewMeta.textContent = `LIVE · ${VIEW_W}×${viewH} @ ${Math.round(k * 100)}%`;
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
    // opts.hash deep-links an embedded page (#piece, #section: the command palette), loading it there or, if it's
    // already showing, sending it there
    function select(o, opts = {}) {
        if (!o) return;
        const changed = o !== current;
        current = o;
        deepHash = opts.hash || null;
        renderHeader(o);
        if (changed) renderPreview(o);
        else if (deepHash && embedEl) {
            try {
                const w = embedEl.contentWindow;
                if (w.location.hash.slice(1) === deepHash) w.dispatchEvent(new w.HashChangeEvent('hashchange'));
                else w.location.hash = deepHash;
            } catch (_) {}
        }
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

    // The brand, the "tylerirl" crumb and the Host hologram point at "/", which is this page: select home
    // instead of reloading (the hologram also brings the object header + featured cards into view)
    document.querySelectorAll('.g-topbar a[href="/"], .g-home a[href="/"]').forEach((a) => a.addEventListener('click', (e) => {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        select(objectByKey(HOME));
        if (a.closest('.g-home')) header.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));

    // ---------- Search + keyboard ----------
    // The search box is the command palette's launcher (js/palette.js): objects and what's inside them
    const openPalette = () => { if (window.TirlPalette) window.TirlPalette.open(); };
    els.search.readOnly = true;
    els.search.addEventListener('focus', () => { els.search.blur(); openPalette(); });
    // Also run for keys an embedded page passes up (js/embed.js); true when the key was used
    function command(key) {
        if (key === '/') openPalette();
        else if (key === 'ArrowLeft' || key === 'ArrowRight') step(key === 'ArrowLeft' ? -1 : 1);
        // Escape: back to the home object (other pages go back to this one, js/escape-home.js)
        else if (key === 'Escape' && current && current.key !== HOME) select(objectByKey(HOME));
        else if (key === 'Enter' && current) {
            const open = header.querySelector('.g-visit');
            if (open) open.click();
        }
        else return false;
        return true;
    }
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
        if (el && el.closest('input, textarea, [contenteditable="true"]')) return;
        if (e.key === 'Enter' && el && el.closest('button, a')) return;
        if (command(e.key) && e.key !== 'Escape' && e.key !== 'Enter') e.preventDefault();
    });

    // ---------- Status bar ----------
    function updateStatus() {
        els.statusObjects.textContent = `${objects.length} OBJECTS`;
        els.statusFilter.textContent = `TYPE: ${(type === 'all' ? 'ALL' : typeName(type)).toUpperCase()} · ${visible().length} SHOWN`;
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
    function noteInput() {
        lastInput = Date.now();
        if (ambient) exitAmbient();
    }
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => window.addEventListener(t, (e) => {
        if (e.isTrusted) noteInput();
    }, { capture: true, passive: true }));
    // Called from inside an embedded page (js/embed.js): its input counts here, it passes up this page's keys,
    // and it reports where it is (status: the preview's title bar) and what just happened (event: the ticker,
    // its row in Results, and with a mood, the status-bar RadGotchi). Reports from a page no longer showing are dropped.
    const fromShowing = (win) => !!embedEl && win === embedEl.contentWindow;
    window.TirlEmbedHost = {
        activity: noteInput,
        key: (k) => { noteInput(); command(k); },
        status(win, text) {
            const t = String(text || '').trim();
            if (!fromShowing(win) || !t || t === embedStatus) return;
            embedStatus = t;
            if (!els.screen.classList.contains('ready')) return; // shown once the page has loaded
            els.previewMeta.textContent = t;
            window.tirlArrive?.arrive(els.previewMeta);
        },
        event(win, e) {
            if (!fromShowing(win) || !e) return;
            const text = new DOMParser().parseFromString(String(e.html || ''), 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
            if (!text) return;
            window.tirlTicker?.push({ text: `${current.name} · ${text}`, tone: e.tone });
            window.tirlLog?.add({ key: current.key, text, tone: e.tone });
            const row = els.results.querySelector(`.g-res[data-key="${CSS.escape(current.key)}"]`);
            if (row) {
                row.classList.remove('is-ping');
                void row.offsetWidth; // restart the ping
                row.classList.add('is-ping');
            }
            // priority: the pet's own reactions (to the keys that made the news) don't talk over it
            if (e.mood && typeof RG !== 'undefined') RG.setMood(e.mood, { anim: 'rg-bounce', status: e.status, duration: 4000, priority: true });
        }
    };
    // For the command palette (js/palette.js), the Signal Log (js/signals.js)
    // and the NOW strip (js/now.js)
    window.TirlObjects = {
        objects,
        live,
        iconHtml,
        typeName,
        select: (key, hash) => { const o = objectByKey(key); if (o) select(o, { hash }); }
    };
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
    window.dispatchEvent(new CustomEvent('tirl:boot', { detail: { id: 'objects', status: `${objects.length} MOUNTED` } }));
})();
