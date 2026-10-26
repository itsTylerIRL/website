/* Page scripts for markets.html: Neochibi Markets in the DEEPDISH workspace.
   Pulls collection stats from the OpenSea API and the ETH price from CoinGecko (every 5 minutes while the
   tab is visible) and renders the collection explorer, market board, price trend, properties and feed log. */

// ---------- Collections (edit here to add / remove one) ----------
// slug: OpenSea collection slug; logo: square image; video: looping clip shown in the header (logo is its still)
const COLLECTIONS = [
    { key: 'milady', slug: 'milady', name: 'milady maker', tagline: '10,000 generative pfps. neochibi street style.', logo: '/assets/milady.png', site: ['site', 'https://miladymaker.net'] },
    { key: 'remilio', slug: 'remilio-babies', name: 'remilio babies', tagline: '10,000 male milady variants. underground culture.', logo: '/assets/remilio.jpg', site: ['site', 'https://remilio.org'] },
    { key: 'schizo', slug: 'schizoposters', name: 'schizoposters', tagline: 'I HATE THE ANTICHRIST.', logo: '/assets/schizo.png', site: ['site', 'https://schizoposters.xyz'] },
    { key: 'radbro', slug: 'radbro-webring', name: 'radbro webring', tagline: 'Check the Chain.', logo: '/assets/radbro.png', site: ['site', 'http://radbro.xyz'] },
    { key: 'fumo', slug: 'milady-fumo-baby-404', name: 'fumo baby 404', tagline: 'Hardforked 404 collection.', logo: '/assets/markets/fumo.webp', video: 'https://blog.remilia.org/content/media/2024/04/fumo_01-1.mp4', site: ['blog', 'https://blog.remilia.org/fumo-404'] }
];

