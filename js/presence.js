/* Live Discord presence in the Host dossier, from Lanyard (api.lanyard.rest; the Discord account is in its server).
   A REST read paints the card straight away, then Lanyard's socket pushes every change. Shows, in order of
   preference: Spotify (album art, track, progress), a game or other activity (art, details, time played),
   a custom status, or just the online state. The last two are a profile card: nameplate behind, display name
   in its colours, badges, account age, and when offline the last time seen online (discord-seen on
   cancel-api.tylerirl.com, which polls Lanyard). Also tints the hologram tag's dot and the Discord comms tile,
   and shares the latest state as window.tirlPresence plus a 'tirl:presence' event (js/live-rows.js). */
(function () {
    'use strict';
    const card = document.getElementById('g-presence');
    if (!card) return;
    const USER = '367487663990898689';
    const dot = document.getElementById('g-presence-dot');
    const chan = document.getElementById('g-discord-status');
    const seenLine = document.getElementById('g-presence-seen');
    const PROFILE = card.href;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const STATUS = {
        online: ['online', 'green'],
        idle: ['idle', 'orange'],
        dnd: ['do not disturb', 'red'],
        offline: ['offline', 'muted']
    };
    const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
    // public_flags bits that come with a profile badge: [badge icon, name]
    const BADGES = [
        [1, '5e74e9b61934fc1f67c65515d1f7e60d', 'Discord Staff'],
        [2, '3f9748e53446a137a052f3454e2de41e', 'Partnered Server Owner'],
        [4, 'bf01d1073931f921909045f3a39fd264', 'HypeSquad Events'],
        [8, '2717692c7dca7289b35297368a940dd0', 'Bug Hunter'],
        [64, '8a88d63823d8a71cd5e390baa45efa02', 'HypeSquad Bravery'],
        [128, '011940fd013da3f7fb926e4a1cd2e618', 'HypeSquad Brilliance'],
        [256, '3aa41de486fa12454c3761e8e223442e', 'HypeSquad Balance'],
        [512, '7060786766c9c840eb3019e725d2b358', 'Early Supporter'],
        [16384, '848f79194d4be5ff5f81505cbd0ce1e6', 'Golden Bug Hunter'],
        [131072, '6df5892e0f35b051f8b61eace34f4967', 'Early Verified Bot Developer'],
        [4194304, '6bdc42827a38498929a4920da12695d9', 'Active Developer']
    ];
    const SEEN = 'https://cancel-api.tylerirl.com/discord-seen';
    let presence = null;
    let timer = null;
    let seen = null, seenAt = 0;

    // Discord asset keys: media-proxy ("mp:"), Spotify ("spotify:") or an application asset id
    function assetURL(appId, key) {
        if (!key) return '';
        if (key.startsWith('mp:external/')) return 'https://media.discordapp.net/external/' + key.slice(12);
        if (key.startsWith('mp:')) return 'https://media.discordapp.net/' + key.slice(3);
        if (key.startsWith('spotify:')) return 'https://i.scdn.co/image/' + key.slice(8);
        return appId ? `https://cdn.discordapp.com/app-assets/${appId}/${key}.png` : '';
    }
    const avatarURL = u => u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'png'}?size=96` : '';
    const emojiURL = e => /^\d+$/.test(e?.id || '') ? `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=48` : '';
    const plateURL = u => {
        const asset = u?.collectibles?.nameplate?.asset;
        return /^[\w/-]+\/$/.test(asset || '') ? `https://cdn.discordapp.com/assets/collectibles/${asset}static.png` : '';
    };
    // Snowflake ids carry their creation time: ms since the Discord epoch (2015), shifted up 22 bits
    const joined = id => /^\d+$/.test(id || '') ? new Date(Number(BigInt(id) >> 22n) + 1420070400000) : null;
    const ago = t => {
        const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };

    // Display name in its Discord colours (one, or two as a gradient), brightened to read on the dark card
    function nameHTML(u) {
        const cols = (u?.display_name_styles?.colors || []).filter(Number.isInteger).slice(0, 2)
            .map(c => '#' + c.toString(16).padStart(6, '0'));
        const style = cols.length ? ` style="--name: ${cols[0]}; --name2: ${cols[1] || cols[0]}"` : '';
        const badges = BADGES.filter(([bit]) => (u?.public_flags || 0) & bit)
            .map(([, icon, name]) => `<img class="g-presence-badge" src="https://cdn.discordapp.com/badge-icons/${icon}.png" alt="${name}" title="${name}" width="14" height="14" decoding="async" referrerpolicy="no-referrer">`).join('');
        return `<span class="g-presence-name${cols.length ? ' is-styled' : ''}"${style}>${esc(u?.global_name || u?.username || 'TylerIRL')}</span>${badges}`;
    }

    // Last time seen online, from discord-seen; asked again at most once a minute while offline
    function fetchSeen() {
        if (Date.now() - seenAt < 60000) return;
        seenAt = Date.now();
        fetch(SEEN, { credentials: 'omit' })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
            .then(j => { if (j.lastOnline && j.lastOnline !== seen) { seen = j.lastOnline; if (presence) render(presence); } })
            .catch(() => {});
    }
    const clock = ms => {
        const s = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
        return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
    };
    const elapsed = start => {
        const m = Math.max(0, Math.floor((Date.now() - start) / 60000));
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
    };

    // What the card shows: { kind, art, title, sub, href, start, end }
    function describe(p) {
        const [word] = STATUS[p.discord_status] || STATUS.offline;
        const acts = (p.activities || []).filter(a => a.type !== 4);
        const custom = (p.activities || []).find(a => a.type === 4);
        if (p.listening_to_spotify && p.spotify) {
            const s = p.spotify;
            return { kind: 'spotify', music: true, art: s.album_art_url, title: s.song, sub: `by ${s.artist.replace(/;/g, ',')}`, album: s.album,
                href: s.track_id ? `https://open.spotify.com/track/${s.track_id}` : PROFILE, start: s.timestamps?.start, end: s.timestamps?.end, label: 'LISTENING' };
        }
        const a = acts[0];
        if (a) {
            const art = assetURL(a.application_id, a.assets?.large_image) || (a.application_id ? `https://dcdn.dstn.to/app-icons/${a.application_id}` : '');
            return { kind: 'activity', art, title: a.name, sub: [a.details, a.state].filter(Boolean).join(' · '),
                href: a.url || PROFILE, start: a.timestamps?.start, label: (VERB[a.type] || 'Playing').toUpperCase() };
        }
        // Profile card: name and badges on top, then the custom status or where Tyler is (or was last seen)
        const where = ['desktop', 'web', 'mobile'].filter(k => p['active_on_discord_' + k]);
        const Word = `${word[0].toUpperCase()}${word.slice(1)}`;
        const base = { art: avatarURL(p.discord_user), profile: true, title: Word, href: PROFILE, label: 'DISCORD' };
        if (custom && (custom.state || custom.emoji)) {
            return { ...base, kind: 'custom', emoji: custom.emoji, sub: custom.state || '', label: 'STATUS' };
        }
        return { ...base, kind: 'idle', ago: word === 'offline' && seen ? 'last online ' : '',
            sub: word === 'offline' ? (seen ? `last online ${ago(seen)}` : 'comms still open, send a dm')
                : where.length ? `${Word} on ${where.join(' + ')}` : Word };
    }

    // Right-hand stats, for cards wide enough to show them (css/objects.css hides them on narrow ones):
    // the track's progress or the session's length, then status, where Tyler is active (or was last seen),
    // the account's age on the profile card, and the handle
    function side(p, d, word) {
        const cell = (value, label, cls = '') => `<span class="g-soc-stat${cls}"><b>${esc(value)}</b><small>${esc(label)}</small></span>`;
        const where = ['desktop', 'mobile', 'web'].filter(k => p['active_on_discord_' + k]);
        const since = d.profile && joined(p.discord_user?.id);
        return [
            d.music && d.end ? cell('', 'of ' + clock(d.end - d.start), ' g-presence-clock') :
                d.start ? cell('', 'session', ' g-presence-clock') : '',
            d.music && d.album ? cell(d.album, 'album', ' is-text') : '',
            cell(word, 'status'),
            word !== 'offline' ? cell(where.join(' + ') || 'discord', 'active on') : seen ? cell(ago(seen), 'last online', ' is-ago') : '',
            since ? cell(since.getFullYear(), 'member since') : '',
            cell('@' + (p.discord_user?.username || 'tylerirl'), 'discord')
        ].join('');
    }

    function tick() {
        const d = presence && describe(presence);
        if (!d) return;
        const bar = card.querySelector('.g-presence-bar i');
        const time = card.querySelector('.g-presence-time');
        const big = card.querySelector('.g-presence-clock b');
        if (d.end && d.start && bar) {
            const span = d.end - d.start, done = Math.min(span, Date.now() - d.start);
            bar.style.transform = `scaleX(${(done / span).toFixed(4)})`;
            if (time) time.textContent = `${clock(done)} / ${clock(span)}`;
            if (big) big.textContent = clock(done);
        } else if (d.start) {
            if (time) time.textContent = `for ${elapsed(d.start)}`;
            if (big) big.textContent = elapsed(d.start);
        }
    }

    function render(p) {
        const was = presence && (STATUS[presence.discord_status] || STATUS.offline)[0];
        presence = p;
        const [word, tone] = STATUS[p.discord_status] || STATUS.offline;
        // Going offline while the page watches means last online is now; ask discord-seen afresh next time
        if (word !== 'offline') seenAt = 0;
        else if (was && was !== 'offline') seen = Date.now();
        const d = describe(p);
        if (dot) dot.className = `g-dot tone-${tone}`;
        if (chan) chan.textContent = word === 'offline' ? 'send a dm' : word;
        if (seenLine) {
            const where = ['desktop', 'mobile', 'web'].filter(k => p['active_on_discord_' + k]);
            // In a game, "gaming" (in purple) takes the place of the online state
            const gaming = (p.activities || []).some(a => a.type === 0);
            seenLine.textContent = word !== 'offline' ? [gaming ? 'gaming' : word, ...where].join(' · ') : seen ? `last seen ${ago(seen)}` : 'offline';
            seenLine.dataset.ago = word === 'offline' && seen ? 'last seen ' : '';
            seenLine.className = `g-op-seen tone-${tone}${gaming ? ' is-gaming' : ''}`;
            seenLine.hidden = false;
        }
        card.href = d.href;
        // Keep the dossier carousel's is-active (js/index.js) across updates
        card.className = `g-presence is-${d.kind} tone-${tone}${card.classList.contains('is-active') ? ' is-active' : ''}`;
        card.title = `Discord: ${word}`;
        const plate = d.profile && plateURL(p.discord_user);
        const emoji = d.emoji && (emojiURL(d.emoji)
            ? `<img class="g-presence-emoji" src="${emojiURL(d.emoji)}" alt=":${esc(d.emoji.name)}:" width="14" height="14" decoding="async" referrerpolicy="no-referrer">`
            : d.emoji.name ? `${esc(d.emoji.name)} ` : '');
        card.innerHTML = `${plate ? `<img class="g-presence-plate" src="${plate}" alt="" decoding="async" referrerpolicy="no-referrer">` : ''}
            <span class="g-presence-art">
                ${d.art ? `<img src="${esc(d.art)}" alt="" width="40" height="40" decoding="async" referrerpolicy="no-referrer">` : ''}
                <i class="g-presence-status" aria-hidden="true"></i></span>
            <span class="g-presence-text">
                <small><span>${esc(d.label)}</span><span class="g-presence-time"></span></small>
                <b>${d.profile ? nameHTML(p.discord_user) : esc(d.title)}</b>
                ${emoji || d.sub ? `<em${d.ago ? ` data-ago="${d.ago}"` : ''}>${emoji || ''}${esc(d.sub)}</em>` : ''}
            </span>
            <span class="g-presence-side">${side(p, d, word)}</span>
            ${d.music && d.end ? '<span class="g-presence-bar" aria-hidden="true"><i></i></span>' : ''}`;
        // Art that won't load (expired media links, apps without icons) falls back to the avatar, then to nothing
        const img = card.querySelector('.g-presence-art img');
        const avatar = avatarURL(p.discord_user);
        img?.addEventListener('error', () => {
            if (avatar && img.src !== avatar) img.src = avatar; else img.remove();
        });
        card.querySelectorAll('.g-presence-plate, .g-presence-badge, .g-presence-emoji')
            .forEach(el => el.addEventListener('error', () => el.remove()));
        card.hidden = false;
        window.tirlPresence = { ...d, word, tone };
        window.dispatchEvent(new CustomEvent('tirl:presence', { detail: window.tirlPresence }));
        clearInterval(timer);
        if (d.start) { tick(); timer = setInterval(tick, 1000); }
        // Offline: look up the last time online, and keep the "ago" current
        else if (word === 'offline') { fetchSeen(); timer = setInterval(() => { fetchSeen(); freshen(); }, 60000); }
    }

    // Rewrite just the "ago" texts, so the minute tick doesn't rebuild the card and reload its images
    function freshen() {
        if (!seen) return;
        card.querySelectorAll('[data-ago]').forEach(el => { el.textContent = el.dataset.ago + ago(seen); });
        card.querySelectorAll('.is-ago b').forEach(el => { el.textContent = ago(seen); });
        if (seenLine?.dataset.ago) seenLine.textContent = seenLine.dataset.ago + ago(seen);
    }

    // Lanyard socket: op 1 hello (heartbeat interval), op 2 subscribe, op 3 heartbeat, op 0 events
    let socket = null, beat = null, retry = 1000;
    function connect() {
        try { socket = new WebSocket('wss://api.lanyard.rest/socket'); } catch (_) { return; }
        socket.addEventListener('message', e => {
            let msg;
            try { msg = JSON.parse(e.data); } catch (_) { return; }
            if (msg.op === 1) {
                clearInterval(beat);
                beat = setInterval(() => socket.readyState === 1 && socket.send('{"op":3}'), msg.d.heartbeat_interval);
                socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: USER } }));
            } else if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') && msg.d) {
                retry = 1000;
                render(msg.d);
            }
        });
        socket.addEventListener('close', () => {
            clearInterval(beat);
            setTimeout(connect, retry);
            retry = Math.min(retry * 2, 60000);
        });
    }

    fetch(`https://api.lanyard.rest/v1/users/${USER}`, { credentials: 'omit' })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .then(j => { if (j.success && j.data && !presence) render(j.data); })
        .catch(() => {});
    if ('WebSocket' in window) connect();
})();
