/* Music in the Host dossier: what's playing on TIDAL, by way of Last.fm (TIDAL scrobbles there on every device),
   from lastfm-now on cancel-api.tylerirl.com, which polls Last.fm and keeps the API key. Its own card, built
   like the Discord one (css/objects.css .g-presence): cover art, track, artist, then the album, progress or
   time played and the all-time scrobble count. Nothing playing shows the last track played instead. Shares
   the playing track as window.tirlMusic plus a 'tirl:music' event (js/live-rows.js). */
(function () {
    'use strict';
    const card = document.getElementById('g-music');
    if (!card) return;
    const SRC = 'https://cancel-api.tylerirl.com/lastfm';
    const PROFILE = card.href;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const clock = ms => {
        const s = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
        return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
    };
    const ago = t => {
        const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    let shown = '';
    let state = null;
    let timer = null;

    // Progress (or time played, when Last.fm doesn't know the length) for a playing track; "ago" for the last one
    function tick() {
        const t = state?.playing;
        const time = card.querySelector('.g-presence-time');
        const big = card.querySelector('.g-presence-clock b');
        if (t) {
            const done = Date.now() - t.start;
            if (t.duration) {
                const shownDone = Math.min(t.duration, done);
                const bar = card.querySelector('.g-presence-bar i');
                if (bar) bar.style.transform = `scaleX(${(shownDone / t.duration).toFixed(4)})`;
                if (time) time.textContent = `${clock(shownDone)} / ${clock(t.duration)}`;
                if (big) big.textContent = clock(shownDone);
            } else {
                if (time) time.textContent = clock(done);
                if (big) big.textContent = clock(done);
            }
        } else if (state?.last) {
            if (time) time.textContent = ago(state.last.start);
            if (big) big.textContent = ago(state.last.start);
        }
    }

    function render(j) {
        state = j;
        const t = j.playing || j.last;
        if (!t) { card.hidden = true; return; }
        const playing = !!j.playing;
        const cell = (value, label, cls = '') => `<span class="g-soc-stat${cls}"><b>${esc(value)}</b><small>${esc(label)}</small></span>`;
        card.href = t.url || PROFILE;
        card.title = playing ? `Now playing: ${t.name} by ${t.artist}` : `Last played: ${t.name} by ${t.artist}`;
        card.className = `g-presence g-music${playing ? ' is-playing' : ''}${card.classList.contains('is-active') ? ' is-active' : ''}`;
        card.innerHTML = `<span class="g-presence-art">
                ${t.art ? `<img src="${esc(t.art)}" alt="" width="40" height="40" decoding="async" referrerpolicy="no-referrer">` : ''}
                <i class="g-music-note" aria-hidden="true">&#9835;</i></span>
            <span class="g-presence-text">
                <small><span>${playing ? 'NOW PLAYING' : 'LAST PLAYED'}</span>${playing ? '<i class="g-music-eq" aria-hidden="true"><i></i><i></i><i></i></i>' : ''}<span class="g-presence-time"></span></small>
                <b>${esc(t.name)}<span class="g-music-by"> · ${esc(t.artist)}</span></b>
                <em>by ${esc(t.artist)}</em>
            </span>
            <span class="g-presence-side">
                ${cell('', playing ? (t.duration ? 'of ' + clock(t.duration) : 'playing') : 'played', ' g-presence-clock')}
                ${t.album ? cell(t.album, 'album', ' is-text') : ''}
                ${Number.isInteger(j.scrobbles) ? cell(j.scrobbles.toLocaleString(), 'scrobbles') : ''}
                ${cell('TIDAL', 'via last.fm')}
            </span>
            ${playing && t.duration ? '<span class="g-presence-bar" aria-hidden="true"><i></i></span>' : ''}`;
        card.querySelector('.g-presence-art img')?.addEventListener('error', e => e.target.remove());
        card.hidden = false;
        tick();
        clearInterval(timer);
        timer = setInterval(tick, playing ? 1000 : 60000);
        window.tirlMusic = j.playing || null;
        // For the status-bar ticker (js/ticker.js)
        (window.tirlFeed = window.tirlFeed || {}).music = [playing
            ? { text: `♫ now playing ${t.name} – ${t.artist}`, tone: 'cyan', href: t.url || PROFILE }
            : { text: () => `♫ last played ${t.name} – ${t.artist} · ${ago(t.start)}`, tone: 'cyan', href: t.url || PROFILE }];
        window.dispatchEvent(new CustomEvent('tirl:music', { detail: window.tirlMusic }));
    }

    // Asked every 20 s while the page is visible; the card is rebuilt only when the track (or count) changes
    function load() {
        if (document.hidden) return;
        fetch(SRC, { credentials: 'omit' })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
            .then(j => {
                const key = JSON.stringify([j.playing, j.last, j.scrobbles]);
                if (key !== shown) { shown = key; render(j); }
            })
            .catch(() => {});
    }
    load();
    setInterval(load, 20000);
    document.addEventListener('visibilitychange', load);
})();
