/* Page scripts for likes.html: the DEEPDISH "things I like" workspace (explorer, object header,
   results, recently viewed) built from the item cards in #likes-data, then the 3D icon cloud. */
(function() {
    const data = document.getElementById('likes-data');
    const header = document.getElementById('g-objhead');
    if (!data || !header) return;

    const CAT_ORDER = ['crypto', 'tech', 'fun'];
    const CAT_TONE = { crypto: 'blue', tech: 'green', fun: 'orange' };
    const toneOf = (cat) => CAT_TONE[cat] || 'muted';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

    const els = {
        cats: document.getElementById('g-cats'),
        count: document.getElementById('g-count'),
        mix: document.getElementById('g-mix'),
        activity: document.getElementById('g-activity'),
        results: document.getElementById('g-results'),
        resultsMeta: document.getElementById('g-results-meta'),
        shuffle: document.getElementById('g-shuffle'),
        search: document.getElementById('g-search'),
        crumb: document.getElementById('g-crumb'),
        statusObjects: document.getElementById('g-status-objects'),
        statusFilter: document.getElementById('g-status-filter'),
        clock: document.getElementById('g-clock'),
        hud: document.getElementById('g-cloud-hud')
    };
    if (els.hud) els.hud.addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) step(+b.dataset.step); });

    // ---------- Items (same order the icon cloud reads them in) ----------
    const seen = new Set();
    const items = Array.from(data.querySelectorAll('.bento-item')).map((a, i) => {
        const img = a.querySelector('.bento-image img');
        const title = (a.querySelector('.bento-content h3')?.textContent || '').trim();
        const desc = (a.querySelector('.bento-content p')?.textContent || '').trim();
        let host = '';
        let external = true;
        try {
            const u = new URL(a.href);
            external = u.host !== location.host;
            host = external ? u.host.replace(/^www\./, '') : 'tylerirl.com' + u.pathname;
        } catch (_) {}
        let slug = slugify(title);
        while (seen.has(slug)) slug += '-' + (i + 1);
        seen.add(slug);
        return {
            id: 'OBJ-' + String(i + 1).padStart(4, '0'),
            slug, title, desc, host, external,
            category: a.dataset.category || 'other',
            href: a.href,
            target: a.target || '_self',
            src: img ? img.getAttribute('src') : '',
            imgStyle: img ? img.getAttribute('style') || '' : ''
        };
    }).filter((it) => it.title);

    const categories = [...CAT_ORDER.filter((c) => items.some((it) => it.category === c)),
        ...new Set(items.map((it) => it.category).filter((c) => !CAT_ORDER.includes(c)))];
    const countOf = (cat) => cat === 'all' ? items.length : items.filter((it) => it.category === cat).length;

    function shuffled(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    let filter = 'all';
    let query = '';
    let order = shuffled(items);
    let current = null;
    const viewed = []; // recently viewed, newest first

    const matches = (it) => !query || [it.title, it.desc, it.category, it.host].some((f) => f.toLowerCase().includes(query));
    const visible = () => order.filter((it) => (filter === 'all' || it.category === filter) && matches(it));
    const iconHtml = (it, cls) => it.src
        ? `<img class="${cls}" src="${esc(it.src)}" alt="" loading="lazy" decoding="async"${it.imgStyle ? ` style="${esc(it.imgStyle)}"` : ''}>`
        : `<span class="${cls} g-noimg">${esc(it.title.charAt(0).toUpperCase())}</span>`;

    // ---------- Explorer + category mix (both filter) ----------
    function renderFilters() {
        els.cats.innerHTML = ['all', ...categories].map((c) => `<li><button type="button" class="g-obj-btn" data-cat="${c}" aria-current="${c === filter}">
            <i class="g-dot tone-${c === 'all' ? 'muted' : toneOf(c)}"></i><span>${c}</span><span class="g-id">${countOf(c)}</span></button></li>`).join('');
        els.count.textContent = items.length;
        els.mix.innerHTML = categories.map((c) => {
            const n = countOf(c);
            const pct = Math.round((n / items.length) * 100);
            return `<button type="button" class="g-mix-row tone-${toneOf(c)}" data-cat="${c}" aria-pressed="${c === filter}">
                <span class="g-mix-label">${c}</span>
                <span class="g-mix-bar"><span style="width:${pct}%"></span></span>
                <span class="g-mix-n">${n} <small>${pct}%</small></span></button>`;
        }).join('');
    }
    function setFilter(cat) {
        filter = cat === filter && cat !== 'all' ? 'all' : cat; // clicking the active category clears it
        window.likesFilter = filter;
        renderFilters();
        renderResults();
        if (window.filterIconCloud) window.filterIconCloud(filter);
        if (query && window.searchIconCloud) window.searchIconCloud(query);
        updateStatus();
    }
    window.likesSetFilter = setFilter; // the cloud's legend
    els.cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) setFilter(b.dataset.cat); });
    els.mix.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) setFilter(b.dataset.cat); });

    // ---------- Results ----------
    function renderResults() {
        const list = visible();
        els.resultsMeta.textContent = `${list.length} object${list.length === 1 ? '' : 's'}`;
        els.results.innerHTML = list.length ? list.map((it) => `<li><button type="button" class="g-res" data-slug="${it.slug}" aria-current="${it === current}">
                ${iconHtml(it, 'g-res-icon')}
                <span class="g-res-text"><span class="g-res-title">${esc(it.title)}</span><span class="g-res-desc">${esc(it.desc)}</span></span>
                <i class="g-dot tone-${toneOf(it.category)}" title="${esc(it.category)}"></i>
            </button></li>`).join('')
            : '<li class="g-no-results">No matching objects</li>';
    }
    els.results.addEventListener('click', (e) => {
        const b = e.target.closest('.g-res');
        if (b) select(items.find((it) => it.slug === b.dataset.slug));
    });
    // Broken remote icons fall back to the item's initial
    els.results.addEventListener('error', (e) => {
        const img = e.target;
        if (img.tagName !== 'IMG') return;
        const span = document.createElement('span');
        span.className = 'g-res-icon g-noimg';
        span.textContent = (img.closest('.g-res')?.querySelector('.g-res-title')?.textContent || '?').charAt(0).toUpperCase();
        img.replaceWith(span);
    }, true);
    els.shuffle.addEventListener('click', () => {
        order = shuffled(items);
        renderResults();
        els.results.scrollTop = 0;
    });

    // ---------- Object header ----------
    function renderHeader(it) {
        const list = visible();
        const idx = list.indexOf(it);
        const tone = toneOf(it.category);
        header.innerHTML = `<div class="g-objrow">
                <div class="g-objicon g-objicon-img">${iconHtml(it, 'g-objimg')}</div>
                <div class="g-objtitle">
                    <div class="g-objtype">INTEREST &middot; ${esc(it.category.toUpperCase())} &middot; ${it.id}</div>
                    <h1>${esc(it.title)}</h1>
                </div>
                <span class="g-chip tone-${tone}"><i class="g-dot tone-${tone}"></i>${esc(it.category)}</span>
                <div class="g-objnav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous object" ${list.length < 2 ? 'disabled' : ''}>&lsaquo;</button>
                    <span>${idx === -1 ? '&ndash;' : idx + 1} / ${list.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next object" ${list.length < 2 ? 'disabled' : ''}>&rsaquo;</button>
                    <a class="g-btn g-visit" href="${esc(it.href)}"${it.external ? ' target="_blank" rel="noopener"' : ''}>VISIT &nearr;</a>
                </div>
            </div>
            <p class="g-summary">${esc(it.desc || 'No description on file.')}</p>
            <div class="g-objmeta">
                <span>SOURCE</span><b>${esc(it.host || '—')}</b>
                <span>LINK</span><b>${it.external ? 'EXTERNAL' : 'INTERNAL'}</b>
                <span>CATEGORY SHARE</span><b>${countOf(it.category)} / ${items.length}</b>
            </div>`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
        // The same, compact, over the cloud (shown when embedded, where the header is hidden)
        if (els.hud) {
            els.hud.innerHTML = `${iconHtml(it, 'g-hud-icon')}
                <div class="g-hud-text"><b>${esc(it.title)}</b><small><i class="g-dot tone-${tone}"></i>${esc(it.category)} &middot; ${esc(it.desc || it.host)}</small></div>
                <div class="g-hud-nav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous object">&lsaquo;</button>
                    <span>${idx === -1 ? '&ndash;' : idx + 1}/${list.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next object">&rsaquo;</button>
                    <a class="g-btn g-visit" href="${esc(it.href)}"${it.external ? ' target="_blank" rel="noopener"' : ''}>VISIT &nearr;</a>
                </div>`;
        }
    }

    // ---------- Recently viewed ----------
    function renderHistory() {
        els.activity.innerHTML = viewed.map((h) => `<li><i class="g-dot tone-${toneOf(h.item.category)}"></i><div>
            <time>${h.time}</time><button type="button" class="g-act-link" data-slug="${h.item.slug}">${esc(h.item.title)}</button>
            <span class="g-act-cat">${esc(h.item.category)}</span></div></li>`).join('');
    }
    els.activity.addEventListener('click', (e) => {
        const b = e.target.closest('.g-act-link');
        if (b) select(items.find((it) => it.slug === b.dataset.slug));
    });

    // ---------- Selection ----------
    function select(it, opts = {}) {
        if (!it) return;
        current = it;
        renderHeader(it);
        els.crumb.textContent = it.title;
        // Embedded on the home page (js/embed.js): the preview's status line
        if (window.TirlEmbed) window.TirlEmbed.status(`${it.title} · ${items.indexOf(it) + 1}/${items.length}`.toUpperCase());
        els.results.querySelectorAll('.g-res').forEach((b) => {
            const on = b.dataset.slug === it.slug;
            b.setAttribute('aria-current', on);
            if (on && !opts.noScroll) b.scrollIntoView({ block: 'nearest' });
        });
        const d = new Date();
        const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
        const prev = viewed.findIndex((h) => h.item === it);
        if (prev !== -1) viewed.splice(prev, 1);
        viewed.unshift({ item: it, time });
        viewed.length = Math.min(viewed.length, 12);
        renderHistory();
        if (location.hash !== '#' + it.slug) history.replaceState(null, '', '#' + it.slug);
        window.likesCurrent = it; // the cloud picks this up when it boots
        if (window.likesCloudFocus) window.likesCloudFocus(it); // the cloud turns to it and locks on
    }
    function step(dir) {
        const list = visible();
        if (!list.length) return;
        const i = list.indexOf(current);
        select(list[(i + dir + list.length) % list.length]);
    }
    // Clicking an icon in the cloud inspects it here
    window.inspectLike = (icon) => {
        const it = items.find((x) => x.title === icon.title && x.href === icon.href) || items.find((x) => x.title === icon.title);
        select(it);
    };
    window.addEventListener('hashchange', () => {
        const it = items.find((x) => x.slug === location.hash.slice(1));
        if (it && it !== current) select(it);
    });

    // ---------- Search + keyboard ----------
    els.search.addEventListener('input', () => {
        query = els.search.value.trim().toLowerCase();
        renderResults();
        if (window.searchIconCloud) window.searchIconCloud(query);
        updateStatus();
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
        const typing = el && el.closest('input, textarea, [contenteditable="true"]');
        if (typing) return;
        if (e.key === '/') {
            e.preventDefault();
            els.search.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            step(e.key === 'ArrowLeft' ? -1 : 1);
        } else if (e.key === 'Enter' && current && !(el && el.closest('button, a'))) {
            header.querySelector('.g-visit').click();
        }
    });

    // ---------- Status bar ----------
    function updateStatus() {
        els.statusObjects.textContent = `${items.length} OBJECTS`;
        els.statusFilter.textContent = `FILTER: ${filter.toUpperCase()}${query ? ` · "${query}"` : ''} · ${visible().length} SHOWN`;
    }
    const tick = () => {
        const d = new Date();
        els.clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);

    // ---------- Boot ----------
    window.likesFilter = filter;
    renderFilters();
    renderResults();
    updateStatus();
    const fromHash = items.find((x) => x.slug === location.hash.slice(1));
    select(fromHash || order[0], { noScroll: !fromHash });
})();

