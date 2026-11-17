/* Player link: sign in with Remilia SSO or an Urbit ID through the cancel game's service, the same sign-in the cancel
   is coming and the network is growing use. The sign-ins, or who you are and sign out, sit in the User Login panel
   at the top of the left column (#g-player-link), whatever object is showing; signed in, your stats from both games
   show there too, under your name: a compact card per game (refreshed every 5 minutes while the tab is visible).
   The service sends the browser back here with its own signed session in #rn= (or #rn_error=). It's kept in this
   browser (localStorage) until it runs out or you sign out. Load this before js/objects.js, which would otherwise
   read the #fragment as an object to select.
   What it reads (the service answers tylerirl.com only, so none of this works from a localhost copy):
   - POST /api/profile {session, data: {}}: the cancel's account sync. With nothing to add it changes nothing and
     answers with the account's record, DRIP, streak, all-time rank and last runs
   - GET /api/king?player=: weeks as king of the hill, kings slain, and whether you hold the hill now
   - GET /api/net/profile?h=: the network: miladys, how far along, grass, where you stand on its boards (404: not started)
   Your crown, DRIP and miladys go into the visit memory (js/now.js), so coming back says what changed (losing the
   crown in particular). Who's signed in is window.TirlPlayer.user(), and a 'tirl:player' event says it changed. */
