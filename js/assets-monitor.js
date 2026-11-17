/* Assets monitor on the home page (index.html, left column under Azimuth IDs): the coins in
   js/coins.js live, whatever object is showing. One Coinbase websocket ticker for all of them gives the price
   and 24h change (open_24h); a 24h sparkline of hourly closes comes from Coinbase candles every 10 minutes and
   follows the live price in between. Clicking a coin opens its terminal in the preview (/#btc); the row of
   the coin showing is lit (tirl:select from js/objects.js).
   It also feeds the paper trading desk (js/paper.js), so orders fill while the home page is open, and shows
   the account: equity and return, and what's held of each coin. The websocket closes while the tab is hidden. */
(function() {
    'use strict';
    const list = document.getElementById('g-assetmon');
    if (!list || typeof COINS === 'undefined') return;
    const meta = document.getElementById('g-assetmon-meta');
    const deskEl = document.getElementById('g-assetmon-desk');
    const P = window.Paper;
    const WS = 'wss://ws-feed.exchange.coinbase.com';
    const CB = 'https://api.exchange.coinbase.com';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const usd = (v, d) => (typeof v === 'number' && isFinite(v))
        ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: d ?? (v >= 10 ? 2 : v >= 1 ? 3 : 5), maximumFractionDigits: d ?? (v >= 10 ? 2 : v >= 1 ? 3 : 5) }) : '—';
    const pct = (p) => (typeof p === 'number' && isFinite(p))
        ? `<span class="g-delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(p).toFixed(2)}%</span>` : '';
    const qtyFmt = (q) => q >= 1 ? q.toLocaleString('en-US', { maximumFractionDigits: 3 }) : q.toPrecision(3);

    const tick = {}; // key -> { price, open }
    const spark = {}; // key -> hourly closes, oldest first
    let current = window.ObjectsCurrent || null;

    // ---------- Rows ----------
    function sparkSvg(k) {
        const pts = (spark[k] || []).slice();
        if (tick[k]) pts.push(tick[k].price);
        if (pts.length < 2) return '<svg class="g-am-spark" viewBox="0 0 60 18" aria-hidden="true"></svg>';
        const min = Math.min(...pts), max = Math.max(...pts), span = (max - min) || 1;
        const xy = pts.map((p, i) => `${(i / (pts.length - 1) * 58 + 1).toFixed(1)},${(16 - (p - min) / span * 14 + 0).toFixed(1)}`);
        const up = pts[pts.length - 1] >= pts[0];
        return `<svg class="g-am-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true"><polyline points="${xy.join(' ')}" fill="none" stroke="${up ? 'var(--g-green)' : 'var(--g-red)'}" stroke-width="1.3" vector-effect="non-scaling-stroke"/></svg>`;
    }
    function row(c) {
        const t = tick[c.key];
        const s = P && P.state();
        const held = s && s.pos[c.key] && s.pos[c.key].qty;
        return `<a class="g-am-row" href="/#${c.key}" data-key="${c.key}" aria-current="${c.key === current}" title="${esc(c.name)}: open the price terminal">
            <img class="g-am-icon" src="${esc(c.icon)}" alt="" width="24" height="24">
            <span class="g-am-text"><span class="g-am-name">${esc(c.key.toUpperCase())}${held ? ` <small title="held on the paper desk">${qtyFmt(held)}</small>` : ''}</span>
            <span class="g-am-price">${t ? usd(t.price) : 'syncing…'}</span></span>
            <span class="g-am-right">${sparkSvg(c.key)}${t && t.open ? pct((t.price - t.open) / t.open * 100) : ''}</span>
        </a>`;
    }
    function render() {
        list.innerHTML = COINS.map((c) => `<li>${row(c)}</li>`).join('');
        meta.textContent = `${COINS.filter((c) => tick[c.key]).length}/${COINS.length} LIVE`;
        renderDesk();
    }
    const timers = {};
    function renderOne(k) { // at most 4 times a second per coin
        if (timers[k]) return;
        timers[k] = setTimeout(() => {
            timers[k] = null;
            const a = list.querySelector(`[data-key="${k}"]`);
            if (a) a.parentElement.innerHTML = row(COINS.find((c) => c.key === k));
            meta.textContent = `${COINS.filter((c) => tick[c.key]).length}/${COINS.length} LIVE`;
        }, 250);
    }
    // The paper desk's line: equity and return, linking to the terminal of what's held (else the first coin)
    let deskTimer = null;
    function renderDesk() {
        if (!P || !deskEl) return;
        clearTimeout(deskTimer);
        deskTimer = setTimeout(() => {
            const s = P.state(), v = P.value();
            const held = COINS.find((c) => s.pos[c.key] && s.pos[c.key].qty > 0) || COINS[0];
            const fresh = !s.trades;
            deskEl.href = `/#${held.key}/desk`;
            deskEl.title = `paper desk: ${P.title(v.ret, s.trades)}${s.orders.length ? ` · ${s.orders.length} open order${s.orders.length === 1 ? '' : 's'}` : ''}`;
            deskEl.innerHTML = `<span class="g-am-desk-k">PAPER</span><b>${usd(v.total, 2)}</b>${fresh ? '<span class="g-am-desk-cta">trade &rsaquo;</span>' : pct(v.ret)}${s.orders.length ? `<span class="g-am-desk-o">${s.orders.length} open</span>` : ''}`;
        }, 300);
    }
    window.addEventListener('tirl:select', (e) => {
        current = e.detail.key;
        list.querySelectorAll('.g-am-row').forEach((a) => a.setAttribute('aria-current', a.dataset.key === current));
    });
    if (P) {
        P.on(() => { renderDesk(); });
        window.addEventListener('paper:fill', () => COINS.forEach((c) => renderOne(c.key)));
    }

    // ---------- Websocket ticker ----------
    let ws = null, retry = null, backoff = 2000;
    function connect() {
        clearTimeout(retry);
        if (document.hidden || (ws && ws.readyState <= 1)) return;
        try { ws = new WebSocket(WS); } catch (_) { return again(); }
        ws.onopen = () => {
            backoff = 2000;
            ws.send(JSON.stringify({ type: 'subscribe', product_ids: COINS.map((c) => c.product), channels: ['ticker'] }));
        };
        ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (_) { return; }
            if (m.type !== 'ticker') return;
            const c = COINS.find((x) => x.product === m.product_id);
            if (!c) return;
            const first = !tick[c.key];
            tick[c.key] = { price: +m.price, open: +m.open_24h };
            if (P) P.tick(c.key, +m.price, m.time ? Date.parse(m.time) : Date.now());
            if (first) window.tirlArrive?.arrive(list.querySelector(`[data-key="${c.key}"] .g-am-price`));
            renderOne(c.key);
        };
        ws.onclose = () => again();
        ws.onerror = () => { try { ws.close(); } catch (_) {} };
    }
    function again() {
        clearTimeout(retry);
        if (document.hidden) return;
        retry = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 60000);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearTimeout(retry);
            if (ws) { ws.onclose = null; try { ws.close(); } catch (_) {} ws = null; }
        } else { backoff = 2000; connect(); sparks(); }
    });

    // ---------- Sparklines ----------
    let sparkAt = 0;
    async function sparks() {
        if (document.hidden || Date.now() - sparkAt < 10 * 60000) return;
        sparkAt = Date.now();
        await Promise.allSettled(COINS.map(async (c) => {
            const r = await fetch(`${CB}/products/${c.product}/candles?granularity=3600`);
            if (!r.ok) return;
            const rows = await r.json();
            spark[c.key] = rows.slice(0, 24).reverse().map((x) => x[4]);
            renderOne(c.key);
        }));
    }

    render();
    connect();
    sparks();
    setInterval(sparks, 60000);
})();