/* The 3D icon cloud ("Link Analysis"): every item on a sphere, in step with the workspace above.
   - Selecting an item anywhere (results, arrows, search Enter, the hash) turns the sphere to bring it to the front
     and locks a reticle on it (window.likesCloudFocus, called by select()); clicking an icon selects it there.
   - Filtering lays the remaining icons out over the whole sphere again (they glide to their new places);
     searching dims what doesn't match and turns the first match to the front.
   - Drag (or swipe sideways on a phone) to spin, with momentum; it drifts on its own after a few seconds idle,
     unless motion is reduced (prefers-reduced-motion, SYS calm) or the spin is paused.
   - Sizes come from the panel, not the window (ResizeObserver), so it reads at any size, embedded included.
   - Each icon is drawn once into a small sprite when it loads; frames only blit sprites. Only runs while on screen. */
(function() {
    const canvas = document.getElementById('iconCloudCanvas');
    const container = document.getElementById('iconCloudContainer');
    const tooltip = document.getElementById('iconTooltip');
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');

    const COLORS = { crypto: [139, 233, 253], tech: [80, 250, 123], fun: [255, 184, 108] };
    const rgb = (cat) => COLORS[cat] || [139, 233, 253];
    const rgba = (cat, a) => `rgba(${rgb(cat).join(',')},${a})`;
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('sys-calm');
    const TAU = Math.PI * 2;
    const PITCH_MAX = 1.15;

    let W = 0, H = 0, CY = 0, dpr = 1;
    let radius = 100, iconSize = 32, persp = 400;
    let icons = [];
    let edges = [];
    let yaw = 0, pitch = -0.25;            // current
    let vYaw = 0, vPitch = 0;              // momentum (rad / frame)
    let goal = null;                       // { yaw, pitch } while turning to an icon
    let spinning = !calm();
    let lastInput = 0;                     // ms; the drift waits a moment after you let go
    let drag = null;                       // { id, x, y, moved, t }
    let hovered = null, selected = null, pendingFocus = null;
    let visible = false, inited = false, raf = null;

    // ---------- Items ----------
    function collect() {
        return Array.from(document.querySelectorAll('#likes-data .bento-item')).map((a) => {
            const img = a.querySelector('.bento-image img');
            const title = (a.querySelector('.bento-content h3')?.textContent || '').trim();
            if (!title) return null;
            return {
                title,
                desc: (a.querySelector('.bento-content p')?.textContent || '').trim(),
                category: a.dataset.category || 'other',
                href: a.href,
                src: img ? img.getAttribute('src') : '',
                invert: !!(img && /invert\(1\)/.test(img.getAttribute('style') || '')),
                sprite: null,
                // unit-sphere position: current (x,y,z) glides toward the target (tx,ty,tz)
                x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0,
                alpha: 0, show: true, dim: false, dimA: 0,
                px: 0, py: 0, s: 1, depth: 0
            };
        }).filter(Boolean);
    }

    // A round sprite per icon, drawn once (and again only if the device pixel ratio changes)
    const SPRITE = 96;
    function makeSprite(icon, img) {
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        const g = c.getContext('2d');
        g.beginPath();
        g.arc(SPRITE / 2, SPRITE / 2, SPRITE / 2, 0, TAU);
        g.clip();
        if (icon.invert) g.filter = 'invert(1)';
        // contain, centred
        const k = Math.min(SPRITE / img.naturalWidth, SPRITE / img.naturalHeight) || 1;
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        try { g.drawImage(img, (SPRITE - w) / 2, (SPRITE - h) / 2, w, h); } catch (_) { return null; }
        return c;
    }
    function letterSprite(icon) {
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        const g = c.getContext('2d');
        g.fillStyle = rgba(icon.category, 1);
        g.beginPath();
        g.arc(SPRITE / 2, SPRITE / 2, SPRITE * 0.42, 0, TAU);
        g.fill();
        g.fillStyle = '#05080a';
        g.font = `bold ${SPRITE * 0.48}px "Share Tech Mono", monospace`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(icon.title.charAt(0).toUpperCase(), SPRITE / 2, SPRITE / 2 + 2);
        return c;
    }
    function loadSprites() {
        icons.forEach((icon) => {
            if (!icon.src) { icon.sprite = letterSprite(icon); return; }
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => { icon.sprite = makeSprite(icon, img) || letterSprite(icon); };
            img.onerror = () => { icon.sprite = letterSprite(icon); };
            img.src = icon.src;
        });
    }

    // ---------- Layout ----------
    // The icons that are showing spread evenly over the whole sphere (Fibonacci), in a stable order
    function layout(first) {
        const shown = icons.filter((i) => i.show);
        const n = shown.length;
        const golden = Math.PI * (3 - Math.sqrt(5));
        shown.forEach((icon, i) => {
            const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const t = golden * i;
            icon.tx = Math.cos(t) * r; icon.ty = y; icon.tz = Math.sin(t) * r;
            if (first) { icon.x = icon.tx; icon.y = icon.ty; icon.z = icon.tz; }
        });
        sizeIcons();
        linkNeighbours(shown);
    }
    // Icon size from the room each one gets on the sphere
    function sizeIcons() {
        const n = Math.max(1, icons.filter((i) => i.show).length);
        const room = Math.sqrt((4 * Math.PI * radius * radius) / n);
        iconSize = Math.max(16, Math.min(46, room * 0.72)); // the front swells with perspective, so leave a gap
    }
    // Constellation lines: each icon to its two nearest neighbours of the same category, in 3D (so front and back
    // never join across the middle)
    function linkNeighbours(shown) {
        const seen = new Set();
        edges = [];
        shown.forEach((a, i) => {
            shown.map((b, j) => [j, (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2 + (a.tz - b.tz) ** 2, b])
                .filter(([j, , b]) => j !== i && b.category === a.category)
                .sort((p, q) => p[1] - q[1]).slice(0, 2)
                .forEach(([j]) => {
                    const k = i < j ? `${i}-${j}` : `${j}-${i}`;
                    if (!seen.has(k)) { seen.add(k); edges.push([a, shown[j]]); }
                });
        });
    }

    // ---------- Size ----------
    function resize() {
        // Layout size, not getBoundingClientRect: a transform on an ancestor mid-animation would skew it
        if (!container.clientWidth || !container.clientHeight) return;
        W = container.clientWidth; H = container.clientHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        // Fit the sphere in the band between the controls (top right) and the legend (bottom left), centred in
        // it. Front icons project ~5% past the radius and stick out by half their size, so leave room for both.
        const ctl = document.getElementById('g-cloud-controls');
        const leg = document.getElementById('g-cloud-legend');
        const top = ctl ? ctl.offsetTop + ctl.offsetHeight + 4 : 40;
        const bottom = leg && leg.offsetHeight ? H - leg.offsetTop + 4 : 36;
        const band = Math.max(80, H - top - bottom);
        CY = top + band / 2;
        radius = Math.max(50, Math.min(W * 0.4, (band / 2 - 16) / 1.05));
        persp = radius * 3.2;
        if (inited) sizeIcons();
        exclusion();
    }
    function exclusion() {
        if (!window.setExclusionZone || !container.offsetParent) return;
        const r = container.getBoundingClientRect();
        window.setExclusionZone('iconCloud', r.left + r.width / 2, r.top + CY, radius * 1.15);
    }

    // ---------- Turning ----------
    // yaw then pitch, as rotate() applies them; returns the angles that bring a unit point to the front
    function anglesFor(icon) {
        const R = Math.hypot(icon.tx, icon.tz) || 1e-6;
        let y = Math.atan2(-icon.tx, -icon.tz);
        y += Math.round((yaw - y) / TAU) * TAU; // the nearest way round
        const p = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, Math.atan2(-icon.ty, R)));
        return { yaw: y, pitch: p };
    }
    function focus(icon) {
        if (!icon) return;
        goal = anglesFor(icon);
        vYaw = vPitch = 0;
        if (calm()) { yaw = goal.yaw; pitch = goal.pitch; goal = null; }
        lastInput = performance.now();
        wake();
    }
    function rotate(x, y, z) {
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    }

    // ---------- Frame ----------
    function step(now) {
        // Turning to a selection
        if (goal) {
            yaw += (goal.yaw - yaw) * 0.12;
            pitch += (goal.pitch - pitch) * 0.12;
            if (Math.abs(goal.yaw - yaw) < 0.001 && Math.abs(goal.pitch - pitch) < 0.001) goal = null;
        } else if (!drag) {
            // Momentum, then the slow drift once you've left it alone for a bit
            yaw += vYaw; pitch += vPitch;
            vYaw *= 0.94; vPitch *= 0.9;
            if (spinning && !calm() && now - lastInput > 2500 && !hovered) vYaw += (0.0022 - vYaw) * 0.02;
        }
        pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch));

        // Glide to layout targets, fade in/out, project
        icons.forEach((i) => {
            i.x += (i.tx - i.x) * 0.1; i.y += (i.ty - i.y) * 0.1; i.z += (i.tz - i.z) * 0.1;
            i.alpha += ((i.show ? 1 : 0) - i.alpha) * 0.12;
            i.dimA += ((i.dim ? 1 : 0) - i.dimA) * 0.15;
            const [x, y, z] = rotate(i.x * radius, i.y * radius, i.z * radius);
            const s = persp / (persp + z);
            i.px = W / 2 + x * s;
            i.py = CY + y * s;
            i.s = s;
            i.depth = (z / radius + 1) / 2; // 0 front .. 1 back
        });
    }

    function hex(x, y, r) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k - Math.PI / 6;
            k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
    }
    function vis(i) { return i.alpha * (1 - i.depth * 0.72) * (1 - i.dimA * 0.85); }

    function draw(now) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // Sphere: a faint equator and meridian so the shape reads even with few icons showing
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(139,233,253,0.06)';
        ctx.beginPath(); ctx.arc(W / 2, CY, radius, 0, TAU); ctx.stroke();
        [[0, 1, 0], [1, 0, 0]].forEach(([ax]) => {
            ctx.beginPath();
            for (let k = 0; k <= 48; k++) {
                const t = (k / 48) * TAU;
                const [x, y, z] = ax ? rotate(0, Math.cos(t) * radius, Math.sin(t) * radius) : rotate(Math.cos(t) * radius, 0, Math.sin(t) * radius);
                const s = persp / (persp + z);
                k ? ctx.lineTo(W / 2 + x * s, CY + y * s) : ctx.moveTo(W / 2 + x * s, CY + y * s);
            }
            ctx.stroke();
        });

        // Constellation lines
        edges.forEach(([a, b]) => {
            const al = Math.min(vis(a), vis(b)) * 0.22;
            if (al < 0.01) return;
            ctx.strokeStyle = rgba(a.category, al);
            ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        });

        // Icons, back to front
        const order = icons.filter((i) => i.alpha > 0.02).sort((a, b) => b.depth - a.depth);
        order.forEach((i) => {
            const on = i === hovered || i === selected;
            const size = iconSize * i.s * (i === hovered ? 1.35 : 1);
            const a = vis(i);
            ctx.globalAlpha = on ? Math.max(a, 0.95) : a;
            hex(i.px, i.py, size * 0.6);
            ctx.fillStyle = on ? 'rgba(14,20,26,0.95)' : 'rgba(8,10,14,0.75)';
            ctx.fill();
            ctx.lineWidth = on ? 1.6 : 1;
            ctx.strokeStyle = rgba(i.category, on ? 1 : 0.45);
            ctx.stroke();
            const d = size * 0.72;
            if (i.sprite) ctx.drawImage(i.sprite, i.px - d / 2, i.py - d / 2, d, d);
        });
        ctx.globalAlpha = 1;

        if (selected && selected.alpha > 0.3) lock(selected, now);
        if (hovered && hovered !== selected) tag(hovered, rgba(hovered.category, 0.9), false);
    }

    // Reticle on the selection: four rotating corner brackets and a name tag
    function lock(i, now) {
        const r = iconSize * i.s * 0.78 + 4;
        const spin = calm() ? 0 : now * 0.0012;
        ctx.save();
        ctx.translate(i.px, i.py);
        ctx.rotate(spin);
        ctx.strokeStyle = rgba(i.category, 0.95);
        ctx.lineWidth = 1.5;
        ctx.shadowColor = rgba(i.category, 0.8);
        ctx.shadowBlur = 8;
        for (let k = 0; k < 4; k++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(r, r * 0.45); ctx.lineTo(r, r); ctx.lineTo(r * 0.45, r);
            ctx.stroke();
        }
        ctx.restore();
        tag(i, rgba(i.category, 1), true);
    }
    // A label beside an icon, on whichever side has room, joined by a leader line
    function tag(i, color, locked) {
        const text = i.title;
        ctx.font = `${locked ? 12 : 11}px "Share Tech Mono", monospace`;
        const tw = ctx.measureText(text).width;
        const pad = 6, h = 20;
        const r = iconSize * i.s * 0.75 + 8;
        const right = i.px + r + 14 + tw + pad * 2 < W - 6;
        const x0 = right ? i.px + r : i.px - r;
        const bx = right ? x0 + 14 : x0 - 14 - tw - pad * 2;
        const by = Math.max(4, Math.min(H - h - 4, i.py - r * 0.6 - h / 2));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(right ? i.px + r * 0.7 : i.px - r * 0.7, i.py - r * 0.4);
        ctx.lineTo(right ? bx : bx + tw + pad * 2, by + h / 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(4,8,10,0.88)';
        ctx.fillRect(bx, by, tw + pad * 2, h);
        ctx.strokeRect(bx + 0.5, by + 0.5, tw + pad * 2 - 1, h - 1);
        ctx.fillStyle = locked ? color : '#eaeaea';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + pad, by + h / 2 + 1);
    }

    function frame(now) {
        raf = null;
        if (!visible || document.hidden) return;
        step(now);
        draw(now);
        // Stay awake while anything moves; otherwise sleep until input wakes it
        const busy = goal || drag || Math.abs(vYaw) > 1e-5 || Math.abs(vPitch) > 1e-5 || (spinning && !calm())
            || icons.some((i) => Math.abs(i.tx - i.x) > 1e-3 || Math.abs((i.show ? 1 : 0) - i.alpha) > 0.01 || Math.abs((i.dim ? 1 : 0) - i.dimA) > 0.01)
            || (selected && !calm()); // the reticle turns
        if (busy) raf = requestAnimationFrame(frame);
    }
    function wake() { if (raf === null && visible && inited) raf = requestAnimationFrame(frame); }

    // ---------- Input ----------
    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    // The front-most icon under the point (back-half icons can't be picked)
    function pick(x, y, slop = 1) {
        let best = null;
        icons.forEach((i) => {
            if (i.alpha < 0.5 || i.depth > 0.62 || i.dimA > 0.5) return;
            const r = iconSize * i.s * 0.6 * slop;
            if ((i.px - x) ** 2 + (i.py - y) ** 2 <= r * r && (!best || i.depth < best.depth)) best = i;
        });
        return best;
    }
    function setHover(i, e) {
        if (i === hovered) { if (i && e) placeTip(e); return; }
        hovered = i;
        canvas.style.cursor = drag ? 'grabbing' : i ? 'pointer' : 'grab';
        if (!tooltip) return;
        if (i) {
            tooltip.querySelector('.tooltip-title').textContent = i.title;
            tooltip.querySelector('.tooltip-desc').textContent = [i.desc, i.category].filter(Boolean).join(' · ');
            tooltip.style.setProperty('--tone', rgba(i.category, 0.6));
            placeTip(e);
            tooltip.classList.add('visible');
        } else tooltip.classList.remove('visible');
        wake();
    }
    function placeTip(e) {
        if (!e || !tooltip) return;
        const tw = tooltip.offsetWidth || 160;
        const left = e.clientX + 16 + tw > window.innerWidth ? e.clientX - tw - 12 : e.clientX + 16;
        tooltip.style.left = left + 'px';
        tooltip.style.top = (e.clientY + 16) + 'px';
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        const [x, y] = local(e);
        drag = { id: e.pointerId, x, y, sx: x, sy: y, moved: false, t: performance.now(), touch: e.pointerType !== 'mouse' };
        goal = null;
        vYaw = vPitch = 0;
        lastInput = performance.now();
        wake();
    });
    canvas.addEventListener('pointermove', (e) => {
        const [x, y] = local(e);
        if (drag && drag.id === e.pointerId) {
            const dx = x - drag.x, dy = y - drag.y;
            if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 5) {
                drag.moved = true;
                try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
                setHover(null);
                canvas.style.cursor = 'grabbing';
            }
            if (drag.moved) {
                const k = 1 / radius;
                vYaw = dx * k * 0.9;
                vPitch = drag.touch ? 0 : dy * k * 0.9; // phones: sideways only, so vertical swipes still scroll
                yaw += vYaw; pitch += vPitch;
            }
            drag.x = x; drag.y = y;
            lastInput = performance.now();
            return;
        }
        if (e.pointerType === 'mouse') setHover(pick(x, y), e);
    });
    function endDrag(e) {
        if (!drag || drag.id !== e.pointerId) return;
        const tap = !drag.moved;
        drag = null;
        lastInput = performance.now();
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        if (tap && e.type === 'pointerup') {
            const [x, y] = local(e);
            const hit = pick(x, y, e.pointerType === 'mouse' ? 1 : 1.5);
            if (hit && window.inspectLike) window.inspectLike(hit);
        }
        wake();
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', (e) => { if (!drag && e.pointerType === 'mouse') setHover(null); });
    // Double click: back to the selection
    canvas.addEventListener('dblclick', () => focus(selected));

    // ---------- Controls (spin / recenter) + legend ----------
    const controls = document.getElementById('g-cloud-controls');
    const spinBtn = document.getElementById('g-cloud-spin');
    function syncSpin() {
        if (!spinBtn) return;
        spinBtn.setAttribute('aria-pressed', String(spinning && !calm()));
        spinBtn.textContent = spinning && !calm() ? '❚❚' : '▶';
        spinBtn.title = spinning && !calm() ? 'Pause the drift' : calm() ? 'Motion is reduced (SYS calm / system setting)' : 'Let it drift';
        spinBtn.disabled = calm();
    }
    if (controls) controls.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cloud]');
        if (!b) return;
        if (b.dataset.cloud === 'spin') { spinning = !spinning; lastInput = 0; syncSpin(); wake(); }
        else if (b.dataset.cloud === 'center') focus(selected);
    });
    const legend = document.getElementById('g-cloud-legend');
    function renderLegend() {
        if (!legend) return;
        const cats = [...new Set(icons.map((i) => i.category))];
        const f = window.likesFilter || 'all';
        legend.innerHTML = cats.map((c) => `<button type="button" data-cat="${c}" aria-pressed="${f === c}" style="--c:${rgb(c).join(',')}">
            <i></i>${c}<small>${icons.filter((i) => i.category === c).length}</small></button>`).join('');
    }
    if (legend) legend.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (b && window.likesSetFilter) window.likesSetFilter(b.dataset.cat);
    });

    // ---------- API for the workspace (js/likes.js above) ----------
    const find = (it) => it && icons.find((i) => i.title === it.title && i.href === it.href) || icons.find((i) => i.title === (it && it.title));
    window.likesCloudFocus = (it) => {
        if (!inited) { pendingFocus = it; return; }
        selected = find(it) || null;
        if (selected && selected.show) focus(selected);
        wake();
    };
    window.filterIconCloud = (category) => {
        if (!inited) return;
        icons.forEach((i) => { i.show = category === 'all' || i.category === category; });
        layout(false);
        renderLegend();
        if (selected && selected.show) setTimeout(() => focus(selected), 60);
        wake();
    };
    window.searchIconCloud = (query) => {
        if (!inited) return;
        const q = (query || '').toLowerCase().trim();
        let first = null;
        icons.forEach((i) => {
            const hit = !q || [i.title, i.desc, i.category].some((f) => f.toLowerCase().includes(q));
            i.dim = !hit;
            if (q && hit && i.show && !first) first = i;
        });
        if (first) focus(first);
        wake();
    };

    // ---------- Boot: only once the panel is on screen ----------
    function boot() {
        if (inited) return;
        resize();
        if (!W) return;
        icons = collect();
        const f = window.likesFilter || 'all';
        icons.forEach((i) => { i.show = f === 'all' || i.category === f; i.alpha = i.show ? 1 : 0; });
        layout(true);
        loadSprites();
        inited = true;
        renderLegend();
        resize(); // the legend's height is known now
        syncSpin();
        canvas.setAttribute('aria-label', `A rotating cloud of ${icons.length} things I like; the Results list has the same items`);
        const first = pendingFocus || window.likesCurrent; // selected before the cloud was up
        pendingFocus = null;
        if (first) window.likesCloudFocus(first);
    }
    new ResizeObserver(() => { resize(); wake(); }).observe(container);
    new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) { boot(); wake(); exclusion(); }
        else if (window.removeExclusionZone) window.removeExclusionZone('iconCloud');
    }).observe(container);
    document.addEventListener('visibilitychange', wake);
    // SYS calm toggles live (js/sys.js sets the class on <html>)
    new MutationObserver(() => { syncSpin(); wake(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('scroll', exclusion, { passive: true, capture: true });
})();
