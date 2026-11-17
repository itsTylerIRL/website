/* Page scripts for the coin feeds (pages/btc.html, pages/eth.html, pages/link.html): one live price terminal in
   the DEEPDISH workspace, opened on the coin its page names (<html data-coin>), with the others a click away.
   - Candles: Coinbase Exchange REST (300 a call; scrolling back past the start loads older ones)
   - Live: one Coinbase websocket ticker for every coin: prices, the forming candle and the trade tape
   - Market data: CoinGecko /coins/markets (cap, rank, supply, ATH, 7d / 30d / 1y), every 5 minutes while visible
   The chart is TradingView's lightweight-charts (loaded before this script): candles, line or area, volume,
   MA 20 / MA 50, log scale, crosshair readout, drag to pan, wheel to zoom.
   The coins come from js/coins.js. Live prices also go to the paper trading desk (js/paper.js), whose ticket,
   positions and chart marks are js/coin-desk.js, by way of window.CoinTerminal below. */

(function() {
    const header = document.getElementById('g-objhead');
    if (!header || !window.LightweightCharts) return;
    const LC = window.LightweightCharts;

    const CB = 'https://api.exchange.coinbase.com';
    const WS = 'wss://ws-feed.exchange.coinbase.com';
    const GECKO_MS = 5 * 60 * 1000;
    const INTERVALS = [ // Coinbase granularities
        { key: '1m', sec: 60 }, { key: '5m', sec: 300 }, { key: '15m', sec: 900 },
        { key: '1h', sec: 3600 }, { key: '6h', sec: 21600 }, { key: '1D', sec: 86400 }
    ];
    const MAX_BARS = 3000; // how far back scrolling may load
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = (id) => document.getElementById(id);
    const store = {
        get(k, d) { try { return localStorage.getItem('coin.' + k) ?? d; } catch (_) { return d; } },
        set(k, v) { try { localStorage.setItem('coin.' + k, v); } catch (_) {} }
    };

    const els = {
        assets: $('g-assets'), assetMeta: $('g-asset-meta'), intervals: $('g-intervals'), styles: $('g-styles'), toggles: $('g-toggles'),
        log: $('g-log'), logMeta: $('g-log-meta'), chart: $('g-chart'), legend: $('g-legend'), chartMeta: $('g-chart-meta'),
        props: $('g-props'), propsMeta: $('g-props-meta'), tape: $('g-tape'), tapeMeta: $('g-tape-meta'),
        crumb: $('g-crumb'), feed: $('g-feed'), feedDot: $('g-feed-dot')
    };

    let current = COINS.find((c) => c.key === document.documentElement.dataset.coin) || COINS[0];
    let interval = INTERVALS.find((i) => i.key === store.get('interval', '1h')) || INTERVALS[3];
    let style = ['candles', 'line', 'area'].includes(store.get('style')) ? store.get('style') : 'candles';
    const opts = { volume: store.get('volume', '1') === '1', ma20: store.get('ma20', '1') === '1', ma50: store.get('ma50', '0') === '1', log: store.get('log', '0') === '1' };

    const tick = {}; // key -> last websocket ticker
    const gecko = {}; // key -> CoinGecko /coins/markets row, or { error }
    const tape = {}; // key -> recent trades
    let bars = []; // the chart's candles, oldest first: { time, open, high, low, close, volume }
    let loadToken = 0;
    const hooks = { select: [], draw: [] }; // js/coin-desk.js: the coin changed / the chart was redrawn
    const run = (ev) => hooks[ev].forEach((fn) => { try { fn(current); } catch (e) { console.error(e); } });

    // ---------- Numbers ----------
    const usd = (v, d) => {
        if (typeof v !== 'number' || !isFinite(v)) return '—';
        const digits = d ?? priceDigits(Math.abs(v));
        return '$' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };
    const big = (v) => {
        if (typeof v !== 'number' || !isFinite(v)) return '—';
        const a = Math.abs(v);
        return a >= 1e12 ? `${(v / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(2);
    };
    const pctHtml = (p) => (typeof p === 'number' && isFinite(p))
        ? `<span class="g-delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(p).toFixed(2)}%</span>`
        : '<span class="g-delta">—</span>';
    const dayChange = (c) => { const t = tick[c.key]; return t && t.open ? ((t.price - t.open) / t.open) * 100 : null; };
    const priceDigits = (p) => p >= 10 ? 2 : p >= 1 ? 3 : 5;
    const stamp = (d = new Date()) => [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    // ---------- Chart ----------
    const C = { up: css('--g-green') || '#50fa7b', down: css('--g-red') || '#ff5555', blue: css('--g-blue') || '#8be9fd', orange: css('--g-orange') || '#ffb86c', dim: css('--g-dim') || '#5f8a99' };
    const chart = LC.createChart(els.chart, {
        autoSize: true,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: C.dim, fontFamily: "'Share Tech Mono', ui-monospace, monospace", fontSize: 11 },
        grid: { vertLines: { color: 'rgba(139, 233, 253, 0.05)' }, horzLines: { color: 'rgba(139, 233, 253, 0.07)' } },
        crosshair: {
            mode: LC.CrosshairMode.Normal,
            vertLine: { color: 'rgba(139, 233, 253, 0.45)', labelBackgroundColor: '#123' },
            horzLine: { color: 'rgba(139, 233, 253, 0.45)', labelBackgroundColor: '#123' }
        },
        rightPriceScale: { borderColor: 'rgba(139, 233, 253, 0.14)', scaleMargins: { top: 0.08, bottom: 0.22 } },
        timeScale: { borderColor: 'rgba(139, 233, 253, 0.14)', timeVisible: true, secondsVisible: false, rightOffset: 6 },
        localization: {
            priceFormatter: (p) => usd(p, priceDigits(Math.abs(p))),
            timeFormatter: (t) => new Date(t * 1000).toLocaleString('en-US', interval.sec >= 86400
                ? { weekday: 'short', month: 'short', day: 'numeric', year: '2-digit' }
                : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
        }
    });
    // The axis in local time (the library's own is UTC)
    const TICK = [{ year: 'numeric' }, { month: 'short' }, { month: 'short', day: 'numeric' }, { hour: '2-digit', minute: '2-digit', hour12: false }, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }];
    chart.timeScale().applyOptions({ tickMarkFormatter: (t, type) => new Date(t * 1000).toLocaleString('en-US', TICK[type] || TICK[3]) });
    let main = null;
    const volume = chart.addHistogramSeries({ priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const ma20 = chart.addLineSeries({ color: C.orange, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
    const ma50 = chart.addLineSeries({ color: '#bd93f9', lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });

    function makeMain() {
        if (main) chart.removeSeries(main);
        const fmt = { priceFormat: { type: 'custom', formatter: (p) => usd(p, priceDigits(Math.abs(p))), minMove: 0.00001 } };
        if (style === 'candles') {
            main = chart.addCandlestickSeries({ ...fmt, upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down, wickUpColor: C.up, wickDownColor: C.down });
        } else if (style === 'line') {
            main = chart.addLineSeries({ ...fmt, color: C.blue, lineWidth: 2 });
        } else {
            main = chart.addAreaSeries({ ...fmt, lineColor: C.blue, topColor: 'rgba(139, 233, 253, 0.28)', bottomColor: 'rgba(139, 233, 253, 0.01)', lineWidth: 2 });
        }
        main.setData(bars.map(mainPoint));
        run('draw');
    }
    const mainPoint = (b) => style === 'candles' ? { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close } : { time: b.time, value: b.close };
    const volPoint = (b) => ({ time: b.time, value: b.volume, color: b.close >= b.open ? 'rgba(80, 250, 123, 0.32)' : 'rgba(255, 85, 85, 0.32)' });
    function maOf(n) {
        const out = [];
        let sum = 0;
        bars.forEach((b, i) => {
            sum += b.close;
            if (i >= n) sum -= bars[i - n].close;
            if (i >= n - 1) out.push({ time: b.time, value: sum / n });
        });
        return out;
    }
    function drawAll() {
        main.setData(bars.map(mainPoint));
        volume.setData(opts.volume ? bars.map(volPoint) : []);
        ma20.setData(opts.ma20 ? maOf(20) : []);
        ma50.setData(opts.ma50 ? maOf(50) : []);
        legend();
        run('draw');
    }
    function applyOpts() {
        chart.priceScale('right').applyOptions({ mode: opts.log ? LC.PriceScaleMode.Logarithmic : LC.PriceScaleMode.Normal, scaleMargins: { top: 0.08, bottom: opts.volume ? 0.22 : 0.06 } });
        els.toggles.querySelectorAll('[data-opt]').forEach((b) => b.setAttribute('aria-pressed', opts[b.dataset.opt]));
        els.styles.querySelectorAll('[data-style]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.style === style));
        els.intervals.querySelectorAll('[data-interval]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.interval === interval.key));
    }

    // Readout: the bar under the crosshair, else the latest
    function legend(bar) {
        const b = bar || bars[bars.length - 1];
        if (!b) { els.legend.innerHTML = ''; return; }
        const d = priceDigits(b.close);
        const chg = b.open ? ((b.close - b.open) / b.open) * 100 : null;
        const when = new Date(b.time * 1000);
        const date = interval.sec >= 86400 ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        els.legend.innerHTML = `<b>${esc(current.product)}</b> <span class="g-dim">${interval.key} · ${date}</span>
            <span>O <b>${usd(b.open, d)}</b></span><span>H <b>${usd(b.high, d)}</b></span><span>L <b>${usd(b.low, d)}</b></span><span>C <b>${usd(b.close, d)}</b></span>
            ${pctHtml(chg)}<span>V <b>${big(b.volume)}</b></span>
            ${opts.ma20 ? '<span class="g-ma20">MA20</span>' : ''}${opts.ma50 ? '<span class="g-ma50">MA50</span>' : ''}`;
    }
    chart.subscribeCrosshairMove((p) => {
        if (!p || !p.time) return legend();
        const b = bars.find((x) => x.time === p.time);
        legend(b);
    });

    // ---------- Candles ----------
    async function candles(c, sec, end) {
        // Coinbase: [time, low, high, open, close, volume], newest first, up to 300 per call
        let q = `granularity=${sec}`;
        if (end) q += `&start=${new Date((end - sec * 300) * 1000).toISOString()}&end=${new Date((end - sec) * 1000).toISOString()}`;
        const r = await fetch(`${CB}/products/${c.product}/candles?${q}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const rows = await r.json();
        return rows.map(([time, low, high, open, close, vol]) => ({ time, open, high, low, close, volume: vol })).sort((a, b) => a.time - b.time);
    }
    async function load() {
        const token = ++loadToken;
        const c = current, iv = interval;
        bars = [];
        drawAll();
        els.chart.classList.add('is-loading');
        els.chartMeta.textContent = `${c.product} · ${iv.key} · loading`;
        try {
            const got = await candles(c, iv.sec);
            if (token !== loadToken) return;
            bars = got;
            olderDone = false;
            drawAll();
            chart.timeScale().fitContent();
            chart.timeScale().applyOptions({ timeVisible: iv.sec < 86400 });
            els.chartMeta.textContent = `${c.product} · ${iv.key} · ${bars.length} bars · coinbase`;
            log('CANDLES', `${esc(c.product)} ${iv.key}: ${bars.length} bars`, 'muted');
        } catch (e) {
            if (token !== loadToken) return;
            els.chartMeta.textContent = `${c.product} · ${iv.key} · offline`;
            log('ERR', `candles for ${esc(c.product)}: ${esc(e.message)}`, 'red');
        } finally {
            if (token === loadToken) els.chart.classList.remove('is-loading');
        }
    }
    // Scrolled back to the start: fetch the 300 before it
    let loadingOlder = false, olderDone = false;
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
        if (!r || r.from > 15 || loadingOlder || olderDone || !bars.length || bars.length >= MAX_BARS) return;
        loadingOlder = true;
        const token = loadToken;
        candles(current, interval.sec, bars[0].time).then((older) => {
            if (token !== loadToken) return;
            older = older.filter((b) => b.time < bars[0].time);
            if (!older.length) { olderDone = true; return; }
            bars = older.concat(bars);
            drawAll();
            els.chartMeta.textContent = `${current.product} · ${interval.key} · ${bars.length} bars · coinbase`;
        }).catch(() => { olderDone = true; }).finally(() => { loadingOlder = false; });
    });
    // A trade from the websocket: into the forming candle, or the start of a new one
    function feedBar(price, size, time) {
        if (!bars.length) return;
        const t = Math.floor(time / interval.sec) * interval.sec;
        let b = bars[bars.length - 1];
        if (t < b.time) return;
        if (t > b.time) {
            b = { time: t, open: b.close, high: price, low: price, close: price, volume: 0 };
            bars.push(b);
        }
        b.high = Math.max(b.high, price);
        b.low = Math.min(b.low, price);
        b.close = price;
        b.volume += size;
        main.update(mainPoint(b));
        if (opts.volume) volume.update(volPoint(b));
        if (opts.ma20 && bars.length >= 20) { const m = maOf(20); ma20.update(m[m.length - 1]); }
        if (opts.ma50 && bars.length >= 50) { const m = maOf(50); ma50.update(m[m.length - 1]); }
        if (!hovering) legend();
    }
    let hovering = false;
    els.chart.addEventListener('pointerenter', () => { hovering = true; });
    els.chart.addEventListener('pointerleave', () => { hovering = false; legend(); });

    // ---------- Websocket ticker (all coins at once) ----------
    let ws = null, wsTimer = null, wsBackoff = 2000, lastMsg = 0;
    function connect() {
        clearTimeout(wsTimer);
        try { ws = new WebSocket(WS); } catch (_) { return retry(); }
        ws.onopen = () => {
            wsBackoff = 2000;
            ws.send(JSON.stringify({ type: 'subscribe', product_ids: COINS.map((c) => c.product), channels: ['ticker'] }));
            log('WS', 'coinbase ticker connected', 'green');
            setFeed();
        };
        ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (_) { return; }
            if (m.type !== 'ticker') return;
            const c = COINS.find((x) => x.product === m.product_id);
            if (!c) return;
            lastMsg = Date.now();
            window.Paper?.tick(c.key, +m.price, m.time ? Date.parse(m.time) : Date.now());
            const t = {
                price: +m.price, open: +m.open_24h, high: +m.high_24h, low: +m.low_24h, vol: +m.volume_24h,
                bid: +m.best_bid, ask: +m.best_ask, side: m.side, size: +m.last_size, time: m.time ? Date.parse(m.time) : Date.now()
            };
            const prev = tick[c.key];
            tick[c.key] = t;
            if (t.size) {
                (tape[c.key] = tape[c.key] || []).unshift(t);
                tape[c.key].length = Math.min(tape[c.key].length, 60);
            }
            if (c === current) {
                if (t.size) feedBar(t.price, t.size, Math.floor(t.time / 1000));
                livePrice(prev);
                renderTape();
            }
            renderAsset(c);
        };
        ws.onclose = () => { setFeed(); retry(); };
        ws.onerror = () => { try { ws.close(); } catch (_) {} };
    }
    function retry() {
        clearTimeout(wsTimer);
        if (document.hidden) return; // reconnects when the tab is back
        wsTimer = setTimeout(connect, wsBackoff);
        wsBackoff = Math.min(wsBackoff * 2, 60000);
    }
    const wsLive = () => ws && ws.readyState === 1;
    function setFeed() {
        const live = wsLive() && Date.now() - lastMsg < 30000;
        els.feed.textContent = live ? `FEED LIVE · ${stamp()}` : wsLive() ? 'FEED CONNECTED' : 'FEED OFFLINE · RETRYING';
        els.feedDot.className = `g-dot tone-${live ? 'green' : wsLive() ? 'orange' : 'red'}`;
    }
    setInterval(setFeed, 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (!wsLive()) { wsBackoff = 2000; connect(); }
        if (Date.now() - (syncGecko.last || 0) > GECKO_MS) syncGecko();
        if (bars.length && Date.now() / 1000 - bars[bars.length - 1].time > interval.sec * 3) load(); // the gap is too long to fill from the tape
    });

    // ---------- Asset explorer ----------
    function assetRow(c) {
        const t = tick[c.key];
        const g = gecko[c.key];
        const price = t ? t.price : (g && !g.error ? g.current_price : null);
        const chg = t ? dayChange(c) : (g && !g.error ? g.price_change_percentage_24h : null);
        return `<button type="button" class="g-asset" data-key="${c.key}" aria-current="${c === current}">
            <img class="g-asset-logo" src="${esc(c.icon)}" alt="" width="30" height="30">
            <span class="g-asset-text"><span class="g-asset-name">${esc(c.name)} <small>${esc(c.key.toUpperCase())}</small></span>
            <span class="g-asset-price">${price ? usd(price) : 'syncing…'} ${price ? pctHtml(chg) : ''}</span></span>
            <i class="g-dot tone-${t ? 'green' : 'muted'}"></i></button>`;
    }
    function renderAssets() {
        els.assets.innerHTML = COINS.map((c) => `<li>${assetRow(c)}</li>`).join('');
        els.assetMeta.textContent = `${COINS.filter((c) => tick[c.key]).length}/${COINS.length} LIVE`;
    }
    const assetThrottle = {};
    function renderAsset(c) {
        if (assetThrottle[c.key]) return;
        assetThrottle[c.key] = setTimeout(() => {
            assetThrottle[c.key] = null;
            const li = els.assets.querySelector(`[data-key="${c.key}"]`)?.parentElement;
            if (li) li.innerHTML = assetRow(c);
            els.assetMeta.textContent = `${COINS.filter((x) => tick[x.key]).length}/${COINS.length} LIVE`;
        }, 250);
    }

    // ---------- Header ----------
    function renderHeader() {
        const c = current;
        const idx = COINS.indexOf(c);
        header.innerHTML = `<div class="g-objrow">
                <div class="g-objicon g-objicon-img"><img class="g-objimg" src="${esc(c.icon)}" alt=""></div>
                <div class="g-objtitle">
                    <div class="g-objtype">OBJECT &middot; FEED &middot; ${esc(c.product)}</div>
                    <h1>${esc(c.name)}</h1>
                </div>
                <span class="g-chip tone-muted" id="g-live-chip"><i class="g-dot tone-muted"></i>Syncing</span>
                <div class="g-objnav">
                    <button type="button" class="g-btn" data-step="-1" aria-label="Previous coin">&lsaquo;</button>
                    <span>${idx + 1} / ${COINS.length}</span>
                    <button type="button" class="g-btn" data-step="1" aria-label="Next coin">&rsaquo;</button>
                    <a class="g-btn g-visit" href="https://www.coinbase.com/advanced-trade/spot/${esc(c.product)}" target="_blank" rel="noopener">COINBASE &nearr;</a>
                    <a class="g-btn g-visit" href="https://www.coingecko.com/en/coins/${esc(c.gecko)}" target="_blank" rel="noopener">GECKO &nearr;</a>
                </div>
            </div>
            <div class="g-quote">
                <span class="g-quote-price" id="g-quote-price">—</span>
                <span id="g-quote-chg"></span>
                <span class="g-quote-sub" id="g-quote-sub"></span>
            </div>
            <p class="g-summary">${esc(c.tagline)}</p>`;
        header.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
        els.crumb.textContent = c.name;
        document.title = `${c.name} - Tyler (in real life)`;
        livePrice();
    }
    let lastStatus = 0;
    function livePrice(prev) {
        const c = current;
        const t = tick[c.key];
        const g = gecko[c.key];
        const price = t ? t.price : (g && !g.error ? g.current_price : null);
        const chg = t ? dayChange(c) : (g && !g.error ? g.price_change_percentage_24h : null);
        const el = $('g-quote-price');
        if (!el) return;
        el.textContent = usd(price);
        if (prev && t && t.price !== prev.price) {
            el.classList.remove('flash-up', 'flash-down');
            void el.offsetWidth;
            el.classList.add(t.price > prev.price ? 'flash-up' : 'flash-down');
        }
        $('g-quote-chg').innerHTML = `${pctHtml(chg)} <span class="g-dim">24h</span>`;
        $('g-quote-sub').innerHTML = t
            ? `bid <b>${usd(t.bid)}</b> &middot; ask <b>${usd(t.ask)}</b> &middot; 24h range <b>${usd(t.low)} – ${usd(t.high)}</b>`
            : '';
        const chip = $('g-live-chip');
        const live = !!t && wsLive();
        chip.className = `g-chip tone-${live ? 'green' : 'muted'}`;
        chip.innerHTML = `<i class="g-dot tone-${live ? 'green' : 'muted'}"></i>${live ? 'Live' : 'Syncing'}`;
        // Embedded on the home page (js/embed.js): the preview's status line, at most once a second
        if (window.TirlEmbed && price && Date.now() - lastStatus > 1000) {
            lastStatus = Date.now();
            window.TirlEmbed.status(`${c.key.toUpperCase()} ${usd(price)} · ${chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% 24H` : 'LIVE'}`);
        }
    }

    // ---------- Properties (CoinGecko + the ticker) ----------
    function renderProps() {
        const m = gecko[current.key];
        const t = tick[current.key];
        const ok = m && !m.error;
        els.propsMeta.textContent = m && m.error ? 'GECKO OFFLINE' : ok ? `RANK #${m.market_cap_rank ?? '—'}` : 'SYNCING';
        const rows = [
            ['market cap', ok && `$${big(m.market_cap)}`],
            ['fdv', ok && m.fully_diluted_valuation && `$${big(m.fully_diluted_valuation)}`],
            ['24h volume', t ? `${big(t.vol)} ${current.key.toUpperCase()} · $${big(t.vol * t.price)}` : ok && `$${big(m.total_volume)}`],
            ['24h high', t ? usd(t.high) : ok && usd(m.high_24h)],
            ['24h low', t ? usd(t.low) : ok && usd(m.low_24h)],
            ['7d', ok && pctHtml(m.price_change_percentage_7d_in_currency)],
            ['30d', ok && pctHtml(m.price_change_percentage_30d_in_currency)],
            ['1y', ok && pctHtml(m.price_change_percentage_1y_in_currency)],
            ['ath', ok && m.ath && `${usd(m.ath)} <span class="g-dim">${new Date(m.ath_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>`],
            ['from ath', ok && pctHtml(m.ath_change_percentage)],
            ['circulating', ok && big(m.circulating_supply)],
            ['max supply', ok && (m.max_supply ? big(m.max_supply) : '∞')]
        ];
        els.props.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v || '—'}</dd>`).join('');
    }
    // One call for every coin (CoinGecko's free tier rate-limits bursts)
    async function syncGecko() {
        if (document.hidden) return;
        syncGecko.last = Date.now();
        try {
            const ids = COINS.map((c) => c.gecko).join(',');
            const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=7d,30d,1y`);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const rows = await r.json();
            COINS.forEach((c) => { const row = rows.find((x) => x.id === c.gecko); if (row) gecko[c.key] = row; });
            log('SYNC', `market data for ${rows.length}/${COINS.length} coins · coingecko`, rows.length === COINS.length ? 'green' : 'orange');
        } catch (e) {
            COINS.forEach((c) => { if (!gecko[c.key]) gecko[c.key] = { error: true }; });
            log('ERR', `coingecko: ${esc(e.message)}`, 'orange');
        }
        renderProps();
        COINS.forEach(renderAsset);
        livePrice();
    }
    setInterval(() => { renderProps(); }, 5000); // the ticker's 24h numbers

    // ---------- Trade tape ----------
    let tapeTimer = null;
    function renderTape() {
        if (tapeTimer) return;
        tapeTimer = setTimeout(() => {
            tapeTimer = null;
            const list = tape[current.key] || [];
            els.tapeMeta.textContent = list.length ? `${list.length} trades` : 'waiting for trades';
            els.tape.innerHTML = list.slice(0, 40).map((t) => `<li class="${t.side === 'buy' ? 'up' : 'down'}">
                <time>${stamp(new Date(t.time))}</time><b>${usd(t.price)}</b><span>${t.size >= 1 ? t.size.toLocaleString('en-US', { maximumFractionDigits: 4 }) : t.size.toFixed(8).replace(/0+$/, '')}</span></li>`).join('');
        }, 150);
    }

    // ---------- Selection + controls ----------
    function select(c) {
        if (!c || c === current) return;
        current = c;
        els.assets.querySelectorAll('.g-asset').forEach((b) => b.setAttribute('aria-current', b.dataset.key === c.key));
        renderHeader();
        renderProps();
        renderTape();
        load();
        run('select');
    }
    function step(dir) {
        const i = COINS.indexOf(current);
        select(COINS[(i + dir + COINS.length) % COINS.length]);
    }
    function setInterval_(key) {
        const iv = INTERVALS.find((i) => i.key === key);
        if (!iv || iv === interval) return;
        interval = iv;
        store.set('interval', key);
        applyOpts();
        load();
    }
    els.assets.addEventListener('click', (e) => {
        const b = e.target.closest('[data-key]');
        if (b) select(COINS.find((c) => c.key === b.dataset.key));
    });
    els.intervals.addEventListener('click', (e) => {
        const b = e.target.closest('[data-interval]');
        if (b) setInterval_(b.dataset.interval);
    });
    els.styles.addEventListener('click', (e) => {
        const b = e.target.closest('[data-style]');
        if (!b || b.dataset.style === style) return;
        style = b.dataset.style;
        store.set('style', style);
        makeMain();
        applyOpts();
    });
    els.toggles.addEventListener('click', (e) => {
        const b = e.target.closest('[data-opt]');
        if (!b) return;
        const k = b.dataset.opt;
        opts[k] = !opts[k];
        store.set(k, opts[k] ? '1' : '0');
        applyOpts();
        drawAll();
    });
    $('g-fit').addEventListener('click', () => chart.timeScale().fitContent());
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? -1 : 1); }
        else if (/^[1-6]$/.test(e.key)) setInterval_(INTERVALS[+e.key - 1].key);
        else if (e.key === 'c') els.styles.querySelector(`[data-style="${['candles', 'line', 'area'][(['candles', 'line', 'area'].indexOf(style) + 1) % 3]}"]`).click();
        else if (e.key === 'f') chart.timeScale().fitContent();
    });

    // ---------- Feed log ----------
    const events = [];
    function log(kind, html, tone) {
        events.unshift({ t: stamp(), kind, html, tone });
        events.length = Math.min(events.length, 60);
        els.log.innerHTML = events.map((e) => `<li><i class="g-dot tone-${e.tone}"></i><div>
            <time>${e.t} &middot; ${e.kind}</time><span>${e.html}</span></div></li>`).join('');
        els.logMeta.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
        // Embedded on the home page (js/embed.js): connects, errors and fills go to its ticker
        if (window.TirlEmbed && (kind === 'WS' || kind === 'ERR' || kind === 'FILL') && tone !== 'muted') window.TirlEmbed.event({ kind, html, tone });
    }

    // For js/coin-desk.js
    window.CoinTerminal = {
        get coin() { return current; }, get series() { return main; }, get bars() { return bars; }, chart,
        price: (k) => (tick[k] ? tick[k].price : null),
        select: (k) => select(COINS.find((c) => c.key === k)),
        on(ev, fn) { hooks[ev].push(fn); }, log, usd, big, pctHtml, esc, priceDigits
    };

    // ---------- Boot ----------
    makeMain();
    applyOpts();
    renderAssets();
    renderHeader();
    renderProps();
    renderTape();
    load();
    connect();
    syncGecko();
    setInterval(syncGecko, GECKO_MS);
})();
