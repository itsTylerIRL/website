// Speedcube timer — space-bar controlled, session stats saved in localStorage
// Author: Tyler (in real life)

(function () {
    'use strict';

    const STORAGE_KEY = 'cubeTimerData';
    const HOLD_THRESHOLD = 300; // ms to hold space before "ready"
    const INSPECTION_LIMIT = 15000; // WCA inspection
    const INSPECTION_PLUS2 = 15000;
    const INSPECTION_DNF = 17000;

    // ---- State ----
    let data;                 // persisted data
    let state = 'idle';       // idle | inspection | holding | ready | running
    let holdStart = 0;
    let solveStart = 0;
    let inspectionStart = 0;
    let inspectionPenalty = 'ok';
    let rafId = null;
    let readyTimeout = null;
    let awaitingInspectionRelease = false;

    // ---- DOM ----
    let els = {};

    function $(id) { return document.getElementById(id); }

    // ---- Persistence ----
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.sessions) return parsed;
            }
        } catch (e) { /* ignore corrupt data */ }
        const id = 's' + Date.now();
        return {
            sessions: { [id]: { name: 'Session 1', solves: [] } },
            current: id,
            options: { inspection: false, hideUI: false }
        };
    }

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage may be full/unavailable */ }
    }

    function currentSolves() {
        const s = data.sessions[data.current];
        return s ? s.solves : [];
    }

    // ---- Time helpers ----
    function effective(solve) {
        if (solve.penalty === 'dnf') return Infinity;
        return solve.penalty === 'plus2' ? solve.time + 2000 : solve.time;
    }

    function fmt(ms) {
        if (ms === Infinity) return 'DNF';
        if (ms == null) return '—';
        const totalCs = Math.floor(ms / 10);
        const cs = totalCs % 100;
        const totalSec = Math.floor(totalCs / 100);
        const sec = totalSec % 60;
        const min = Math.floor(totalSec / 60);
        const pad = (n, l = 2) => String(n).padStart(l, '0');
        if (min > 0) return `${min}:${pad(sec)}.${pad(cs)}`;
        return `${sec}.${pad(cs)}`;
    }

    function fmtSolve(solve) {
        if (solve.penalty === 'dnf') return 'DNF';
        const base = fmt(solve.time);
        return solve.penalty === 'plus2' ? base + '+' : base;
    }

    // Average of N over the most recent N solves (WCA trimmed mean)
    function averageOf(solves, n, endIndex) {
        const end = endIndex == null ? solves.length : endIndex;
        if (end < n) return null;
        const window = solves.slice(end - n, end);
        const times = window.map(effective);
        const dnfCount = times.filter(t => t === Infinity).length;
        if (dnfCount >= 2) return Infinity;
        const sorted = [...times].sort((a, b) => a - b);
        const trimmed = sorted.slice(1, sorted.length - 1); // drop best & worst
        const sum = trimmed.reduce((a, b) => a + b, 0);
        return sum / trimmed.length;
    }

    function bestAverageOf(solves, n) {
        if (solves.length < n) return null;
        let best = null;
        for (let i = n; i <= solves.length; i++) {
            const avg = averageOf(solves, n, i);
            if (avg != null && avg !== Infinity && (best == null || avg < best)) best = avg;
        }
        return best;
    }

    // ---- Rendering ----
    function render() {
        renderSessions();
        renderSolves();
        renderStats();
    }

    function renderSessions() {
        const sel = els.sessionSelect;
        sel.innerHTML = '';
        Object.keys(data.sessions).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            const s = data.sessions[id];
            opt.textContent = `${s.name} (${s.solves.length})`;
            if (id === data.current) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function renderSolves() {
        const solves = currentSolves();
        const list = els.solveList;
        if (!solves.length) {
            list.innerHTML = '<div class="solve-empty">no solves yet — press space to begin</div>';
            return;
        }
        const bestVal = Math.min(...solves.map(effective).filter(t => t !== Infinity));
        const frag = document.createDocumentFragment();
        // newest first
        for (let i = solves.length - 1; i >= 0; i--) {
            const solve = solves[i];
            const chip = document.createElement('button');
            chip.className = 'solve-chip';
            if (solve.penalty === 'dnf') chip.classList.add('is-dnf');
            else if (effective(solve) === bestVal) chip.classList.add('is-best');
            chip.innerHTML = `<span class="chip-idx">${i + 1}</span>${fmtSolve(solve)}`;
            chip.addEventListener('click', () => openSolveModal(i));
            frag.appendChild(chip);
        }
        list.innerHTML = '';
        list.appendChild(frag);
    }

    function renderStats() {
        const solves = currentSolves();
        const valid = solves.map(effective).filter(t => t !== Infinity);
        els.statCount.textContent = solves.length;
        els.statBest.textContent = valid.length ? fmt(Math.min(...valid)) : '—';
        els.statMean.textContent = valid.length
            ? fmt(valid.reduce((a, b) => a + b, 0) / valid.length) : '—';
        const ao5 = averageOf(solves, 5);
        const ao12 = averageOf(solves, 12);
        els.statAo5.textContent = ao5 == null ? '—' : fmt(ao5);
        els.statAo12.textContent = ao12 == null ? '—' : fmt(ao12);
        const bestAo5 = bestAverageOf(solves, 5);
        els.statBestAo5.textContent = bestAo5 == null ? '—' : fmt(bestAo5);
    }

    // ---- Timer display ----
    function setDisplay(text) { els.display.textContent = text; }

    function setState(s) {
        state = s;
        const stage = els.stage;
        stage.classList.remove('state-idle', 'state-holding', 'state-ready',
            'state-running', 'state-inspection', 'warn', 'danger');
        if (s !== 'idle') stage.classList.add('state-' + s);
        const timingBody = (s === 'running' || s === 'inspection' || s === 'holding' || s === 'ready');
        if (data.options.hideUI) {
            document.body.classList.toggle('timing-active', timingBody);
        }
        if (els.hint) els.hint.style.visibility = (s === 'idle') ? 'visible' : 'hidden';
    }

    function tickRunning() {
        setDisplay(fmt(performance.now() - solveStart));
        rafId = requestAnimationFrame(tickRunning);
    }

    function tickInspection() {
        const elapsed = performance.now() - inspectionStart;
        const remaining = Math.ceil((INSPECTION_LIMIT - elapsed) / 1000);
        els.stage.classList.toggle('warn', elapsed > 8000 && elapsed <= INSPECTION_LIMIT);
        els.stage.classList.toggle('danger', elapsed > INSPECTION_LIMIT);
        if (elapsed >= INSPECTION_DNF) {
            inspectionPenalty = 'dnf';
            setDisplay('DNF');
        } else if (elapsed >= INSPECTION_PLUS2) {
            inspectionPenalty = 'plus2';
            setDisplay('+2');
        } else {
            setDisplay(String(Math.max(0, remaining)));
        }
        if (state === 'inspection' || (state === 'holding' && awaitingInspectionRelease === false && inspectionActive)) {
            rafId = requestAnimationFrame(tickInspection);
        }
    }

    // Track inspection separately so holding during inspection keeps countdown
    let inspectionActive = false;

    function startInspection() {
        inspectionActive = true;
        inspectionPenalty = 'ok';
        inspectionStart = performance.now();
        setState('inspection');
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tickInspection);
    }

    function startSolve() {
        inspectionActive = false;
        cancelAnimationFrame(rafId);
        solveStart = performance.now();
        setState('running');
        rafId = requestAnimationFrame(tickRunning);
    }

    function stopSolve() {
        cancelAnimationFrame(rafId);
        const time = performance.now() - solveStart;
        setState('idle');
        setDisplay(fmt(time));
        addSolve(time, inspectionPenalty);
        inspectionPenalty = 'ok';
    }

    function addSolve(time, penalty) {
        currentSolves().push({ time, penalty: penalty || 'ok', date: Date.now() });
        saveData();
        render();
    }

    // ---- Keyboard control ----
    function onKeyDown(e) {
        if (e.code !== 'Space') return;
        // ignore when typing in inputs/selects
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        e.preventDefault();
        if (e.repeat) return;

        if (state === 'running') {
            stopSolve();
            return;
        }

        // Starting a hold (either from idle or during inspection)
        if (state === 'idle' && data.options.inspection && !inspectionActive) {
            startInspection();
            awaitingInspectionRelease = true;
            return;
        }

        if (state === 'idle' || state === 'inspection') {
            holdStart = performance.now();
            setState('holding');
            if (inspectionActive) {
                // keep countdown running visually
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(tickInspection);
            } else {
                setDisplay('0.00');
            }
            clearTimeout(readyTimeout);
            readyTimeout = setTimeout(() => {
                if (state === 'holding') {
                    setState('ready');
                    if (inspectionActive) {
                        cancelAnimationFrame(rafId);
                        rafId = requestAnimationFrame(tickInspection);
                    } else {
                        setDisplay('0.00');
                    }
                }
            }, HOLD_THRESHOLD);
        }
    }

    function onKeyUp(e) {
        if (e.code !== 'Space') return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        e.preventDefault();

        if (awaitingInspectionRelease) {
            // this keyup just ends the initial inspection-start press
            awaitingInspectionRelease = false;
            return;
        }

        clearTimeout(readyTimeout);

        if (state === 'ready') {
            startSolve();
        } else if (state === 'holding') {
            // released too early — cancel back to previous state
            if (inspectionActive) {
                setState('inspection');
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(tickInspection);
            } else {
                setState('idle');
                setDisplay(fmt(0));
            }
        }
    }

    // ---- Solve edit modal ----
    let editIndex = -1;
    function openSolveModal(index) {
        editIndex = index;
        const solve = currentSolves()[index];
        if (!solve) return;
        els.modalTime.textContent = fmtSolve(solve);
        els.modal.classList.add('show');
    }
    function closeSolveModal() {
        els.modal.classList.remove('show');
        editIndex = -1;
    }
    function applySolveAction(action) {
        const solves = currentSolves();
        if (editIndex < 0 || !solves[editIndex]) return;
        if (action === 'delete') {
            solves.splice(editIndex, 1);
        } else {
            solves[editIndex].penalty = action === 'ok' ? 'ok' : action;
        }
        saveData();
        render();
        closeSolveModal();
    }

    // ---- Session management ----
    function switchSession(id) {
        if (data.sessions[id]) {
            data.current = id;
            saveData();
            render();
        }
    }
    function newSession() {
        const name = prompt('Name for the new session:', 'Session ' + (Object.keys(data.sessions).length + 1));
        if (name == null) return;
        const id = 's' + Date.now();
        data.sessions[id] = { name: name.trim() || 'Session', solves: [] };
        data.current = id;
        saveData();
        render();
    }
    function renameSession() {
        const s = data.sessions[data.current];
        if (!s) return;
        const name = prompt('Rename session:', s.name);
        if (name == null) return;
        s.name = name.trim() || s.name;
        saveData();
        render();
    }
    function clearSession() {
        const s = data.sessions[data.current];
        if (!s || !s.solves.length) return;
        if (confirm('Clear all times in this session?')) {
            s.solves = [];
            saveData();
            render();
        }
    }
    function deleteSession() {
        const ids = Object.keys(data.sessions);
        if (ids.length <= 1) { alert('Cannot delete the only session.'); return; }
        if (!confirm('Delete this session and its times?')) return;
        delete data.sessions[data.current];
        data.current = Object.keys(data.sessions)[0];
        saveData();
        render();
    }

    // ---- Init / teardown ----
    function init() {
        const stage = $('timer-stage');
        if (!stage) return; // not on timer page

        data = loadData();

        els = {
            stage,
            display: $('timer-display'),
            hint: $('timer-hint'),
            sessionSelect: $('session-select'),
            solveList: $('solve-list'),
            statCount: $('stat-count'),
            statBest: $('stat-best'),
            statMean: $('stat-mean'),
            statAo5: $('stat-ao5'),
            statAo12: $('stat-ao12'),
            statBestAo5: $('stat-best-ao5'),
            modal: $('solve-modal'),
            modalTime: $('solve-modal-time'),
            inspectionToggle: $('inspection-toggle'),
            hideUIToggle: $('hide-ui-toggle')
        };

        // reflect options
        els.inspectionToggle.checked = !!data.options.inspection;
        els.hideUIToggle.checked = !!data.options.hideUI;

        // Remove any stale listeners from a previous SPA navigation
        teardown();

        window.__cubeTimerHandlers = {
            keydown: onKeyDown,
            keyup: onKeyUp
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        els.sessionSelect.addEventListener('change', e => switchSession(e.target.value));
        $('new-session-btn').addEventListener('click', newSession);
        $('rename-session-btn').addEventListener('click', renameSession);
        $('clear-session-btn').addEventListener('click', clearSession);
        $('delete-session-btn').addEventListener('click', deleteSession);

        els.inspectionToggle.addEventListener('change', e => {
            data.options.inspection = e.target.checked;
            saveData();
        });
        els.hideUIToggle.addEventListener('change', e => {
            data.options.hideUI = e.target.checked;
            saveData();
            if (!e.target.checked) document.body.classList.remove('timing-active');
        });

        els.modal.querySelectorAll('.solve-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => applySolveAction(btn.dataset.action));
        });
        $('solve-modal-close').addEventListener('click', closeSolveModal);
        els.modal.addEventListener('click', e => {
            if (e.target === els.modal) closeSolveModal();
        });

        // Tapping the stage also stops a running solve (touch/mouse support)
        stage.addEventListener('pointerdown', () => {
            if (state === 'running') stopSolve();
        });

        setState('idle');
        setDisplay('0.00');
        render();
    }

    function teardown() {
        const h = window.__cubeTimerHandlers;
        if (h) {
            document.removeEventListener('keydown', h.keydown);
            document.removeEventListener('keyup', h.keyup);
            window.__cubeTimerHandlers = null;
        }
        cancelAnimationFrame(rafId);
        clearTimeout(readyTimeout);
        inspectionActive = false;
        state = 'idle';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for SPA router re-init
    window.initCubeTimer = init;
})();
