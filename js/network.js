/* the network is growing, the companion section of the cancel's page (pages/cancel.html): live from the clicker's
   service, which runs inside the cancel's (cancel-api.tylerirl.com/api/net/, tylerirl.com origins only). The page's
   status bar belongs to the cancel (js/cancel.js); this reports in its own panels' titles.
   - Leaderboards (main): one board at a time (/api/net/board?b=), every 2 minutes and on switching tabs
   - Census (side): totals worked out from the boards (every synced network is on the grass board)
   - Network feed (side): runs finished, epochs reached, the new internet turned on (/api/net/recent), every minute */
(function () {
    'use strict';
    const API = 'https://cancel-api.tylerirl.com/api/net';
    const GAME = 'https://clicker.tylerirl.com';
    const CP = window.CancelPreview;
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = (n) => Number(n || 0).toLocaleString('en-US');
    // 512522 -> 512.5k, 3.4e9 -> 3.4b
    const short = (n) => {
        n = Number(n) || 0;
        const u = [[1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']].find(([v]) => Math.abs(n) >= v);
        return u ? `${(n / u[0]).toFixed(n / u[0] >= 100 ? 0 : 1)}${u[1]}` : String(Math.round(n));
    };
    // seconds -> 1:10 / 2:03:45 / 4d 2h
    const clock = (s) => {
        s = Math.round(Number(s) || 0);
        if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h`;
        const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
    };
    const ago = (unix) => {
        const m = Math.max(0, Math.round((Date.now() / 1000 - unix) / 60));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const day = (unix) => new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const who = (h) => h ? (String(h).startsWith('~') ? h : '~' + h) : 'anon';
    const face = (look, h) => `<span class="g-face">${(CP && CP.look(look)) || `<span class="g-cancel-initial">${esc(String(h || '?').replace(/^~/, '').slice(0, 2).toUpperCase())}</span>`}</span>`;
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

    function feed(ok, text) {
        const meta = $('n-board-meta');
        if (meta && !ok) meta.textContent = text;
    }

    // ---------- Leaderboards ----------
    // value: the big number; what: the line under the name
    const BOARDS = {
        grass: { blurb: 'All the grass a network has touched while synced, every run added up.',
            value: (r) => [short(r.value), 'GRASS'], what: (r) => `${num(r.detail.runs)} runs` },
        fastest: { blurb: 'The quickest single run to the infinite garden. Challenge runs don’t count; their rules are bent.',
            value: (r) => [clock(r.value), 'RUN TIME'], what: (r) => `run #${num(r.detail.n)} · peak ${num(r.detail.peak)} miladys · ${short(r.detail.grass)} grass` },
        network: { blurb: 'The most Miladys in one network at once.',
            value: (r) => [num(r.value), 'MILADYS'], what: (r) => `run #${num(r.detail.n)} · ${short(r.detail.grass)} grass` },
        uptime: { blurb: 'How far past the ending the new internet has grown, an epoch at a time.',
            value: (r) => [num(r.value), 'EPOCHS'], what: (r) => r.detail.days != null ? `${num(r.detail.days)} days in` : '' },
        online: { blurb: 'Who turned the new internet on first.',
            value: (r) => [day(r.value), 'ONLINE'], what: (r) => `in ${num(r.detail.days)} day${r.detail.days === 1 ? '' : 's'} · ${num(r.detail.runs)} runs` }
    };
    let board = 'grass';
    const cache = {};
    function drawBoard(b) {
        const d = cache[b];
        if (!d) return;
        const spec = BOARDS[b];
        $('n-blurb').textContent = spec.blurb;
        $('n-board-meta').textContent = `${num(d.total)} ON THE BOARD`;
        $('n-board').innerHTML = (d.rows || []).map((r) => {
            const [v, unit] = spec.value(r);
            return `<li><a class="g-row" href="${GAME}" target="_blank" rel="noopener" title="${esc(who(r.handle))}">
                <span class="g-row-rank${r.rank <= 3 ? ' is-top' : ''}">${r.rank}</span>
                ${face(r.look, r.handle)}
                <span class="g-row-text"><span class="g-row-who">${esc(who(r.handle))}</span><span class="g-row-what">${esc(spec.what(r))} · ${ago(r.at)}</span></span>
                <span class="g-row-val">${esc(v)}<small>${unit}</small></span></a></li>`;
        }).join('') || '<li class="g-note">nobody yet. the board is open.</li>';
    }
    async function loadBoard(b, force) {
        if (!cache[b] || force) {
            try { cache[b] = await get(`/board?b=${b}&limit=25`); } catch (_) {
                if (b === board && !cache[b]) $('n-board').innerHTML = '<li class="g-note">the boards are taking a break. the game is still open.</li>';
                return null;
            }
        }
        if (b === board) drawBoard(b);
        return cache[b];
    }
    $('n-tabs').addEventListener('click', (e) => {
        const t = e.target.closest('[data-board]');
        if (!t || t.dataset.board === board) return;
        board = t.dataset.board;
        $('n-tabs').querySelectorAll('[data-board]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
        if (cache[board]) drawBoard(board);
        else { $('n-board').innerHTML = '<li class="g-wait">LOADING&hellip;</li>'; loadBoard(board); }
    });

    // ---------- Census: from the boards ----------
    async function census() {
        const [grass, net, up] = await Promise.all(['grass', 'network', 'uptime'].map((b) => loadBoard(b, true)));
        if (!['grass', 'network', 'uptime'].includes(board)) loadBoard(board, true); // and whichever board is showing
        if (!grass) { feed(false, 'SERVICE UNREACHABLE'); return; }
        const set = (k, v) => { const el = document.querySelector(`#n-census [data-k="${k}"]`); if (el) el.textContent = v; };
        const rows = grass.rows || [];
        set('networks', num(grass.total));
        set('grass', short(rows.reduce((a, r) => a + (r.value || 0), 0)));
        const top = net && net.rows && net.rows[0];
        set('peak', top ? num(top.value) : '—');
        const far = up && up.rows && up.rows[0];
        set('epoch', far ? num(far.value) : '—');
        const runs = rows.reduce((a, r) => a + ((r.detail && r.detail.runs) || 0), 0);
        $('n-census-note').innerHTML = [
            runs && `<b>${num(runs)}</b> runs to the garden between them`,
            top && `the biggest network is <b>${esc(who(top.handle))}</b>’s`,
            far && `<b>${esc(who(far.handle))}</b> leads the new internet`
        ].filter(Boolean).join(' · ');
        feed(true, `LIVE · ${num(grass.total)} networks`);
    }
    every(2 * 60000, census);

    // ---------- Network feed ----------
    function line(r) {
        const d = r.detail || {};
        if (r.kind === 'run') {
            const ch = d.ch ? `challenge ${esc(String(d.ch).replace(/_/g, ' '))}${d.beaten ? ' <span class="is-win">beaten</span>' : ''} · ` : '';
            return [`${ch}touched grass in ${clock(d.t)}`, `+${short(d.grass)}`, 'GRASS'];
        }
        if (r.kind === 'epoch') return ['the new internet grew an epoch', `E${num(d.e)}`, 'EPOCH'];
        if (r.kind === 'online') return ['<span class="is-win">turned the new internet on</span>', '◉', 'ONLINE'];
        if (r.kind === 'challenge') return [`beat a challenge${d.ch ? `: ${esc(String(d.ch).replace(/_/g, ' '))}` : ''}`, '✓', 'CHALLENGE'];
        return [esc(String(r.kind || 'news').replace(/_/g, ' ')), '', ''];
    }
    every(60000, async () => {
        let d;
        try { d = await get('/recent?limit=40'); } catch (_) {
            if (!$('n-feed').querySelector('.g-row')) $('n-feed').innerHTML = '<li class="g-note">the feed is quiet right now.</li>';
            return;
        }
        const rows = d.rows || [];
        $('n-feed-meta').textContent = rows.length ? `LAST ${ago(rows[0].at).toUpperCase()}` : '';
        $('n-feed').innerHTML = rows.map((r) => {
            const [what, v, unit] = line(r);
            return `<li><a class="g-row" href="${GAME}" target="_blank" rel="noopener">
                ${face(r.look, r.handle)}
                <span class="g-row-text"><span class="g-row-who">${esc(who(r.handle))}</span><span class="g-row-what">${what} · ${ago(r.at)}</span></span>
                <span class="g-row-val">${esc(v)}<small>${unit}</small></span></a></li>`;
        }).join('') || '<li class="g-note">nothing yet. go post.</li>';
        // (what's new reaches the home page's ticker from its own watch on the feed, js/live-rows.js)
    });
})();
