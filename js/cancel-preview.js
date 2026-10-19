/* Cancel's public hall-of-fame calendar, without booting the game in an iframe.
   Matches the game's Monday-first daily champions + weekly kings; the API's today
   determines the month (the game rolls over in America/New_York, not browser time). */
(function () {
    'use strict';
    const API = 'https://cancel-api.tylerirl.com';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const date = s => new Date(s + 'T12:00:00Z');
    const iso = d => d.toISOString().slice(0, 10);
    const addDays = (s, n) => iso(new Date(date(s).getTime() + n * 86400000));
    const monday = s => addDays(s, -((date(s).getUTCDay() + 6) % 7));
    const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(date(s).getTime()) && iso(date(s)) === s;
    const who = e => e.handle ? (String(e.handle).startsWith('~') ? e.handle : '~' + e.handle) : e.name || 'anon';
    let cached = null;

    // Shared run cards already contain the equipped character. Crop their portrait
    // instead of loading the game's compositor, trait index and hundreds of relics.
    const cardURL = e => {
        try {
            const url = new URL(e.image);
            if (url.origin === API && /^\/api\/card\/[a-z0-9]{8}\.png$/.test(url.pathname)) return url.href;
        } catch (_) {}
        return '';
    };
    // Older weekly kings have no share card, only their character's recipe ("look": trait layers). Rebuild it
    // from the game's own art the way the server's card.py does, minus relics and eye tint (too small to matter
    // here). Slots, draw order and the Remilio fit are copied from the game's server/card_spec.json.
    const ART = 'https://cancel.tylerirl.com/assets/img/';
    const SLOTS = {
        Milady: { Skin: 'skin', Face: 'face', Eyes: 'eyes', Mouth: 'mouth', Neck: 'necktat', Necklaces: 'neck', Shirt: 'shirt', Hair: 'hair', Brows: 'brows', Earrings: 'ear', 'Face Decoration': 'deco', Glasses: 'glasses', Hat: 'hat' },
        Remilio: { Race: 'skin', Brows: 'brows', Eyes: 'eyes', Hair: 'hair', Face: 'face', Shirt: 'shirt', Mouth: 'mouth', Costume: 'costume', Earrings: 'ear', Glasses: 'glasses', Hat: 'hat', Weapon: 'weapon', Friend: 'friend' }
    };
    const ORDER = {
        Milady: ['skin', 'face', 'eyes', 'mouth', 'necktat', 'neck', 'shirt', 'hair', 'costume', 'brows', 'smoke', 'ear', 'deco', 'glasses', 'hat', 'weapon', 'friend'],
        Remilio: ['skin', 'brows', 'eyes', 'hair', 'face', 'deco', 'shirt', 'neck', 'mouth', 'smoke', 'costume', 'ear', 'glasses', 'hat', 'weapon', 'friend']
    };
    // On the 600x750 character canvas, as percentages: Remilio art is square with a smaller head, fitted at
    // (-70, -32) 762x762; Remilio friends are 600x600 in the bottom-right corner, side by side
    const pct = (x, y, w, h) => `left:${(x / 6).toFixed(3)}%;top:${(y / 7.5).toFixed(3)}%;width:${(w / 6).toFixed(3)}%;height:${(h / 7.5).toFixed(3)}%`;
    function lookHtml(look) {
        const body = look && SLOTS[look.cfg] ? look.cfg : null;
        if (!body || !look.layers) return '';
        const slots = {};
        Object.entries(look.layers).forEach(([name, file]) => {
            const slot = SLOTS[body][name];
            if (slot && typeof file === 'string' && !file.includes('/')) slots[slot] = [name, file];
        });
        if (slots.costume) (body === 'Remilio' ? ['shirt', 'hat', 'glasses', 'hair', 'face'] : ['shirt']).forEach(k => delete slots[k]);
        const layers = ORDER[body].filter(slot => slots[slot]).map(slot => {
            const [name, file] = slots[slot];
            const box = slot === 'friend' ? pct(0, 150, 600, 600) : body === 'Remilio' ? pct(-70, -32, 762, 762) : pct(0, 0, 600, 750);
            return `<img src="${ART}${encodeURIComponent(body)}/${encodeURIComponent(name)}/${encodeURIComponent(file)}" alt="" style="${box}" loading="lazy" decoding="async">`;
        }).join('');
        return layers ? `<span class="g-cancel-look" aria-hidden="true">${layers}</span>` : '';
    }
    function portrait(e) {
        const fallback = `<span class="g-cancel-initial" aria-hidden="true">${esc(who(e).replace(/^~/, '').slice(0, 2).toUpperCase())}</span>`;
        const card = cardURL(e);
        return card ? `${fallback}<img src="${esc(card)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : fallback + lookHtml(e.look);
    }
    // "3d 4h" / "5h 12m" / "40m" between now and a unix time (either direction)
    const span = unix => {
        const m = Math.max(0, Math.round(Math.abs(unix - Date.now() / 1000) / 60));
        return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor(m % 1440 / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
    };

    // This week's king of the hill: their run's share card as a player card, how long they've held
    // the crown, and a link to play their map (/r/<id> opens the game on that run's seed).
    function throne(kg) {
        if (!kg) return ''; // /api/king didn't answer: say nothing rather than "empty"
        const k = kg.king;
        if (!k) {
            return `<div class="g-cancel-throne is-vacant"><span class="g-cancel-crown" aria-hidden="true">♛</span>
                <div><strong>The throne is empty.</strong><p>Top this week’s board to take the crown.</p></div></div>`;
        }
        const card = cardURL(k);
        const run = /^[a-z0-9]{8}$/.test(k.id || '') ? `${API}/r/${k.id}` : '';
        const week = validDate(kg.week) ? date(kg.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
        const stats = [
            Number.isFinite(k.since) && `<span>held <b>${span(k.since)}</b></span>`,
            Number.isFinite(k.defences) && `<span><b>${k.defences}</b> defence${k.defences === 1 ? '' : 's'}</span>`,
            Number.isFinite(kg.resets) && `<span>crown resets in <b>${span(kg.resets)}</b></span>`
        ].filter(Boolean).join('');
        return `<figure class="g-cancel-throne">
            <figcaption class="g-cancel-throne-head"><span class="g-cancel-crown" aria-hidden="true">♛</span>King of the hill${week ? ` <span>week of ${esc(week)}</span>` : ''}</figcaption>
            ${card ? `<a class="g-cancel-card" href="${esc(run || card)}" target="_blank" rel="noopener">
                <img src="${esc(card)}" alt="${esc(who(k))}’s run: ${esc(k.score ?? 0)} drip as ${esc(k.tribe || 'unknown')}" width="1200" height="630" decoding="async" referrerpolicy="no-referrer"></a>` : ''}
            <div class="g-cancel-throne-foot">
                <div class="g-cancel-throne-who"><strong>${esc(who(k))}</strong><span>${esc(k.score ?? 0)} drip${Number.isFinite(k.kills) ? ` · ${k.kills} kills` : ''}</span></div>
                <div class="g-cancel-throne-stats">${stats}</div>
                ${run ? `<a class="g-btn g-cancel-challenge" href="${esc(run)}" target="_blank" rel="noopener">CHALLENGE THE KING &nearr;</a>` : ''}
            </div>
        </figure>`;
    }

    function render(screen, meta, gameURL) {
        let active = true, controller = null, timeout = null, loading = false;
        const play = `<a class="g-btn g-visit g-cancel-play" href="${esc(gameURL)}" target="_blank" rel="noopener">PLAY THE CANCEL &nearr;</a>`;
        screen.innerHTML = `<div class="g-cancel-preview">
            <div class="g-cancel-intro"><img src="/assets/featured/cancel.webp" alt="" width="56" height="56">
                <div><h2>Survive the cancel.</h2><p>9 days. 3 bosses. One timeline. Can you make the board?</p></div></div>
            <div class="g-cancel-king"></div>
            <div class="g-cancel-hall" aria-busy="true"><p class="g-cancel-message" role="status">Connecting to this month’s hall of fame…</p></div>
            <div class="g-cancel-invite"><p>One daily map. A new chance to take the crown.</p>${play}</div>
        </div>`;
        const hall = screen.querySelector('.g-cancel-hall');
        const king = screen.querySelector('.g-cancel-king');

        function draw(h, kg) {
            king.innerHTML = throne(kg);
            king.querySelectorAll('.g-cancel-card img').forEach(img => img.addEventListener('error', () => img.parentElement.remove(), { once: true }));
            const month = h.today.slice(0, 7), first = month + '-01';
            const [year, m] = month.split('-').map(Number);
            const end = iso(new Date(Date.UTC(year, m, 0, 12)));
            const label = date(first).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
            const days = new Map(h.days.filter(e => validDate(e.date)).map(e => [e.date, e]));
            const kings = new Map((Array.isArray(h.kings) ? h.kings : []).filter(e => validDate(e.week)).map(e => [e.week, e]));
            if (kg?.king && kg.week === monday(h.today)) kings.set(kg.week, { ...kg.king, live: true });
            const entries = new Map();
            const cell = (id, e, day, king = false) => {
                const future = !king && id > h.today;
                const name = king ? `King of the hill, week of ${id.slice(1)}` : id;
                const hint = name + (e ? ` · ${who(e)} · ${e.score ?? 0}${king ? ' · king of the hill' : e.win ? ' · timeline saved' : ' · cancelled'}` : future ? ' · upcoming' : ' · no champion yet');
                entries.set(id, { e, king });
                return `<button type="button" class="g-cancel-cell${king ? ' is-king' : ''}${e ? (king || e.win ? ' is-won' : ' is-fell') : ' is-empty'}${(!king && id === h.today) || e?.live ? ' is-today' : ''}" data-hall-id="${id}" aria-label="${esc(hint)}" title="${esc(hint)}" aria-pressed="false" ${future ? 'disabled' : ''}>
                    ${e ? portrait(e) : ''}${e && !king && !e.win ? '<s aria-hidden="true">×</s>' : ''}<em aria-hidden="true">${king ? '♛' : day}</em></button>`;
            };
            let cells = '';
            // Like the game home page, only weeks that have started are shown.
            for (let week = monday(first); week <= end && week <= h.today; week = addDays(week, 7)) {
                for (let i = 0; i < 7; i++) {
                    const d = addDays(week, i);
                    cells += d.slice(0, 7) === month ? cell(d, days.get(d), +d.slice(8)) : '<span class="g-cancel-cell is-out" aria-hidden="true"></span>';
                }
                cells += cell('k' + week, kings.get(week), null, true);
            }
            hall.innerHTML = `<div class="g-cancel-month"><h3>Hall of fame <span>${esc(label)}</span></h3><span class="g-cancel-live">LIVE</span></div>
                <div class="g-cancel-calendar" role="group" aria-label="${esc(label)} daily champions and weekly kings">
                    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'King'].map(d => `<span class="g-cancel-weekday">${d}</span>`).join('')}${cells}</div>
                <div class="g-cancel-legend"><span>Daily champions</span><span>♛ Weekly kings</span><span>× Cancelled</span></div>
                <p class="g-cancel-detail" role="status" aria-live="polite"></p>`;
            hall.setAttribute('aria-busy', 'false');
            hall.querySelectorAll('img').forEach(img => img.addEventListener('error', () => img.remove(), { once: true }));
            function select(id) {
                const item = entries.get(id);
                if (!item) return;
                hall.querySelectorAll('[data-hall-id]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hallId === id)));
                const { e, king } = item;
                const when = king ? 'Week of ' + id.slice(1) : id === h.today ? 'Today' : date(id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                hall.querySelector('.g-cancel-detail').innerHTML = e
                    ? `<span>${esc(when)}</span> <strong>${esc(who(e))}</strong> · ${esc(e.score ?? 0)}${king ? ' · ♛ king of the hill' : e.win ? ' · timeline saved' : ' · cancelled'}`
                    : `<span>${esc(when)}</span> ${king ? 'The crown is waiting.' : id === h.today ? 'No champion yet. Set the score to beat.' : 'No champion recorded.'}`;
            }
            hall.querySelectorAll('[data-hall-id]').forEach(b => b.addEventListener('click', () => select(b.dataset.hallId)));
            select(h.today);
            meta.textContent = 'LIVE · ' + label.toUpperCase();
        }

        async function load() {
            if (!active || loading) return;
            loading = true;
            meta.textContent = 'CONNECTING…';
            try {
                if (!cached || Date.now() - cached.at >= 60000) {
                    controller = new AbortController();
                    timeout = setTimeout(() => controller.abort(), 8000);
                    const get = async path => {
                        const response = await fetch(API + path, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
                        if (!response.ok) throw new Error('Leaderboard unavailable');
                        return response.json();
                    };
                    const [h, kg] = await Promise.all([get('/api/hall'), get('/api/king').catch(() => null)]);
                    if (!validDate(h?.today) || !Array.isArray(h.days)) throw new Error('Invalid leaderboard');
                    if (!active) return;
                    cached = { h, kg, at: Date.now() };
                }
                if (active) draw(cached.h, cached.kg);
            } catch (_) {
                if (!active) return;
                hall.setAttribute('aria-busy', 'false');
                hall.innerHTML = '<p class="g-cancel-message" role="status">The leaderboard is taking a break. The game is still open.</p><button type="button" class="g-btn g-cancel-retry">RETRY LEADERBOARD</button>';
                hall.querySelector('button').addEventListener('click', load);
                meta.textContent = 'LEADERBOARD UNAVAILABLE';
            } finally {
                clearTimeout(timeout);
                loading = false;
            }
        }
        load();
        const refresh = setInterval(() => { if (!document.hidden) load(); }, 60000);
        return () => { active = false; controller?.abort(); clearTimeout(timeout); clearInterval(refresh); };
    }
    window.CancelPreview = { render };
})();
