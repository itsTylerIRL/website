/* The paper trading desk on the coin terminal (pages/btc.html, eth.html, link.html): the order ticket, the
   account strip, positions / orders / history / runs, and the desk's marks on the chart (open orders and the
   average cost as price lines, fills as arrows). The account and its order engine are js/paper.js; the chart,
   the selected coin and the live prices come from js/coin.js (window.CoinTerminal).
   The desk starts minimized so the chart gets the room: its title bar keeps a one-line summary, and it opens
   with its toggle, D, a fill, or a link to #desk (the home page's Assets monitor); open or closed is remembered. */
(function() {
    'use strict';
    const T = window.CoinTerminal, P = window.Paper;
    const form = document.getElementById('g-ticket');
    if (!T || !P || !form) return;
    const { usd, esc, pctHtml } = T;
    const $ = (id) => document.getElementById(id);
    const els = {
        meta: $('g-ticket-meta'), price: $('g-t-price'), last: $('g-t-last'), amt: $('g-t-amt'), unit: $('g-t-unit'),
        sl: $('g-t-sl'), tp: $('g-t-tp'), est: $('g-t-est'), go: $('g-t-go'), msg: $('g-t-msg'), types: $('g-types-t'),
        acct: $('g-acct'), desk: $('g-desk'), tabs: $('g-desk-tabs'), reset: $('g-reset'),
        pane: $('g-desk-pane'), toggle: $('g-desk-toggle'), sum: $('g-desk-sum')
    };
    const coinOf = (k) => COINS.find((c) => c.key === k);
    const num = (v) => { const n = parseFloat(String(v).replace(/[$,\s]/g, '')); return isFinite(n) && n > 0 ? n : null; };
    const qtyFmt = (q) => !(q > 0) ? '0' : q >= 1 ? q.toLocaleString('en-US', { maximumFractionDigits: 4 }) : q.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    const money = (v) => (v < 0 ? '−' : '') + usd(Math.abs(v), 2);
    const signed = (v) => `<span class="g-delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${usd(Math.abs(v), 2)}</span>`;
    const when = (t) => {
        const d = new Date(t);
        const today = new Date().toDateString() === d.toDateString();
        return d.toLocaleString('en-US', today ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };
    const LABEL = { market: 'MKT', limit: 'LMT', stop: 'STP', sl: 'SL', tp: 'TP' };

    let side = 'buy', type = 'market', unit = 'usd', tab = 'pos';
    try { tab = localStorage.getItem('coin.deskTab') || 'pos'; } catch (_) {}
    const live = () => T.price(T.coin.key) || P.price(T.coin.key);

    // ---------- Ticket ----------
    function say(text, tone) {
        els.msg.textContent = text || '';
        els.msg.className = 'g-t-msg' + (tone ? ' tone-' + tone : '');
    }
    function setSide(s) {
        side = s;
        form.querySelectorAll('[data-side]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.side === s));
        form.dataset.side = s;
        say('');
        refresh();
    }
    function setType(t) {
        type = t;
        form.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.type === t));
        form.dataset.type = t;
        if (t !== 'market' && !num(els.price.value) && live()) els.price.value = live().toFixed(T.priceDigits(live()));
        say('');
        refresh();
    }
    // What the ticket would do, from its fields: { price, qty } or null
    function read() {
        const p = type === 'market' ? live() : num(els.price.value);
        const a = num(els.amt.value);
        if (!p || !a) return { price: p, qty: null };
        let qty = a;
        if (unit === 'usd') qty = side === 'buy' ? a / (p * (1 + P.FEE)) : a / p;
        return { price: p, qty };
    }
    function refresh() {
        const k = T.coin.key, sym = k.toUpperCase();
        const v = P.value();
        const s = P.state();
        const held = (s.pos[k] && s.pos[k].qty) || 0;
        const free = P.freeQty(k);
        els.meta.textContent = side === 'buy' ? `${usd(v.free, 2)} free` : `${qtyFmt(free)} ${sym} free`;
        els.go.textContent = `${side.toUpperCase()} ${sym}${type === 'market' ? '' : ' ' + type.toUpperCase()}`;
        els.unit.textContent = unit === 'usd' ? 'USD' : sym;
        const { price, qty } = read();
        const rows = [];
        if (qty) {
            const gross = qty * price, fee = gross * P.FEE;
            rows.push(['qty', `${qtyFmt(qty)} ${sym}`], ['value', usd(gross, 2)], ['fee 0.1%', usd(fee, 2)]);
            if (side === 'buy') rows.push(['cash after', money(v.free - gross - fee)]);
            else if (held) {
                const avg = s.pos[k].cost / held;
                rows.push(['vs avg cost', signed(gross - fee - avg * qty)]);
            }
        } else rows.push(['held', `${qtyFmt(held)} ${sym}`], ['cash', usd(v.free, 2)]);
        els.est.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    }
    form.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.side) setSide(b.dataset.side);
        else if (b.dataset.type) setType(b.dataset.type);
        else if (b.dataset.pct) {
            const f = +b.dataset.pct / 100;
            const p = type === 'market' ? live() : num(els.price.value);
            if (!p) return say('set a price first', 'orange');
            if (side === 'buy') {
                const cash = P.value().free * f;
                const buf = type === 'stop' ? 1.02 : 1;
                // a hair under, so rounding never asks for more than there is
                els.amt.value = unit === 'usd' ? (Math.floor(cash / buf * 100) / 100).toFixed(2) : qtyFmt(cash / (p * (1 + P.FEE) * buf) * 0.99999);
            } else {
                const q = P.freeQty(T.coin.key) * f;
                els.amt.value = unit === 'usd' ? (Math.floor(q * p * 100) / 100).toFixed(2) : qtyFmt(q);
                if (f === 1) els.amt.dataset.all = '1';
            }
            refresh();
        } else if (b === els.last) {
            if (live()) els.price.value = live().toFixed(T.priceDigits(live()));
            refresh();
        } else if (b === els.unit) {
            const { price, qty } = read();
            unit = unit === 'usd' ? 'coin' : 'usd';
            if (qty && price) els.amt.value = unit === 'usd' ? (qty * price * (side === 'buy' ? 1 + P.FEE : 1)).toFixed(2) : qtyFmt(qty);
            refresh();
        }
    });
    form.addEventListener('input', (e) => {
        if (e.target === els.amt) delete els.amt.dataset.all;
        refresh();
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const k = T.coin.key, sym = k.toUpperCase();
        const { price, qty } = read();
        const all = side === 'sell' && els.amt.dataset.all === '1';
        const br = side === 'buy' ? { sl: num(els.sl.value), tp: num(els.tp.value) } : null;
        try {
            if (!price) throw new Error(type === 'market' ? 'waiting for a live price' : 'enter a price');
            if (!qty && !all) throw new Error('enter an amount');
            if (type === 'market') {
                const f = side === 'buy' ? P.buyMarket(k, { qty }, br) : P.sellMarket(k, all ? { qty: 'all' } : { qty });
                say(`${side === 'buy' ? 'bought' : 'sold'} ${qtyFmt(f.qty)} ${sym} at ${usd(f.price)}`, side === 'buy' ? 'green' : 'red');
            } else {
                const o = P.place(k, { side, type, price, qty: all ? 'all' : qty, sl: br && br.sl, tp: br && br.tp });
                say(`${side} ${type} placed: ${qtyFmt(o.qty)} ${sym} at ${usd(o.price)}`, 'blue');
                T.log('ORDER', `${side} ${type} ${qtyFmt(o.qty)} ${esc(sym)} @ ${usd(o.price)}`, 'blue');
            }
            els.amt.value = '';
            els.sl.value = '';
            els.tp.value = '';
            delete els.amt.dataset.all;
        } catch (err) {
            say(err.message, 'red');
        }
        refresh();
    });
    // B / S: the ticket, ready to type an amount
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, select, [contenteditable="true"]')) {
            if (e.key === 'Escape') el.blur();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'd') { setOpen(!open); return; }
        if (e.key === 'b' || e.key === 's') {
            e.preventDefault();
            setSide(e.key === 'b' ? 'buy' : 'sell');
            els.amt.focus();
        }
    });
    // With a limit or stop ticket, clicking the chart sets its price
    T.chart.subscribeClick((p) => {
        if (type === 'market' || !p || !p.point) return;
        const v = T.series.coordinateToPrice(p.point.y);
        if (!(v > 0)) return;
        els.price.value = v.toFixed(T.priceDigits(v));
        refresh();
    });

    // ---------- Account strip + desk ----------
    // ---------- Minimize ----------
    let open = false;
    try { open = localStorage.getItem('coin.deskOpen') === '1'; } catch (_) {}
    function setOpen(on, remember = true) {
        open = on;
        els.pane.classList.toggle('is-min', !on);
        els.toggle.setAttribute('aria-expanded', on);
        if (remember) try { localStorage.setItem('coin.deskOpen', on ? '1' : '0'); } catch (_) {}
    }
    els.toggle.addEventListener('click', () => setOpen(!open));
    // the summary is part of the closed bar: clicking it opens the desk too
    els.sum.addEventListener('click', () => setOpen(true));
    const toDesk = () => { if (location.hash === '#desk') setOpen(true); };
    window.addEventListener('hashchange', toDesk);

    function renderAcct() {
        const s = P.state(), v = P.value();
        const held = COINS.filter((c) => s.pos[c.key] && s.pos[c.key].qty > 0).length;
        els.sum.innerHTML = `<b>${usd(v.total, 2)}</b> ${pctHtml(v.ret)}<span>${held ? `${held} position${held === 1 ? '' : 's'}` : 'no positions'}${s.orders.length ? ` · ${s.orders.length} open order${s.orders.length === 1 ? '' : 's'}` : ''}</span>`;
        const closed = s.wins + s.losses;
        const title = P.title(v.ret, s.trades);
        els.acct.innerHTML = `
            <div class="g-acct-main"><span>equity</span><b>${usd(v.total, 2)}</b>${signed(v.pnl)} ${pctHtml(v.ret)}</div>
            <span class="g-chip tone-${v.ret >= 0 ? 'green' : 'red'} g-title">${esc(title)}</span>
            <dl class="g-acct-stats">
                <dt>cash</dt><dd>${usd(v.free, 2)}${v.reserved > 0.005 ? ` <small>+${usd(v.reserved, 2)} on order</small>` : ''}</dd>
                <dt>realized</dt><dd>${signed(s.realized)}</dd>
                <dt>win rate</dt><dd>${closed ? `${Math.round(s.wins / closed * 100)}% <small>${s.wins}/${closed}</small>` : '—'}</dd>
                <dt>max dd</dt><dd>${s.maxDD ? `−${s.maxDD.toFixed(1)}%` : '—'}</dd>
                <dt>fees</dt><dd>${usd(s.fees, 2)}</dd>
                <dt>trades</dt><dd>${s.trades}</dd>
            </dl>${P.saveFails ? '<p class="g-t-msg tone-red">this browser isn\'t saving: the account resets when you leave</p>' : ''}`;
    }
    const coinCell = (k) => { const c = coinOf(k); return `<td class="col-coin"><img src="${esc(c.icon)}" alt="" width="16" height="16">${esc(k.toUpperCase())}</td>`; };
    function renderDesk() {
        const s = P.state();
        els.tabs.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
        let html = '';
        if (tab === 'pos') {
            const rows = COINS.filter((c) => s.pos[c.key] && s.pos[c.key].qty > 0).map((c) => {
                const p = s.pos[c.key], last = P.price(c.key) || 0, avg = p.cost / p.qty, val = p.qty * last, un = val - p.cost;
                return `<tr data-coin="${c.key}">${coinCell(c.key)}<td>${qtyFmt(p.qty)}</td><td>${usd(avg)}</td><td>${usd(last)}</td><td>${usd(val, 2)}</td>
                    <td>${signed(un)} ${pctHtml(p.cost ? un / p.cost * 100 : 0)}</td>
                    <td><button type="button" class="g-btn g-mini" data-close="${c.key}" title="Sell what's free at market">CLOSE</button></td></tr>`;
            });
            html = rows.length ? `<table class="g-desk-t"><thead><tr><th>coin</th><th>qty</th><th>avg cost</th><th>last</th><th>value</th><th>unrealized</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>`
                : `<p class="g-desk-empty">no positions. ${usd(P.value().free, 2)} to put to work: pick a side on the ticket (B to buy)</p>`;
        } else if (tab === 'orders') {
            const rows = s.orders.slice().sort((a, b) => b.t - a.t).map((o) => {
                const last = P.price(o.key);
                const dist = last ? (o.price - last) / last * 100 : null;
                return `<tr data-coin="${o.key}">${coinCell(o.key)}<td class="${o.side === 'buy' ? 'up' : 'down'}">${o.side} ${LABEL[o.role || o.type]}</td>
                    <td>${usd(o.price)}</td><td>${qtyFmt(o.qty)}</td><td>${dist === null ? '—' : `${dist >= 0 ? '+' : ''}${dist.toFixed(2)}%`}</td>
                    <td>${o.bracket ? [o.bracket.sl && `SL ${usd(o.bracket.sl)}`, o.bracket.tp && `TP ${usd(o.bracket.tp)}`].filter(Boolean).join(' · ') : o.oco ? 'one cancels other' : ''}</td>
                    <td>${when(o.t)}</td><td><button type="button" class="g-btn g-mini" data-cancel="${o.id}" aria-label="Cancel order">&times;</button></td></tr>`;
            });
            html = rows.length ? `<table class="g-desk-t"><thead><tr><th>coin</th><th>order</th><th>price</th><th>qty</th><th>to go</th><th>then</th><th>placed</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>`
                : '<p class="g-desk-empty">no open orders. limit and stop orders wait here, and keep working while you\'re away</p>';
        } else if (tab === 'fills') {
            const rows = s.fills.map((f) => `<tr data-coin="${f.key}"><td>${when(f.t)}</td>${coinCell(f.key)}<td class="${f.side === 'buy' ? 'up' : 'down'}">${f.side} ${LABEL[f.type] || ''}</td>
                <td>${qtyFmt(f.qty)}</td><td>${usd(f.price)}</td><td>${usd(f.fee, 2)}</td><td>${f.pnl === null ? '' : signed(f.pnl)}</td></tr>`);
            html = rows.length ? `<table class="g-desk-t"><thead><tr><th>time</th><th>coin</th><th>fill</th><th>qty</th><th>price</th><th>fee</th><th>p&amp;l</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
                : '<p class="g-desk-empty">no trades yet this run</p>';
        } else {
            const runs = s.runs || [];
            const best = runs.reduce((b, r) => (!b || r.ret > b.ret ? r : b), null);
            const rows = runs.map((r) => `<tr class="${r === best ? 'is-best' : ''}"><td>${new Date(r.ended).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${pctHtml(r.ret)}</td><td>${usd(r.value, 2)}</td><td>${r.trades}</td><td>${esc(P.title(r.ret, r.trades))}${r === best ? ' ★' : ''}</td></tr>`);
            html = `<p class="g-desk-empty">this run: started ${new Date(s.started).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${pctHtml(P.value().ret)} so far. RESET files it here and starts over at ${usd(P.START, 0)}</p>`
                + (rows.length ? `<table class="g-desk-t"><thead><tr><th>ended</th><th>return</th><th>final</th><th>trades</th><th>rank</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '');
        }
        els.desk.innerHTML = html;
    }
    els.tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        tab = b.dataset.tab;
        try { localStorage.setItem('coin.deskTab', tab); } catch (_) {}
        renderDesk();
    });
    els.desk.addEventListener('click', (e) => {
        const c = e.target.closest('[data-close]'), x = e.target.closest('[data-cancel]');
        if (c) {
            try {
                const f = P.sellMarket(c.dataset.close, { qty: 'all' });
                T.log('FILL', `closed: sold ${qtyFmt(f.qty)} ${esc(f.key.toUpperCase())} @ ${usd(f.price)} · ${f.pnl >= 0 ? '+' : '−'}${usd(Math.abs(f.pnl), 2)}`, f.pnl >= 0 ? 'green' : 'red');
            } catch (err) { say(err.message, 'red'); }
        } else if (x) {
            P.cancel(+x.dataset.cancel);
            T.log('ORDER', 'order cancelled', 'muted');
        } else {
            const row = e.target.closest('tr[data-coin]');
            if (row && row.dataset.coin !== T.coin.key) T.select(row.dataset.coin);
        }
    });
    els.reset.addEventListener('click', () => {
        const v = P.value();
        if (!confirm(`File this run (${v.ret >= 0 ? '+' : ''}${v.ret.toFixed(2)}%) and start over with ${usd(P.START, 0)}? Open orders are cancelled.`)) return;
        P.reset();
        T.log('RESET', `new run: ${usd(P.START, 0)}`, 'blue');
        say('fresh run: $10,000', 'blue');
    });

    // ---------- Chart marks: open orders, average cost, fills ----------
    let lines = [], linesOn = null, marksSig = '';
    function renderMarks(force) {
        const k = T.coin.key, s = P.state(), series = T.series, bars = T.bars;
        const pos = s.pos[k];
        const sig = JSON.stringify([k, s.orders.filter((o) => o.key === k).map((o) => [o.id, o.price, o.qty]), pos && pos.qty, s.fills.length && s.fills[0].id, bars.length, bars[0] && bars[0].time]);
        if (!force && sig === marksSig && linesOn === series) return;
        marksSig = sig;
        if (linesOn === series) lines.forEach((l) => { try { series.removePriceLine(l); } catch (_) {} });
        lines = [];
        linesOn = series;
        const C = { buy: '#50fa7b', sell: '#ff5555', avg: '#8be9fd' };
        s.orders.filter((o) => o.key === k).forEach((o) => {
            lines.push(series.createPriceLine({ price: o.price, color: C[o.side], lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: o.role ? LABEL[o.role] : `${o.side.toUpperCase()} ${LABEL[o.type]}` }));
        });
        if (pos && pos.qty > 0) lines.push(series.createPriceLine({ price: pos.cost / pos.qty, color: C.avg, lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'AVG' }));
        // fills, on the candle they happened in
        const marks = [];
        if (bars.length) {
            const first = bars[0].time, step = bars.length > 1 ? bars[1].time - bars[0].time : 60;
            s.fills.filter((f) => f.key === k).forEach((f) => {
                const t = Math.floor(f.t / 1000 / step) * step;
                if (t < first) return;
                marks.push({ time: t, position: f.side === 'buy' ? 'belowBar' : 'aboveBar', color: C[f.side], shape: f.side === 'buy' ? 'arrowUp' : 'arrowDown', text: `${f.side === 'buy' ? 'B' : 'S'} ${usd(f.price)}` });
            });
        }
        marks.sort((a, b) => a.time - b.time);
        try { series.setMarkers(marks); } catch (_) {}
    }

    // ---------- Updates ----------
    let pending = null;
    function soon() {
        if (pending) return;
        pending = setTimeout(() => { pending = null; renderAcct(); renderDesk(); refresh(); renderMarks(); }, 400);
    }
    P.on(soon);
    window.addEventListener('paper:fill', (e) => {
        const f = e.detail, sym = f.key.toUpperCase();
        const what = `${f.side === 'buy' ? 'bought' : 'sold'} ${qtyFmt(f.qty)} ${sym} @ ${usd(f.price)}${f.pnl !== null ? ` · ${f.pnl >= 0 ? '+' : '−'}${usd(Math.abs(f.pnl), 2)}` : ''}`;
        if (f.type !== 'market') {
            T.log('FILL', `${LABEL[f.type]} ${f.away ? 'filled while away' : 'filled'}: ${what}`, f.side === 'buy' ? 'green' : f.pnl >= 0 ? 'green' : 'red');
            say(`${LABEL[f.type]} filled: ${what}`, f.side === 'buy' ? 'green' : 'red');
        } else T.log('FILL', what, f.side === 'buy' ? 'green' : 'red');
        // an order filling on its own is news: the desk opens to it (just this once, not remembered)
        if (f.type !== 'market' && !open) setOpen(true, false);
        soon();
    });
    T.on('select', () => {
        els.price.value = '';
        els.sl.value = '';
        els.tp.value = '';
        if (type !== 'market' && live()) els.price.value = live().toFixed(T.priceDigits(live()));
        say('');
        renderMarks(true);
        refresh();
    });
    T.on('draw', () => renderMarks());

    setOpen(open, false);
    toDesk();
    setSide('buy');
    setType('market');
    renderAcct();
    renderDesk();
    renderMarks(true);
})();
