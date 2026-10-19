/* Page script for kol.html: TylerIRL in the Kingdom of Loathing, in the DEEPDISH workspace.
   Everything is read live in the browser where the source allows it:
   - the KoL calendar, moons, stat days and holidays: computed here, ported from KoLmafia's HolidayDatabase
   - the player feed: KoL's own signature images (sigs.kingdomofloathing.com, proxied by images.weserv.nl
     because that host is http-only, which https pages can't load)
   - mall prices: pricegun.loathers.net
   - KoLmafia's latest release, recent commits and items.txt: the GitHub API and raw.githubusercontent.com
   - the display case: museum.loathers.net, which doesn't allow cross-origin reads yet, so MUSEUM below is a
     snapshot that the live fetch replaces if it ever succeeds. */

const PLAYER = { id: 571951, name: 'TylerIRL' };
const IMG = 'https://images.kingdomofloathing.com/itemimages/';
const WIKI = 'https://wiki.kingdomofloathing.com/';
const PRICEGUN = 'https://pricegun.loathers.net/api/';
const MAFIA_REPO = 'kolmafia/kolmafia';
const ITEMS_TXT = `https://raw.githubusercontent.com/${MAFIA_REPO}/main/src/main/resources/data/items.txt`;

// Display case snapshot from museum.loathers.net: [item id, quantity, rank, name, image]
const MUSEUM = {
    at: '2026-10-18',
    items: [
        [7767, 2, 3, "airplane charter: Conspiracy Island", "aircharter.gif"],
        [8831, 1, 4, "basking robin", "baskinrobin.gif"],
        [9303, 1, 4, "hopeful candle", "hopefulcandle.gif"],
        [8794, 1, 6, "The Big Book of Communism (used)", "book4.gif"],
        [10481, 2, 7, "Better Shrooms and Gardens catalog", "mushcatalog.gif"],
        [8064, 1, 8, "golden monkey statuette", "goldmonkeystat.gif"],
        [8989, 1, 10, "Witchess Set", "chessset.gif"],
        [8705, 1, 11, "X-32-F snowman crate", "crate.gif"],
        [9103, 1, 11, "Dear Past Self Package", "pastselfpackage.gif"],
        [3536, 1, 14, "plans for depleted Grimacite gravy boat", "blueprint.gif"],
        [9296, 1, 14, "space planula", "planula.gif"],
        [8674, 1, 15, "airplane charter: The Glaciest", "aircharter.gif"],
        [9478, 1, 15, "New-You Club Membership Form", "newyouform.gif"],
        [8706, 1, 16, "machine elf capsule", "machelfcapsule.gif"],
        [8203, 1, 17, "airplane charter: Dinseylandfill", "aircharter.gif"],
        [8787, 2, 17, "faded red protest sign", "protsign2.gif"],
        [10431, 1, 17, "Retrospecs try-at-home kit", "retrospecsbox.gif"],
        [9016, 1, 18, "disconnected intergnat", "discognat.gif"],
        [8836, 1, 19, "LT&T telegraph office deed", "document.gif"],
        [9033, 1, 19, "Source terminal", "sourceterminal.gif"],
        [10433, 1, 19, "unopened Bird-a-Day calendar", "birdcal_unopened.gif"],
        [10437, 1, 19, "mint-in-box Powerful Glove", "pglove_inbox.gif"],
        [9203, 1, 20, "Build-a-City Gingerbread kit", "gingercity.gif"],
        [9492, 1, 20, "suspicious package", "kgbpackage.gif"],
        [8791, 1, 26, "reindeer sickle", "commiesickle.gif"],
        [10502, 1, 29, "sinistral homunculus", "lhmlarva.gif"],
        [8776, 1, 30, "red armband", "blackcheck.gif"],
        [8782, 1, 30, "reindeer hammer", "commiehammer.gif"],
        [3192, 2, 34, "naughty origami kit", "origamikit.gif"],
        [3219, 2, 35, "sane hatrack", "sanehatrack.gif"],
        [9988, 1, 35, "latte lovers club card", "lattecard.gif"],
        [7466, 1, 36, "airplane charter: Spring Break Beach", "aircharter.gif"],
        [10187, 1, 39, "PirateRealm membership packet", "pr_packet.gif"],
        [10931, 1, 40, "unopened tiny stillsuit", "stillsuit_box.gif"],
        [8778, 1, 43, "nuclear stockpile", "crate.gif"],
        [12066, 1, 44, "discreetly-wrapped Eternity Codpiece", "eternitycodbox.gif"],
        [12325, 1, 59, "black rosebud", "rosebud.gif"],
        [11001, 1, 63, "deed to Oliver's Place", "oliver_deed.gif"],
        [4965, 1, 66, "Sorcerers of the Shore Grimoire", "book3.gif"],
        [12047, 1, 69, "shrunken head in a duffel bag", "headbag.gif"],
        [12215, 1, 71, "wrapped Baseball Diamond", "bdiamond_box.gif"],
        [12276, 1, 79, "Interesting Coin Inheritance Letter", "interestenvelope.gif"],
        [12180, 1, 80, "boxed Heartstone", "heartstonebox.gif"],
        [12245, 1, 80, "scabbarded Sword of S Words", "swordswordbox.gif"],
        [12222, 1, 84, "pasta wand loot box", "legpastabox.gif"],
        [12133, 1, 88, "seal-clubbing club loot box", "leg_club_box.gif"],
        [9032, 1, 93, "bowl of Tastee-Wheet&trade;", "soupbowl.gif"],
        [10918, 1, 108, "Thwaitgold harvestman statuette", "thwaitharvestman.gif"],
        [12182, 1, 113, "Thwaitgold meat bee statuette", "thwaitmeatbee.gif"],
        [3263, 1, 137, "Sp'n-Zor's Grimoire of &quot;Tasteful&quot; Gifts", "book4.gif"],
        [11973, 3, 151, "Thwaitgold lobster statuette", "thwaitlobster.gif"],
        [1409, 1, 202, "Unionize The Elves sign", "elfsign.gif"],
        [10570, 1, 336, "Thwaitgold keyhole spider statuette", "thwaitkeyspider.gif"],
        [9031, 1, 350, "Thwaitgold moth statuette", "thwaitmoth.gif"],
        [11255, 1, 374, "Thwaitgold splendor beetle statuette", "thwaitsplendor.gif"],
        [8556, 1, 1343, "Thwaitgold termite statuette", "thwaittermite.gif"],
        [1265, 14, 4025, "box of sunshine", "chromebox.gif"]
    ]
};

