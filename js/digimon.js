// DigiFlip — the Flipper Zero virtual pet, compiled to WebAssembly
// Author: Tyler (in real life)
//
// The C app draws into a 128x64 1-bit framebuffer; this file blits it to the
// canvas, feeds it key presses, plays its beeps and keeps its saves in
// IndexedDB.

(function () {
    'use strict';

    const WASM_DIR = '/js/digiflip/';
    const SOUND_KEY = 'digimonSound';
    // Lit pixels glow cyan; unlit ones are transparent so the CSS background
    // and glow show through. When the lights are off the game fills the play
    // field with ink, so those rows switch to a dim teal room with cyan art.
    const INK = [139, 233, 253, 255];
    const PAPER = [0, 0, 0, 0];
    const ROOM_DARK = [8, 30, 38, 255];
    const FIELD_TOP = 12;
    const FIELD_BOTTOM = 52;

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
    });

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
    function draw() {
        const canvas = $('digimon-screen');
        if (!canvas || !state.frame) return;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(128, 64);
        const px = image.data;
        const fb = state.frame;
        const lit = function (x, y) { return fb[(y >> 3) * 128 + x] & (1 << (y & 7)); };
        let fieldInk = 0;
        for (let y = FIELD_TOP; y < FIELD_BOTTOM; y++) {
            for (let x = 0; x < 128; x++) if (lit(x, y)) fieldInk++;
        }
        const dark = fieldInk > 0.6 * 128 * (FIELD_BOTTOM - FIELD_TOP);
        for (let y = 0; y < 64; y++) {
            const inRoom = dark && y >= FIELD_TOP && y < FIELD_BOTTOM;
            const on = inRoom ? ROOM_DARK : INK;
            const off = inRoom ? INK : PAPER;
            for (let x = 0; x < 128; x++) {
                const c = lit(x, y) ? on : off;
                const i = (y * 128 + x) * 4;
                px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
            }
        }
        ctx.putImageData(image, 0, 0);
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
            locateFile: function (path) { return WASM_DIR + path; },
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
            syncNow: syncNow,
            syncLater: syncLater,
            onLogExport: onLogExport,
            onCrash: function (what) { setStatus('the game crashed: ' + what, true); },
            print: function (text) { console.log('digiflip:', text); },
            printErr: function (text) { console.warn('digiflip:', text); },
        };

        loadScript(WASM_DIR + 'digiflip.js?v=1.0')
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
        drawSoundButton();
        bindButtons();
        bindGlobal();
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
