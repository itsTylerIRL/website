/* Player link, on the home object (js/objects.js renderHeader, while tylerirl.com is selected): sign in with Remilia
   SSO or an Urbit ID through the cancel game's service, the same sign-in the cancel is coming and the network is
   growing use. Signed out, the two buttons sit on the right of the object's header; signed in, who you are (and
   sign out) moves to the top bar beside the search (#g-whoami), and your stats from both games show in the header.
   The service sends the browser back here with its own signed session in #rn= (or #rn_error=). It's kept in this
   browser (localStorage) until it runs out or you sign out. Load this before js/objects.js, which would otherwise
   read the #fragment as an object to select.
   What it reads (the service answers tylerirl.com only, so none of this works from a localhost copy):
   - POST /api/profile {session, data: {}}: the cancel's account sync. With nothing to add it changes nothing and
     answers with the account's record, DRIP, streak, all-time rank and last runs
   - GET /api/king?player=: weeks as king of the hill, kings slain, and whether you hold the hill now
   - GET /api/net/profile?h=: the network: miladys, how far along, grass, where you stand on its boards (404: not started) */
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
    const slots = { sso: null, stats: null, top: document.getElementById('g-whoami') };

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
        if (welcome && !stats.failed) {
            welcome = false;
            if (typeof RG !== 'undefined') RG.setMood('grateful', { anim: 'rg-bounce', status: `WELCOME ${user.name}`.toUpperCase().slice(0, 28), duration: 4000, priority: true });
            window.tirlTicker?.push({ text: `player link up · ${isShip(user.handle) ? user.handle : '~' + user.handle}`, tone: 'green' });
        }
    }
    function signOut(msg) {
        keep(null);
        user = null;
        stats = null;
        notice = msg || '';
        render();
    }

    // ---------- Render ----------
    const tag = (u) => isShip(u.handle)
        ? `<span class="g-ptag ur" title="signed in with Urbit ID">${URBIT_MARK}<b>${esc(u.handle)}</b></span>`
        : `<a class="g-ptag rm" href="https://remilia.net/~${encodeURIComponent(u.handle)}" target="_blank" rel="noopener" title="signed in with Remilia SSO">${REMILIA_MARK}<b>~${esc(u.handle)}</b></a>`;
    const stat = (value, label, cls = '') => `<span class="g-pstat${cls ? ' ' + cls : ''}"><b>${value}</b><small>${label}</small></span>`;

    function cancelCard() {
        const a = stats.acct, p = a.data || {}, k = stats.king || {};
        const runs = +p.runs || 0, wins = +p.wins || 0, rank = a.rank || {};
        const last = (a.runs || [])[0];
        const lastLine = last
            ? `<span class="${last.win ? 'good' : 'bad'}">last run: ${last.endless ? '📡 endless' : last.win ? `👑 saved the timeline on day ${last.day}` : `💀 cancelled on day ${last.day}${last.killedBy ? ' by ' + esc(last.killedBy) : ''}`} · <b>${num(last.score)}</b></span><i>${ago(last.at * 1000)}</i>`
            : '<span>no runs on this account yet</span>';
        return `<a class="g-game" href="https://cancel.tylerirl.com" target="_blank" rel="noopener" style="--game: 255, 222, 23">
                <span class="g-game-head"><img src="/assets/object-icons/cancel.webp" alt=""><b>the cancel is coming</b>${k.you ? '<em>👑 KING OF THE HILL</em>' : ''}<span class="g-game-go">PLAY &nearr;</span></span>
                <span class="g-pstats">
                    ${stat(`<span class="good">${wins}W</span> · <span class="bad">${runs - wins}L</span>`, runs ? `record · ${Math.round(100 * wins / runs)}% saved` : 'record')}
                    ${stat(rank.rank ? `#${num(rank.rank)}` : '—', rank.rank ? `of ${num(rank.total)} · best ${num(rank.score)}` : 'not on the board yet')}
                    ${stat(num(p.drip), 'drip', 'drip')}
                    ${stat(`👑 ${num(k.crowns)} · ⚔️ ${num(k.slain)}`, 'crowns · kings slain')}
                    ${p.streak && p.streak.best ? stat(`🔥 ${num(p.streak.n)}`, `daily streak · best ${num(p.streak.best)}`) : ''}
                    ${stat(num((p.ach || []).length), 'achievements')}
                </span>
                <span class="g-game-last">${lastLine}</span>
            </a>`;
    }
    const BOARD_NAMES = { fastest: 'fastest to the garden', grass: 'grass', network: 'biggest network', online: 'new internet', uptime: 'uptime' };
    function netCard() {
        const n = stats.net;
        const head = `<span class="g-game-head"><img src="/assets/object-icons/network.webp" alt=""><b>the network is growing</b><span class="g-game-go">${n && n.started === false ? 'START' : 'PLAY'} &nearr;</span></span>`;
        let body;
        if (!n) body = '<span class="g-game-last"><span>the network didn\'t answer · try again in a bit</span></span>';
        else if (n.started === false) body = '<span class="g-game-last"><span>no network on this account yet · the idle clicker with the same miladys, and it keeps growing while you play the cancel</span></span>';
        else {
            const best = Object.entries(n.ranks || {}).filter(([b]) => BOARD_NAMES[b]).sort((x, y) => x[1].rank - y[1].rank)[0];
            body = `<span class="g-pstats">
                    ${stat(num(n.miladys), `milad${n.miladys === 1 ? 'y' : 'ys'}`, 'drip')}
                    ${stat(n.online ? '🌐 on' : `${n.stage}/7`, n.online ? `the new internet · ${num(n.epochs)} epochs` : 'new internet')}
                    ${stat(`🌱 ${num(n.runs)}×`, `touched grass · ${num(n.grass)} grass`)}
                    ${stat(hours(n.played || 0), 'played')}
                    ${best ? stat(`#${num(best[1].rank)}`, `of ${num(best[1].total)} · ${BOARD_NAMES[best[0]]}`) : ''}
                    ${n.cheese || n.beetles ? stat(`🧀 ${num(n.cheese)} · 🪲 ${num(n.beetles)}`, 'cheese this week · beetles') : ''}
                </span>
                <span class="g-game-last"><span>${num(n.ach)} achievements${(n.challenges || []).length ? ` · ${n.challenges.length} challenges beaten` : ''}</span>${n.saved ? `<i>synced ${ago(n.saved * 1000)}</i>` : ''}</span>`;
        }
        return `<a class="g-game" href="https://clicker.tylerirl.com" target="_blank" rel="noopener" style="--game: 255, 121, 198">${head}${body}</a>`;
    }

    const live = (el) => el && el.isConnected;
    function render(arrived) {
        // Top bar: who's signed in, whatever object is showing
        if (slots.top) {
            slots.top.hidden = !user;
            if (user) {
                slots.top.innerHTML = `<span class="g-player-label">PLAYER</span>${tag(user)}<button type="button" class="g-btn" data-out title="Sign out of the games">SIGN OUT</button>`;
                slots.top.querySelector('[data-out]').addEventListener('click', () => signOut());
                if (arrived) window.tirlArrive?.arrive(slots.top.querySelector('.g-ptag b'));
            } else slots.top.replaceChildren();
        }
        // Header, signed out: the two sign-ins on the right
        if (live(slots.sso)) {
            const sso = [offer.rn ? `<button type="button" class="g-btn g-sso" data-sso="rn">${REMILIA_MARK}Remilia SSO</button>` : '',
                offer.ur ? `<button type="button" class="g-btn g-sso ur" data-sso="ur">${URBIT_MARK}Urbit ID</button>` : ''].filter(Boolean).join('<i>or</i>');
            slots.sso.hidden = !!user;
            slots.sso.innerHTML = user ? '' : `<div class="g-player-head"><span class="g-player-label">PLAYER LINK</span><small>the cancel is coming · the network is growing</small></div>
                <div class="g-sso-row">${sso}</div>${notice ? `<span class="g-player-note">${esc(notice)}</span>` : ''}`;
            slots.sso.querySelectorAll('[data-sso]').forEach((b) => b.addEventListener('click', () => {
                const back = encodeURIComponent(location.origin + location.pathname);
                location.assign(`${API}/api/auth/${b.dataset.sso === 'ur' ? 'urbit/' : ''}login?return=${back}`);
            }));
        }
        // Header, signed in: a card per game
        if (live(slots.stats)) {
            slots.stats.innerHTML = !user ? ''
                : !stats ? '<div class="g-player-wait">SYNCING PLAYER RECORD&hellip;</div>'
                : stats.failed ? '<div class="g-player-wait is-error">[ NO LINK ] · the games\' service didn\'t answer · <button type="button" class="g-btn" data-retry>RETRY</button></div>'
                : `<div class="g-games">${cancelCard()}${netCard()}</div>`;
            slots.stats.querySelector('[data-retry]')?.addEventListener('click', () => { stats = null; render(); load(); });
            if (arrived) slots.stats.querySelectorAll('.g-pstat b, .g-game-head b').forEach((el) => window.tirlArrive?.arrive(el));
        }
    }

    // Called by js/objects.js each time it draws the home object's header
    function mount(sso, statsEl) {
        slots.sso = sso;
        slots.stats = statsEl;
        render();
        if (user && (!stats || stats.failed || Date.now() - stats.at > REFRESH)) load();
    }
    // Which sign-ins are on (the service's health check); without an answer both stay offered
    if (!user) api('/api/health').then((h) => {
        if (!h || h.ok === false) return;
        offer = { rn: !!h.rn, ur: !!h.ur };
        if (!offer.rn && !offer.ur) notice = 'sign-in is switched off on the games right now';
        render();
    });

    window.TirlPlayer = { mount };
})();
