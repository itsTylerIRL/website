/* Page scripts for gallery.html: the DEEPDISH NFT gallery workspace (collections, artists, recently viewed,
   object header, media viewer with zoom & pan, results grid) built from the cards in #gallery-data. */
(function() {
    const data = document.getElementById('gallery-data');
    const header = document.getElementById('g-objhead');
    if (!data || !header) return;

    // Collection keys (data-category) -> display name + status tone
    const COLLECTIONS = {
        tyler: { name: 'Tyler PFPs', tone: 'blue' },
        schizo: { name: 'Schizoposters', tone: 'red' },
        remilia: { name: 'Remilia', tone: 'orange' }
    };
    const colName = (c) => (COLLECTIONS[c] || {}).name || c;
    const toneOf = (c) => (COLLECTIONS[c] || {}).tone || 'muted';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
    const shortHex = (h) => h.length > 12 ? h.slice(0, 6) + '…' + h.slice(-4) : h;

    const els = {
        cols: document.getElementById('g-cols'),
        count: document.getElementById('g-count'),
        artists: document.getElementById('g-artists'),
        artistsMeta: document.getElementById('g-artists-meta'),
        activity: document.getElementById('g-activity'),
        thumbs: document.getElementById('g-thumbs'),
        resultsMeta: document.getElementById('g-results-meta'),
        search: document.getElementById('g-search'),
        crumb: document.getElementById('g-crumb'),
        crumbCol: document.getElementById('g-crumb-col'),
        stage: document.getElementById('g-stage'),
        frame: document.getElementById('g-frame'),
        img: document.getElementById('g-view-img'),
        vid: document.getElementById('g-view-vid'),
        zoom: document.getElementById('g-zoom'),
        viewerMeta: document.getElementById('g-viewer-meta'),
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
            thumb: isVideo ? '' : media.getAttribute('src'),
            full: media.dataset.full || media.getAttribute('src'),
            w: +media.dataset.w || 0,
            h: +media.dataset.h || 0
        };
    });

    const collections = Object.keys(COLLECTIONS).filter((c) => pieces.some((p) => p.collection === c))
        .concat([...new Set(pieces.map((p) => p.collection))].filter((c) => !COLLECTIONS[c]));
    const countOf = (c) => c === 'all' ? pieces.length : pieces.filter((p) => p.collection === c).length;

    let collection = 'all';
    let artist = '';
    let query = '';
    let current = null;
    const viewed = []; // recently viewed, newest first

    const matches = (p) => !query || [p.name, p.artist, p.twitter, colName(p.collection)].some((f) => f.toLowerCase().includes(query));
    const visible = () => pieces.filter((p) => (collection === 'all' || p.collection === collection) && (!artist || p.artist === artist) && matches(p));

    // ---------- Collections (explorer) ----------
    function renderCollections() {
        els.cols.innerHTML = ['all', ...collections].map((c) => `<li><button type="button" class="g-obj-btn" data-col="${c}" aria-current="${c === collection}">
            <i class="g-dot tone-${c === 'all' ? 'muted' : toneOf(c)}"></i><span>${c === 'all' ? 'All' : esc(colName(c))}</span><span class="g-id">${countOf(c)}</span></button></li>`).join('');
        els.count.textContent = pieces.length;
    }
    els.cols.addEventListener('click', (e) => {
        const b = e.target.closest('[data-col]');
        if (!b) return;
        collection = b.dataset.col;
        artist = '';
        refresh();
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
        refresh();
    });

    // ---------- Results grid ----------
    function renderThumbs() {
        const list = visible();
        els.resultsMeta.textContent = `${list.length} object${list.length === 1 ? '' : 's'}`;
        els.thumbs.innerHTML = list.length ? list.map((p) => `<li><button type="button" class="g-thumb tone-${toneOf(p.collection)}" data-slug="${p.slug}" aria-current="${p === current}" title="${esc(p.name)} · ${esc(p.artist)}">
                ${p.isVideo
                    ? `<video src="${esc(p.full)}" muted loop playsinline autoplay preload="metadata" aria-label="${esc(p.name)}"></video><span class="g-thumb-badge">&#9654;</span>`
                    : `<img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`}
                <i class="g-dot tone-${toneOf(p.collection)}"></i>
            </button></li>`).join('')
            : '<li class="g-no-results">No matching objects</li>';
    }
    els.thumbs.addEventListener('click', (e) => {
        const b = e.target.closest('.g-thumb');
        if (b) select(pieces.find((p) => p.slug === b.dataset.slug));
    });

    function refresh() {
        renderCollections();
        renderArtists();
        renderThumbs();
        updateStatus();
        if (current) renderHeader(current);
    }

    // ---------- Object header ----------
    function renderHeader(p) {
        const list = visible();
        const idx = list.indexOf(p);
        const tone = toneOf(p.collection);
        const icon = p.isVideo ? '<span class="g-objimg g-noimg">&#9654;</span>' : `<img class="g-objimg" src="${esc(p.thumb)}" alt="">`;
        header.innerHTML = `<div class="g-objrow">
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
                    ${p.opensea ? `<a class="g-btn g-visit" href="${esc(p.opensea)}" target="_blank" rel="noopener">OPENSEA &nearr;</a>` : ''}
                    ${p.etherscan ? `<a class="g-btn g-visit" href="${esc(p.etherscan)}" target="_blank" rel="noopener">ETHERSCAN &nearr;</a>` : ''}
                </div>
            </div>
            <div class="g-objmeta">
                <span>ARTIST</span><b>${esc(p.artist)}${p.twitter ? ` <a href="https://x.com/${esc(p.twitter)}" target="_blank" rel="noopener">@${esc(p.twitter)}</a>` : ''}</b>
                <span>CONTRACT</span><b title="${esc(p.contract)}">${p.contract ? esc(shortHex(p.contract)) : 'OFF-CHAIN'}</b>
                <span>TOKEN</span><b>${p.token ? '#' + esc(p.token) : '&mdash;'}</b>
                <span>RES</span><b>${p.isVideo ? 'VIDEO' : p.w ? `${p.w}&times;${p.h}` : '&mdash;'}</b>
            </div>`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
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
        if (p.isVideo) {
            // Video: fill the stage, letterboxed (object-fit: contain)
            const r = els.stage.getBoundingClientRect();
            els.vid.style.width = Math.max(40, Math.round(r.width - 32)) + 'px';
            els.vid.style.height = Math.max(40, Math.round(r.height - 40)) + 'px';
            return;
        }
        const r = els.stage.getBoundingClientRect();
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
    window.addEventListener('resize', () => { if (current) { sizeImage(current); resetZoom(); } });

    // ---------- Recently viewed ----------
    function renderHistory() {
        els.activity.innerHTML = viewed.map((h) => `<li><i class="g-dot tone-${toneOf(h.p.collection)}"></i><div>
            <time>${h.time}</time><button type="button" class="g-act-link" data-slug="${h.p.slug}">${esc(h.p.name)}</button>
            <span class="g-act-cat">${esc(h.p.artist)}</span></div></li>`).join('');
    }
    els.activity.addEventListener('click', (e) => {
        const b = e.target.closest('.g-act-link');
        if (b) select(pieces.find((p) => p.slug === b.dataset.slug));
    });

    // ---------- Selection ----------
    function select(p, opts = {}) {
        if (!p) return;
        current = p;
        renderHeader(p);
        showMedia(p);
        els.crumb.textContent = p.name;
        els.crumbCol.textContent = colName(p.collection);
        els.thumbs.querySelectorAll('.g-thumb').forEach((b) => {
            const on = b.dataset.slug === p.slug;
            b.setAttribute('aria-current', on);
            if (on && !opts.noScroll) b.scrollIntoView({ block: 'nearest' });
        });
        const d = new Date();
        const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
        const prev = viewed.findIndex((h) => h.p === p);
        if (prev !== -1) viewed.splice(prev, 1);
        viewed.unshift({ p, time });
        viewed.length = Math.min(viewed.length, 12);
        renderHistory();
        if (location.hash !== '#' + p.slug) history.replaceState(null, '', '#' + p.slug);
    }
    function step(dir) {
        const list = visible();
        if (!list.length) return;
        const i = list.indexOf(current);
        select(list[(i + dir + list.length) % list.length]);
    }
    // #<piece-slug> opens a piece; #tyler / #schizo / #remilia (old gallery links) open a collection
    function fromHash() {
        const key = location.hash.slice(1);
        if (collections.includes(key)) {
            collection = key;
            refresh();
            return visible()[0];
        }
        return pieces.find((p) => p.slug === key);
    }
    window.addEventListener('hashchange', () => {
        const p = fromHash();
        if (p && p !== current) select(p);
    });

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
    els.search.addEventListener('input', () => {
        query = els.search.value.trim().toLowerCase();
        renderThumbs();
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
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1 + STEP); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / (1 + STEP)); }
        else if (e.key === '0') { resetZoom(); }
        // Escape resets a zoom; unzoomed, it's left to js/escape-home.js (back to the home page)
        else if (e.key === 'Escape' && scale !== 1) { e.preventDefault(); resetZoom(); }
    });

    // ---------- Status bar ----------
    function updateStatus() {
        els.statusObjects.textContent = `${pieces.length} OBJECTS`;
        els.statusFilter.textContent = `COLLECTION: ${(collection === 'all' ? 'ALL' : colName(collection)).toUpperCase()}`
            + (artist ? ` · ARTIST: ${artist.toUpperCase()}` : '') + (query ? ` · "${query}"` : '') + ` · ${visible().length} SHOWN`;
    }
    const tick = () => {
        const d = new Date();
        els.clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);

    // ---------- Boot ----------
    refresh();
    const initial = fromHash();
    select(initial || pieces[0], { noScroll: !initial });
})();