(function() {
    const header = document.getElementById('g-objhead');
    if (!header) return;

    const OPENSEA_KEY = '5a79fc7192de4ababec6b822f0ca4635';
    const REFRESH_MS = 5 * 60 * 1000;
    const RANGES = { one_day: '24h', seven_day: '1w', thirty_day: '1m' };
    const NEXT = { one_day: 'seven_day', seven_day: 'thirty_day', thirty_day: null }; // Δ baseline
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = (id) => document.getElementById(id);

    const els = {
        colls: $('g-colls'), collMeta: $('g-coll-meta'), range: $('g-range'), log: $('g-log'), logMeta: $('g-log-meta'),
        board: $('g-board'), trend: $('g-trend'), trendMeta: $('g-trend-meta'), props: $('g-props'), propsMeta: $('g-props-meta'),
        crumb: $('g-crumb'), feed: $('g-feed'), feedDot: $('g-feed-dot'), eth: $('g-eth')
    };

    let range = 'one_day';
    try { if (RANGES[localStorage.getItem('marketRange')]) range = localStorage.getItem('marketRange'); } catch (_) {}
    let current = COLLECTIONS[0];
    let ethUSD = null;
    const stats = {}; // key -> OpenSea stats, or { error }

    // ---------- Numbers ----------
    const eth = (v) => (typeof v === 'number' && isFinite(v)) ? `${v.toFixed(v < 0.1 ? 3 : 2)} ETH` : '—';
    const usd = (v) => (typeof v === 'number' && isFinite(v) && ethUSD)
        ? (v * ethUSD).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';
    const int = (v) => (typeof v === 'number' && isFinite(v)) ? v.toLocaleString('en-US') : '—';
    const intervals = (s) => Object.fromEntries(((s && s.intervals) || []).map((i) => [i.interval, i]));
    const avgOf = (i) => (i && i.sales) ? (i.average_price || i.volume / i.sales) : 0;
    function read(c) {
        const s = stats[c.key];
        if (!s || s.error) return null;
        const t = s.total || {};
        const iv = intervals(s);
        const cur = iv[range] || {};
        const avg = avgOf(cur);
        const base = NEXT[range] ? avgOf(iv[NEXT[range]]) : (t.sales ? t.volume / t.sales : 0);
        return {
            floor: t.floor_price || 0,
            vol: cur.volume || 0,
            sales: cur.sales || 0,
            avg,
            change: avg && base ? ((avg - base) / base) * 100 : null,
            owners: t.num_owners,
            allVol: t.volume,
            allSales: t.sales,
            allAvg: t.sales ? t.volume / t.sales : 0,
            trend: [avgOf(iv.thirty_day), avgOf(iv.seven_day), avgOf(iv.one_day), t.floor_price || 0]
        };
    }
    const changeHtml = (d) => d && d.change !== null
        ? `<span class="g-delta ${d.change >= 0 ? 'up' : 'down'}">${d.change >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(d.change).toFixed(1)}%</span>`
        : '<span class="g-delta">—</span>';
    const logoHtml = (c, cls) => `<img class="${cls}" src="${esc(c.logo)}" alt="" loading="lazy" decoding="async">`;
    const state = (c) => !stats[c.key] ? 'loading' : stats[c.key].error ? 'offline' : 'live';

    // ---------- Sparkline (board) + trend chart (main) ----------
    function sparkline(points, w, h, pad) { // small board sparkline
        const pts = points.map((p, i) => [i, p]).filter(([, p]) => p > 0);
        if (pts.length < 2) return null;
        const vals = pts.map(([, p]) => p);
        const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
        const step = (w - pad * 2) / (points.length - 1);
        const xy = pts.map(([i, p]) => [pad + i * step, h - pad - ((p - min) / span) * (h - pad * 2)]);
        return { xy, min, max, up: vals[vals.length - 1] >= vals[0] };
    }
    function sparkSvg(points) {
        const s = sparkline(points, 100, 26, 3);
        if (!s) return '';
        const color = s.up ? 'var(--g-green)' : 'var(--g-red)';
        const line = s.xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        const [lx, ly] = s.xy[s.xy.length - 1];
        return `<svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
            <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2" fill="${color}"/></svg>`;
    }
    // Drawn at the panel's pixel size (so text isn't stretched) and redrawn on resize
    function renderTrend() {
        const d = read(current);
        const keep = [...els.trend.querySelectorAll('.g-reticle')];
        const W = Math.max(200, els.trend.clientWidth), H = Math.max(120, els.trend.clientHeight);
        const L = 74, R = 40, T = 34, B = 30; // plot insets: y labels left, x labels below
        const pts = d ? d.trend.map((p, i) => [i, p]).filter(([, p]) => p > 0) : [];
        els.trend.replaceChildren(...keep);
        if (pts.length < 2) {
            els.trend.insertAdjacentHTML('beforeend', `<div class="g-trend-empty">${state(current) === 'offline' ? '[ FEED OFFLINE ]' : '[ ACQUIRING DATA… ]'}</div>`);
            return;
        }
        const vals = pts.map(([, p]) => p);
        let min = Math.min(...vals), max = Math.max(...vals);
        const padV = ((max - min) || max * 0.1) * 0.15;
        min = Math.max(0, min - padV); max += padV;
        const x = (i) => L + (i / 3) * (W - L - R);
        const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
        const xy = pts.map(([i, p]) => [x(i), y(p)]);
        const up = vals[vals.length - 1] >= vals[0];
        const line = xy.map(([a, b2]) => `${a.toFixed(1)},${b2.toFixed(1)}`).join(' ');
        const base = (H - B).toFixed(1);
        const area = `M${xy[0][0].toFixed(1)},${base} L${line.replace(/ /g, ' L')} L${xy[xy.length - 1][0].toFixed(1)},${base} Z`;
        const grid = [0, 0.5, 1].map((f) => {
            const v = max - f * (max - min);
            const gy = y(v).toFixed(1);
            return `<line x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}"/><text class="y" x="${L - 8}" y="${gy}" text-anchor="end" dominant-baseline="middle">${eth(v).replace(' ETH', '')}</text>`;
        }).join('');
        const labels = ['30d avg', '7d avg', '24h avg', 'floor'];
        const ticks = labels.map((l, i) => `<text class="l" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${l}</text>`).join('');
        const dots = xy.map(([a, b2], k) => `<circle cx="${a.toFixed(1)}" cy="${b2.toFixed(1)}" r="4.5"/>
            <text class="v" x="${a.toFixed(1)}" y="${(b2 - 12).toFixed(1)}" text-anchor="middle">${eth(vals[k])}</text>`).join('');
        els.trend.insertAdjacentHTML('beforeend', `<svg class="g-trend-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
                style="--trend: ${up ? 'var(--g-green)' : 'var(--g-red)'}" role="img" aria-label="${esc(current.name)} average sale price trend">
                <g class="grid">${grid}${ticks}</g>
                <path class="area" d="${area}"/>
                <polyline class="line" points="${line}"/>
                <g class="dots">${dots}</g>
            </svg>`);
        const pct = ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100;
        els.trendMeta.textContent = `${labels[pts[0][0]]} → floor: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }
    let resizeTimer = null;
    new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderTrend, 60);
    }).observe(els.trend);

    // ---------- Collections explorer ----------
    function renderColls() {
        const live = COLLECTIONS.filter((c) => state(c) === 'live').length;
        els.collMeta.textContent = `${live}/${COLLECTIONS.length} LIVE`;
        els.colls.innerHTML = COLLECTIONS.map((c) => {
            const d = read(c);
            const tone = { live: 'green', loading: 'muted', offline: 'red' }[state(c)];
            return `<li><button type="button" class="g-coll" data-key="${c.key}" aria-current="${c === current}">
                ${logoHtml(c, 'g-coll-logo')}
                <span class="g-coll-text"><span class="g-coll-name">${esc(c.name)}</span><span class="g-coll-floor">${d ? `${eth(d.floor)} ${changeHtml(d)}` : state(c) === 'offline' ? 'offline' : 'syncing…'}</span></span>
                <i class="g-dot tone-${tone}" title="${state(c)}"></i>
            </button></li>`;
        }).join('');
    }

    // ---------- Market board ----------
    function renderBoard() {
        document.querySelectorAll('[data-range-label="vol"]').forEach((th) => { th.textContent = `${RANGES[range]} vol`; });
        els.board.innerHTML = COLLECTIONS.map((c) => {
            const d = read(c);
            const dash = state(c) === 'offline' ? 'offline' : '…';
            return `<tr data-key="${c.key}" aria-selected="${c === current}" tabindex="-1">
                <td class="col-name">${logoHtml(c, 'g-board-logo')}<span>${esc(c.name)}</span></td>
                <td>${d ? eth(d.floor) : dash}</td>
                <td>${d ? changeHtml(d) : ''}</td>
                <td>${d ? eth(d.vol).replace(' ETH', '') : ''}</td>
                <td>${d ? int(d.sales) : ''}</td>
                <td>${d ? int(d.owners) : ''}</td>
                <td class="col-spark">${d ? sparkSvg(d.trend) : ''}</td>
            </tr>`;
        }).join('');
    }

    // ---------- Header + properties for the selected collection ----------
    function renderHeader() {
        const c = current;
        const d = read(c);
        const idx = COLLECTIONS.indexOf(c);
        const art = c.video
            ? `<video class="g-objimg" src="${esc(c.video)}" poster="${esc(c.logo)}" autoplay muted loop playsinline></video>`
            : logoHtml(c, 'g-objimg');
        const tone = { live: 'green', loading: 'muted', offline: 'red' }[state(c)];
        // Embedded on the home page (js/embed.js): the preview's status line
        if (window.TirlEmbed) window.TirlEmbed.status(`${c.name} · ${d ? `floor ${eth(d.floor)}` : state(c)}`.toUpperCase());
        header.innerHTML = `<div class="g-objrow">
                <div class="g-objicon g-objicon-img">${art}</div>
                <div class="g-objtitle">
                    <div class="g-objtype">OBJECT &middot; COLLECTION &middot; ${esc(c.slug.toUpperCase())}</div>
                    <h1>${esc(c.name)}</h1>
                </div>
                <span class="g-chip tone-${tone}"><i class="g-dot tone-${tone}"></i>${state(c) === 'live' ? 'Live' : state(c) === 'offline' ? 'Offline' : 'Syncing'}</span>
                <div class="g-objnav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous collection">&lsaquo;</button>
                    <span>${idx + 1} / ${COLLECTIONS.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next collection">&rsaquo;</button>
                    <a class="g-btn g-visit" href="https://opensea.io/collection/${esc(c.slug)}" target="_blank" rel="noopener">OPENSEA &nearr;</a>
                    <a class="g-btn g-visit" href="${esc(c.site[1])}" target="_blank" rel="noopener">${esc(c.site[0].toUpperCase())} &nearr;</a>
                </div>
            </div>
            <p class="g-summary">${esc(c.tagline)}</p>
            <div class="g-objmeta">
                <span>FLOOR</span><b>${d ? `${eth(d.floor)} &middot; ${usd(d.floor)}` : '—'}</b>
                <span>${RANGES[range].toUpperCase()} &Delta;</span><b>${changeHtml(d)}</b>
                <span>OWNERS</span><b>${d ? int(d.owners) : '—'}</b>
            </div>`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
        els.crumb.textContent = c.name;
    }
    function renderProps() {
        const d = read(current);
        const r = RANGES[range];
        els.propsMeta.textContent = r.toUpperCase();
        const rows = [
            ['floor', d && eth(d.floor)], ['floor (usd)', d && usd(d.floor)],
            [`${r} volume`, d && eth(d.vol)], [`${r} sales`, d && int(d.sales)], [`${r} avg sale`, d && (d.avg ? eth(d.avg) : '—')],
            [`${r} Δ`, d && changeHtml(d)], ['owners', d && int(d.owners)],
            ['all-time volume', d && eth(d.allVol)], ['all-time sales', d && int(d.allSales)], ['all-time avg', d && eth(d.allAvg)],
            ['slug', esc(current.slug)]
        ];
        els.props.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v || '—'}</dd>`).join('');
    }

    function renderAll() {
        renderColls();
        renderBoard();
        renderHeader();
        renderProps();
        renderTrend();
        els.range.querySelectorAll('[data-range]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.range === range));
    }

    // ---------- Selection + range ----------
    function select(c) {
        if (!c || c === current) return;
        current = c;
        renderColls();
        els.board.querySelectorAll('tr').forEach((tr) => tr.setAttribute('aria-selected', tr.dataset.key === c.key));
        renderHeader();
        renderProps();
        renderTrend();
    }
    function step(dir) {
        const i = COLLECTIONS.indexOf(current);
        select(COLLECTIONS[(i + dir + COLLECTIONS.length) % COLLECTIONS.length]);
    }
    function setRange(r) {
        if (!RANGES[r] || r === range) return;
        range = r;
        try { localStorage.setItem('marketRange', r); } catch (_) {}
        log('RANGE', `window set to ${RANGES[r]}`, 'blue');
        renderAll();
    }
    els.colls.addEventListener('click', (e) => {
        const b = e.target.closest('[data-key]');
        if (b) select(COLLECTIONS.find((c) => c.key === b.dataset.key));
    });
    els.board.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-key]');
        if (tr) select(COLLECTIONS.find((c) => c.key === tr.dataset.key));
    });
    els.range.addEventListener('click', (e) => {
        const b = e.target.closest('[data-range]');
        if (b) setRange(b.dataset.range);
    });
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? -1 : 1); }
        else if (e.key === '1' || e.key === '2' || e.key === '3') setRange(Object.keys(RANGES)[+e.key - 1]);
    });

    // ---------- Feed log ----------
    const events = [];
    const stamp = () => {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    };
    function log(kind, html, tone) {
        events.unshift({ t: stamp(), kind, html, tone });
        events.length = Math.min(events.length, 60);
        els.log.innerHTML = events.map((e) => `<li><i class="g-dot tone-${e.tone}"></i><div>
            <time>${e.t} &middot; ${e.kind}</time><span>${e.html}</span></div></li>`).join('');
        els.logMeta.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
        // Embedded on the home page (js/embed.js): syncs and errors go to its ticker
        if (window.TirlEmbed && (kind === 'SYNC' || kind === 'ERR') && tone !== 'muted') window.TirlEmbed.event({ kind, html, tone });
    }

    // ---------- Fetch ----------
    let syncing = false;
    async function sync() {
        if (syncing || document.hidden) return;
        syncing = true;
        sync.last = Date.now();
        els.feed.textContent = 'SYNCING';
        els.feedDot.className = 'g-dot tone-orange';
        log('SYNC', `polling opensea for ${COLLECTIONS.length} collections`, 'muted');
        try {
            const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            if (!r.ok) throw new Error('HTTP ' + r.status);
            ethUSD = (await r.json()).ethereum.usd;
            els.eth.textContent = `ETH ${ethUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`;
        } catch (e) {
            log('ETH', `price feed unavailable (${esc(e.message)}): usd values hidden`, 'orange');
        }
        const results = await Promise.allSettled(COLLECTIONS.map(async (c) => {
            const r = await fetch(`https://api.opensea.io/api/v2/collections/${c.slug}/stats`, { headers: { 'X-API-KEY': OPENSEA_KEY, Accept: 'application/json' } });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }));
        let ok = 0;
        results.forEach((res, i) => {
            const c = COLLECTIONS[i];
            if (res.status === 'fulfilled') {
                ok++;
                // keep the last good numbers if a later refresh fails
                stats[c.key] = res.value;
            } else {
                if (!stats[c.key] || stats[c.key].error) stats[c.key] = { error: true };
                log('ERR', `${esc(c.name)}: ${esc(res.reason.message)}`, 'red');
            }
        });
        const tone = ok === COLLECTIONS.length ? 'green' : ok ? 'orange' : 'red';
        els.feed.textContent = ok === COLLECTIONS.length ? `FEED LIVE · ${stamp()}` : ok ? `FEED PARTIAL · ${ok}/${COLLECTIONS.length}` : 'FEED OFFLINE';
        els.feedDot.className = `g-dot tone-${tone}`;
        log('SYNC', `${ok}/${COLLECTIONS.length} collections updated${ethUSD ? ` · eth ${ethUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}` : ''}`, tone);
        syncing = false;
        renderAll();
    }

    // ---------- Boot ----------
    renderAll();
    sync();
    setInterval(sync, REFRESH_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (sync.last || 0) > REFRESH_MS) sync(); });
})();
