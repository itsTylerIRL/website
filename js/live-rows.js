/* Live telemetry for the Results list: one short line per object that has a live source, shown in place of
   its path (window.ObjectsLive from js/objects.js). Sources and refresh:
   - Tyler (in real life): the track playing (js/music.js), else the live status (js/presence.js), as they change
   - Kingdom of Loathing: today's date and time to rollover (js/kol-calendar.js), every minute
   - the cancel is coming: this week's king of the hill (cancel-api, which only answers tylerirl.com), every 5 minutes
   - speedcube timer: best and solve count in the current session, from this browser's save; as it changes
   - RadGotchi, DigiFlip: last push and stars from one GitHub call, cached for the session (GitHub allows 60 an hour)
   - Things I Like: how many objects the likes page lists, and how many in each category, counted from its
     #likes-data cards the way js/likes.js reads them; once
   - ~nosfyl, ~raddem-tidwyt: online (and for how long) or offline (and when last seen) from ship-status on
     cancel-api, which checks each ship every minute; every 2 minutes
   - DeepDish: its newest push across the project repos (the same GitHub call); NFT Gallery: pieces and artists,
     and Missile Program: the vehicles and their status, read from the pages once an hour; Neochibi Markets: the
     milady floor from OpenSea, every 10 minutes
   Anything that fails just leaves the row on its path. The crown, the likes count and the repos' last pushes also
   go into the visit memory (js/now.js), so a return visit says what changed.
   News: this page watches the services behind the pages itself, so the ticker hears about it whichever page is
   showing, and the idle tour goes to look (window.ObjectsNews): new runs, a new king, posts to the network's feed,
   ships going down or coming back. The first look at each only sets where things stand. */
