/* X and Steam cards for the Host dossier (rotated with the others by js/index.js; each joins once it loads).
   - X: the latest post that isn't a repost or reply, with its counts, plus followers and posts, from
     api.fxtwitter.com (an unofficial mirror that allows CORS; X's own API is paid). Every 10 minutes.
   - Steam: status and recent games from steam-proxy (cancel-api.tylerirl.com/steam), which reads the public
     profile feed Steam won't serve to other sites and drops the private fields. Every 2 minutes. Also puts
     the status on the Steam comms tile. */
(function () {
    'use strict';
    const xCard = document.getElementById('g-xcard');
    const steamCard = document.getElementById('g-steam');
    const steamTile = document.getElementById('g-steam-status');
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const short = n => !Number.isFinite(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
    const ago = t => {
        const m = Math.max(0, Math.round((Date.now() - t) / 60000));
        return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const hours = h => (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10) + 'h';
    const getJSON = async url => {
        const r = await fetch(url, { credentials: 'omit' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    };
    const stat = (n, label) => `<span class="g-soc-stat"><b>${esc(n)}</b><small>${esc(label)}</small></span>`;

    // ---------- X ----------
    if (xCard) {
        const KEY = 'tirl_x';
        const FX = 'https://api.fxtwitter.com';
        async function loadX() {
            let data = null;
            try {
                const c = JSON.parse(sessionStorage.getItem(KEY));
                if (c && Date.now() - c.at < 10 * 60000) data = c.data;
            } catch (_) {}
            if (!data) {
                const [profile, posts] = await Promise.all([
                    getJSON(`${FX}/itstylerirl`),
                    getJSON(`${FX}/2/profile/itstylerirl/statuses`).catch(() => null)
                ]);
                const u = profile && profile.user;
                if (!u) throw new Error('no profile');
                const post = (posts && posts.results || []).find(p => p.type === 'status' && !p.reposted_by && !p.replying_to);
                data = {
                    avatar: (u.avatar_url || '').replace('_normal.', '_200x200.'),
                    followers: u.followers, posts: u.tweets ?? u.statuses,
                    post: post && { url: post.url, text: post.text, at: post.created_timestamp * 1000, likes: post.likes, reposts: post.reposts, views: post.views }
                };
                // Only a complete answer is reused; without the latest post, the next load asks again
                if (data.post) try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); } catch (_) {}
            }
            const p = data.post;
            xCard.href = p ? p.url : 'https://x.com/itsTylerIRL';
            xCard.innerHTML = `<span class="g-soc-art"><img src="${esc(data.avatar)}" alt="" width="40" height="40" decoding="async" referrerpolicy="no-referrer"></span>
                <span class="g-soc-text">
                    <small><span>${p ? 'LATEST POST' : '@ITSTYLERIRL'}</span>${p ? `<span class="g-soc-dim">${ago(p.at)}</span>` : ''}</small>
                    <b>${p ? esc(p.text.replace(/\s+/g, ' ')) : 'TylerIRL on X'}</b>
                    ${p ? `<em>♥ ${short(p.likes)} · ↻ ${short(p.reposts)}${Number.isFinite(p.views) ? ` · ${short(p.views)} views` : ''}</em>` : ''}
                </span>
                <span class="g-soc-stats">${stat(short(data.followers), 'followers')}${stat(short(data.posts), 'posts')}</span>`;
            xCard.querySelector('img').addEventListener('error', e => e.target.remove(), { once: true });
            // For the status-bar ticker (js/ticker.js): the post, cut short
            if (p) {
                const text = p.text.replace(/\s+/g, ' ').trim();
                window.ObjectsLive?.('live-x', `“${text}” · ${ago(p.at)}`, 'blue');
                // Visit memory (js/now.js): a post since you were last here
                window.tirlVisit?.seen('xpost', p.url, (was, now) => was !== now ? { text: 'new post on 𝕏', tone: 'blue', key: 'live-x' } : null);
                (window.tirlFeed = window.tirlFeed || {}).x = [{ text: () => `𝕏 “${text.length > 90 ? text.slice(0, 88).trimEnd() + '…' : text}” · ${ago(p.at)}`, tone: 'blue', href: p.url }];
            }
            xCard.hidden = false;
        }
        const runX = () => loadX().catch(e => console.log('X card unavailable:', e.message));
        runX();
        setInterval(() => { if (!document.hidden) runX(); }, 10 * 60000);
    }

    // ---------- Steam ----------
    if (steamCard) {
        const STATES = { 'in-game': ['IN-GAME', 'steam'], online: ['ONLINE', 'green'], offline: ['OFFLINE', 'muted'] };
        async function loadSteam() {
            const d = await getJSON('https://cancel-api.tylerirl.com/steam');
            const [label, tone] = STATES[d.state] || STATES.offline;
            const games = (d.games || []).filter(g => g.name);
            const recent = games.reduce((n, g) => n + (g.hours2wk || 0), 0);
            const g = d.playing;
            // In game: the game's capsule; otherwise the avatar. Status line: Steam's own ("Last Online 3 hrs ago")
            steamCard.className = `g-steam tone-${tone}${steamCard.classList.contains('is-active') ? ' is-active' : ''}`;
            steamCard.href = g && g.link ? g.link : d.profile;
            steamCard.innerHTML = `<span class="g-soc-art${g ? ' is-capsule' : ''}"><img src="${esc(g ? g.logo : d.avatar)}" alt="" decoding="async" referrerpolicy="no-referrer"><i class="g-soc-pip" aria-hidden="true"></i></span>
                <span class="g-soc-text">
                    <small><span>${label}</span>${recent ? `<span class="g-soc-dim">${hours(recent)} past 2 weeks</span>` : ''}</small>
                    <b>${esc(g ? g.name : d.status || label.toLowerCase())}</b>
                    <em>${g ? 'playing now' : games[0] ? `last played ${esc(games[0].name)}` : esc(d.name)}</em>
                </span>
                <span class="g-soc-stats">${recent ? stat(hours(recent), 'past 2 weeks') : ''}${games.length ? stat(hours(Math.max(...games.map(x => x.hoursTotal || 0))), 'top game') : ''}</span>
                <span class="g-steam-games">${games.slice(0, 3).map(x => `<span class="g-steam-game" title="${esc(x.name)}: ${hours(x.hours2wk || 0)} past 2 weeks, ${hours(x.hoursTotal || 0)} total">
                    <img src="${esc(x.logo)}" alt="${esc(x.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><small>${hours(x.hoursTotal || 0)}</small></span>`).join('')}</span>`;
            steamCard.querySelectorAll('img').forEach(img => img.addEventListener('error', () => img.remove(), { once: true }));
            steamCard.hidden = false;
            if (steamTile) steamTile.textContent = g ? `playing ${g.name}` : label.toLowerCase();
            // The Steam row in Results (js/objects.js): the game, else the status and what was played last
            window.ObjectsLive?.('live-steam', g ? `in-game · ${g.name}` : [label.toLowerCase(), games[0] && `last played ${games[0].name}`].filter(Boolean).join(' · '),
                g ? 'purple' : tone === 'green' ? 'green' : 'muted');
            // For the status-bar ticker (js/ticker.js)
            (window.tirlFeed = window.tirlFeed || {}).steam = g
                ? [{ text: `in-game on steam · ${g.name}`, tone: 'purple', href: g.link || d.profile }]
                : recent && games[0] ? [{ text: `${hours(recent)} on steam the past 2 weeks · mostly ${games[0].name}`, tone: 'blue', href: d.profile }] : [];
        }
        const runSteam = () => loadSteam().catch(e => console.log('Steam card unavailable:', e.message));
        runSteam();
        setInterval(() => { if (!document.hidden) runSteam(); }, 2 * 60000);
    }
})();
