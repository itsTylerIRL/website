// DigiFlip — the Flipper Zero virtual pet, compiled to WebAssembly
// Author: Tyler (in real life)
//
// The C app draws into a 128x64 1-bit framebuffer; this file renders it as an
// LCD (pixel grid, response ghosting, glow, themes), plays the game's screen
// effects (Module.onFx: shake, flash, sparkle), feeds it key presses, plays its
// beeps and keeps its saves in IndexedDB.

(function () {
    'use strict';

    const WASM_DIR = '/js/digiflip/';
    const WASM_VERSION = '2.0';
    const SOUND_KEY = 'digimonSound';
    const THEME_KEY = 'digimonTheme';
    const W = 128;
    const H = 64;
    // When the lights are off the game fills the play field with ink; those
    // rows render as a dim room with the art lit instead of a slab of glow.
    const FIELD_TOP = 12;
    const FIELD_BOTTOM = 52;

    // Screen themes. Emissive ones glow (bloom); LCD ones are dark ink on a
    // backlight. off = an unlit cell, on = a lit one, room = the dark room.
    const THEMES = [
        { id: 'cyan', label: 'cyan', bg: [4, 8, 11], off: [12, 24, 30], on: [139, 233, 253], room: [7, 26, 33], glow: '139, 233, 253', bloom: 0.75, grid: 0.55 },
        { id: 'flipper', label: 'flipper', bg: [255, 133, 10], off: [246, 124, 6], on: [28, 14, 2], room: [120, 56, 2], glow: null, bloom: 0, grid: 0.2 },
        { id: 'lcd', label: 'lcd', bg: [158, 176, 120], off: [148, 166, 112], on: [26, 38, 22], room: [62, 80, 52], glow: null, bloom: 0, grid: 0.22 },
        { id: 'amber', label: 'amber', bg: [10, 6, 2], off: [28, 17, 6], on: [255, 180, 40], room: [34, 20, 4], glow: '255, 180, 40', bloom: 0.8, grid: 0.55 },
        { id: 'ghost', label: 'phosphor', bg: [5, 7, 6], off: [16, 22, 18], on: [214, 255, 226], room: [14, 28, 20], glow: '190, 255, 210', bloom: 0.7, grid: 0.55 },
    ];
    // LCD response: cells light quickly and fade slowly (the ghost trail a
    // real pet screen leaves). Rates are per 60 Hz frame.
    const RISE = 0.62;
    const FALL = 0.30;
    // Module.onFx kinds (DigiflipFx in src/services/digiflip_sound.h).
    const FX_HIT = 0, FX_CRIT = 1, FX_FLASH = 2, FX_SPARKLE = 3, FX_ALERT = 4;
    const FX_NAMES = ['hit', 'crit', 'flash', 'sparkle', 'alert'];

    // Flipper keys: 0 up, 1 down, 2 right, 3 left, 4 ok, 5 back
    const KEYMAP = {
        ArrowUp: 0, KeyW: 0,
        ArrowDown: 1, KeyS: 1,
        ArrowRight: 2, KeyD: 2,
        ArrowLeft: 3, KeyA: 3,
        Enter: 4, NumpadEnter: 4, Space: 4, KeyZ: 4,
        Escape: 5, Backspace: 5, KeyX: 5,
    };

    // State lives on window so a second init (SPA navigation) reuses the
    // running game instead of starting another one.
    const state = window.__digimon || (window.__digimon = {
        module: null,
        loading: false,
        frame: null,
        led: false,
        audio: null,
        sound: true,
        held: new Set(),
        syncing: false,
        syncAgain: false,
        syncTimer: null,
        listening: false,
        theme: 0,
        // LCD state: target and shown brightness per cell, and effects.
        target: new Float32Array(W * H),
        shown: new Float32Array(W * H),
        room: false,
        raf: 0,
        last: 0,
        shake: 0,
        shakeMax: 0,
        flash: 0,
        particles: [],
        ring: 0,
    });
    // Older saved state (a second init after an update) may lack the LCD fields.
    if (!state.target) { state.target = new Float32Array(W * H); state.shown = new Float32Array(W * H); state.particles = []; }

    function $(id) { return document.getElementById(id); }

    function loadSoundPref() {
        try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; }
    }

    function saveSoundPref() {
        try { localStorage.setItem(SOUND_KEY, state.sound ? 'on' : 'off'); } catch (e) { /* ignore */ }
    }

    function setStatus(text, isError) {
        const el = $('digimon-status');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('hidden', !text);
        el.classList.toggle('error', !!isError);
    }

    // ---- Screen ----
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const view = {
        canvas: null, ctx: null, scale: 0,
        lo: null, loCtx: null, loImg: null, // 128x64 colours
        glow: null, glowCtx: null, glowImg: null, // 128x64, lit cells only
        grid: null, glass: null, filter: false,
    };

    function theme() { return THEMES[state.theme] || THEMES[0]; }

    function loadThemePref() {
        try {
            const id = localStorage.getItem(THEME_KEY);
            const i = THEMES.findIndex(function (t) { return t.id === id; });
            return i < 0 ? 0 : i;
        } catch (e) { return 0; }
    }

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    // Size the backing store to whole device pixels per cell, then rebuild
    // the grid and glass overlays for that size.
    function layout() {
        const canvas = $('digimon-screen');
        if (!canvas) return false;
        const css = canvas.clientWidth || 256;
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.max(2, Math.min(14, Math.round((css * dpr) / W)));
        if (view.canvas === canvas && view.scale === scale) return true;
        view.canvas = canvas;
        view.ctx = canvas.getContext('2d');
        view.scale = scale;
        canvas.width = W * scale;
        canvas.height = H * scale;
        if (!view.lo) {
            view.lo = makeCanvas(W, H);
            view.loCtx = view.lo.getContext('2d');
            view.loImg = view.loCtx.createImageData(W, H);
            view.glow = makeCanvas(W, H);
            view.glowCtx = view.glow.getContext('2d');
            view.glowImg = view.glowCtx.createImageData(W, H);
            const probe = makeCanvas(1, 1).getContext('2d');
            probe.filter = 'blur(1px)';
            view.filter = probe.filter === 'blur(1px)';
        }
        buildOverlays();
        return true;
    }

    function buildOverlays() {
        const t = theme();
        const s = view.scale;
        const w = W * s, h = H * s;
        // The gaps between cells: a 1px lattice (2px on big screens).
        view.grid = makeCanvas(w, h);
        const g = view.grid.getContext('2d');
        const gap = s >= 9 ? 2 : 1;
        if (s >= 3) {
            g.fillStyle = 'rgba(' + t.bg.join(',') + ',' + t.grid + ')';
            for (let x = 0; x < W; x++) g.fillRect(x * s + s - gap, 0, gap, h);
            for (let y = 0; y < H; y++) g.fillRect(0, y * s + s - gap, w, gap);
        }
        // Glass: a soft vignette and a faint diagonal sheen.
        view.glass = makeCanvas(w, h);
        const q = view.glass.getContext('2d');
        const lcd = !t.glow;
        const v = q.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, lcd ? 'rgba(40,20,0,0.22)' : 'rgba(0,0,0,0.5)');
        q.fillStyle = v;
        q.fillRect(0, 0, w, h);
        const sheen = q.createLinearGradient(0, 0, w * 0.6, h);
        sheen.addColorStop(0, 'rgba(255,255,255,' + (lcd ? 0.10 : 0.05) + ')');
        sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
        q.fillStyle = sheen;
        q.fillRect(0, 0, w, h);
        // The CSS glow around the canvas follows the theme.
        view.canvas.style.filter = t.glow ? 'drop-shadow(0 0 ' + Math.max(2, s / 2) + 'px rgba(' + t.glow + ',0.45))' : 'none';
        view.canvas.style.background = 'rgb(' + t.bg.join(',') + ')';
        const wrap = view.canvas.parentElement;
        if (wrap) wrap.dataset.screenTheme = t.id;
    }

    // A new frame from the game: set every cell's target brightness.
    function setTargets(fb) {
        let fieldInk = 0;
        for (let y = FIELD_TOP; y < FIELD_BOTTOM; y++) {
            for (let x = 0; x < W; x++) if (fb[(y >> 3) * W + x] & (1 << (y & 7))) fieldInk++;
        }
        state.room = fieldInk > 0.6 * W * (FIELD_BOTTOM - FIELD_TOP);
        const target = state.target;
        for (let y = 0; y < H; y++) {
            const row = (y >> 3) * W, bit = 1 << (y & 7);
            const flip = state.room && y >= FIELD_TOP && y < FIELD_BOTTOM;
            for (let x = 0; x < W; x++) {
                const lit = (fb[row + x] & bit) !== 0;
                target[y * W + x] = lit !== flip ? 1 : 0;
            }
        }
    }

    function kick() {
        if (!state.raf) state.raf = requestAnimationFrame(tick);
    }

    function tick(now) {
        state.raf = 0;
        if (!layout()) return;
        const dt = state.last ? Math.min(100, now - state.last) : 16.7;
        state.last = now;
        const busy = render(dt);
        if (busy) {
            kick();
        } else {
            state.last = 0;
        }
    }

    // Ease the cells toward their targets and paint. Returns true while
    // anything is still moving (ghosts fading, effects playing).
    function render(dt) {
        const t = theme();
        const k = dt / 16.7;
        const rise = 1 - Math.pow(1 - RISE, k);
        const fall = 1 - Math.pow(1 - FALL, k);
        const target = state.target, shown = state.shown;
        const px = view.loImg.data, gx = view.glowImg.data;
        let moving = false;
        for (let y = 0; y < H; y++) {
            const room = state.room && y >= FIELD_TOP && y < FIELD_BOTTOM;
            // In the dark room the "lit" state is the room itself (dim) and
            // the art is the bright part, so lit cells draw as art.
            const off = room ? t.room : t.off;
            const on = t.on;
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                let v = shown[i];
                const goal = target[i];
                if (v !== goal) {
                    v += (goal - v) * (goal > v ? rise : fall);
                    if (Math.abs(goal - v) < 0.004) v = goal; else moving = true;
                    shown[i] = v;
                }
                const o = i * 4;
                px[o] = off[0] + (on[0] - off[0]) * v;
                px[o + 1] = off[1] + (on[1] - off[1]) * v;
                px[o + 2] = off[2] + (on[2] - off[2]) * v;
                px[o + 3] = 255;
                if (t.glow) {
                    gx[o] = on[0] * v; gx[o + 1] = on[1] * v; gx[o + 2] = on[2] * v; gx[o + 3] = 255;
                }
            }
        }
        view.loCtx.putImageData(view.loImg, 0, 0);
        if (t.glow) view.glowCtx.putImageData(view.glowImg, 0, 0);

        const ctx = view.ctx;
        const s = view.scale;
        const w = W * s, h = H * s;
        ctx.save();
        ctx.fillStyle = 'rgb(' + t.bg.join(',') + ')';
        ctx.fillRect(0, 0, w, h);
        // Shake: the whole picture jolts inside the glass.
        if (state.shake > 0) {
            const amp = state.shakeMax * (state.shake / 320) * s * 0.5;
            ctx.translate(Math.round((Math.random() * 2 - 1) * amp), Math.round((Math.random() * 2 - 1) * amp));
            state.shake = Math.max(0, state.shake - dt);
            moving = true;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(view.lo, 0, 0, w, h);
        ctx.drawImage(view.grid, 0, 0);
        if (t.glow && t.bloom > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.imageSmoothingEnabled = true;
            if (view.filter) {
                ctx.filter = 'blur(' + (s * 0.9).toFixed(1) + 'px)';
                ctx.globalAlpha = t.bloom * 0.55;
                ctx.drawImage(view.glow, 0, 0, w, h);
                ctx.filter = 'blur(' + (s * 2.6).toFixed(1) + 'px)';
                ctx.globalAlpha = t.bloom * 0.35;
                ctx.drawImage(view.glow, 0, 0, w, h);
                ctx.filter = 'none';
            } else {
                ctx.globalAlpha = t.bloom * 0.18;
                ctx.drawImage(view.glow, 0, 0, w, h);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
        if (drawParticles(ctx, dt, t)) moving = true;
        ctx.restore();
        ctx.drawImage(view.glass, 0, 0);
        if (state.flash > 0) {
            ctx.fillStyle = t.glow ? 'rgba(' + t.glow + ',' + (state.flash * (reduceMotion ? 0.25 : 0.6)).toFixed(3) + ')'
                : 'rgba(255,255,240,' + (state.flash * (reduceMotion ? 0.25 : 0.55)).toFixed(3) + ')';
            ctx.fillRect(0, 0, w, h);
            state.flash = Math.max(0, state.flash - dt / 220);
            moving = true;
        }
        if (state.ring > 0) {
            // Alert: a pulsing frame around the screen edge.
            const a = Math.sin((1 - state.ring) * Math.PI * 4) * 0.5 + 0.5;
            ctx.strokeStyle = t.glow ? 'rgba(' + t.glow + ',' + (a * state.ring).toFixed(3) + ')' : 'rgba(0,0,0,' + (a * state.ring * 0.6).toFixed(3) + ')';
            ctx.lineWidth = s * 1.5;
            ctx.strokeRect(s * 0.75, s * 0.75, w - s * 1.5, h - s * 1.5);
            state.ring = Math.max(0, state.ring - dt / 1600);
            moving = true;
        }
        return moving;
    }

    // Sparkles: four-point stars that drift up, twinkle and fade.
    function drawParticles(ctx, dt, t) {
        const list = state.particles;
        if (!list.length) return false;
        const s = view.scale;
        const rgb = t.glow ? t.glow : t.on.join(',');
        ctx.globalCompositeOperation = t.glow ? 'lighter' : 'source-over';
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            p.life -= dt;
            if (p.life <= 0) { list.splice(i, 1); continue; }
            p.x += p.vx * dt / 16.7;
            p.y += p.vy * dt / 16.7;
            const f = p.life / p.max;
            const twinkle = 0.55 + 0.45 * Math.sin(p.life / 45 + p.seed);
            const r = p.size * s * (0.6 + 0.4 * twinkle);
            ctx.fillStyle = 'rgba(' + rgb + ',' + (f * twinkle).toFixed(3) + ')';
            const cx = p.x * s, cy = p.y * s;
            ctx.fillRect(cx - r, cy - s * 0.25, r * 2, s * 0.5);
            ctx.fillRect(cx - s * 0.25, cy - r, s * 0.5, r * 2);
            ctx.fillRect(cx - s * 0.5, cy - s * 0.5, s, s);
        }
        ctx.globalCompositeOperation = 'source-over';
        return list.length > 0;
    }

    function sparkle(count) {
        for (let i = 0; i < count; i++) {
            const max = 700 + Math.random() * 700;
            state.particles.push({
                x: 6 + Math.random() * (W - 12), y: 14 + Math.random() * 36,
                vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.12,
                size: 1.2 + Math.random() * 1.8, life: max, max: max, seed: Math.random() * 6,
            });
        }
    }

    function onFx(kind) {
        switch (kind) {
            case FX_HIT:
                if (!reduceMotion) { state.shake = 120; state.shakeMax = 1.2; }
                break;
            case FX_CRIT:
                if (!reduceMotion) { state.shake = 320; state.shakeMax = 4; }
                state.flash = Math.max(state.flash, 0.7);
                sparkle(reduceMotion ? 4 : 10);
                break;
            case FX_FLASH:
                state.flash = 1;
                break;
            case FX_SPARKLE:
                sparkle(reduceMotion ? 8 : 26);
                break;
            case FX_ALERT:
                state.ring = 1;
                if (!reduceMotion) { state.shake = 200; state.shakeMax = 1.5; }
                break;
            default:
                return;
        }
        kick();
        try {
            window.dispatchEvent(new CustomEvent('digiflip:fx', { detail: { kind: FX_NAMES[kind] || String(kind) } }));
        } catch (e) { /* ignore */ }
    }

    function draw() {
        if (!state.frame || !layout()) return;
        setTargets(state.frame);
        kick();
    }

    function setTheme(index) {
        state.theme = (index + THEMES.length) % THEMES.length;
        try { localStorage.setItem(THEME_KEY, theme().id); } catch (e) { /* ignore */ }
        drawThemeButton();
        if (view.canvas) { buildOverlays(); kick(); }
    }

    function drawThemeButton() {
        const btn = $('digimon-theme');
        if (btn) btn.textContent = 'screen: ' + theme().label;
    }

    function onFrame(buffer) {
        if (!state.frame) {
            state.frame = new Uint8Array(1024);
            setStatus('');
        }
        state.frame.set(buffer);
        draw();
    }

    function drawLed() {
        const led = $('digimon-led');
        if (led) led.classList.toggle('on', state.led);
    }

    // ---- Sound ----
    function unlockAudio() {
        if (!state.audio) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            state.audio = new Ctx();
        }
        if (state.audio.state === 'suspended') state.audio.resume();
    }

    function onTone(hz, startMs, lengthMs) {
        const ac = state.audio;
        if (!state.sound || !ac || ac.state !== 'running') return;
        const click = hz === 0;
        const t0 = ac.currentTime + startMs / 1000;
        const t1 = t0 + (click ? 0.006 : Math.max(lengthMs, 10) / 1000);
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = click ? 2000 : hz;
        gain.gain.setValueAtTime(click ? 0.03 : 0.045, t0);
        gain.gain.setValueAtTime(0, t1);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t1 + 0.01);
    }

    function drawSoundButton() {
        const btn = $('digimon-sound');
        if (btn) btn.textContent = 'sound: ' + (state.sound ? 'on' : 'off');
    }

    // ---- Saves (IndexedDB via Emscripten's IDBFS) ----
    function syncNow() {
        const M = state.module;
        if (!M) return;
        clearTimeout(state.syncTimer);
        state.syncTimer = null;
        if (state.syncing) { state.syncAgain = true; return; }
        state.syncing = true;
        M.FS.syncfs(false, function (err) {
            state.syncing = false;
            if (err) console.warn('digiflip: save sync failed', err);
            if (state.syncAgain) { state.syncAgain = false; syncNow(); }
        });
    }

    function syncLater() {
        if (!state.syncTimer) state.syncTimer = setTimeout(syncNow, 400);
    }

    function saveNow() {
        const M = state.module;
        if (!M || !M._web_save) return;
        try { M._web_save(); } catch (e) { console.warn('digiflip: save failed', e); }
        syncNow();
    }

    function onLogExport(path) {
        const M = state.module;
        try {
            const data = M.FS.readFile(path);
            const url = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'digiflip-log.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (e) { console.warn('digiflip: log export failed', e); }
    }

    // ---- Input ----
    function press(key, down) {
        const M = state.module;
        if (!M || !M._web_key) return;
        if (down) {
            if (state.held.has(key)) return;
            state.held.add(key);
            unlockAudio();
        } else {
            if (!state.held.has(key)) return;
            state.held.delete(key);
        }
        M._web_key(key, down ? 1 : 0);
    }

    function releaseAll() {
        Array.from(state.held).forEach(function (key) { press(key, false); });
    }

    function typingInField(target) {
        if (!target || !target.tagName) return false;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    }

    function onKey(e) {
        if (!$('digimon-screen')) return; // navigated away
        if (e.ctrlKey || e.metaKey || e.altKey || typingInField(e.target)) return;
        const key = KEYMAP[e.code];
        if (key === undefined) return;
        e.preventDefault();
        if (e.type === 'keydown') {
            if (!e.repeat) press(key, true);
        } else {
            press(key, false);
        }
    }

    function bindButtons() {
        document.querySelectorAll('.flipper [data-key]').forEach(function (btn) {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            const key = Number(btn.dataset.key);
            const up = function () { btn.classList.remove('pressed'); press(key, false); };
            btn.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                btn.classList.add('pressed');
                press(key, true);
            });
            btn.addEventListener('pointerup', up);
            btn.addEventListener('pointercancel', up);
            btn.addEventListener('lostpointercapture', up);
            btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        });

        const screen = $('digimon-screen');
        if (screen && !screen.dataset.bound) {
            screen.dataset.bound = '1';
            screen.addEventListener('pointerdown', function () { screen.focus(); unlockAudio(); });
        }

        const themeBtn = $('digimon-theme');
        if (themeBtn && !themeBtn.dataset.bound) {
            themeBtn.dataset.bound = '1';
            themeBtn.addEventListener('click', function () { setTheme(state.theme + 1); });
        }

        const sound = $('digimon-sound');
        if (sound && !sound.dataset.bound) {
            sound.dataset.bound = '1';
            sound.addEventListener('click', function () {
                state.sound = !state.sound;
                saveSoundPref();
                drawSoundButton();
                if (state.sound) unlockAudio();
            });
        }
    }

    function bindGlobal() {
        if (state.listening) return;
        state.listening = true;
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        window.addEventListener('blur', releaseAll);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') { releaseAll(); saveNow(); }
        });
        window.addEventListener('pagehide', saveNow);
        // Re-fit the cell size when the screen changes size or zoom.
        let fit = 0;
        window.addEventListener('resize', function () {
            cancelAnimationFrame(fit);
            fit = requestAnimationFrame(function () { view.scale = 0; draw(); });
        });
        if (window.ResizeObserver) {
            const canvas = $('digimon-screen');
            if (canvas) new ResizeObserver(function () { view.scale = 0; if (state.frame) draw(); }).observe(canvas);
        }
        // Another tab (or the home page's pet frame) changed the theme.
        window.addEventListener('storage', function (e) {
            if (e.key !== THEME_KEY) return;
            const i = THEMES.findIndex(function (t) { return t.id === e.newValue; });
            if (i >= 0 && i !== state.theme) { state.theme = i; drawThemeButton(); if (view.canvas) { buildOverlays(); kick(); } }
        });
    }

    // ---- Boot ----
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (typeof window.createDigiflip === 'function') return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('could not load ' + src)); };
            document.head.appendChild(s);
        });
    }

    function start() {
        if (state.module || state.loading) return;
        state.loading = true;
        setStatus('loading…');

        const opts = {
            // Versioned so a cached old .wasm never meets the new glue code.
            locateFile: function (path) { return WASM_DIR + path + '?v=' + WASM_VERSION; },
            preRun: [function () {
                opts.FS.mkdir('/data');
                opts.FS.mount(opts.FS.filesystems.IDBFS, {}, '/data');
                opts.addRunDependency('digiflip-saves');
                opts.FS.syncfs(true, function (err) {
                    if (err) console.warn('digiflip: could not read saves', err);
                    opts.removeRunDependency('digiflip-saves');
                });
            }],
            onFrame: onFrame,
            onTone: onTone,
            onLed: function (on) { state.led = on; drawLed(); },
            onFx: onFx,
            syncNow: syncNow,
            syncLater: syncLater,
            onLogExport: onLogExport,
            onCrash: function (what) { setStatus('the game crashed: ' + what, true); },
            print: function (text) { console.log('digiflip:', text); },
            printErr: function (text) { console.warn('digiflip:', text); },
        };

        loadScript(WASM_DIR + 'digiflip.js?v=' + WASM_VERSION)
            .then(function () { return window.createDigiflip(opts); })
            .then(function (M) { state.module = M; })
            .catch(function (err) {
                console.error(err);
                setStatus('could not start the game (' + err.message + ')', true);
            })
            .finally(function () { state.loading = false; });
    }

    function initDigimon() {
        if (!$('digimon-screen')) return;
        state.sound = loadSoundPref();
        state.theme = loadThemePref();
        drawSoundButton();
        drawThemeButton();
        bindButtons();
        bindGlobal();
        view.scale = 0; // a new page's canvas
        if (state.frame) { setStatus(''); draw(); drawLed(); }
        start();
    }

    window.initDigimon = initDigimon;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDigimon);
    } else {
        initDigimon();
    }
})();