// Mall ticker: long-running market staples
const TICKER = [194, 10881, 9537, 8382, 3665, 4136];

// ---------- KoL calendar (KoLmafia: persistence/HolidayDatabase.java, KoLmafia.KOL_TIME_ZONE) ----------
// KoL days start at midnight GMT-03:30 (03:30 UTC). A year is 12 months of 8 days; the moons run a
// 16-day cycle, Ronald stepping every day and Grimace every other day.
const KOL = (function() {
    const DAY = 86400000;
    const OFFSET = -3.5 * 3600000;
    const midnight = (y, m, d) => Date.UTC(y, m, d) - OFFSET; // midnight KoL time, as a UTC timestamp
    const NEWYEAR = midnight(2005, 8, 17);
    const BOUNDARY = midnight(2005, 9, 27); // one day was skipped here
    const COLLISION = midnight(2006, 5, 3); // the Hamburglar's first appearance
    const MONTHS = ['Jarlsuary', 'Frankruary', 'Starch', 'April', 'Martinus', 'Bill', 'Bor', 'Petember', 'Carlvember', 'Porktober', 'Boozember', 'Dougtember'];
    const HOLIDAYS = {
        '1-1': 'Festival of Jarlsberg', '2-4': "Valentine's Day", '3-3': "St. Sneaky Pete's Day", '4-2': 'Oyster Egg Day',
        '5-2': 'El Dia De Los Muertos Borrachos', '6-3': 'Generic Summer Holiday', '7-4': 'Dependence Day', '8-4': 'Arrrbor Day',
        '9-6': 'Labór Day', '10-8': 'Halloween', '11-7': 'Feast of Boris', '12-4': 'Yuletide'
    };
    const PHASES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'third quarter', 'waning crescent'];
    const HAMBURGLAR = ['in front of Grimace, L side', 'in front of Grimace, R side', 'far right', 'behind Grimace', 'in back, near Grimace',
        'in back, near Ronald', 'behind Ronald', 'far left', 'in front of Ronald, L side', 'in front of Ronald, R side', 'front center'];
    const STAT_EFFECT = ['Moxie bonus today and yesterday.', '3 days until Mysticism.', '2 days until Mysticism.', 'Mysticism bonus tomorrow (not today).',
        'Mysticism bonus today (not tomorrow).', '3 days until Muscle.', '2 days until Muscle.', 'Muscle bonus tomorrow (not today).',
        'Muscle bonus today and tomorrow.', 'Muscle bonus today and yesterday.', '2 days until Mysticism.', 'Mysticism bonus tomorrow (not today).',
        'Mysticism bonus today (not tomorrow).', '2 days until Moxie.', 'Moxie bonus tomorrow (not today).', 'Moxie bonus today and tomorrow.'];

    function dayDifference(t) {
        let days = Math.floor((t - NEWYEAR) / DAY);
        if (t > BOUNDARY) days -= 1;
        return days;
    }
    const dayInYear = (t) => ((dayDifference(t) % 96) + 96) % 96;
    const calendar = (day) => ({ month: Math.floor(day / 8) % 12 + 1, date: day % 8 + 1 });

    // Real-world dates KoL also celebrates (getRealLifeHoliday / getRealLifeOnlyHoliday), on KoL-time dates
    function easter(y) {
        const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
        const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1];
    }
    function thanksgiving(y) {
        const first = new Date(Date.UTC(y, 10, 1)).getUTCDay();
        return [11, 1 + ((4 - first + 7) % 7) + 21];
    }
    function realHoliday(t) {
        const d = new Date(t + OFFSET);
        const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
        const is = ([mm, dd]) => m === mm && day === dd;
        if (is([1, 1])) return 'Festival of Jarlsberg';
        if (is([2, 14])) return "Valentine's Day";
        if (is([3, 17])) return "St. Sneaky Pete's Day";
        if (is([7, 4])) return 'Dependence Day';
        if (is(easter(y))) return 'Oyster Egg Day';
        if (is(thanksgiving(y))) return 'Feast of Boris';
        if (is([10, 31])) return 'Halloween';
        if (is([12, 15])) return `KoLmafia's ${ordinal(y - 2004)} Birthday`;
        if (is([2, 2])) return 'Groundhog Day';
        if (is([4, 1])) return "April Fool's Day";
        if (is([9, 19])) return 'Talk Like a Pirate Day';
        if (is([12, 25])) return 'Crimbo';
        if (is([10, 22])) return "Holatuwol's Birthday";
        return null;
    }
    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function today(t = Date.now()) {
        const day = dayInYear(t);
        const { month, date } = calendar(day);
        const step = day % 16;
        const ronald = step % 8, grimace = Math.floor(step / 2);
        const light = (p) => (p > 4 ? 8 - p : p);
        const burglar = t < COLLISION ? -1 : ((Math.floor((t - COLLISION) / DAY) * 2 % 11) + 11) % 11;
        const stat = [0, 15].includes(step) ? 'Moxie' : [4, 12].includes(step) ? 'Mysticality' : [8, 9].includes(step) ? 'Muscle' : null;
        const kolNow = t + OFFSET;
        return {
            day, month, date,
            monthName: MONTHS[month - 1],
            ronald: { phase: ronald, name: PHASES[ronald], light: light(ronald) },
            grimace: { phase: grimace, name: PHASES[grimace], light: light(grimace) },
            hamburglar: HAMBURGLAR[burglar] || 'not yet in orbit',
            stat, statEffect: STAT_EFFECT[step],
            holiday: HOLIDAYS[`${month}-${date}`] || realHoliday(t),
            nextRollover: (Math.floor(kolNow / DAY) + 1) * DAY - OFFSET,
            dayNumber: dayDifference(t)
        };
    }
    // Upcoming holidays over the next KoL year: game calendar days plus real-world dates, soonest first
    function upcoming(t = Date.now(), count = 6) {
        const seen = new Map();
        const add = (name, days) => { if (!seen.has(name) || seen.get(name) > days) seen.set(name, days); };
        const start = dayInYear(t);
        for (let i = 1; i < 96; i++) {
            const { month, date } = calendar((start + i) % 96);
            const h = HOLIDAYS[`${month}-${date}`];
            if (h) add(h, i);
            const r = realHoliday(t + i * DAY);
            if (r) add(r, i);
        }
        return [...seen].sort((a, b) => a[1] - b[1]).slice(0, count);
    }
    return { today, upcoming, DAY };
})();