(function () {
    'use strict';
    const API = 'https://cancel-api.tylerirl.com';
    const KEY = 'tirl_player';
    const REFRESH = 5 * 60000;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = (n) => (+n || 0).toLocaleString('en-US');
    const isShip = (h) => typeof h === 'string' && h[0] === '~';
    const ago = (t) => {
        const m = Math.max(0, Math.round((Date.now() - t) / 60000));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const hours = (sec) => sec >= 3600 ? `${Math.round(sec / 3600).toLocaleString('en-US')}h` : `${Math.max(1, Math.round(sec / 60))}m`;
    const URBIT_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.4 13.4c1.2-2.6 2.9-3.3 4.6-2.1l2 1.4c1.7 1.2 3.4.5 4.6-2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
    const REMILIA_MARK = '<img src="/assets/remilianet-symbol.svg" alt="">';

    function stored() {
        try {
            const u = JSON.parse(localStorage.getItem(KEY));
            if (u && u.token && u.exp * 1000 > Date.now()) return u;
        } catch (_) {}
        return null;
    }
    function keep(u) {
        try { if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY); } catch (_) {}
    }

    // Back from signing in: keep the session (its body says who it is), and tidy the address bar
    let notice = '';
    let welcome = false;
    {
        const m = /[#&]rn(_error)?=([^&]*)/.exec(location.hash);
        if (m) {
            history.replaceState(null, '', location.pathname + location.search);
            if (m[1]) notice = `sign-in didn't go through (${decodeURIComponent(m[2])})`;
            else {
                try {
                    const body = m[2].split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
                    const d = JSON.parse(decodeURIComponent(escape(atob(body))));
                    keep({ token: m[2], handle: String(d.h), name: String(d.n || d.h), player: String(d.p), exp: +d.exp });
                    welcome = true;
                } catch (_) { notice = "sign-in didn't go through"; }
            }
        }
    }
    let user = stored();
    let offer = { rn: true, ur: true }; // which sign-ins the service has on (both, until it says)
    let stats = null; // { acct, king, net, at }, or { failed: true }
    let loading = false;
    const slots = { link: document.getElementById('g-player-link'), meta: document.getElementById('g-player-meta') };

    // { ok: false, status } for an answer that isn't a 2xx; null when the service can't be reached
    async function api(path, body) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 8000);
        try {
            const r = await fetch(API + path, {
                credentials: 'omit', signal: ctl.signal,
                ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
            });
            return r.ok ? await r.json() : { ok: false, status: r.status };
        } catch (_) { return null; } finally { clearTimeout(t); }
    }

    async function load() {
        if (!user || loading) return;
        loading = true;
        const [acct, king, net] = await Promise.all([
            api('/api/profile', { session: user.token, data: {} }),
            api('/api/king?player=' + encodeURIComponent(user.player)),
            api('/api/net/profile?h=' + encodeURIComponent(user.handle))
        ]);
        loading = false;
        if (acct && acct.status === 401) return signOut('your sign-in ran out: sign in again');
        stats = !acct || acct.ok === false ? { failed: true } : { acct, king: king && king.ok !== false ? king : null, net: net && net.ok !== false ? net : (net && net.status === 404 ? { started: false } : null), at: Date.now() };
        render(true);
        if (stats.failed) return;
        remember();
        if (welcome) {
            welcome = false;
            if (typeof RG !== 'undefined') RG.setMood('grateful', { anim: 'rg-bounce', status: `WELCOME ${user.name}`.toUpperCase().slice(0, 28), duration: 4000, priority: true });
            const it = { text: `player link up · ${isShip(user.handle) ? user.handle : '~' + user.handle}`, tone: 'green' };
            window.tirlTicker?.push(it);
            window.tirlLog?.add({ ...it, src: 'player link' });
        }
    }
    // What changed in the games since your last visit (js/now.js): per account, so another sign-in starts fresh
    function remember() {
        const visit = window.tirlVisit;
        if (!visit) return;
        const id = (k) => `${k}:${user.player}`;
        const k = stats.king || {}, n = stats.net || {};
        if (stats.king) visit.seen(id('crown'), !!k.you, (was, now) => was && !now
            ? { text: 'you lost the crown', tone: 'red', key: 'cancel', alert: { mood: 'sad', status: 'DETHRONED' } }
            : !was && now ? { text: '👑 you hold the crown', tone: 'orange', key: 'cancel' } : null);
        visit.seen(id('drip'), +(stats.acct.data || {}).drip || 0, (was, now) => now > was ? { text: `+${num(now - was)} drip`, tone: 'orange', key: 'cancel' } : null);
        if (n.started !== false && stats.net) visit.seen(id('miladys'), +n.miladys || 0, (was, now) => now > was ? { text: `+${num(now - was)} miladys`, tone: 'purple', key: 'cancel' } : null);
    }
    function signOut(msg) {
        keep(null);
        user = null;
        stats = null;
        notice = msg || '';
        render();
        window.dispatchEvent(new CustomEvent('tirl:player'));
    }

    // ---------- Render ----------
    const tag = (u) => isShip(u.handle)
        ? `<span class="g-ptag ur" title="signed in with Urbit ID">${URBIT_MARK}<b>${esc(u.handle)}</b></span>`
        : `<a class="g-ptag rm" href="https://remilia.net/~${encodeURIComponent(u.handle)}" target="_blank" rel="noopener" title="signed in with Remilia SSO">${REMILIA_MARK}<b>~${esc(u.handle)}</b></a>`;
    const stat = (value, label, cls = '') => `<span class="g-pstat${cls ? ' ' + cls : ''}"><b>${value}</b><small>${label}</small></span>`;

    // Compact for the rail: the four stats that matter most in a 2 x 2 grid; the rest go in the card's tooltip
    function cancelCard() {
        const a = stats.acct, p = a.data || {}, k = stats.king || {};
        const runs = +p.runs || 0, wins = +p.wins || 0, rank = a.rank || {};
        const last = (a.runs || [])[0];
        const lastLine = last
            ? `<span class="${last.win ? 'good' : 'bad'}">${last.endless ? '📡 endless' : last.win ? `👑 saved it, day ${last.day}` : `💀 day ${last.day}${last.killedBy ? ' · ' + esc(last.killedBy) : ''}`} · <b>${num(last.score)}</b></span><i>${ago(last.at * 1000)}</i>`
            : '<span>no runs on this account yet</span>';
        const more = [runs ? `${Math.round(100 * wins / runs)}% saved` : '', rank.rank ? `best ${num(rank.score)}` : '',
            p.streak && p.streak.best ? `daily streak ${num(p.streak.n)} (best ${num(p.streak.best)})` : '', `${num((p.ach || []).length)} achievements`].filter(Boolean).join(' · ');
        return `<a class="g-game" href="https://cancel.tylerirl.com" target="_blank" rel="noopener" style="--game: 255, 222, 23" title="the cancel is coming: ${esc(more)}">
                <span class="g-game-head"><img src="/assets/object-icons/cancel.webp" alt=""><b>the cancel is coming</b>${k.you ? '<em title="king of the hill">👑</em>' : ''}<span class="g-game-go" title="play">&nearr;</span></span>
                <span class="g-pstats">
                    ${stat(`<span class="good">${wins}W</span>·<span class="bad">${runs - wins}L</span>`, 'record')}
                    ${stat(rank.rank ? `#${num(rank.rank)}` : '—', rank.rank ? `of ${num(rank.total)}` : 'unranked')}
                    ${stat(num(p.drip), 'drip', 'drip')}
                    ${stat(`👑${num(k.crowns)} ⚔️${num(k.slain)}`, 'crowns/slain')}
                </span>
                <span class="g-game-last">${lastLine}</span>
            </a>`;
    }
    const BOARD_NAMES = { fastest: 'fastest to the garden', grass: 'grass', network: 'biggest network', online: 'new internet', uptime: 'uptime' };
    function netCard() {
        const n = stats.net;
        const head = `<span class="g-game-head"><img src="/assets/object-icons/network.webp" alt=""><b>the network is growing</b><span class="g-game-go" title="${n && n.started === false ? 'start' : 'play'}">&nearr;</span></span>`;
        let body, more = '';
        if (!n) body = '<span class="g-game-last"><span>the network didn\'t answer</span></span>';
        else if (n.started === false) body = '<span class="g-game-last"><span>not started yet · same miladys, idle</span></span>';
        else {
            const best = Object.entries(n.ranks || {}).filter(([b]) => BOARD_NAMES[b]).sort((x, y) => x[1].rank - y[1].rank)[0];
            more = [`touched grass ${num(n.runs)}× (${num(n.grass)} grass)`, (n.challenges || []).length ? `${n.challenges.length} challenges beaten` : '',
                n.cheese || n.beetles ? `🧀 ${num(n.cheese)} cheese this week · 🪲 ${num(n.beetles)} beetles` : '', best ? `#${num(best[1].rank)} of ${num(best[1].total)} · ${BOARD_NAMES[best[0]]}` : ''].filter(Boolean).join(' · ');
            body = `<span class="g-pstats">
                    ${stat(num(n.miladys), `milad${n.miladys === 1 ? 'y' : 'ys'}`, 'drip')}
                    ${stat(n.online ? '🌐 on' : `${n.stage}/7`, n.online ? `${num(n.epochs)} epochs` : 'new internet')}
                    ${best ? stat(`#${num(best[1].rank)}`, BOARD_NAMES[best[0]]) : stat(`🌱${num(n.runs)}×`, 'touched grass')}
                    ${stat(hours(n.played || 0), 'played')}
                </span>
                <span class="g-game-last"><span>${num(n.ach)} achievements</span>${n.saved ? `<i>synced ${ago(n.saved * 1000)}</i>` : ''}</span>`;
        }
        return `<a class="g-game" href="https://clicker.tylerirl.com" target="_blank" rel="noopener" style="--game: 255, 121, 198"${more ? ` title="the network is growing: ${esc(more)}"` : ''}>${head}${body}</a>`;
    }

    const live = (el) => el && el.isConnected;
    function render(arrived) {
        // Rail panel: the sign-ins, or who's signed in and sign out
        if (slots.meta) slots.meta.textContent = user ? 'LINKED' : 'GUEST';
        if (slots.link) {
            if (user) {
                const games = !stats ? '<div class="g-player-wait">SYNCING&hellip;</div>'
                    : stats.failed ? '<div class="g-player-wait is-error">[ NO LINK ] the games didn\'t answer <button type="button" class="g-btn" data-retry>RETRY</button></div>'
                    : `<div class="g-games">${cancelCard()}${netCard()}</div>`;
                slots.link.innerHTML = `<div class="g-player-who">${tag(user)}<button type="button" class="g-btn" data-out title="Sign out of the games">SIGN OUT</button></div>${games}`;
                slots.link.querySelector('[data-out]').addEventListener('click', () => signOut());
                slots.link.querySelector('[data-retry]')?.addEventListener('click', () => { stats = null; render(); load(); });
                if (arrived) slots.link.querySelectorAll('.g-ptag b, .g-pstat b, .g-game-head b').forEach((el) => window.tirlArrive?.arrive(el));
            } else {
                const sso = [offer.rn ? `<button type="button" class="g-btn g-sso" data-sso="rn">${REMILIA_MARK}Remilia SSO</button>` : '',
                    offer.ur ? `<button type="button" class="g-btn g-sso ur" data-sso="ur">${URBIT_MARK}Urbit ID</button>` : ''].filter(Boolean).join('');
                slots.link.innerHTML = `<small class="g-player-sub">sign in for the cancel is coming</small>
                    ${sso ? `<div class="g-sso-row">${sso}</div>` : ''}${notice ? `<span class="g-player-note">${esc(notice)}</span>` : ''}`;
                slots.link.querySelectorAll('[data-sso]').forEach((b) => b.addEventListener('click', () => {
                    const back = encodeURIComponent(location.origin + location.pathname);
                    location.assign(`${API}/api/auth/${b.dataset.sso === 'ur' ? 'urbit/' : ''}login?return=${back}`);
                }));
            }
        }
    }

    // Fresh numbers every 5 minutes while the tab is visible (and on coming back to it)
    const stale = () => user && (!stats || stats.failed || Date.now() - stats.at > REFRESH);
    setInterval(() => { if (!document.hidden && stale()) load(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && stale()) load(); });
    // Which sign-ins are on (the service's health check); without an answer both stay offered
    if (!user) api('/api/health').then((h) => {
        if (!h || h.ok === false) return;
        offer = { rn: !!h.rn, ur: !!h.ur };
        if (!offer.rn && !offer.ur) notice = 'sign-in is switched off on the games right now';
        render();
    });

    render();
    if (user) load();

    // For the boot screen (index.html)
    window.dispatchEvent(new CustomEvent('tirl:boot', { detail: user
        ? { id: 'player', status: (isShip(user.handle) ? user.handle : '~' + user.handle).toUpperCase() }
        : { id: 'player', status: 'GUEST', tone: 'idle' } }));

    window.TirlPlayer = { user: () => user && { handle: user.handle, name: user.name } };
})();
