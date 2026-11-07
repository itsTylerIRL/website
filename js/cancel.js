/* the cancel is coming (pages/cancel.html): live from the game's service on cancel-api.tylerirl.com, which only
   answers tylerirl.com (and localhost while its dev flag is on).
   - Pulse (side): runs, wins, win rate and kills today / over 7 days / ever (/api/pulse), every minute
   - Tribes, where runs end, most wanted (rail), loadout meta and winners vs. the fallen (side): /api/stats, once
   - Recent runs (main): the latest finished runs with their share cards (/api/recent), every minute
   - Crown & hall of fame (main): js/cancel-preview.js, which refreshes itself */
(function () {
    'use strict';
    const API = 'https://cancel-api.tylerirl.com';
    const GAME = 'https://cancel.tylerirl.com';
    const CP = window.CancelPreview;
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = (n) => Number(n || 0).toLocaleString('en-US');
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
    const ago = (unix) => {
        const m = Math.max(0, Math.round((Date.now() / 1000 - unix) / 60));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const title = (s) => String(s || '').replace(/_/g, ' ');
    const get = async (path) => {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 9000);
        try {
            const r = await fetch(API + path, { credentials: 'omit', cache: 'no-store', signal: ctl.signal });
            if (!r.ok) throw new Error(r.status);
            return await r.json();
        } finally { clearTimeout(t); }
    };
    const every = (ms, fn) => { fn(); setInterval(() => { if (!document.hidden) fn(); }, ms); };
    const bars = (rows, max) => rows.map(([label, value, shown, color], i) =>
        `<li style="--i:${i}${color ? `;--bar:${color}` : ''}"><span class="g-bar-label">${esc(label)}</span><span class="g-bar-val">${shown}</span>
            <span class="g-bar-track"><span class="g-bar-fill" style="--v:${max ? (value / max).toFixed(3) : 0}"></span></span></li>`).join('');

    // Status bar + the home page's preview title
    function feed(ok, text) {
        $('g-feed-dot').className = `g-dot tone-${ok ? 'green' : 'red'}`;
        $('g-feed').textContent = text;
        if (window.TirlEmbed) window.TirlEmbed.status(`the cancel · ${text}`.toUpperCase());
    }

    // ---------- Crown + hall of fame ----------
    if (CP && $('c-hall')) CP.render($('c-hall'), $('c-hall-meta'), GAME);

    // ---------- Pulse ----------
    let pulse = null;
    let range = 'week';
    function drawPulse() {
        if (!pulse) return;
        const p = pulse[range] || {};
        const set = (k, v) => { const el = document.querySelector(`#c-pulse [data-k="${k}"]`); if (el) el.textContent = v; };
        set('games', num(p.games));
        set('wins', num(p.wins));
        set('rate', pct(p.wins, p.tgames));
        set('kills', num(p.kills));
        const e = pulse.endless || {};
        $('c-pulse-note').innerHTML = `<b>${num(pulse.players)}</b> players on the all-time board · terminally online: <b>${num(e.runs)}</b> endless runs, <b>${num(e.depth)}</b> floors deep between them`;
    }
    $('c-range').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-range]');
        if (!b) return;
        range = b.dataset.range;
        $('c-range').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        drawPulse();
    });
    let lastGames = null;
    every(60000, async () => {
        try {
            pulse = await get('/api/pulse');
            drawPulse();
            const today = pulse.today || {};
            feed(true, `LIVE · ${num(today.games)} run${today.games === 1 ? '' : 's'} today`);
            // A new run since the last look goes to the home page's ticker
            const total = (pulse.lifetime || {}).games;
            if (lastGames !== null && total > lastGames && window.TirlEmbed) {
                window.TirlEmbed.event({ kind: 'RUN', html: `${total - lastGames} new run${total - lastGames === 1 ? '' : 's'} on the cancel`, tone: 'orange' });
            }
            lastGames = total;
        } catch (_) {
            feed(false, 'SERVICE UNREACHABLE');
        }
    });

    // ---------- Stats: tribes, days, killers, relics, final stats ----------
    (async () => {
        let s;
        try { s = await get('/api/stats'); } catch (_) {
            ['c-tribes', 'c-killers', 'c-relics', 'c-final'].forEach((id) => { $(id).innerHTML = '<li class="g-note">stats unavailable right now</li>'; });
            return;
        }
        // Tribes, best win rate first (a tribe needs a few runs before its rate means much)
        const tribes = Object.entries(s.tribes || {}).map(([t, v]) => [t, v.runs ? v.wins / v.runs : 0, v]).sort((a, b) => b[1] - a[1]);
        const topRate = Math.max(...tribes.map((t) => t[1]), 0.01);
        $('c-tribes').innerHTML = bars(tribes.map(([t, rate, v]) => [t, rate, `${Math.round(rate * 100)}% · ${num(v.runs)}`]), topRate);

        // Where runs end: a column per day, the boss days marked
        const days = s.deathsByDay || {};
        const dmax = Math.max(...Object.values(days), 1);
        const keys = Array.from({ length: 9 }, (_, i) => String(i + 1));
        $('c-days').innerHTML = keys.map((d, i) => `<span class="g-col" style="--i:${i};--v:${((days[d] || 0) / dmax).toFixed(3)}${['3', '6', '9'].includes(d) ? ';--bar:255,85,85' : ''}" title="day ${d}: ${num(days[d])} runs ended"></span>`).join('');
        $('c-days-axis').innerHTML = keys.map((d) => `<span${['3', '6', '9'].includes(d) ? ' class="g-accent"' : ''}>${d}</span>`).join('');
        $('c-days-note').innerHTML = `<b>${num(s.runs)}</b> timeline runs · <b>${pct(s.wins, s.runs)}</b> saved · the average run ends on day <b>${(s.avgDay || 0).toFixed(1)}</b>, boss days in red`;

        // What ends runs
        const killers = (s.killedBy || []).slice(0, 10);
        const kmax = Math.max(...killers.map((k) => k[1]), 1);
        $('c-killers').innerHTML = bars(killers.map(([who, n]) => [who, n, num(n)]), kmax);

        // Relics most often held when a run ended
        const relics = (s.relicsHeldAtEnd || []).slice(0, 8);
        const rmax = Math.max(...relics.map((r) => r[1]), 1);
        $('c-relics').innerHTML = bars(relics.map(([r, n]) => [title(r), n, num(n)]), rmax);

        // Final stats: winners against the fallen
        const fs = s.finalStats || {};
        const win = fs.win || {}, loss = fs.loss || {};
        const NAMES = { hp: 'health', atk: 'attack', arm: 'armor', spd: 'speed', crit: 'crit %', dodge: 'dodge %' };
        $('c-final').innerHTML = Object.entries(NAMES).map(([k, name], i) => {
            const w = win[k] || 0, l = loss[k] || 0, m = Math.max(w, l, 0.01);
            return `<li style="--i:${i}"><span class="g-bar-label">${name}</span><span class="g-bar-val"><span class="g-accent">${w.toFixed(0)}</span> / <span style="color:var(--g-red)">${l.toFixed(0)}</span></span>
                <span class="g-bar-track"><span class="g-bar-fill" style="--v:${(w / m).toFixed(3)}"></span></span>
                <span class="g-bar-track"><span class="g-bar-fill" style="--v:${(l / m).toFixed(3)};--bar:255,85,85"></span></span></li>`;
        }).join('');
    })();

    // ---------- Recent runs ----------
    every(60000, async () => {
        let runs;
        try { runs = await get('/api/recent?limit=30'); } catch (_) {
            if (!$('c-runs').querySelector('.g-row')) $('c-runs').innerHTML = '<li class="g-note">the run feed is taking a break. the game is still open.</li>';
            return;
        }
        runs = Array.isArray(runs) ? runs : runs.runs || [];
        $('c-runs-meta').textContent = runs.length ? `LATEST ${runs.length} · ${ago(runs[0].at).toUpperCase()}` : '';
        $('c-runs').classList.add('is-plain');
        $('c-runs').innerHTML = runs.map((r) => {
            const who = CP ? CP.who(r) : r.name || 'anon';
            const face = CP ? CP.look(r.look) : '';
            const result = r.endless
                ? `<span class="is-win">endless</span> · floor ${num(r.depth)}`
                : r.win ? `<span class="is-win">saved the timeline</span>` : `<span class="is-loss">day ${r.day}</span> · ${esc(r.killedBy || 'cancelled')}`;
            const share = /^https:\/\/[a-z.]*tylerirl\.com\//.test(r.share || '') ? r.share : GAME;
            return `<li><a class="g-row" href="${esc(share)}" target="_blank" rel="noopener" title="${esc(who)}: open this run's card">
                <span class="g-face${r.win || r.endless ? '' : ' is-fell'}">${face || `<span class="g-cancel-initial">${esc(who.replace(/^~/, '').slice(0, 2).toUpperCase())}</span>`}</span>
                <span class="g-row-text"><span class="g-row-who">${esc(who)} <span style="color:var(--g-dim)">· ${esc(r.tribe || '')}</span></span>
                    <span class="g-row-what">${result} · ${num(r.kills)} kills · ${ago(r.at)}</span></span>
                <span class="g-row-val">${num(r.score)}<small>DRIP</small></span></a></li>`;
        }).join('') || '<li class="g-note">no runs yet. be the first.</li>';
    });
})();
