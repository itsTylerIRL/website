/* The KoL calendar, shared by kol.html (js/kol.js) and the KoL preview on the home page (js/kol-preview.js):
   calendar day, moons, stat days and holidays, all computed locally. */

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