// ---------- Page ----------
(function() {
    const $ = (id) => document.getElementById(id);
    if (!$('kol-today')) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // KoL data files carry HTML entities in names (&trade;, &quot;): decode once, escape on output
    const decoder = document.createElement('textarea');
    const plain = (s) => { decoder.innerHTML = s; return decoder.value; };
    const meat = (n) => !Number.isFinite(n) ? '—' : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n));
    const pad = (n) => String(n).padStart(2, '0');
    const ago = (iso) => {
        const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
        return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const wiki = (name) => WIKI + encodeURIComponent(plain(name).replace(/ /g, '_'));
    // Item images sit on a paper chip: KoL's art is black ink drawn for a white page
    const chip = (img, cls = '') => `<span class="kol-chip ${cls}"><img src="${IMG}${esc(img)}" alt="" width="30" height="30" loading="lazy" decoding="async"></span>`;
    async function getJSON(url) {
        const r = await fetch(url, { credentials: 'omit' });
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.json();
    }
    const feed = { ok: 0, failed: [] };
    function status(name, ok) {
        if (ok) feed.ok++; else feed.failed.push(name);
        $('kol-feed').textContent = feed.failed.length ? `LIVE ${feed.ok} · OFFLINE: ${feed.failed.join(', ').toUpperCase()}` : `LIVE · ${feed.ok} FEEDS`;
        $('kol-feed-dot').className = 'g-dot ' + (feed.failed.length ? 'tone-orange' : 'tone-green');
    }

    // ---------- Today in the Kingdom ----------
    function renderToday() {
        const t = KOL.today();
        const moon = (who, m, file) => `<figure class="kol-moon">
                <img src="${IMG}${file}${m.phase + 1}.gif" alt="${esc(who)}: ${esc(m.name)}" class="kol-ink">
                <figcaption><b>${who}</b><span>${esc(m.name)}</span><small>moonlight ${m.light}/4</small></figcaption></figure>`;
        $('kol-today').innerHTML = `
            <div class="kol-date"><b>${esc(t.monthName)} ${t.date}</b><span>${t.holiday ? esc(t.holiday) : 'no holiday today'}</span></div>
            <div class="kol-moons">${moon('Ronald', t.ronald, 'moon')}${moon('Grimace', t.grimace, 'smoon')}</div>
            <dl class="g-props kol-props">
                <dt>stat day</dt><dd class="${t.stat ? 'kol-stat-' + t.stat.toLowerCase() : ''}">${t.stat || 'none'}</dd>
                <dt>moons say</dt><dd>${esc(t.statEffect)}</dd>
                <dt>hamburglar</dt><dd>${esc(t.hamburglar)}</dd>
            </dl>`;
        $('kol-today-meta').textContent = `DAY ${t.day + 1}/96`;
        $('kol-holidays').innerHTML = KOL.upcoming().map(([name, days]) => `<li><i class="g-dot tone-${days <= 7 ? 'orange' : 'muted'}"></i><div>
                <time>${days === 1 ? 'tomorrow' : `in ${days} days`}</time><b>${esc(plain(name))}</b></div></li>`).join('');
        return t;
    }
    let today = renderToday();
    function tick() {
        const left = today.nextRollover - Date.now();
        if (left <= 0) { today = renderToday(); refreshSigs(); return; }
        const s = Math.floor(left / 1000);
        $('kol-rollover').textContent = `ROLLOVER ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
        $('kol-date-status').textContent = `${today.monthName.toUpperCase()} ${today.date}`;
    }
    tick();
    setInterval(tick, 1000);

    // ---------- Player feed: KoL's own signature images ----------
    // weserv caches by URL: an hourly key keeps the stats current without refetching on every visit
    function refreshSigs() {
        const key = Math.floor(Date.now() / 3600000);
        document.querySelectorAll('img[data-sig]').forEach((img) => {
            img.src = `https://images.weserv.nl/?url=sigs.kingdomofloathing.com/player_${PLAYER.id}/${img.dataset.sig}/playerfeed_${PLAYER.id}.gif&_=${key}`;
        });
    }
    document.querySelectorAll('img[data-sig]').forEach((img) => {
        img.addEventListener('load', () => img.closest('.kol-sig')?.classList.add('ready'));
        img.addEventListener('error', () => img.closest('.kol-sig')?.classList.add('offline'));
    });
    refreshSigs();

    // ---------- Item names: KoLmafia's items.txt (id, name, descid, image, use, access, autosell, plural) ----------
    let items = null;
    const loadItems = fetch(ITEMS_TXT, { credentials: 'omit' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
        .then((txt) => {
            items = new Map();
            for (const line of txt.split('\n')) {
                if (!line || line[0] === '#') continue;
                const p = line.split('\t');
                if (p.length > 4 && /^\d+$/.test(p[0])) items.set(+p[0], { id: +p[0], name: p[1], image: p[3], use: p[4], access: p[5] || '', autosell: +p[6] || 0 });
            }
            status('items.txt', true);
            return items;
        })
        .catch(() => { status('items.txt', false); return null; });

    // ---------- Mall prices: pricegun (only items with recent sales come back) ----------
    const prices = new Map();
    async function loadPrices(ids) {
        const want = ids.filter((id) => !prices.has(id));
        if (!want.length) return prices;
        const rows = await getJSON(PRICEGUN + want.join(','));
        (Array.isArray(rows) ? rows : [rows]).forEach((r) => {
            const value = Number(r.value?.__decimal__ ?? r.value);
            // 2^32-1 is the "no real price" ceiling
            prices.set(r.itemId, { value: value >= 4294967295 ? NaN : value, volume: r.volume, sales: r.sales || [], name: r.name, image: r.image });
        });
        return prices;
    }

    // ---------- Display case ----------
    let caseRows = MUSEUM.items.map(([id, qty, rank, name, image]) => ({ id, qty, rank, name, image }));
    let caseSort = 'rank';
    function renderCase() {
        const rows = [...caseRows].sort(caseSort === 'rank'
            ? (a, b) => a.rank - b.rank || a.id - b.id
            : (a, b) => (prices.get(b.id)?.value || 0) * b.qty - (prices.get(a.id)?.value || 0) * a.qty);
        $('kol-case').innerHTML = rows.map((r) => {
            const p = prices.get(r.id);
            const tier = r.rank <= 10 ? 'is-top' : r.rank <= 50 ? 'is-high' : '';
            return `<li><a class="kol-item ${tier}" href="${wiki(r.name)}" target="_blank" rel="noopener" title="${esc(plain(r.name))}: #${r.rank} display case on the server">
                ${chip(r.image)}
                <span class="kol-item-text"><b>${esc(plain(r.name))}</b><small>${r.qty > 1 ? `&times;${r.qty} · ` : ''}${p && Number.isFinite(p.value) ? meat(p.value) + ' meat' : 'no mall price'}</small></span>
                <span class="kol-rank">#${r.rank}</span></a></li>`;
        }).join('');
        const top10 = caseRows.filter((r) => r.rank <= 10).length;
        const total = caseRows.reduce((sum, r) => sum + ((prices.get(r.id)?.value) || 0) * r.qty, 0);
        $('kol-case-meta').textContent = `${caseRows.length} ITEMS · ${top10} TOP-10` + (total ? ` · ≈${meat(total)} MEAT` : '');
    }
    document.querySelectorAll('[data-case-sort]').forEach((b) => b.addEventListener('click', () => {
        caseSort = b.dataset.caseSort;
        document.querySelectorAll('[data-case-sort]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        renderCase();
    }));
    renderCase();
    (async () => {
        // Live museum if it ever allows cross-origin reads; the snapshot otherwise
        try {
            const m = await getJSON(`https://museum.loathers.net/api/player/${PLAYER.id}`);
            const names = await loadItems;
            if (names && Array.isArray(m.collections)) {
                caseRows = m.collections.map((c) => {
                    const it = names.get(c.itemid) || {};
                    return { id: c.itemid, qty: c.quantity, rank: c.rank, name: it.name || `item ${c.itemid}`, image: it.image || 'nopic.gif' };
                });
                $('kol-case-src').textContent = 'museum.loathers.net · live';
                status('museum', true);
            }
        } catch (_) {
            $('kol-case-src').textContent = `museum.loathers.net · snapshot ${MUSEUM.at}`;
        }
        try {
            await loadPrices(caseRows.map((r) => r.id));
            status('pricegun', true);
        } catch (_) { status('pricegun', false); }
        renderCase();
    })();

    // ---------- Mall ticker ----------
    function spark(sales) {
        const pts = sales.slice(0, 24).reverse().map((s) => Number(s.unitPrice?.__decimal__ ?? s.unitPrice)).filter(Number.isFinite);
        if (pts.length < 2) return '';
        const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
        const d = pts.map((v, i) => `${(i / (pts.length - 1) * 100).toFixed(1)},${(18 - (v - lo) / span * 16).toFixed(1)}`).join(' ');
        const up = pts[pts.length - 1] >= pts[0];
        return `<svg class="kol-spark ${up ? 'up' : 'down'}" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><polyline points="${d}"/></svg>`;
    }
    async function renderTicker() {
        try {
            await loadPrices(TICKER);
            $('kol-ticker').innerHTML = TICKER.filter((id) => prices.has(id)).map((id) => {
                const p = prices.get(id);
                const last = p.sales[0];
                return `<li><a class="kol-tick" href="${wiki(p.name)}" target="_blank" rel="noopener">${chip(p.image)}
                    <span class="kol-item-text"><b>${esc(plain(p.name))}</b><small>${last ? `last sale ${ago(last.date)}` : `${p.volume} sold`}</small></span>
                    ${spark(p.sales)}<span class="kol-price">${meat(p.value)}</span></a></li>`;
            }).join('');
            $('kol-ticker-meta').textContent = 'PRICEGUN · LIVE';
        } catch (_) {
            $('kol-ticker').innerHTML = '<li class="kol-empty">The mall feed is down. Prices come back on the next refresh.</li>';
            $('kol-ticker-meta').textContent = 'OFFLINE';
        }
    }
    renderTicker();
    setInterval(() => { TICKER.forEach((id) => prices.delete(id)); renderTicker(); }, 5 * 60000);

    // ---------- KoLmafia: latest release + recent commits ----------
    async function renderMafia() {
        try {
            const [rel, commits] = await Promise.all([
                getJSON(`https://api.github.com/repos/${MAFIA_REPO}/releases/latest`),
                getJSON(`https://api.github.com/repos/${MAFIA_REPO}/commits?per_page=6`)
            ]);
            const jar = (rel.assets || []).find((a) => /\.jar$/.test(a.name));
            const changes = (rel.body || '').split('\n').map((l) => l.match(/^\*\s+(.+?)(?:\s+by\s+@[\w-]+)?(?:\s+in\s+https:\S+)?\s*$/)).filter(Boolean).map((m) => m[1]).slice(0, 3);
            $('kol-mafia').innerHTML = `
                <div class="kol-release">
                    <div><b>${esc(rel.tag_name)}</b><span>released ${ago(rel.published_at)}</span></div>
                    ${jar ? `<a class="g-btn" href="${esc(jar.browser_download_url)}">.JAR &darr;</a>` : ''}
                    <a class="g-btn" href="${esc(rel.html_url)}" target="_blank" rel="noopener">NOTES &nearr;</a>
                </div>
                ${changes.length ? `<ul class="kol-changes">${changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
                <ol class="g-activity kol-commits">${commits.map((c) => `<li><i class="g-dot tone-blue"></i><div>
                    <time>${ago(c.commit.author.date)} · ${esc(c.author?.login || c.commit.author.name)}</time>
                    <a href="${esc(c.html_url)}" target="_blank" rel="noopener">${esc(c.commit.message.split('\n')[0])}</a></div></li>`).join('')}</ol>`;
            $('kol-mafia-meta').textContent = 'GITHUB · LIVE';
            status('github', true);
        } catch (_) {
            $('kol-mafia').innerHTML = '<p class="kol-empty">GitHub isn’t answering right now (it limits how often a browser can ask). <a href="https://github.com/kolmafia/kolmafia/releases/latest" target="_blank" rel="noopener">Latest release &nearr;</a></p>';
            $('kol-mafia-meta').textContent = 'OFFLINE';
            status('github', false);
        }
    }
    renderMafia();

    // ---------- Item of the day: one of KoLmafia's items, picked by the KoL day ----------
    const ACCESS = { t: 'tradeable', d: 'discardable', q: 'quest', g: 'gift', c: 'cannot be closeted' };
    (async () => {
        const names = await loadItems;
        if (!names) {
            $('kol-iotd').innerHTML = '<p class="kol-empty">KoLmafia’s item list didn’t load.</p>';
            return;
        }
        const list = [...names.values()].filter((i) => i.image && i.image !== 'nopic.gif');
        // A fixed shuffle of the day number, so neighbouring days land far apart in the list
        const pick = list[(today.dayNumber * 2654435761 >>> 0) % list.length];
        $('kol-iotd-meta').textContent = `${names.size.toLocaleString('en-US')} ITEMS`;
        let price = null;
        if (pick.access.includes('t')) {
            try { await loadPrices([pick.id]); price = prices.get(pick.id); } catch (_) {}
        }
        const access = pick.access.split(',').map((a) => ACCESS[a.trim()]).filter(Boolean);
        $('kol-iotd').innerHTML = `<a class="kol-iotd" href="${wiki(pick.name)}" target="_blank" rel="noopener">
                ${chip(pick.image, 'is-big')}
                <span class="kol-item-text"><b>${esc(plain(pick.name))}</b><small>item #${pick.id} · ${esc(pick.use || 'none')}</small></span></a>
            <dl class="g-props kol-props">
                <dt>access</dt><dd>${esc(access.join(', ') || 'untradeable')}</dd>
                <dt>autosell</dt><dd>${pick.autosell ? meat(pick.autosell) + ' meat' : '—'}</dd>
                <dt>mall</dt><dd>${price && Number.isFinite(price.value) ? meat(price.value) + ' meat' : pick.access.includes('t') ? 'no recent sales' : 'not sold'}</dd>
            </dl>`;
    })();
})();
