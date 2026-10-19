/* Live Discord presence in the Host dossier, from Lanyard (api.lanyard.rest; the Discord account is in its server).
   A REST read paints the card straight away, then Lanyard's socket pushes every change. Shows, in order of
   preference: Spotify (album art, track, progress), a game or other activity (art, details, time played),
   a custom status, or just the online state. Also tints the hologram tag's dot and the Discord comms tile,
   and shares the latest state as window.tirlPresence plus a 'tirl:presence' event (js/live-rows.js). */
(function () {
    'use strict';
    const card = document.getElementById('g-presence');
    if (!card) return;
    const USER = '367487663990898689';
    const dot = document.getElementById('g-presence-dot');
    const chan = document.getElementById('g-discord-status');
    const PROFILE = card.href;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const STATUS = {
        online: ['online', 'green'],
        idle: ['idle', 'orange'],
        dnd: ['do not disturb', 'red'],
        offline: ['offline', 'muted']
    };
    const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
    let presence = null;
    let timer = null;

    // Discord asset keys: media-proxy ("mp:"), Spotify ("spotify:") or an application asset id
    function assetURL(appId, key) {
        if (!key) return '';
        if (key.startsWith('mp:external/')) return 'https://media.discordapp.net/external/' + key.slice(12);
        if (key.startsWith('mp:')) return 'https://media.discordapp.net/' + key.slice(3);
        if (key.startsWith('spotify:')) return 'https://i.scdn.co/image/' + key.slice(8);
        return appId ? `https://cdn.discordapp.com/app-assets/${appId}/${key}.png` : '';
    }
    const avatarURL = u => u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'png'}?size=96` : '';
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
            return { kind: 'spotify', art: s.album_art_url, title: s.song, sub: `by ${s.artist.replace(/;/g, ',')}`,
                href: s.track_id ? `https://open.spotify.com/track/${s.track_id}` : PROFILE, start: s.timestamps?.start, end: s.timestamps?.end, label: 'LISTENING' };
        }
        const a = acts[0];
        if (a) {
            const art = assetURL(a.application_id, a.assets?.large_image) || (a.application_id ? `https://dcdn.dstn.to/app-icons/${a.application_id}` : '');
            return { kind: 'activity', art, title: a.name, sub: [a.details, a.state].filter(Boolean).join(' · '),
                href: a.url || PROFILE, start: a.timestamps?.start, label: (VERB[a.type] || 'Playing').toUpperCase() };
        }
        if (custom && (custom.state || custom.emoji)) {
            return { kind: 'custom', art: avatarURL(p.discord_user), emoji: custom.emoji?.id ? null : custom.emoji?.name,
                title: custom.state || '', sub: word, href: PROFILE, label: 'STATUS' };
        }
        const where = ['desktop', 'web', 'mobile'].filter(k => p['active_on_discord_' + k]);
        return { kind: 'idle', art: avatarURL(p.discord_user), title: word === 'offline' ? 'Offline' : `${word[0].toUpperCase()}${word.slice(1)}`,
            sub: word === 'offline' ? 'comms still open, send a dm' : where.length ? `on ${where.join(' + ')}` : 'on discord', href: PROFILE, label: 'DISCORD' };
    }

    // Right-hand stats, for cards wide enough to show them (css/objects.css hides them on narrow ones):
    // the track's progress or the session's length, then status, where Tyler is active and the handle
    function side(p, d, word) {
        const cell = (value, label, cls = '') => `<span class="g-soc-stat${cls}"><b>${esc(value)}</b><small>${esc(label)}</small></span>`;
        const where = ['desktop', 'mobile', 'web'].filter(k => p['active_on_discord_' + k]);
        return [
            d.kind === 'spotify' && d.end ? cell('', 'of ' + clock(d.end - d.start), ' g-presence-clock') :
                d.start ? cell('', 'session', ' g-presence-clock') : '',
            d.kind === 'spotify' && p.spotify?.album ? cell(p.spotify.album, 'album', ' is-text') : '',
            cell(word, 'status'),
            word !== 'offline' ? cell(where.join(' + ') || 'discord', 'active on') : '',
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
        presence = p;
        const [word, tone] = STATUS[p.discord_status] || STATUS.offline;
        const d = describe(p);
        if (dot) dot.className = `g-dot tone-${tone}`;
        if (chan) chan.textContent = word === 'offline' ? 'send a dm' : word;
        card.href = d.href;
        // Keep the dossier carousel's is-active (js/index.js) across updates
        card.className = `g-presence is-${d.kind} tone-${tone}${card.classList.contains('is-active') ? ' is-active' : ''}`;
        card.title = `Discord: ${word}`;
        card.innerHTML = `<span class="g-presence-art">
                ${d.art ? `<img src="${esc(d.art)}" alt="" width="40" height="40" decoding="async" referrerpolicy="no-referrer">` : ''}
                <i class="g-presence-status" aria-hidden="true"></i></span>
            <span class="g-presence-text">
                <small><span>${esc(d.label)}</span><span class="g-presence-time"></span></small>
                <b>${d.emoji ? `${esc(d.emoji)} ` : ''}${esc(d.title)}</b>
                ${d.sub ? `<em>${esc(d.sub)}</em>` : ''}
            </span>
            <span class="g-presence-side">${side(p, d, word)}</span>
            ${d.kind === 'spotify' && d.end ? '<span class="g-presence-bar" aria-hidden="true"><i></i></span>' : ''}`;
        // Art that won't load (expired media links, apps without icons) falls back to the avatar, then to nothing
        const img = card.querySelector('.g-presence-art img');
        const avatar = avatarURL(p.discord_user);
        img?.addEventListener('error', () => {
            if (avatar && img.src !== avatar) img.src = avatar; else img.remove();
        });
        card.hidden = false;
        window.tirlPresence = { ...d, word, tone };
        window.dispatchEvent(new CustomEvent('tirl:presence', { detail: window.tirlPresence }));
        clearInterval(timer);
        if (d.start) { tick(); timer = setInterval(tick, 1000); }
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
