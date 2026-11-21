/* Page scripts for gallery.html: the DEEPDISH NFT gallery workspace, built from the cards in #gallery-data.
   The centre column has two views (#gotham[data-view]):
   - gallery (the default): every piece that matches the filters as one continuous grid
   - piece: one piece clicked in the gallery, in the media viewer (zoom & pan) with the rest as a filmstrip under
     it; "← GALLERY", Escape or a filter goes back
   Around it: the collection logos, artists and recently viewed (left), and the Properties panel (right), which describes
   the open piece or, in the gallery, what's showing.
   Links: #<piece-slug> opens a piece, #tyler / #schizo / #remilia a collection, no hash the whole gallery. */
(function() {
    const data = document.getElementById('gallery-data');
    const header = document.getElementById('g-objhead');
    if (!data || !header) return;

    // Collection keys (data-category) -> display name + status tone
    // logo: the collection's button in the left column's Collections panel
    const COLLECTIONS = {
        tyler: { name: 'Tyler PFPs', tone: 'blue', logo: '/assets/gallery-logos/tyler.webp' },
        schizo: { name: 'Schizoposters', tone: 'red', logo: '/assets/gallery-logos/schizo.webp' },
        remilia: { name: 'Remilia', tone: 'orange', logo: '/assets/gallery-logos/remilia.webp' }
    };
    const colName = (c) => (COLLECTIONS[c] || {}).name || c;
    const toneOf = (c) => (COLLECTIONS[c] || {}).tone || 'muted';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
    const shortHex = (h) => h.length > 12 ? h.slice(0, 6) + '…' + h.slice(-4) : h;

    const els = {
        root: document.getElementById('gotham'),
        logos: document.getElementById('g-logos'),
        logosMeta: document.getElementById('g-logos-meta'),
        artists: document.getElementById('g-artists'),
        artistsMeta: document.getElementById('g-artists-meta'),
        activity: document.getElementById('g-activity'),
        grid: document.getElementById('g-thumbs'),
        gridPane: document.getElementById('g-grid-pane'),
        viewerPane: document.getElementById('g-viewer-pane'),
        strip: document.getElementById('g-strip'),
        resultsMeta: document.getElementById('g-results-meta'),
        props: document.getElementById('g-props'),
        propsMeta: document.getElementById('g-props-meta'),
        links: document.getElementById('g-links'),
        search: document.getElementById('g-search'),
        crumb: document.getElementById('g-crumb'),
        crumbCol: document.getElementById('g-crumb-col'),
        stage: document.getElementById('g-stage'),
        frame: document.getElementById('g-frame'),
        img: document.getElementById('g-view-img'),
        vid: document.getElementById('g-view-vid'),
        zoom: document.getElementById('g-zoom'),
        viewerMeta: document.getElementById('g-viewer-meta'),
        main: document.getElementById('g-main'),
        statusObjects: document.getElementById('g-status-objects'),
        statusFilter: document.getElementById('g-status-filter'),
        clock: document.getElementById('g-clock')
    };

    // ---------- Pieces ----------
    const seen = new Set();
    const pieces = Array.from(data.querySelectorAll('.pfp-card')).map((card, i) => {
        const d = card.dataset;
        const media = card.querySelector('img, video');
        const isVideo = media.tagName === 'VIDEO';
        // OpenSea item URLs end in /<chain>/<contract>/<token>
        const m = (d.opensea || d.etherscan || '').match(/(0x[0-9a-fA-F]{40})(?:\/|\?a=)(\d+)/);
        let slug = slugify(d.name || 'piece');
        while (seen.has(slug)) slug += '-' + (i + 1);
        seen.add(slug);
        return {
            id: 'OBJ-' + String(i + 1).padStart(4, '0'),
            slug,
            name: d.name || 'Untitled',
            artist: d.artist || 'Unknown',
            twitter: d.twitter || '',
            opensea: d.opensea || '',
            etherscan: d.etherscan || '',
            collection: d.category || 'other',
            contract: m ? m[1] : '',
            token: m ? m[2] : '',
            isVideo,
            thumb: isVideo ? (media.getAttribute('poster') || '') : media.getAttribute('src'),
            preview: isVideo ? media.getAttribute('src') : '',
            full: media.dataset.full || media.getAttribute('src'),
            w: +media.dataset.w || 0,
            h: +media.dataset.h || 0
        };
    });
    const bySlug = (s) => pieces.find((p) => p.slug === s);

    const collections = Object.keys(COLLECTIONS).filter((c) => pieces.some((p) => p.collection === c))
        .concat([...new Set(pieces.map((p) => p.collection))].filter((c) => !COLLECTIONS[c]));
    const countOf = (c) => c === 'all' ? pieces.length : pieces.filter((p) => p.collection === c).length;

    let collection = 'all';
    let artist = '';
    let query = '';
    let current = null; // the open piece; null in the gallery view
    const viewed = []; // recently viewed, newest first

    const matches = (p) => !query || [p.name, p.artist, p.twitter, colName(p.collection)].some((f) => f.toLowerCase().includes(query));
    const visible = () => pieces.filter((p) => (collection === 'all' || p.collection === collection) && (!artist || p.artist === artist) && matches(p));

    // ---------- Collections: the logo buttons (left column), one per collection, pressed while it's the filter ----------
    function renderCollections() {
        els.logos.innerHTML = collections.map((c) => `<button type="button" class="g-logo tone-${toneOf(c)}" data-col="${c}" aria-pressed="${c === collection}" title="${esc(colName(c))} · ${countOf(c)}">
            ${COLLECTIONS[c] && COLLECTIONS[c].logo ? `<img src="${COLLECTIONS[c].logo}" alt="">` : `<span class="g-noimg">${esc(colName(c)[0])}</span>`}
            <span class="g-logo-name">${esc(colName(c))}</span></button>`).join('');
        els.logosMeta.textContent = collection === 'all' ? 'ALL' : colName(collection).toUpperCase();
    }
    // Click a logo to show only that collection; click it again for all of them
    els.logos.addEventListener('click', (e) => {
        const b = e.target.closest('[data-col]');
        if (!b) return;
        collection = collection === b.dataset.col ? 'all' : b.dataset.col;
        artist = '';
        showGallery();
    });

    // ---------- Artists (within the current collection) ----------
    function renderArtists() {
        const pool = pieces.filter((p) => collection === 'all' || p.collection === collection);
        const counts = new Map();
        pool.forEach((p) => counts.set(p.artist, (counts.get(p.artist) || 0) + 1));
        const list = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        els.artistsMeta.textContent = `${list.length}`;
        els.artists.innerHTML = list.map(([name, n]) => `<li><button type="button" class="g-artist" data-artist="${esc(name)}" aria-pressed="${name === artist}">
            <span class="g-artist-name">${esc(name)}</span><span class="g-artist-n">${n}</span></button></li>`).join('');
    }
    els.artists.addEventListener('click', (e) => {
        const b = e.target.closest('[data-artist]');
        if (!b) return;
        artist = artist === b.dataset.artist ? '' : b.dataset.artist; // click again to clear
        showGallery();
    });

    // ---------- Gallery grid ----------
    const media = (p, eager) => p.isVideo
        ? `<video src="${esc(p.preview || p.full)}"${p.thumb ? ` poster="${esc(p.thumb)}"` : ''} muted loop playsinline autoplay preload="metadata" aria-label="${esc(p.name)}"></video><span class="g-thumb-badge">&#9654;</span>`
        : `<img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
    const tile = (p) => `<li><button type="button" class="g-thumb g-tile tone-${toneOf(p.collection)}" data-slug="${p.slug}" aria-current="${p === current}" title="${esc(p.name)} · ${esc(p.artist)}">
            ${media(p)}
            <span class="g-tile-cap"><b>${esc(p.name)}</b><span>${esc(p.artist)}</span></span>
        </button></li>`;
    function renderGrid() {
        const list = visible();
        els.resultsMeta.textContent = `${list.length} object${list.length === 1 ? '' : 's'}`;
        if (!list.length) {
            els.grid.innerHTML = '<p class="g-grid-empty">No matching objects. <button type="button" class="g-btn" data-clear>CLEAR FILTERS</button></p>';
            return;
        }
        // One continuous grid, in page order (collection by collection), with no section breaks
        els.grid.innerHTML = `<ol class="g-grid">${list.map(tile).join('')}</ol>`;
        fitGrid();
    }
    // Fit the grid to its panel: square tiles, as big as they can be with every row on screen, in as even rows as
    // possible (16 makes 4 × 4, not 5 + 5 + 5 + 1). If that would make them smaller than FIT_MIN, the grid scrolls
    // instead, with tiles near SCROLL_SIZE. Only where the panel has a height of its own (the one-screen layout,
    // and the home page's preview); elsewhere the stylesheet's auto-fill grid stands.
    const FIT_MIN = 96, SCROLL_SIZE = 150;
    function fitGrid() {
        const ol = els.grid.querySelector('.g-grid');
        if (!ol) return;
        const cs = getComputedStyle(els.grid);
        const reset = () => { els.grid.classList.remove('is-fit', 'is-scroll'); ol.style.gridTemplateColumns = ''; };
        if (!/(auto|scroll)/.test(cs.overflowY) || !els.grid.clientWidth) return reset();
        const W = els.grid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const H = els.grid.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const gap = parseFloat(getComputedStyle(ol).columnGap) || 0;
        const n = ol.children.length;
        if (W <= 0 || H <= 0 || !n) return reset();
        let best = null;
        for (let c = 1; c <= n; c++) {
            const r = Math.ceil(n / c);
            const size = Math.floor(Math.min((W - (c - 1) * gap) / c, (H - (r - 1) * gap) / r));
            if (size <= 0) continue;
            const empty = r * c - n;
            // Within 4% of the biggest tiles, fewer empty cells in the last row wins
            if (!best || size > best.size * 1.04 || (size >= best.size / 1.04 && empty < best.empty)) best = { c, size, empty };
        }
        if (best && best.size >= FIT_MIN) {
            els.grid.classList.add('is-fit');
            els.grid.classList.remove('is-scroll');
            ol.style.gridTemplateColumns = `repeat(${best.c}, ${best.size}px)`;
            return;
        }
        // Too many to fit: as many columns of about SCROLL_SIZE as the width takes, filling it
        const c = Math.max(1, Math.round((W + gap) / (SCROLL_SIZE + gap)));
        els.grid.classList.add('is-scroll');
        els.grid.classList.remove('is-fit');
        ol.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`;
    }
    if (window.ResizeObserver) new ResizeObserver(() => { if (!current) fitGrid(); }).observe(els.grid);
    else window.addEventListener('resize', () => { if (!current) fitGrid(); });
    els.grid.addEventListener('click', (e) => {
        if (e.target.closest('[data-clear]')) return clearFilters();
        const b = e.target.closest('.g-thumb');
        if (b) open(bySlug(b.dataset.slug));
    });
    function clearFilters() {
        collection = 'all';
        artist = '';
        query = '';
        els.search.value = '';
        showGallery();
    }

    // ---------- Filmstrip (piece view): the same list, to hop along without going back ----------
    function renderStrip() {
        const list = visible();
        els.strip.innerHTML = list.map((p) => `<li><button type="button" class="g-thumb tone-${toneOf(p.collection)}" data-slug="${p.slug}" aria-current="${p === current}" title="${esc(p.name)} · ${esc(p.artist)}">
                ${p.isVideo ? `<img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="lazy" decoding="async"><span class="g-thumb-badge">&#9654;</span>` : `<img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`}
            </button></li>`).join('');
        centerStrip();
    }
    // Scrolled by hand: scrollIntoView from inside the home page's preview frame would scroll the home page too
    function centerStrip() {
        const on = els.strip.querySelector('[aria-current="true"]');
        if (!on) return;
        const li = on.parentElement;
        els.strip.scrollTo({ left: li.offsetLeft - (els.strip.clientWidth - li.offsetWidth) / 2, behavior: 'smooth' });
    }
    els.strip.addEventListener('click', (e) => {
        const b = e.target.closest('.g-thumb');
        if (b) open(bySlug(b.dataset.slug));
    });

    // ---------- Header ----------
    function renderGalleryHeader() {
        const list = visible();
        const title = collection === 'all' ? 'NFT Gallery' : colName(collection);
        const tone = collection === 'all' ? 'blue' : toneOf(collection);
        const chips = [
            collection !== 'all' && `<button type="button" class="g-filter" data-drop="collection">${esc(colName(collection))} &times;</button>`,
            artist && `<button type="button" class="g-filter" data-drop="artist">${esc(artist)} &times;</button>`,
            query && `<button type="button" class="g-filter" data-drop="query">&ldquo;${esc(query)}&rdquo; &times;</button>`
        ].filter(Boolean).join('');
        header.innerHTML = `<div class="g-objrow">
                <div class="g-objicon g-objicon-img"><img class="g-objimg" src="/assets/object-icons/oh-ive-seen.webp" alt=""></div>
                <div class="g-objtitle">
                    <div class="g-objtype">COLLECTION &middot; ${list.length} PIECES &middot; ${new Set(list.map((p) => p.artist)).size} ARTISTS</div>
                    <h1>${esc(title)}</h1>
                </div>
                <span class="g-chip tone-${tone}"><i class="g-dot tone-${tone}"></i>Collection</span>
            </div>
            ${chips ? `<div class="g-filters"><span>FILTERS</span>${chips}</div>` : ''}`;
    }
    header.addEventListener('click', (e) => {
        const drop = e.target.closest('[data-drop]');
        if (drop) {
            const k = drop.dataset.drop;
            if (k === 'collection') { collection = 'all'; artist = ''; }
            else if (k === 'artist') artist = '';
            else { query = ''; els.search.value = ''; }
            return showGallery();
        }
        if (e.target.closest('[data-back]')) return showGallery();
        const st = e.target.closest('[data-step]');
        if (st) step(+st.dataset.step);
    });
    function renderPieceHeader(p) {
        const list = visible();
        const idx = list.indexOf(p);
        const tone = toneOf(p.collection);
        const icon = p.isVideo && !p.thumb ? '<span class="g-objimg g-noimg">&#9654;</span>' : `<img class="g-objimg" src="${esc(p.thumb)}" alt="">`;
        header.innerHTML = `<div class="g-objrow">
                <button type="button" class="g-btn g-back" data-back title="Back to the gallery (Esc)">&larr; GALLERY</button>
                <div class="g-objicon g-objicon-img">${icon}</div>
                <div class="g-objtitle">
                    <div class="g-objtype">NFT &middot; ${esc(colName(p.collection).toUpperCase())} &middot; ${p.id}</div>
                    <h1>${esc(p.name)}</h1>
                </div>
                <span class="g-chip tone-${tone}"><i class="g-dot tone-${tone}"></i>${esc(colName(p.collection))}</span>
                <div class="g-objnav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous piece" ${list.length < 2 ? 'disabled' : ''}>&lsaquo;</button>
                    <span>${idx === -1 ? '&ndash;' : idx + 1} / ${list.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next piece" ${list.length < 2 ? 'disabled' : ''}>&rsaquo;</button>
                </div>
            </div>`;
    }

    // ---------- Properties (side) ----------
    const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    function renderProps() {
        if (!current) {
            const list = visible();
            const n = (pred) => list.filter(pred).length;
            els.propsMeta.textContent = 'GALLERY';
            els.props.innerHTML = row('showing', `${list.length} / ${pieces.length}`)
                + collections.filter((c) => n((p) => p.collection === c)).map((c) => row(esc(colName(c).toLowerCase()), `${n((p) => p.collection === c)}`)).join('')
                + row('artists', `${new Set(list.map((p) => p.artist)).size}`)
                + row('on-chain', `${n((p) => p.contract)}`)
                + row('video', `${n((p) => p.isVideo)}`);
            els.links.innerHTML = '<p class="g-props-hint">Click a piece in the gallery to see its details here.</p>';
            return;
        }
        const p = current;
        els.propsMeta.textContent = p.id;
        els.props.innerHTML = row('name', esc(p.name))
            + row('artist', esc(p.artist) + (p.twitter ? `<br><a href="https://x.com/${esc(p.twitter)}" target="_blank" rel="noopener">@${esc(p.twitter)}</a>` : ''))
            + row('collection', `<span class="g-chip tone-${toneOf(p.collection)}">${esc(colName(p.collection))}</span>`)
            + row('contract', p.contract ? `<span title="${esc(p.contract)}">${esc(shortHex(p.contract))}</span>` : 'OFF-CHAIN')
            + row('token', p.token ? '#' + esc(p.token) : '&mdash;')
            + row('format', p.isVideo ? 'VIDEO · LOOP' : (p.full.split('.').pop() || '').toUpperCase())
            + row('resolution', p.isVideo ? '&mdash;' : p.w ? `${p.w}&times;${p.h}` : '&mdash;');
        els.links.innerHTML = [
            p.opensea && `<a class="g-btn g-visit" href="${esc(p.opensea)}" target="_blank" rel="noopener">OPENSEA &nearr;</a>`,
            p.etherscan && `<a class="g-btn g-visit" href="${esc(p.etherscan)}" target="_blank" rel="noopener">ETHERSCAN &nearr;</a>`,
            `<a class="g-btn g-visit" href="${esc(p.full)}" target="_blank" rel="noopener">ORIGINAL &nearr;</a>`
        ].filter(Boolean).join('');
    }

    // ---------- Viewer: thumbnail first, full-res original swapped in when it arrives ----------
    function stopVideo() {
        els.vid.pause();
        els.vid.removeAttribute('src');
        els.vid.load();
        els.vid.style.display = 'none';
    }
    // Size the image to the original's aspect inside the stage, so the thumbnail placeholder
    // and the full-res image occupy the same box
    function sizeImage(p) {
        const r = els.stage.getBoundingClientRect();
        if (!r.width) return;
        if (p.isVideo) {
            // Video: fill the stage, letterboxed (object-fit: contain)
            els.vid.style.width = Math.max(40, Math.round(r.width - 32)) + 'px';
            els.vid.style.height = Math.max(40, Math.round(r.height - 40)) + 'px';
            return;
        }
        const w = p.w || 400;
        const h = p.h || 400;
        const k = Math.min((r.width - 32) / w, (r.height - 40) / h, 1.5);
        els.img.style.width = Math.max(40, Math.round(w * k)) + 'px';
        els.img.style.height = Math.max(40, Math.round(h * k)) + 'px';
    }
    function showMedia(p) {
        resetZoom();
        if (p.isVideo) {
            els.img.style.display = 'none';
            els.img.removeAttribute('src');
            els.frame.classList.remove('loading');
            if (p.thumb) els.vid.poster = p.thumb; else els.vid.removeAttribute('poster');
            els.vid.src = p.full;
            sizeImage(p);
            els.vid.style.display = 'block';
            els.vid.play().catch(() => {});
            els.viewerMeta.textContent = 'VIDEO · LOOP';
            return;
        }
        stopVideo();
        sizeImage(p);
        els.img.alt = p.name;
        els.img.style.display = 'block';
        els.img.src = p.thumb;
        els.frame.classList.add('loading');
        els.viewerMeta.textContent = 'LOADING ORIGINAL…';
        const loader = new Image();
        loader.onload = () => {
            if (current !== p) return;
            els.img.src = p.full;
            els.frame.classList.remove('loading');
            els.viewerMeta.textContent = `ORIGINAL · ${p.w}×${p.h}`;
        };
        loader.onerror = () => {
            if (current !== p) return;
            els.frame.classList.remove('loading');
            els.viewerMeta.textContent = 'THUMBNAIL ONLY';
        };
        loader.src = p.full;
    }
    const resize = () => { if (current) { sizeImage(current); resetZoom(); } };
    if (window.ResizeObserver) new ResizeObserver(resize).observe(els.stage);
    else window.addEventListener('resize', resize);

    // ---------- Recently viewed ----------
    function renderHistory() {
        els.activity.innerHTML = viewed.map((h) => `<li><i class="g-dot tone-${toneOf(h.p.collection)}"></i><div>
            <time>${h.time}</time><button type="button" class="g-act-link" data-slug="${h.p.slug}">${esc(h.p.name)}</button>
            <span class="g-act-cat">${esc(h.p.artist)}</span></div></li>`).join('');
    }
    els.activity.addEventListener('click', (e) => {
        const b = e.target.closest('.g-act-link');
        if (b) open(bySlug(b.dataset.slug));
    });

    // ---------- Views ----------
    const setHash = (h) => {
        const want = h ? '#' + h : '';
        if (location.hash !== want) history.replaceState(null, '', location.pathname + location.search + want);
    };
    function setView(v) {
        els.root.dataset.view = v;
        els.gridPane.hidden = v !== 'gallery';
        els.viewerPane.hidden = v !== 'piece';
        els.main.scrollTop = 0;
        els.grid.scrollTop = 0;
    }
    // What scrolls the gallery: its own panel in the one-screen layout, else the main column
    const gridScroller = () => (els.grid.scrollHeight > els.grid.clientHeight + 1 ? els.grid : els.main);
    function showGallery() {
        const was = current;
        current = null;
        stopVideo();
        setView('gallery');
        renderCollections();
        renderArtists();
        renderGrid();
        renderGalleryHeader();
        renderProps();
        updateStatus();
        els.crumbCol.textContent = 'Collection';
        els.crumb.textContent = collection === 'all' ? 'NFT Gallery' : colName(collection);
        if (window.TirlEmbed) window.TirlEmbed.status(`GALLERY · ${visible().length} PIECES`);
        setHash(collection === 'all' ? '' : collection);
        // Back from a piece: keep its tile in sight and focused, so the keyboard picks up where it was
        const tileEl = was && els.grid.querySelector(`.g-thumb[data-slug="${was.slug}"]`);
        if (tileEl) {
            const box = gridScroller();
            const m = box.getBoundingClientRect(), t = tileEl.getBoundingClientRect();
            box.scrollTop += t.top - m.top - m.height / 3;
            tileEl.focus({ preventScroll: true });
        }
    }
    function open(p) {
        if (!p) return;
        const fresh = !current;
        current = p;
        // A piece opened by link that the filters hide: drop the filters so it's in its own list
        if (!visible().includes(p)) { collection = 'all'; artist = ''; query = ''; els.search.value = ''; }
        renderCollections();
        renderArtists();
        setView('piece');
        renderPieceHeader(p);
        renderProps();
        showMedia(p);
        if (fresh) renderStrip();
        else {
            els.strip.querySelectorAll('.g-thumb').forEach((b) => b.setAttribute('aria-current', String(b.dataset.slug === p.slug)));
            centerStrip();
        }
        updateStatus();
        // Embedded on the home page (js/embed.js): the preview's status line
        if (window.TirlEmbed) window.TirlEmbed.status(`${p.name} · ${colName(p.collection)} · ${pieces.indexOf(p) + 1}/${pieces.length}`.toUpperCase());
        els.crumb.textContent = p.name;
        els.crumbCol.textContent = colName(p.collection);
        const d = new Date();
        const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
        const prev = viewed.findIndex((h) => h.p === p);
        if (prev !== -1) viewed.splice(prev, 1);
        viewed.unshift({ p, time });
        viewed.length = Math.min(viewed.length, 12);
        renderHistory();
        setHash(p.slug);
    }
    function step(dir) {
        const list = visible();
        if (!list.length || !current) return;
        const i = list.indexOf(current);
        open(list[(i + dir + list.length) % list.length]);
    }
    // #<piece-slug> opens a piece; #tyler / #schizo / #remilia (old gallery links) open a collection
    function route() {
        const key = decodeURIComponent(location.hash.slice(1));
        const p = bySlug(key);
        if (p) { if (p !== current) open(p); return; }
        collection = collections.includes(key) ? key : 'all';
        artist = '';
        showGallery();
    }
    window.addEventListener('hashchange', route);

    // ---------- Zoom & pan (on the frame around the image / video) ----------
    const MIN = 1, MAX = 6, STEP = 0.25;
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

    function activeMedia() {
        if (els.img.style.display !== 'none') return els.img;
        if (els.vid.style.display !== 'none') return els.vid;
        return null;
    }
    function apply() {
        const el = activeMedia();
        if (!el) return;
        el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        els.frame.classList.toggle('zoomed', scale > 1);
        els.zoom.textContent = `ZOOM ${scale.toFixed(1)}×`;
    }
    function clampPan() {
        const el = activeMedia();
        if (!el) return;
        const fr = els.frame.getBoundingClientRect();
        const maxX = Math.max(0, el.clientWidth * scale - fr.width);
        const maxY = Math.max(0, el.clientHeight * scale - fr.height);
        tx = Math.min(0, Math.max(-maxX, tx));
        ty = Math.min(0, Math.max(-maxY, ty));
    }
    function resetZoom() {
        scale = 1; tx = 0; ty = 0;
        els.img.style.transform = '';
        els.vid.style.transform = '';
        els.frame.classList.remove('zoomed');
        els.zoom.textContent = 'ZOOM 1.0×';
    }
    function zoomAt(factor, cx, cy) {
        const el = activeMedia();
        if (!el) return;
        const fr = els.frame.getBoundingClientRect();
        const px = (cx ?? fr.left + fr.width / 2) - fr.left;
        const py = (cy ?? fr.top + fr.height / 2) - fr.top;
        const next = Math.min(MAX, Math.max(MIN, scale * factor));
        if (next === scale) return;
        const ratio = next / scale;
        tx = px - (px - tx) * ratio;
        ty = py - (py - ty) * ratio;
        scale = next;
        clampPan();
        apply();
    }
    els.frame.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });
    els.frame.addEventListener('click', (e) => {
        if (e.detail === 0) return; // ignore keyboard-synthesized
        if (scale === 1) zoomAt(2, e.clientX, e.clientY);
    });
    els.frame.addEventListener('pointerdown', (e) => {
        if (scale === 1) return;
        dragging = true;
        els.frame.classList.add('panning');
        sx = e.clientX; sy = e.clientY; ox = tx; oy = ty;
        els.frame.setPointerCapture(e.pointerId);
    });
    els.frame.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        tx = ox + (e.clientX - sx);
        ty = oy + (e.clientY - sy);
        clampPan();
        apply();
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        els.frame.classList.remove('panning');
        try { els.frame.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    els.frame.addEventListener('pointerup', endDrag);
    els.frame.addEventListener('pointercancel', endDrag);

    // Swipe left/right on touch to browse (only when not zoomed)
    let touchX = null, touchY = null;
    els.stage.addEventListener('touchstart', (e) => {
        if (scale !== 1 || e.touches.length !== 1) { touchX = null; return; }
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
    }, { passive: true });
    els.stage.addEventListener('touchend', (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    // ---------- Search + keyboard ----------
    // Searching is a gallery thing: typing takes you back to the grid of what matches
    els.search.addEventListener('input', () => {
        query = els.search.value.trim().toLowerCase();
        if (current) return showGallery();
        renderGrid();
        renderGalleryHeader();
        renderProps();
        updateStatus();
    });
    els.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = visible()[0];
            if (first) open(first);
        } else if (e.key === 'Escape') {
            els.search.value = '';
            els.search.dispatchEvent(new Event('input'));
            els.search.blur();
        }
    });
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, [contenteditable="true"]')) return;
        if (e.key === '/') { e.preventDefault(); els.search.focus(); return; }
        // The gallery view leaves ← → to the page around it (the home page's Results when embedded)
        if (!current) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1 + STEP); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / (1 + STEP)); }
        else if (e.key === '0') { resetZoom(); }
        // Escape: a zoom resets first, then it's back to the gallery (from there js/escape-home.js goes home)
        else if (e.key === 'Escape') { e.preventDefault(); if (scale !== 1) resetZoom(); else showGallery(); }
    });

    // ---------- Status bar ----------
    function updateStatus() {
        els.statusObjects.textContent = `${pieces.length} OBJECTS`;
        els.statusFilter.textContent = (current ? 'VIEW: PIECE · ' : 'VIEW: GALLERY · ')
            + `COLLECTION: ${(collection === 'all' ? 'ALL' : colName(collection)).toUpperCase()}`
            + (artist ? ` · ARTIST: ${artist.toUpperCase()}` : '') + (query ? ` · "${query}"` : '') + ` · ${visible().length} SHOWN`;
    }
    const tick = () => {
        const d = new Date();
        els.clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);

    // ---------- Boot ----------
    route();
})();
