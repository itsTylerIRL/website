/* Live telemetry for the Results list: one short line per object that has a live source, shown in place of
   its path (window.ObjectsLive from js/objects.js). Sources and refresh:
   - Tyler (in real life): the track playing (js/music.js), else the live status (js/presence.js), as they change
   - Kingdom of Loathing: today's date and time to rollover (js/kol-calendar.js), every minute
   - the cancel is coming: this week's king of the hill (cancel-api, which only answers tylerirl.com), every 5 minutes
   - RadGotchi, DigiFlip: last push and stars from one GitHub call, cached for the session (GitHub allows 60 an hour)
   - Things I Like: how many objects the likes page lists, and how many in each category, counted from its
     #likes-data cards the way js/likes.js reads them; once
   - ~nosfyl, ~raddem-tidwyt: online (and for how long) or offline (and when last seen) from ship-status on
     cancel-api, which checks each ship every minute; every 2 minutes
   Anything that fails just leaves the row on its path. */
(function () {
    'use strict';
    const set = window.ObjectsLive;
    if (!set) return;
    const FIVE_MIN = 5 * 60000;
    const ago = t => {
        const m = Math.max(0, Math.round((Date.now() - t) / 60000));
        return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const getJSON = async (url, opts) => {
        const r = await fetch(url, { credentials: 'omit', ...opts });
        if (!r.ok) throw new Error(r.status);
        return r.json();
    };
    const every = (ms, fn) => { fn(); setInterval(() => { if (!document.hidden) fn(); }, ms); };

    // Tyler (in real life): what Tyler is up to right now, music first
    let pres = window.tirlPresence, music = window.tirlMusic;
    function home() {
        if (music) return set('home', `♫ ${music.name} – ${music.artist}`, 'blue');
        const p = pres;
        if (!p) return;
        const text = p.music ? `♫ ${p.title}`
            : p.kind === 'activity' ? `${p.label.toLowerCase()} ${p.title}`
            : `I am currently ${p.word[0].toUpperCase()}${p.word.slice(1)}`;
        set('home', text, p.tone);
    }
    home();
    window.addEventListener('tirl:presence', e => { pres = e.detail; home(); });
    window.addEventListener('tirl:music', e => { music = e.detail; home(); });

    // Kingdom of Loathing: the KoL date and the countdown to rollover
    if (typeof KOL !== 'undefined') {
        every(60000, () => {
            const t = KOL.today();
            const m = Math.max(0, Math.floor((t.nextRollover - Date.now()) / 60000));
            set('kol', `${t.monthName} ${t.date} · ${t.holiday || `rollover ${Math.floor(m / 60)}h ${m % 60}m`}`, t.holiday ? 'orange' : 'blue');
        });
    }

    // Things I Like: the likes page's object count, biggest category first. Counting means fetching the whole
    // page, so the line is kept for an hour.
    (async () => {
        const KEY = 'tirl_likes_line';
        try {
            const c = JSON.parse(localStorage.getItem(KEY));
            if (c && Date.now() - c.at < 3600000) return set('likes', c.text, 'blue');
        } catch (_) {}
        try {
            const r = await fetch('/pages/likes.html');
            if (!r.ok) return;
            const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
            const cards = [...doc.querySelectorAll('#likes-data .bento-item')].filter(a => (a.querySelector('.bento-content h3')?.textContent || '').trim());
            if (!cards.length) return;
            const cats = {};
            cards.forEach(a => { const c = a.dataset.category || 'other'; cats[c] = (cats[c] || 0) + 1; });
            const split = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${n} ${c}`).join(' · ');
            const text = `${cards.length} objects · ${split}`;
            set('likes', text, 'blue');
            try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), text })); } catch (_) {}
        } catch (_) {}
    })();

    // Urbit ships: up and for how long, or down and since when
    const SHIPS = { nosfyl: '~nosfyl', raddem: '~raddem-tidwyt' };
    const span = t => {
        const m = Math.floor((Date.now() - t) / 60000);
        return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
    };
    every(2 * 60000, async () => {
        try {
            const { ships } = await getJSON('https://cancel-api.tylerirl.com/ships');
            Object.entries(SHIPS).forEach(([key, name]) => {
                const s = ships && ships[name];
                if (!s || s.online === null) return;
                if (s.online) set(key, s.since ? `online · up ${span(s.since)}` : 'online', 'green');
                else set(key, s.lastOnline ? `offline · last seen ${ago(s.lastOnline)}` : 'offline', 'red');
            });
        } catch (_) {}
    });

    // the cancel is coming: who holds the crown this week
    every(FIVE_MIN, async () => {
        try {
            const { king } = await getJSON('https://cancel-api.tylerirl.com/api/king', { cache: 'no-store' });
            const feed = (window.tirlFeed = window.tirlFeed || {});
            if (!king) {
                feed.cancel = [{ text: '♛ the cancel is coming: throne empty, take the crown', tone: 'orange', href: 'https://cancel.tylerirl.com' }];
                return set('cancel', '♛ throne empty · take the crown', 'orange');
            }
            const who = king.handle ? (String(king.handle).startsWith('~') ? king.handle : '~' + king.handle) : king.name || 'anon';
            set('cancel', `♛ ${who} · ${king.score ?? 0} drip`, 'orange');
            feed.cancel = [{ text: `♛ ${who} holds the cancel crown · ${king.score ?? 0} drip`, tone: 'orange', href: 'https://cancel.tylerirl.com' }];
        } catch (_) {}
    });

    // Program repos: last push (and stars once there are any)
    const REPOS = { radgotchi: 'radgotchi', digiflip: 'Digiflip' };
    (async () => {
        const KEY = 'tirl_repos';
        let repos = null;
        try {
            const c = JSON.parse(sessionStorage.getItem(KEY));
            if (c && Date.now() - c.at < 10 * 60000) repos = c.repos;
        } catch (_) {}
        if (!repos) {
            try {
                const list = await getJSON('https://api.github.com/users/itsTylerIRL/repos?per_page=100&sort=pushed');
                repos = Object.fromEntries(list.map(r => [r.name.toLowerCase(), { pushed: r.pushed_at, stars: r.stargazers_count }]));
                try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), repos })); } catch (_) {}
            } catch (_) { return; }
        }
        Object.entries(REPOS).forEach(([key, name]) => {
            const r = repos[name.toLowerCase()];
            if (r) set(key, `pushed ${ago(new Date(r.pushed))}${r.stars ? ` · ★${r.stars}` : ''}`, 'green');
        });
        // For the status-bar ticker (js/ticker.js)
        (window.tirlFeed = window.tirlFeed || {}).repos = Object.values(REPOS).filter(name => repos[name.toLowerCase()]).map(name => ({
            text: () => `pushed to ${name} ${ago(new Date(repos[name.toLowerCase()].pushed))}`, tone: 'green', href: `https://github.com/itsTylerIRL/${name}`
        }));
    })();
})();
