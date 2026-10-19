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
        clock: document.getElementById('g-clock')
    };

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

(function() {
    const canvas = document.getElementById('iconCloudCanvas');
    const container = document.getElementById('iconCloudContainer');
    const tooltip = document.getElementById('iconTooltip');
    
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let icons = [];
    let isDragging = false;
    let lastMouseX = 0, lastMouseY = 0;
    let rotationX = 0, rotationY = 0;
    let targetRotationX = 0, targetRotationY = 0;
    let autoRotate = true;
    let hoveredIcon = null;
    let animationId = null;
    let cloudInited = false;
    let cloudVisible = false;
    
    // Color palette
    const categoryColors = {
        personal: '#ff79c6',
        crypto: '#8be9fd',
        tech: '#50fa7b',
        fun: '#ffb86c',
        art: '#bd93f9'
    };
    
    // Collect items from the item cards (#likes-data)
    function collectItems() {
        const bentoItems = document.querySelectorAll('.bento-item');
        const items = [];
        
        bentoItems.forEach((item, i) => {
            const img = item.querySelector('.bento-image img');
            const title = item.querySelector('.bento-content h3');
            const desc = item.querySelector('.bento-content p');
            const category = item.dataset.category;
            
            if (img && title) {
                items.push({
                    src: img.src,
                    title: title.textContent,
                    desc: desc ? desc.textContent : '',
                    category: category,
                    href: item.href || '#',
                    target: item.target || '_self',
                    imgStyle: img.getAttribute('style') || '',
                    image: null,
                    loaded: false
                });
            }
        });
        
        return items;
    }
    
    // Create 3D positions for icons (sphere distribution)
    function initIcons() {
        const itemData = collectItems();
        icons = [];
        
        // Adjust radius and icon size based on screen size
        const isMobile = width < 600;
        const isTablet = width < 900;
        const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.35);
        const iconSize = isMobile ? 28 : (isTablet ? 34 : 40);
        const count = itemData.length;
        
        // Fibonacci sphere distribution for even spacing
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        
        itemData.forEach((data, i) => {
            const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;
            
            const icon = {
                ...data,
                baseX: x * radius,
                baseY: y * radius,
                baseZ: z * radius,
                x: 0,
                y: 0,
                z: 0,
                projX: 0,
                projY: 0,
                scale: 1,
                opacity: 1,
                size: iconSize,
                hovered: false,
                pulsePhase: Math.random() * Math.PI * 2
            };
            
            icons.push(icon);
            
            // Load image. No crossOrigin needed: the canvas only draws icons and never
            // reads pixels back, so a tainted canvas is fine (and most hosts lack CORS headers).
            const img = new Image();
            img.onload = () => {
                icon.image = img;
                icon.loaded = true;
            };
            img.onerror = () => {
                // Fallback - mark as loaded but no image
                icon.loaded = true;
                icon.fallbackLetter = data.title ? data.title.charAt(0).toUpperCase() : '?';
            };
            img.src = data.src;
        });
    }
    
    // Resize handler
    function resize() {
        if (!cloudInited) return;
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Update exclusion zone for background particles
        updateExclusionZone();
        
        // Reinitialize icons with new dimensions
        if (icons.length > 0) {
            const isMobile = width < 600;
            const isTablet = width < 900;
            const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.35);
            const iconSize = isMobile ? 28 : (isTablet ? 34 : 40);
            const count = icons.length;
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            
            icons.forEach((icon, i) => {
                const y = 1 - (i / (count - 1)) * 2;
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = goldenAngle * i;
                
                const x = Math.cos(theta) * radiusAtY;
                const z = Math.sin(theta) * radiusAtY;
                
                icon.baseX = x * radius;
                icon.baseY = y * radius;
                icon.baseZ = z * radius;
                icon.size = iconSize;
            });
        }
    }
    
    // Update exclusion zone for the icon cloud
    function updateExclusionZone() {
        if (window.setExclusionZone && container.offsetParent !== null) {
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) * 0.45; // Slightly larger than visual cloud
            window.setExclusionZone('iconCloud', centerX, centerY, radius);
        }
    }
    
    // Rotate point around Y axis then X axis
    function rotatePoint(x, y, z, rx, ry) {
        // Rotate around Y
        let cosY = Math.cos(ry);
        let sinY = Math.sin(ry);
        let tempX = x * cosY - z * sinY;
        let tempZ = x * sinY + z * cosY;
        
        // Rotate around X
        let cosX = Math.cos(rx);
        let sinX = Math.sin(rx);
        let tempY = y * cosX - tempZ * sinX;
        tempZ = y * sinX + tempZ * cosX;
        
        return { x: tempX, y: tempY, z: tempZ };
    }
    
    // Project 3D to 2D
    function project(icon) {
        const perspective = 600;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const rotated = rotatePoint(icon.baseX, icon.baseY, icon.baseZ, rotationX, rotationY);
        icon.x = rotated.x;
        icon.y = rotated.y;
        icon.z = rotated.z;
        
        const scale = perspective / (perspective + rotated.z);
        icon.projX = centerX + rotated.x * scale;
        icon.projY = centerY + rotated.y * scale;
        icon.scale = scale;
        icon.opacity = Math.max(0.3, Math.min(1, (scale - 0.5) * 2));
    }
    
    // Draw connection lines between nearby icons (desktop only)
    function drawConnections(visibleIcons) {
        // Skip connection lines on mobile for cleaner look
        if (width < 600) return;
        
        const iconList = visibleIcons || icons;
        const maxDist = width < 900 ? 100 : 150; // Shorter lines on tablet
        
        ctx.lineCap = 'round';
        
        for (let i = 0; i < iconList.length; i++) {
            for (let j = i + 1; j < iconList.length; j++) {
                const a = iconList[i];
                const b = iconList[j];
                
                const dx = a.projX - b.projX;
                const dy = a.projY - b.projY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.15 * Math.min(a.opacity, b.opacity);
                    // Use category color if both icons share a category, otherwise neutral
                    let lineColor;
                    if (a.category === b.category) {
                        const c = categoryColors[a.category] || '#8be9fd';
                        const lr = parseInt(c.slice(1,3), 16);
                        const lg = parseInt(c.slice(3,5), 16);
                        const lb = parseInt(c.slice(5,7), 16);
                        lineColor = `rgba(${lr}, ${lg}, ${lb}, ${alpha})`;
                    } else {
                        lineColor = `rgba(139, 233, 253, ${alpha * 0.5})`;
                    }
                    ctx.beginPath();
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1;
                    ctx.moveTo(a.projX, a.projY);
                    ctx.lineTo(b.projX, b.projY);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Draw a single icon
    function drawIcon(icon, time) {
        const size = icon.size * icon.scale * (icon.hovered ? 1.5 : 1);
        const x = icon.projX;
        const y = icon.projY;
        
        ctx.save();
        ctx.globalAlpha = icon.searchDimmed ? icon.opacity * 0.12 : icon.opacity;
        
        // Glow effect for hovered
        if (icon.hovered && !icon.searchDimmed) {
            const color = categoryColors[icon.category] || '#8be9fd';
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
        }
        
        // Draw hexagonal frame
        const pulse = Math.sin(time * 0.003 + icon.pulsePhase) * 0.1 + 1;
        const frameSize = size * 0.6 * pulse;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + Math.cos(angle) * frameSize;
            const py = y + Math.sin(angle) * frameSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        // Fill with semi-transparent dark
        ctx.fillStyle = icon.hovered 
            ? 'rgba(20, 20, 30, 0.9)' 
            : 'rgba(10, 10, 15, 0.6)';
        ctx.fill();
        
        // Stroke - always use category color
        const color = categoryColors[icon.category] || '#8be9fd';
        // Parse hex to RGB for alpha support
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        ctx.strokeStyle = icon.hovered 
            ? color 
            : `rgba(${r}, ${g}, ${b}, ${0.4 * icon.opacity})`;
        ctx.lineWidth = icon.hovered ? 2 : 1;
        ctx.stroke();
        
        // Draw image
        if (icon.image && icon.loaded) {
            const imgSize = size * 0.7;
            ctx.save();
            
            // Clip to circle
            ctx.beginPath();
            ctx.arc(x, y, imgSize * 0.5, 0, Math.PI * 2);
            ctx.clip();
            
            // Check for invert filter
            if (icon.imgStyle && icon.imgStyle.includes('invert(1)')) {
                ctx.filter = 'invert(1)';
            }
            
            ctx.drawImage(
                icon.image,
                x - imgSize / 2,
                y - imgSize / 2,
                imgSize,
                imgSize
            );
            ctx.restore();
        } else {
            // Fallback: draw colored circle with letter
            const fallbackSize = size * 0.35;
            ctx.beginPath();
            ctx.arc(x, y, fallbackSize, 0, Math.PI * 2);
            const fallbackColor = categoryColors[icon.category] || '#8be9fd';
            ctx.fillStyle = fallbackColor;
            ctx.fill();
            
            // Draw letter
            if (icon.fallbackLetter) {
                ctx.fillStyle = '#000';
                ctx.font = `bold ${fallbackSize * 1.2}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon.fallbackLetter, x, y);
            }
        }
        
        ctx.restore();
    }
    
    // Main render loop
    function render(time) {
        // Stop cleanly when the cloud is hidden (grid view / mobile / scrolled away)
        if (!cloudVisible) { animationId = null; return; }
        ctx.clearRect(0, 0, width, height);
        
        // Update exclusion zone position (for scrolling)
        updateExclusionZone();
        
        // Auto rotation
        if (autoRotate && !isDragging) {
            targetRotationY += 0.002;
        }
        
        // Smooth rotation
        rotationX += (targetRotationX - rotationX) * 0.05;
        rotationY += (targetRotationY - rotationY) * 0.05;
        
        // Filter visible icons
        const visibleIcons = icons.filter(icon => icon.visible !== false);
        
        // Update projections
        visibleIcons.forEach(icon => project(icon));
        
        // Sort by Z for proper depth ordering (back to front)
        visibleIcons.sort((a, b) => b.z - a.z);
        
        // Draw connections first (only visible icons)
        drawConnections(visibleIcons);
        
        // Draw icons
        visibleIcons.forEach(icon => drawIcon(icon, time));
        
        animationId = requestAnimationFrame(render);
    }
    
    // Mouse/touch handlers
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    function onPointerDown(e) {
        isDragging = true;
        autoRotate = false;
        const pos = getMousePos(e);
        lastMouseX = pos.x;
        lastMouseY = pos.y;
    }
    
    function onPointerMove(e) {
        const pos = getMousePos(e);
        
        if (isDragging) {
            const dx = pos.x - lastMouseX;
            const dy = pos.y - lastMouseY;
            
            targetRotationY += dx * 0.005;
            targetRotationX += dy * 0.005;
            
            // Clamp X rotation
            targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));
            
            lastMouseX = pos.x;
            lastMouseY = pos.y;
        } else {
            // Check hover
            let found = null;
            const sortedByDistance = [...icons].sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.projX - pos.x, 2) + Math.pow(a.projY - pos.y, 2));
                const distB = Math.sqrt(Math.pow(b.projX - pos.x, 2) + Math.pow(b.projY - pos.y, 2));
                return distA - distB;
            });
            
            for (const icon of sortedByDistance) {
                const size = icon.size * icon.scale;
                const dist = Math.sqrt(Math.pow(icon.projX - pos.x, 2) + Math.pow(icon.projY - pos.y, 2));
                
                if (dist < size * 0.6 && icon.opacity > 0.5) {
                    found = icon;
                    break;
                }
            }
            
            icons.forEach(icon => icon.hovered = false);
            
            if (found) {
                found.hovered = true;
                hoveredIcon = found;
                canvas.style.cursor = 'pointer';
                
                // Show tooltip
                tooltip.querySelector('.tooltip-title').textContent = found.title;
                tooltip.querySelector('.tooltip-desc').textContent = found.desc;
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.classList.add('visible');
                
                // Show in spotlight
                if (window.showIconInSpotlight) {
                    window.showIconInSpotlight(found);
                }
            } else {
                if (hoveredIcon) {
                    // Was hovering, now not - restore spotlight
                    if (window.restoreSpotlight) {
                        window.restoreSpotlight();
                    }
                }
                hoveredIcon = null;
                canvas.style.cursor = 'grab';
                tooltip.classList.remove('visible');
            }
        }
    }
    
    function onPointerUp(e) {
        if (isDragging) {
            isDragging = false;
            // Resume auto rotation after a delay
            setTimeout(() => { autoRotate = true; }, 3000);
        }
    }
    
    function onClick(e) {
        if (hoveredIcon) {
            // Inspect it in the workspace instead of navigating
            if (window.inspectLike) {
                window.inspectLike(hoveredIcon);
            }
        }
    }
    
    // Touch tap handler for mobile
    let touchStartPos = null;
    let touchStartTime = 0;
    
    function onTouchStart(e) {
        touchStartPos = getMousePos(e);
        touchStartTime = Date.now();
        onPointerDown(e);
    }
    
    function onTouchEnd(e) {
        const touchDuration = Date.now() - touchStartTime;
        const wasTap = touchDuration < 300;
        
        if (wasTap && touchStartPos) {
            // Check if tap was on an icon
            const visibleIcons = icons.filter(icon => icon.visible !== false);
            for (const icon of visibleIcons) {
                const size = icon.size * icon.scale;
                const dist = Math.sqrt(Math.pow(icon.projX - touchStartPos.x, 2) + Math.pow(icon.projY - touchStartPos.y, 2));
                
                if (dist < size * 0.7 && icon.opacity > 0.5) {
                    // Tapped on icon - inspect it in the workspace
                    if (window.inspectLike) {
                        window.inspectLike(icon);
                    }
                    break;
                }
            }
        }
        
        touchStartPos = null;
        onPointerUp(e);
    }
    
    function onPointerLeave() {
        isDragging = false;
        icons.forEach(icon => icon.hovered = false);
        hoveredIcon = null;
        tooltip.classList.remove('visible');
        autoRotate = true;
        
        // Restore spotlight rotation
        if (window.restoreSpotlight) {
            window.restoreSpotlight();
        }
    }
    
    // Filter handler
    window.filterIconCloud = function(category) {
        icons.forEach(icon => {
            icon.visible = category === 'all' || icon.category === category;
        });
    };
    
    // Search handler - filter by title/desc matching query
    window.searchIconCloud = function(query) {
        const q = query.toLowerCase().trim();
        icons.forEach(icon => {
            if (!q) {
                // Reset to current category filter
                const cat = window.likesFilter || 'all';
                icon.visible = cat === 'all' || icon.category === cat;
                icon.searchDimmed = false;
            } else {
                const cat = window.likesFilter || 'all';
                const matches = icon.title.toLowerCase().includes(q) || icon.desc.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q);
                icon.visible = cat === 'all' || icon.category === cat; // keep the category filter, dim non-matches
                icon.searchDimmed = !matches;
            }
        });
    };
    
    // Init — lazy: the cloud only initializes (including loading its ~100
    // icon images) and renders while its container is actually visible.
    // On mobile the container is display:none, so none of that work happens.
    function startLoop() {
        if (animationId === null) animationId = requestAnimationFrame(render);
    }

    function bootCloud() {
        if (cloudInited) return;
        cloudInited = true;
        resize();
        initIcons();
    }

    function init() {
        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('mouseleave', onPointerLeave);
        canvas.addEventListener('click', onClick);
        
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onPointerMove, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd);
        
        window.addEventListener('resize', resize);

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                cloudVisible = entries[0].isIntersecting;
                if (cloudVisible) {
                    bootCloud();
                    startLoop();
                } else if (window.removeExclusionZone) {
                    window.removeExclusionZone('iconCloud');
                }
            });
            io.observe(container);
        } else {
            cloudVisible = true;
            bootCloud();
            startLoop();
        }
    }
    
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