(function () {
    'use strict';
    const set = window.ObjectsLive;
    if (!set) return;
    const news = (e) => window.ObjectsNews?.(e);
    const num = (n) => Number(n || 0).toLocaleString('en-US');
    const API = 'https://cancel-api.tylerirl.com';
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

    // speedcube timer: your best and solve count in the current session, from the timer's save in this
    // browser (js/timer.js); the storage event brings in solves made in the live preview
    function timer() {
        let s = null;
        try {
            const data = JSON.parse(localStorage.getItem('cubeTimerData'));
            s = data && data.sessions && data.sessions[data.current];
        } catch (_) {}
        const solves = (s && s.solves) || [];
        if (!solves.length) return set('timer', 'no solves yet · hold space to begin', 'orange');
        const times = solves.filter(x => x.penalty !== 'dnf').map(x => x.time + (x.penalty === 'plus2' ? 2000 : 0));
        if (!times.length) return set('timer', `${solves.length} solves · all DNF`, 'red');
        const sec = Math.floor(Math.min(...times) / 10) / 100; // centiseconds, cut like the timer's display
        const pb = sec >= 60 ? `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}` : sec.toFixed(2);
        set('timer', `PB ${pb} · ${solves.length} solve${solves.length === 1 ? '' : 's'}`, 'green');
    }
    timer();
    window.addEventListener('storage', e => { if (e.key === 'cubeTimerData' || e.key === null) timer(); });

    // Things I Like: the likes page's object count, biggest category first. Counting means fetching the whole
    // page, so the line is kept for an hour.
    const likesSeen = (n) => window.tirlVisit?.seen('likes', n, (was, now) => now > was ? { text: `+${now - was} new likes`, tone: 'purple', key: 'likes' } : null);
    (async () => {
        const KEY = 'tirl_likes_line';
        try {
            const c = JSON.parse(localStorage.getItem(KEY));
            if (c && Date.now() - c.at < 3600000) { likesSeen(c.count); return set('likes', c.text, 'blue'); }
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
            likesSeen(cards.length);
            try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), text, count: cards.length })); } catch (_) {}
        } catch (_) {}
    })();

    // Urbit ships: up and for how long, or down and since when
    const SHIPS = { nosfyl: '~nosfyl', raddem: '~raddem-tidwyt' };
    const span = t => {
        const m = Math.floor((Date.now() - t) / 60000);
        return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
    };
    // hours: [hour start, checks up, checks, avg ms] for each hour ship-status has kept
    const upPct = (hours) => {
        const [up, all] = hours.reduce((a, h) => [a[0] + h[1], a[1] + h[2]], [0, 0]);
        return all ? Math.floor(up / all * 1000) / 10 : null;
    };
    const shipWas = {};
    every(60000, async () => {
        try {
            const { ships } = await getJSON(`${API}/ships?history=1`);
            Object.entries(SHIPS).forEach(([key, name]) => {
                const s = ships && ships[name];
                if (!s || s.online === null) return;
                const day = (s.hours || []).slice(-24);
                const pct = upPct(day);
                const share = pct === null ? '' : ` · ${pct}% 24h`;
                if (s.online) set(key, s.since ? `online · up ${span(s.since)}${share}` : `online${share}`, 'green');
                else set(key, s.lastOnline ? `offline · last seen ${ago(s.lastOnline)}` : 'offline', 'red');
                // Up or down since the last look
                if (key in shipWas && shipWas[key] !== s.online) {
                    news({ key, text: `${name} ${s.online ? 'is back online' : 'went offline'}`, tone: s.online ? 'green' : 'red', hash: 'uptime',
                        mood: s.online ? 'happy' : 'sad', status: `${name.toUpperCase()} ${s.online ? 'BACK' : 'DOWN'}` });
                }
                shipWas[key] = s.online;
            });
        } catch (_) {}
    });

    // the cancel is coming: who holds the crown this week
    let lastKing = null;
    every(FIVE_MIN, async () => {
        try {
            const { king } = await getJSON('https://cancel-api.tylerirl.com/api/king', { cache: 'no-store' });
            const feed = (window.tirlFeed = window.tirlFeed || {});
            const crown = (who) => window.tirlVisit?.seen('king', who, (was, now) => was === now ? null
                : now ? { text: `♛ new king ${now}`, tone: 'orange', key: 'cancel' } : { text: '♛ the throne went empty', tone: 'orange', key: 'cancel' });
            if (!king) {
                crown('');
                feed.cancel = [{ text: '♛ the cancel is coming: throne empty, take the crown', tone: 'orange', href: 'https://cancel.tylerirl.com' }];
                return set('cancel', '♛ throne empty · take the crown', 'orange');
            }
            const who = king.handle ? (String(king.handle).startsWith('~') ? king.handle : '~' + king.handle) : king.name || 'anon';
            crown(who);
            if (lastKing !== null && lastKing !== who) news({ key: 'cancel', text: `♛ ${who} took the crown`, tone: 'orange', hash: 'hall', mood: 'excited', status: 'NEW KING' });
            lastKing = who;
            set('cancel', `♛ ${who} · ${king.score ?? 0} drip`, 'orange');
            feed.cancel = [{ text: `♛ ${who} holds the cancel crown · ${king.score ?? 0} drip`, tone: 'orange', href: 'https://cancel.tylerirl.com' }];
        } catch (_) {}
    });

    // the cancel is coming: new runs since the last look
    let lastGames = null;
    every(60000, async () => {
        try {
            const p = await getJSON(`${API}/api/pulse`, { cache: 'no-store' });
            const t = p.today || {};
            const total = (p.lifetime || {}).games;
            if (lastGames !== null && total > lastGames) {
                const n = total - lastGames;
                news({ key: 'cancel', text: `${n} new run${n === 1 ? '' : 's'}${t.wins ? ` · ${t.wins} saved the timeline today` : ''}`, tone: 'orange', hash: 'runs' });
            }
            if (typeof total === 'number') lastGames = total;
        } catch (_) {}
    });
    // the network is growing (on the cancel's page): what's new in its feed
    let netNewest = null;
    const netWho = (h) => h ? (String(h).startsWith('~') ? h : '~' + h) : 'anon';
    const netLine = (r) => {
        const d = r.detail || {};
        if (r.kind === 'run') return `touched grass${d.ch ? ` (challenge ${String(d.ch).replace(/_/g, ' ')})` : ''}`;
        if (r.kind === 'epoch') return `grew the new internet to epoch ${num(d.e)}`;
        if (r.kind === 'online') return 'turned the new internet on';
        if (r.kind === 'challenge') return `beat a challenge${d.ch ? `: ${String(d.ch).replace(/_/g, ' ')}` : ''}`;
        return String(r.kind || 'posted').replace(/_/g, ' ');
    };
    every(2 * 60000, async () => {
        try {
            const { rows = [] } = await getJSON(`${API}/api/net/recent?limit=10`, { cache: 'no-store' });
            const fresh = netNewest === null ? [] : rows.filter((r) => r.at > netNewest);
            if (fresh.length) {
                const top = fresh[0];
                news({ key: 'cancel', text: `the network · ${netWho(top.handle)} ${netLine(top)}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, tone: 'purple', hash: 'network' });
            }
            if (rows[0]) netNewest = Math.max(netNewest || 0, rows[0].at);
            else if (netNewest === null) netNewest = 0;
        } catch (_) {}
    });

    // NFT Gallery and Missile Program: what's in them, read from the pages (kept for an hour)
    async function counted(key, url, read) {
        const KEY = `tirl_count_${key}`;
        try {
            const c = JSON.parse(localStorage.getItem(KEY));
            if (c && Date.now() - c.at < 3600000) return set(key, c.text, c.tone);
        } catch (_) {}
        try {
            const r = await fetch(url);
            if (!r.ok) return;
            const out = read(await r.text());
            if (!out) return;
            set(key, out.text, out.tone);
            try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), ...out })); } catch (_) {}
        } catch (_) {}
    }
    counted('gallery', '/pages/gallery.html', (html) => {
        const cards = [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('#gallery-data .pfp-card')];
        if (!cards.length) return null;
        const artists = new Set(cards.map((c) => c.dataset.artist).filter(Boolean)).size;
        return { text: `${cards.length} pieces${artists ? ` · ${artists} artists` : ''}`, tone: 'blue' };
    });
    counted('rocketry', '/js/rocketry.js', (src) => {
        const v = Array.from(src.matchAll(/designation: '([^']+)'[\s\S]*?status: '([^']+)'/g), ([, name, status]) => [name, status.toLowerCase()]);
        if (!v.length) return null;
        const building = v.find(([, st]) => st !== 'build complete');
        return { text: `${v.length} vehicle${v.length === 1 ? '' : 's'}${building ? ` · ${building[0]} ${building[1]}` : ''}`, tone: building ? 'orange' : 'green' };
    });

    // Neochibi Markets: the milady floor (OpenSea, the same key js/markets.js uses)
    every(10 * 60000, async () => {
        try {
            const d = await getJSON('https://api.opensea.io/api/v2/collections/milady/stats', { headers: { 'X-API-KEY': '5a79fc7192de4ababec6b822f0ca4635', Accept: 'application/json' } });
            const floor = d.total && d.total.floor_price;
            const day = (d.intervals || []).find((i) => i.interval === 'one_day');
            if (!floor) return;
            set('markets', `milady floor ${Number(floor).toFixed(2)} Ξ${day && day.volume ? ` · 24h vol ${Number(day.volume).toFixed(1)} Ξ` : ''}`, 'green');
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
        // DeepDish: the newest push across what's on the rack
        const RACK = ['radgotchi', 'digiflip', 'middle-management', 'sextant', 'chibi', 'iron'];
        const rack = RACK.filter((n) => repos[n]).sort((a, b) => new Date(repos[b].pushed) - new Date(repos[a].pushed));
        if (rack.length) {
            const n = rack[0];
            set('deepdish', `pushed ${n} ${ago(new Date(repos[n].pushed))}`, 'green');
        }
        Object.entries(REPOS).forEach(([key, name]) => {
            const r = repos[name.toLowerCase()];
            if (!r) return;
            set(key, `pushed ${ago(new Date(r.pushed))}${r.stars ? ` · ★${r.stars}` : ''}`, 'green');
            window.tirlVisit?.seen('pushed:' + key, r.pushed, (was, now) => now > was ? { text: `pushed to ${name}`, tone: 'green', key } : null);
        });
        // For the status-bar ticker (js/ticker.js)
        (window.tirlFeed = window.tirlFeed || {}).repos = Object.values(REPOS).filter(name => repos[name.toLowerCase()]).map(name => ({
            text: () => `pushed to ${name} ${ago(new Date(repos[name.toLowerCase()].pushed))}`, tone: 'green', href: `https://github.com/itsTylerIRL/${name}`
        }));
    })();
})();
