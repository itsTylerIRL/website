/* An urbit ship's page (pages/raddem.html, pages/nosfyl.html; which ship is .gotham's data-ship). Everything about
   the ship that isn't live is in SHIPS below; the live part is ship-status on cancel-api.tylerirl.com, which asks
   each ship's web server for /~/host every minute and keeps 30 days of it by the hour (/ships?history=1:
   hours = [[hour start ms, checks up, checks, avg response ms], ...]). Polled every minute. */
(function () {
    'use strict';
    const API = 'https://cancel-api.tylerirl.com/ships?history=1';
    const HOUR = 3600000;
    const SHIPS = {
        '~raddem-tidwyt': {
            key: 'raddem', cls: 'planet', url: 'https://urbit.tylerirl.com', icon: '/assets/object-icons/raddem.webp',
            hosting: 'self-hosted', where: 'a DigitalOcean box, behind nginx',
            about: [
                'A <b>planet</b> is an urbit ID for one person: a name, a network address and a personal server, all in one. There are about four billion of them.',
                '<b>~raddem-tidwyt</b> is tyler’s home ship. It runs on the same box as this site’s live services, and it does real work for them: the guest book lives on it, and the games’ Urbit ID sign-in goes through it.',
                'Its web interface is at <b>urbit.tylerirl.com</b>. Looking around needs a login; the guest book doesn’t.'
            ],
            services: [
                { icon: '/assets/featured/guest-book.webp', name: 'Guest Book', desc: '%guestbook · a comment board anyone can sign, stored on this ship', href: '/#guest-book' },
                { icon: '/assets/object-icons/cancel.webp', name: 'Urbit ID sign-in', desc: 'how the cancel and the network log you in with your own ship: the handshake comes through here', href: '/#cancel' },
                { glyph: '~', name: 'Web interface', desc: 'urbit.tylerirl.com · the ship’s own apps, for whoever holds its login', href: 'https://urbit.tylerirl.com' }
            ]
        },
        '~nosfyl': {
            key: 'nosfyl', cls: 'star', url: 'https://nosfyl.tylerirl.com', icon: '/assets/object-icons/nosfyl.webp',
            hosting: 'StarTram', where: 'Native Planet’s hosted relay',
            about: [
                'A <b>star</b> sits a level above planets. There are only about 65 thousand of them; each one can spawn around 65 thousand planets and helps route their traffic around the network.',
                '<b>~nosfyl</b> is tyler’s star, the galaxy’s middle child. It reaches the internet through <b>StarTram</b>, so it answers at nosfyl.tylerirl.com without a server of its own to look after.',
                'It’s also where tyler’s Urbit apps are published: any ship can <b>|install</b> them straight from ~nosfyl, and updates arrive the same way.',
                'Its web interface is at <b>nosfyl.tylerirl.com</b>, behind a login.'
            ],
            services: [
                { glyph: '✦', name: 'Star', desc: 'one of ~65k: can spawn planets and helps route the network', href: 'https://network.urbit.org/' },
                { glyph: '⇄', name: 'StarTram relay', desc: 'reached at nosfyl.tylerirl.com through Native Planet’s hosted relay', href: 'https://nosfyl.tylerirl.com' }
            ],
            // Apps distributed from this ship (the Apps card): desk, what it is, its repo
            apps: [
                { desk: 'sextant', name: 'Sextant', icon: '/assets/urbit-apps/sextant.webp', repo: 'https://github.com/itsTylerIRL/sextant',
                    desc: 'A live map of the Urbit network: every galaxy, star and planet drawn under the ship that sponsors it right now, with pals, connection checks and the apps each ship publishes.' },
                { desk: 'chibi', name: 'Chibi', icon: '/assets/urbit-apps/chibi.webp', repo: 'https://github.com/itsTylerIRL/chibi',
                    desc: 'Live on-chain activity for Remilia collections (Milady, Remilio, Radbro, Schizo, YAYO): sales with real prices, Blend loans, transfers, and which Urbit IDs are trading.' },
                { desk: 'iron', name: 'Iron', icon: '/assets/urbit-apps/iron.webp', repo: 'https://github.com/itsTylerIRL/iron',
                    desc: 'A dumbbell workout tracker: one pair of adjustable dumbbells, a 5-day split that cycles, move guides, progress charts, streaks and bodyweight.' }
            ]
        }
    };
    const root = document.getElementById('gotham');
    const NAME = root && root.dataset.ship;
    const ship = SHIPS[NAME];
    if (!ship) return;
    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = (n) => String(n).padStart(2, '0');
    const span = (ms) => {
        const m = Math.max(0, Math.floor(ms / 60000));
        return m < 1 ? 'under a minute' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d ${Math.floor(m % 1440 / 60)}h`;
    };
    const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${Math.max(1, s)}s ago` : `${span(Date.now() - t)} ago`; };
    const hhmm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const when = (t) => {
        const d = new Date(t);
        return d.toDateString() === new Date().toDateString() ? hhmm(t) : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()} ${hhmm(t)}`;
    };
    const share = (u, n) => n ? u / n : null;
    const pct = (r) => r == null ? '—' : r === 1 ? '100%' : `${(r * 100).toFixed(r > 0.99 ? 2 : 1)}%`;
    const ms = (v) => v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;

    // ---------- Static: properties, about, services, open link ----------
    const props = [
        ['ship', NAME], ['class', ship.cls], ['host', new URL(ship.url).host], ['via', ship.hosting], ['where', ship.where], ['checked', 'every minute']
    ];
    $('s-props').innerHTML = props.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('') + '<dt>status</dt><dd id="s-prop-status">checking</dd>';
    $('s-about-title').textContent = `What's a ${ship.cls}?`;
    $('s-about').innerHTML = ship.about.map((p) => `<p>${p}</p>`).join('');
    $('s-services').innerHTML = ship.services.map((s) => {
        const ext = /^https?:/.test(s.href);
        return `<li><a class="g-service" href="${esc(s.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>
            <span class="g-service-icon">${s.icon ? `<img src="${esc(s.icon)}" alt="">` : esc(s.glyph || '•')}</span>
            <span class="g-service-text"><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></span>
            <span class="g-service-go">${ext ? '&nearr;' : '&rarr;'}</span></a></li>`;
    }).join('');

    // ---------- Apps published from this ship: install line (copyable) and repo ----------
    const appsEl = $('s-apps');
    if (appsEl && ship.apps) {
        $('s-apps-meta').textContent = `${ship.apps.length} desks · |install from ${NAME}`;
        appsEl.innerHTML = ship.apps.map((a) => {
            const cmd = `|install ${NAME} %${a.desk}`;
            return `<li class="g-app">
                <img class="g-app-icon" src="${esc(a.icon)}" alt="" width="48" height="48">
                <div class="g-app-text">
                    <b>%${esc(a.desk)} <span>${esc(a.name)}</span></b>
                    <p>${esc(a.desc)}</p>
                    <div class="g-app-actions">
                        <code class="g-app-cmd">${esc(cmd)}</code>
                        <button type="button" class="g-btn g-app-copy" data-cmd="${esc(cmd)}" aria-label="Copy ${esc(cmd)}">COPY</button>
                        <a class="g-btn g-app-repo" href="${esc(a.repo)}" target="_blank" rel="noopener">GITHUB &nearr;</a>
                    </div>
                </div></li>`;
        }).join('');
        appsEl.addEventListener('click', async (e) => {
            const b = e.target.closest('.g-app-copy');
            if (!b) return;
            let ok = false;
            try { await navigator.clipboard.writeText(b.dataset.cmd); ok = true; } catch (_) {
                // No clipboard access (an old browser, a blocked frame): select the command so it can be copied by hand
                const code = b.parentElement.querySelector('.g-app-cmd');
                const range = document.createRange();
                range.selectNodeContents(code);
                const sel = getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            b.textContent = ok ? 'COPIED' : 'SELECTED';
            b.classList.toggle('is-done', ok);
            setTimeout(() => { b.textContent = 'COPY'; b.classList.remove('is-done'); }, 1600);
        });
    }

    // ---------- Log: what changed, newest first ----------
    const log = [];
    function note(t, text, tone) {
        if (log.some((l) => l.t === t && l.text === text)) return;
        log.push({ t, text, tone });
        log.sort((a, b) => b.t - a.t);
        log.length = Math.min(log.length, 40);
        $('s-log').innerHTML = log.map((l) => `<li><i class="g-dot tone-${l.tone}"></i><div><time>${when(l.t)}</time><span>${l.text}</span></div></li>`).join('');
        $('s-log-meta').textContent = `${log.length} entr${log.length === 1 ? 'y' : 'ies'}`;
    }

    // ---------- Live ----------
    let was = null;
    function draw(data) {
        const s = data.ships && data.ships[NAME];
        if (!s) return;
        const at = data.at || Date.now();
        const hero = $('s-hero');
        const state = s.online === true ? 'up' : s.online === false ? 'down' : 'unknown';
        hero.className = `g-ship-hero is-${state}`;
        $('s-word').textContent = { up: 'ONLINE', down: 'OFFLINE', unknown: 'NO SIGNAL' }[state];
        $('s-line').innerHTML = state === 'up'
            ? (s.since ? `up <b>${span(at - s.since)}</b> · answered in <b>${ms(s.ms)}</b>` : `answered in <b>${ms(s.ms)}</b>`)
            : state === 'down' ? (s.lastOnline ? `last seen <b>${ago(s.lastOnline)}</b>` : 'not answering') : 'ship-status hasn’t heard from it yet';
        $('s-line2').textContent = `checked ${ago(at)}${s.since ? ` · ${state === 'up' ? 'online' : 'offline'} since ${when(s.since)}` : ''}`;
        const ps = $('s-prop-status');
        if (ps) { ps.textContent = state === 'up' ? 'online' : state === 'down' ? 'offline' : 'unknown'; ps.style.color = state === 'up' ? 'var(--g-green)' : state === 'down' ? 'var(--g-red)' : ''; }

        // Status bar + the home page
        $('g-feed-dot').className = `g-dot tone-${state === 'up' ? 'green' : state === 'down' ? 'red' : 'muted'}`;
        $('g-feed').textContent = state === 'up' ? `ONLINE${s.since ? ' · UP ' + span(at - s.since).toUpperCase() : ''}` : state === 'down' ? 'OFFLINE' : 'NO SIGNAL';
        if (window.TirlEmbed) window.TirlEmbed.status(`${NAME} · ${$('g-feed').textContent}`);
        if (was !== null && was !== state) {
            if (window.TirlEmbed) window.TirlEmbed.event({ kind: 'SHIP', html: `${esc(NAME)} went ${state === 'up' ? 'online' : 'offline'}`, tone: state === 'up' ? 'green' : 'red', mood: state === 'up' ? 'happy' : 'sad', status: `${NAME} ${state === 'up' ? 'BACK' : 'DOWN'}` });
            note(at, `went <b>${state === 'up' ? 'online' : 'offline'}</b>`, state === 'up' ? 'green' : 'red');
        }
        was = state;
        if (s.since) note(s.since, `came ${state === 'up' ? 'online' : 'offline'}`, state === 'up' ? 'green' : 'red');
        if (state === 'up') note(at, `answered /~/host in ${ms(s.ms)}`, 'muted');

        // ---------- History ----------
        const hours = Array.isArray(s.hours) ? s.hours : [];
        const byHour = new Map(hours.map((r) => [r[0], r]));
        const nowHour = at - at % HOUR;
        const cell = (r, label) => {
            if (!r) return `<span class="g-cell" title="${esc(label)} · no checks"></span>`;
            const [, u, n, avg] = r;
            const cls = u === n ? 'is-up' : u === 0 ? 'is-down' : 'is-part';
            return `<span class="g-cell ${cls}" title="${esc(label)} · ${u}/${n} checks answered${avg != null ? ` · ${ms(avg)} avg` : ''}"></span>`;
        };
        // 24 hours
        let u24 = 0, n24 = 0, t24 = 0, c24 = 0;
        $('s-cells24').innerHTML = Array.from({ length: 24 }, (_, i) => {
            const h = nowHour - (23 - i) * HOUR;
            const r = byHour.get(h);
            if (r) { u24 += r[1]; n24 += r[2]; if (r[3] != null) { t24 += r[3] * r[1]; c24 += r[1]; } }
            return cell(r, `${hhmm(h)}–${hhmm(h + HOUR)}`).replace('class="g-cell', `class="g-cell${h === nowHour ? ' is-now' : ''}`);
        }).join('');
        // 30 days, by local date
        const days = new Map();
        hours.forEach((r) => {
            const k = new Date(r[0]).toDateString();
            const d = days.get(k) || [0, 0, 0, null];
            d[1] += r[1]; d[2] += r[2];
            days.set(k, d);
        });
        let u30 = 0, n30 = 0;
        $('s-cells30').innerHTML = Array.from({ length: 30 }, (_, i) => {
            const d = new Date(at - (29 - i) * 86400000);
            const r = days.get(d.toDateString());
            if (r) { u30 += r[1]; n30 += r[2]; }
            return cell(r, d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase());
        }).join('');
        $('s-up24').textContent = pct(share(u24, n24));
        $('s-up30').textContent = pct(share(u30, n30));
        const set = (k, v) => { const el = document.querySelector(`#s-stats [data-k="${k}"]`); if (el) el.textContent = v; };
        set('up24', pct(share(u24, n24)));
        set('up30', pct(share(u30, n30)));
        set('ms', state === 'up' ? ms(s.ms) : '—');
        set('avg', c24 ? ms(t24 / c24) : '—');
        const first = hours[0] && hours[0][0];
        const checks = hours.reduce((a, r) => a + r[2], 0);
        $('s-up-meta').textContent = `${checks.toLocaleString('en-US')} checks kept`;
        $('s-up-note').innerHTML = first && at - first < 29 * 86400000
            ? `History started <b>${when(first)}</b>; empty cells fill in as it builds up. Hover a cell for its checks.`
            : 'Hover a cell for its checks. Green answered every check, orange missed some, red missed all of them.';
        // Missed checks go in the log
        hours.forEach((r) => { if (r[1] < r[2]) note(r[0], `missed <b>${r[2] - r[1]}</b> of ${r[2]} checks this hour`, r[1] === 0 ? 'red' : 'orange'); });

        // ---------- Response time: the last 48 hours that answered ----------
        const pts = hours.filter((r) => r[3] != null && r[0] > nowHour - 47 * HOUR);
        const wrap = $('s-spark');
        if (pts.length < 2) {
            wrap.innerHTML = `<p class="g-note" style="padding:0">One point an hour; the line draws once there are two.${pts.length ? ` So far: <b>${ms(pts[0][3])}</b> at ${hhmm(pts[0][0])}.` : ''}</p>`;
        } else {
            const W = 600, H = 90, lo = Math.min(...pts.map((p) => p[3])), hi = Math.max(...pts.map((p) => p[3]));
            const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
            const xy = pts.map((p) => [((p[0] - x0) / (x1 - x0 || 1)) * W, H - 6 - ((p[3] - lo) / (hi - lo || 1)) * (H - 14)]);
            const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
            wrap.innerHTML = `<svg class="g-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Response time, ${ms(lo)} to ${ms(hi)}">
                    <path class="area" d="${d}L${W},${H}L0,${H}Z"/><path class="line" d="${d}"/></svg>
                <div class="g-spark-axis"><span>${when(x0)}</span><span>${ms(lo)} – ${ms(hi)}</span><span>${when(x1)}</span></div>`;
        }

        // ---------- Fleet ----------
        $('s-fleet').innerHTML = Object.entries(SHIPS).map(([name, x]) => {
            const o = data.ships[name] || {};
            const tone = o.online ? 'green' : o.online === false ? 'red' : 'muted';
            const line = o.online ? `${x.cls} · online${o.since ? ` · up ${span(at - o.since)}` : ''}` : o.online === false ? `${x.cls} · offline` : x.cls;
            return `<li><a class="g-res${name === NAME ? ' is-active' : ''}" href="/#${x.key}"${name === NAME ? ' aria-current="page"' : ''}>
                <img class="g-res-icon" src="${esc(x.icon)}" alt="">
                <span class="g-res-text"><span class="g-res-title">${esc(name)}${name === NAME ? ' <small style="color:var(--g-dim)">· this page</small>' : ''}</span><span class="g-res-desc">${esc(line)}</span></span>
                <i class="g-dot tone-${tone}"></i></a></li>`;
        }).join('');
    }

    async function poll() {
        try {
            const r = await fetch(API, { credentials: 'omit', cache: 'no-store' });
            if (!r.ok) throw new Error(r.status);
            draw(await r.json());
        } catch (_) {
            $('g-feed-dot').className = 'g-dot tone-red';
            $('g-feed').textContent = 'SHIP-STATUS UNREACHABLE';
            if (was === null) {
                $('s-word').textContent = 'NO SIGNAL';
                $('s-line').textContent = 'the status service isn’t answering; the ship may be fine';
            }
        }
    }
    poll();
    setInterval(() => { if (!document.hidden) poll(); }, 60000);
})();
