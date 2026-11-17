/* Paper trading desk: a $10,000 practice account for the coins in js/coins.js, kept in this browser
   (localStorage 'tirl.paper'). Used by the coin terminal (js/coin.js) and the home page's Assets monitor
   (js/assets-monitor.js); whichever is open feeds it live prices with window.Paper.tick(), and every open tab
   or frame fills orders from them. Each change re-reads the saved account first, so two tabs never fill the
   same order twice.
   - Orders: market (fills now), limit (buy at or below / sell at or above its price), stop (buy once the price
     rises to it / sell once it falls to it, filling at the price that set it off). A buy can carry a
     stop-loss and a take-profit; they're placed when it fills and cancel each other (one-cancels-other).
   - Money: a 0.1% fee on every fill; no borrowing, so buys need the cash and sells the coins, and open orders
     set aside what they'd use.
   - Away: orders keep working. On the next visit the candles since the last price seen are walked through,
     and anything that would have triggered fills at its price, at the time it would have.
   - Runs: a reset files the run (return, trades) and starts over at $10,000. */
(function() {
    'use strict';
    if (window.Paper || typeof COINS === 'undefined') return;

    const KEY = 'tirl.paper';
    const START = 10000;
    const FEE = 0.001;
    const MIN_USD = 1;
    const STOP_BUFFER = 1.02; // stop buys set aside 2% over the stop for the price they fill at
    const CB = 'https://api.exchange.coinbase.com';
    const keys = COINS.map((c) => c.key);
    const coinOf = (k) => COINS.find((c) => c.key === k);
    const prices = {}; // key -> last live price (this tab)
    const listeners = new Set();

    // ---------- The account ----------
    function fresh() {
        return {
            v: 1, started: Date.now(), cash: START,
            pos: {}, // key -> { qty, cost } (cost: what the coins held cost, fees in)
            orders: [], // { id, key, side, type: 'limit' | 'stop', price, qty, reserve, oco, bracket: { sl, tp }, role, t }
            fills: [], // { id, t, key, side, type, qty, price, fee, pnl }
            realized: 0, fees: 0, wins: 0, losses: 0, trades: 0,
            peak: START, maxDD: 0,
            last: {}, // key -> { p, t }: the last price seen, to value the account and catch up on orders
            runs: [], // finished runs: { started, ended, value, ret, trades }
            seq: 1
        };
    }
    // load(): the saved account, read fresh (before any change); peek(): a cached copy for the per-tick check
    let cache = null;
    function load() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
        cache = s && s.v === 1 ? s : fresh();
        return JSON.parse(JSON.stringify(cache));
    }
    const peek = () => cache || load();
    let saveFails = false;
    function save(s) {
        cache = JSON.parse(JSON.stringify(s));
        try { localStorage.setItem(KEY, JSON.stringify(s)); saveFails = false; }
        catch (_) { saveFails = true; }
        emit();
    }
    function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
    // Another tab or frame changed it
    window.addEventListener('storage', (e) => { if (e.key === KEY) { cache = null; emit(); } });

    const priceOf = (s, k) => prices[k] ?? (s.last[k] && s.last[k].p) ?? null;
    function value(s = load()) {
        let held = 0;
        keys.forEach((k) => { const p = s.pos[k]; if (p && p.qty > 0) held += p.qty * (priceOf(s, k) || 0); });
        const reserved = s.orders.filter((o) => o.side === 'buy').reduce((a, o) => a + o.reserve, 0);
        const total = s.cash + held;
        return { cash: s.cash, free: s.cash - reserved, reserved, held, total, pnl: total - START, ret: (total - START) / START * 100 };
    }
    // Coins not set aside by sell orders (a stop-loss and take-profit pair sets its coins aside once)
    function freeQty(s, k) {
        const held = (s.pos[k] && s.pos[k].qty) || 0;
        const groups = new Set();
        let out = 0;
        s.orders.forEach((o) => {
            if (o.key !== k || o.side !== 'sell') return;
            if (o.oco) { if (groups.has(o.oco)) return; groups.add(o.oco); }
            out += o.qty;
        });
        return Math.max(0, held - out);
    }

    // ---------- Fills ----------
    function fill(s, k, side, qty, price, type, t = Date.now()) {
        const pos = s.pos[k] || (s.pos[k] = { qty: 0, cost: 0 });
        const gross = qty * price;
        const fee = gross * FEE;
        let pnl = null;
        if (side === 'buy') {
            s.cash -= gross + fee;
            pos.qty += qty;
            pos.cost += gross + fee;
        } else {
            const avg = pos.qty ? pos.cost / pos.qty : 0;
            pnl = gross - fee - avg * qty;
            s.cash += gross - fee;
            pos.cost -= avg * qty;
            pos.qty -= qty;
            if (pos.qty < 1e-12) { pos.qty = 0; pos.cost = 0; }
            s.realized += pnl;
            if (pnl >= 0) s.wins++; else s.losses++;
        }
        if (s.cash > -1e-9 && s.cash < 0) s.cash = 0;
        s.fees += fee;
        s.trades++;
        const f = { id: s.seq++, t, key: k, side, type, qty, price, fee, pnl };
        s.fills.unshift(f);
        s.fills.length = Math.min(s.fills.length, 200);
        track(s);
        return f;
    }
    function track(s) {
        const v = value(s).total;
        if (v > s.peak) s.peak = v;
        const dd = s.peak ? (s.peak - v) / s.peak * 100 : 0;
        if (dd > s.maxDD) s.maxDD = dd;
    }
    // A buy that filled places its stop-loss and take-profit
    function bracket(s, k, qty, b, t) {
        if (!b || (!b.sl && !b.tp)) return;
        const oco = b.sl && b.tp ? 'g' + s.seq++ : null;
        if (b.sl) s.orders.push({ id: s.seq++, key: k, side: 'sell', type: 'stop', price: b.sl, qty, reserve: 0, oco, role: 'sl', t });
        if (b.tp) s.orders.push({ id: s.seq++, key: k, side: 'sell', type: 'limit', price: b.tp, qty, reserve: 0, oco, role: 'tp', t });
    }
    // Is the order set off by a price range [lo, hi], and at what price does it fill (open: where the range began)
    function trigger(o, lo, hi, open) {
        if (o.side === 'buy' && o.type === 'limit' && lo <= o.price) return Math.min(o.price, open);
        if (o.side === 'sell' && o.type === 'limit' && hi >= o.price) return Math.max(o.price, open);
        if (o.side === 'buy' && o.type === 'stop' && hi >= o.price) return Math.max(o.price, open);
        if (o.side === 'sell' && o.type === 'stop' && lo <= o.price) return Math.min(o.price, open);
        return null;
    }
    // Fill one triggered order on the account; false if it no longer can
    function execute(s, o, price, t) {
        const i = s.orders.indexOf(o);
        if (i === -1) return null;
        s.orders.splice(i, 1);
        let qty = o.qty;
        if (o.side === 'buy') {
            // what was set aside is spendable again; a stop buy that gapped up buys what the cash covers
            qty = Math.min(qty, (value(s).free) / (price * (1 + FEE)));
            if (qty * price < MIN_USD) return null;
        } else {
            qty = Math.min(qty, (s.pos[o.key] && s.pos[o.key].qty) || 0);
            if (qty <= 0) return null;
        }
        if (o.oco) s.orders = s.orders.filter((x) => x.oco !== o.oco);
        const f = fill(s, o.key, o.side, qty, price, o.role || o.type, t);
        if (o.side === 'buy') bracket(s, o.key, qty, o.bracket, t);
        return f;
    }

    // ---------- Live prices ----------
    let dirtyAt = 0;
    function tick(k, p, t = Date.now()) {
        if (!(p > 0) || !keys.includes(k)) return;
        prices[k] = p;
        let s = null;
        const fills = [];
        // only touch the saved account when an order might fill, or now and then to keep the last price and peak
        const due = peek().orders.filter((o) => o.key === k && trigger(o, p, p, p) !== null);
        if (due.length) {
            s = load();
            due.sort((a, b) => a.t - b.t).forEach((o) => {
                const live = s.orders.find((x) => x.id === o.id);
                const f = live && execute(s, live, o.type === 'limit' ? o.price : p, t);
                if (f) fills.push(f);
            });
        }
        if (s || Date.now() - dirtyAt > 5000) {
            s = s || load();
            s.last[k] = { p, t };
            keys.forEach((x) => { if (prices[x]) s.last[x] = { p: prices[x], t: Math.max(t, (s.last[x] && s.last[x].t) || 0) }; });
            track(s);
            dirtyAt = Date.now();
            save(s);
        } else emit();
        fills.forEach((f) => window.dispatchEvent(new CustomEvent('paper:fill', { detail: f })));
    }

    // ---------- Orders ----------
    const err = (m) => { throw new Error(m); };
    // Market order: by coins (qty) or by dollars (usd); 'all' sells everything not set aside
    function market(k, side, { qty, usd } = {}) {
        const p = prices[k] || err('no live price yet');
        const s = load();
        if (side === 'buy') {
            const free = value(s).free;
            if (usd != null) qty = usd / (p * (1 + FEE));
            if (!(qty > 0)) err('enter an amount');
            if (qty * p * (1 + FEE) > free + 1e-6) err(`not enough cash: $${free.toFixed(2)} free`);
        } else {
            const avail = freeQty(s, k);
            if (qty === 'all') qty = avail;
            else if (usd != null) qty = usd / p;
            if (!(qty > 0)) err('enter an amount');
            if (qty > avail + 1e-12) err(avail ? `only ${avail.toPrecision(6)} free to sell` : s.pos[k] && s.pos[k].qty > 0 ? 'it\'s all set aside by open sell orders: cancel one first' : 'nothing to sell');
            qty = Math.min(qty, avail);
        }
        if (qty * p < MIN_USD) err(`minimum order is $${MIN_USD}`);
        const f = fill(s, k, side, qty, p, 'market');
        return { s, f };
    }
    function buyMarket(k, opts, br) {
        const { s, f } = market(k, 'buy', opts);
        checkBracket(f.price, br);
        bracket(s, k, f.qty, br, f.t);
        save(s);
        window.dispatchEvent(new CustomEvent('paper:fill', { detail: f }));
        return f;
    }
    function sellMarket(k, opts) {
        const { s, f } = market(k, 'sell', opts);
        // sell orders no longer covered by the coins left come off
        trimSells(s, k);
        save(s);
        window.dispatchEvent(new CustomEvent('paper:fill', { detail: f }));
        return f;
    }
    function trimSells(s, k) {
        const held = (s.pos[k] && s.pos[k].qty) || 0;
        s.orders = s.orders.filter((o) => !(o.key === k && o.side === 'sell' && held <= 1e-12));
        s.orders.forEach((o) => { if (o.key === k && o.side === 'sell' && o.qty > held) o.qty = held; });
    }
    function checkBracket(entry, b) {
        if (!b) return;
        if (b.sl && !(b.sl < entry)) err('stop-loss has to be under the buy price');
        if (b.tp && !(b.tp > entry)) err('take-profit has to be over the buy price');
    }
    // Resting order: { side, type: 'limit' | 'stop', price, qty | usd, sl, tp }
    function place(k, { side, type, price, qty, usd, sl, tp }) {
        const p = prices[k] || err('no live price yet');
        if (!(price > 0)) err('enter a price');
        const s = load();
        if (usd != null) qty = usd / price;
        if (qty === 'all') qty = freeQty(s, k);
        if (!(qty > 0)) err('enter an amount');
        if (qty * price < MIN_USD) err(`minimum order is $${MIN_USD}`);
        // a limit that's already through the price would just be a market order
        if (type === 'limit' && side === 'buy' && price >= p) err('a buy limit goes under the price (or buy at market)');
        if (type === 'limit' && side === 'sell' && price <= p) err('a sell limit goes over the price (or sell at market)');
        if (type === 'stop' && side === 'buy' && price <= p) err('a buy stop goes over the price');
        if (type === 'stop' && side === 'sell' && price >= p) err('a sell stop goes under the price');
        const o = { id: s.seq++, key: k, side, type, price, qty, reserve: 0, oco: null, t: Date.now() };
        if (side === 'buy') {
            o.reserve = qty * price * (1 + FEE) * (type === 'stop' ? STOP_BUFFER : 1);
            const free = value(s).free;
            if (o.reserve > free + 1e-6) err(`not enough cash: $${free.toFixed(2)} free${type === 'stop' ? ' (stops set aside 2% extra)' : ''}`);
            const br = { sl: sl || null, tp: tp || null };
            checkBracket(price, br);
            if (br.sl || br.tp) o.bracket = br;
        } else {
            const avail = freeQty(s, k);
            if (qty > avail + 1e-12) err(avail ? `only ${avail.toPrecision(6)} free to sell` : s.pos[k] && s.pos[k].qty > 0 ? 'it\'s all set aside by open sell orders: cancel one first' : 'nothing to sell');
            o.qty = Math.min(qty, avail);
        }
        s.orders.push(o);
        save(s);
        return o;
    }
    function cancel(id) {
        const s = load();
        const o = s.orders.find((x) => x.id === id);
        if (!o) return;
        s.orders = s.orders.filter((x) => x.id !== id);
        save(s);
    }
    function reset() {
        const s = load();
        const v = value(s);
        const runs = s.runs || [];
        if (s.trades) runs.unshift({ started: s.started, ended: Date.now(), value: v.total, ret: v.ret, trades: s.trades });
        const n = fresh();
        n.runs = runs.slice(0, 20);
        n.last = s.last;
        save(n);
    }

    // ---------- Catching up on orders while nobody was watching ----------
    const GRANS = [60, 300, 900, 3600, 21600, 86400];
    async function catchUp() {
        const s0 = load();
        const now = Date.now();
        try { // one tab or frame at a time
            const lock = +localStorage.getItem(KEY + '.catchup') || 0;
            if (now - lock < 30000) return;
            localStorage.setItem(KEY + '.catchup', String(now));
        } catch (_) { return; }
        const todo = keys.filter((k) => s0.orders.some((o) => o.key === k) && s0.last[k] && now - s0.last[k].t > 90000);
        for (const k of todo) {
            const from = Math.floor(s0.last[k].t / 1000);
            const span = now / 1000 - from;
            const g = GRANS.find((x) => span / x <= 300) || 86400;
            let rows;
            try {
                const start = new Date(Math.floor(from / g) * g * 1000).toISOString();
                const r = await fetch(`${CB}/products/${coinOf(k).product}/candles?granularity=${g}&start=${start}&end=${new Date(now).toISOString()}`);
                if (!r.ok) continue;
                rows = (await r.json()).map(([t, lo, hi, op]) => ({ t, lo, hi, op })).sort((a, b) => a.t - b.t);
            } catch (_) { continue; }
            const s = load(); // fresh: orders may have changed while fetching
            const fills = [];
            rows.forEach((c) => {
                const t = c.t * 1000;
                s.orders.filter((o) => o.key === k && o.t <= t + g * 1000).sort((a, b) => a.t - b.t).forEach((o) => {
                    if (!s.orders.includes(o)) return; // its pair filled
                    // a candle that began before the order: its opening price wasn't on offer to it
                    const at = trigger(o, c.lo, c.hi, t >= o.t ? c.op : o.price);
                    if (at === null) return;
                    const f = execute(s, o, at, Math.max(t, o.t));
                    if (f) fills.push(f);
                });
            });
            if (fills.length) {
                save(s);
                fills.forEach((f) => window.dispatchEvent(new CustomEvent('paper:fill', { detail: { ...f, away: true } })));
            }
        }
    }

    // ---------- Titles (for fun) ----------
    function title(ret, trades) {
        if (!trades) return 'fresh capital';
        if (ret <= -50) return 'exit liquidity';
        if (ret <= -20) return 'ngmi';
        if (ret <= -5) return 'paper hands';
        if (ret < 0) return 'down bad';
        if (ret < 5) return 'scratching';
        if (ret < 20) return 'in profit';
        if (ret < 50) return 'gigabrain';
        if (ret < 100) return 'market wizard';
        return 'whale';
    }

    window.Paper = {
        START, FEE, MIN_USD,
        state: () => peek(), value: (s) => value(s || peek()), freeQty: (k) => freeQty(peek(), k), price: (k) => priceOf(peek(), k),
        tick, buyMarket, sellMarket, place, cancel, reset, catchUp, title,
        get saveFails() { return saveFails; },
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
    setTimeout(catchUp, 1500);
})();
