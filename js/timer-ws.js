/* Workspace panels for timer.html, alongside js/timer.js (which it never modifies):
   a WCA-style scramble on the timer stage, the solve trend chart and the session report.
   Reads the timer's own save (localStorage "cubeTimerData") and redraws whenever the solve list changes. */
(function() {
    const STORAGE_KEY = 'cubeTimerData';
    const els = {
        scramble: document.getElementById('g-scramble'),
        newScramble: document.getElementById('g-new-scramble'),
        trend: document.getElementById('g-trend'),
        trendMeta: document.getElementById('g-trend-meta'),
        report: document.getElementById('g-report'),
        solveList: document.getElementById('solve-list'),
        sessionSelect: document.getElementById('session-select'),
        count: document.getElementById('stat-count')
    };
    if (!els.trend || !els.solveList) return;

    // ---------- Data (same rules as js/timer.js) ----------
    function solves() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            const s = data && data.sessions && data.sessions[data.current];
            return s ? s.solves : [];
        } catch (_) { return []; }
    }
    const effective = (s) => s.penalty === 'dnf' ? Infinity : (s.penalty === 'plus2' ? s.time + 2000 : s.time);
    function fmt(ms) {
        if (ms === Infinity) return 'DNF';
        if (ms == null || isNaN(ms)) return '—';
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = String(cs % 100).padStart(2, '0');
        return m ? `${m}:${String(s).padStart(2, '0')}.${c}` : `${s}.${c}`;
    }
    // WCA average: drop the best and worst ~5% (at least one each), DNF counts as worst
    function average(times) {
        const n = times.length;
        if (n < 3) return null;
        const trim = Math.max(1, Math.ceil(n * 0.05));
        const sorted = times.slice().sort((a, b) => a - b);
        const kept = sorted.slice(trim, n - trim);
        if (kept.some((t) => t === Infinity)) return Infinity;
        return kept.reduce((a, b) => a + b, 0) / kept.length;
    }

    // ---------- Scramble (3x3, 20 moves, no repeated face or redundant same-axis moves) ----------
    const FACES = ['U', 'D', 'R', 'L', 'F', 'B'];
    const AXIS = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
    const MODS = ['', '\'', '2'];
    function scramble() {
        const moves = [];
        while (moves.length < 20) {
            const f = FACES[Math.floor(Math.random() * 6)];
            const prev = moves[moves.length - 1];
            const prev2 = moves[moves.length - 2];
            if (prev && prev[0] === f) continue;
            if (prev && prev2 && AXIS[prev[0]] === AXIS[f] && AXIS[prev2[0]] === AXIS[f]) continue;
            moves.push(f + MODS[Math.floor(Math.random() * 3)]);
        }
        return moves.join(' ');
    }
    function newScramble() { if (els.scramble) els.scramble.textContent = scramble(); }
    if (els.newScramble) els.newScramble.addEventListener('click', (e) => { e.stopPropagation(); newScramble(); els.newScramble.blur(); });

    // ---------- Trend chart ----------
    const SVG = 'http://www.w3.org/2000/svg';
    function drawTrend(list) {
        const W = Math.max(200, Math.round(els.trend.clientWidth));
        const H = Math.max(90, Math.round(els.trend.clientHeight));
        const recent = list.slice(-60);
        const offset = list.length - recent.length;
        const times = recent.map(effective);
        const finite = times.filter((t) => t !== Infinity);
        els.trendMeta.textContent = list.length ? `LAST ${recent.length} OF ${list.length}` : 'NO SOLVES';
        if (!finite.length) {
            els.trend.innerHTML = `<div class="g-trend-empty">[ NO SOLVE DATA ] &middot; hold space to record your first solve</div>`;
            return;
        }
        const pad = { l: 44, r: 12, t: 12, b: 20 };
        let lo = Math.min(...finite), hi = Math.max(...finite);
        if (hi - lo < 1000) { hi += 500; lo = Math.max(0, lo - 500); }
        const span = hi - lo;
        const x = (i) => pad.l + (recent.length === 1 ? (W - pad.l - pad.r) / 2 : i * (W - pad.l - pad.r) / (recent.length - 1));
        const y = (t) => pad.t + (1 - (t - lo) / span) * (H - pad.t - pad.b);
        let svg = '';
        // grid + labels
        for (let k = 0; k <= 3; k++) {
            const t = lo + (span * k) / 3;
            svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 3}">${fmt(t)}</text>`;
        }
        // best line
        const best = Math.min(...finite);
        svg += `<line class="best" x1="${pad.l}" x2="${W - pad.r}" y1="${y(best)}" y2="${y(best)}"/><text class="best-label" x="${W - pad.r}" y="${y(best) - 4}">PB ${fmt(best)}</text>`;
        // rolling ao5
        let ao = '';
        for (let i = 4; i < times.length; i++) {
            const a = average(times.slice(i - 4, i + 1));
            if (a == null || a === Infinity) continue;
            ao += `${ao ? 'L' : 'M'}${x(i).toFixed(1)},${y(a).toFixed(1)}`;
        }
        if (ao) svg += `<path class="ao5" d="${ao}"/>`;
        // solves
        let line = '';
        times.forEach((t, i) => { if (t !== Infinity) line += `${line ? 'L' : 'M'}${x(i).toFixed(1)},${y(t).toFixed(1)}`; });
        svg += `<path class="solves" d="${line}"/>`;
        times.forEach((t, i) => {
            const n = offset + i + 1;
            if (t === Infinity) svg += `<text class="dnf" x="${x(i)}" y="${pad.t + 8}">&times;<title>#${n} DNF</title></text>`;
            else svg += `<circle class="pt${t === best ? ' pb' : ''}" cx="${x(i)}" cy="${y(t)}" r="${t === best ? 3.5 : 2.4}"><title>#${n} ${fmt(t)}</title></circle>`;
        });
        els.trend.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Solve times trend">${svg}</svg>`;
    }

    // ---------- Session report ----------
    function drawReport(list) {
        const times = list.map(effective);
        const finite = times.filter((t) => t !== Infinity);
        const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null;
        const sd = finite.length > 1 ? Math.sqrt(finite.reduce((a, t) => a + (t - mean) ** 2, 0) / (finite.length - 1)) : null;
        const today = new Date().toDateString();
        const rows = [
            ['worst', finite.length ? fmt(Math.max(...finite)) : '—'],
            ['std dev', sd == null ? '—' : fmt(sd)],
            ['ao50', times.length >= 50 ? fmt(average(times.slice(-50))) : '—'],
            ['ao100', times.length >= 100 ? fmt(average(times.slice(-100))) : '—'],
            ['DNF rate', times.length ? Math.round((times.length - finite.length) / times.length * 100) + '%' : '—'],
            ['today', String(list.filter((s) => s.date && new Date(s.date).toDateString() === today).length)],
            ['solve time', finite.length ? fmt(finite.reduce((a, b) => a + b, 0)) : '—']
        ];
        els.report.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    }

    // ---------- Redraw when the timer changes anything ----------
    let lastCount = -1;
    let queued = false;
    function refresh() {
        queued = false;
        const list = solves();
        drawTrend(list);
        drawReport(list);
        if (list.length !== lastCount) {
            if (lastCount !== -1) newScramble(); // fresh scramble after each solve (or session switch)
            lastCount = list.length;
        }
    }
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(refresh); } };
    new MutationObserver(schedule).observe(els.solveList, { childList: true, subtree: true, characterData: true, attributes: true });
    if (els.sessionSelect) els.sessionSelect.addEventListener('change', () => setTimeout(schedule, 0));
    window.addEventListener('storage', schedule);
    window.addEventListener('resize', schedule);

    newScramble();
    if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule);
    schedule();
})();
