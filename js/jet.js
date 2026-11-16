/* Jet: the sprite-stack fighter scene (js/jet/engine.js, bundled from /mnt/deepdish/Jet) in the DEEPDISH workspace.
   A vanilla port of the scene's React wrapper (jet.tsx): the pixel canvas and the smooth-flame canvas over it,
   pointer / keyboard / touch flying and fighting (cannon, missiles, loops), the line of help, the touch buttons and
   the training flight (E.createTutorial). No sound: the scene's audio / takeSounds() are never read. On top of that,
   this page's panels: flight plan, airframe and handling controls (input[data-param], [data-set] buttons, saved in
   localStorage "jetSettings"), and the flight + combat readouts, refreshed a few times a second from the scene. */
(function () {
    'use strict';
    const E = window.JetEngine;
    const wrap = document.getElementById('jet-stage');
    const canvas = document.getElementById('jet-canvas');
    const fire = document.getElementById('jet-fire');
    if (!E || !wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STORE = 'jetSettings';
    const embedded = () => document.documentElement.classList.contains('is-embed');
    const $ = (id) => document.getElementById(id);

    // ---------- Settings: the scene's own defaults, this page's look on top, then what this browser saved ----------
    const PRESETS = {
        deepdish: { bodyColor: '#3d4458', accentColor: '#8be9fd', canopyColor: '#50fa7b' },
        radbro: { bodyColor: '#545969', accentColor: '#ffb86c', canopyColor: '#8be9fd' },
        dracula: { bodyColor: '#44475a', accentColor: '#bd93f9', canopyColor: '#ff79c6' },
        original: { bodyColor: '#545969', accentColor: '#f0580e', canopyColor: '#1e8ca0' },
        ghost: { bodyColor: '#c4c9d3', accentColor: '#ff5555', canopyColor: '#282a36' },
    };
    const PAGE_DEFAULTS = Object.assign({ timeOfDay: 'night', flameStyle: 'realistic', clouds: 0.4 }, PRESETS.deepdish);
    const settings = Object.assign({}, E.DEFAULT_PARAMS, PAGE_DEFAULTS, { pixelSize: 0, preset: 'deepdish' });
    try {
        const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (saved && typeof saved === 'object') {
            for (const k of Object.keys(saved)) if (k in settings && typeof saved[k] === typeof settings[k]) settings[k] = saved[k];
        }
    } catch (_) { /* private window or blocked storage: the defaults will do */ }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) settings.intro = false;
    // a link can name the camera to start in: #overhead, #chase or #cockpit (the home page sends /#jet/cockpit here)
    const HASH_VIEW = { overhead: 'top', top: 'top', chase: 'chase', cockpit: 'cockpit' };
    const hashView = () => HASH_VIEW[location.hash.slice(1).toLowerCase()];
    if (hashView()) settings.view = hashView();
    let noFire = false; // the graphics card cannot draw the smooth flames: they are drawn in pixels instead

    const sceneParams = () => {
        const p = {};
        for (const k of Object.keys(E.DEFAULT_PARAMS)) p[k] = settings[k];
        if (noFire) p.flameStyle = 'pixel';
        return p;
    };
    let saveTimer = 0;
    const save = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (_) {}
        }, 300);
    };

    const scene = E.createScene(sceneParams());
    let image = null;
    let layer = null;
    let fireDead = false;
    let scale = 4;

    // ---------- Layout: a low-res picture scaled up with hard pixels, flames at the screen's own sharpness ----------
    function layout() {
        const cw = wrap.clientWidth;
        const ch = wrap.clientHeight;
        if (!cw || !ch) return;
        const auto = Math.min(12, Math.max(2, Math.round(Math.sqrt((cw * ch) / 100000))));
        const px = settings.pixelSize > 0 ? Math.round(settings.pixelSize) : auto;
        const lw = Math.ceil(cw / px);
        const lh = Math.ceil(ch / px);
        if (canvas.width !== lw || canvas.height !== lh) {
            canvas.width = lw;
            canvas.height = lh;
            scene.resize(lw, lh);
            image = null;
        }
        const css = { width: lw * px + 'px', height: lh * px + 'px', left: Math.round((cw - lw * px) / 2) + 'px', top: Math.round((ch - lh * px) / 2) + 'px' };
        Object.assign(canvas.style, css);
        if (fire) {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const fw = Math.round(lw * px * dpr);
            const fh = Math.round(lh * px * dpr);
            if (fire.width !== fw || fire.height !== fh) { fire.width = fw; fire.height = fh; }
            Object.assign(fire.style, css);
        }
        scale = px;
        const pxOut = $('jet-px');
        if (pxOut) pxOut.textContent = `${lw}×${lh} @ ${px}x`;
    }
    layout();
    new ResizeObserver(layout).observe(wrap);

    if (fire) {
        fire.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            layer = null;
            loseFire();
        });
    }
    function loseFire() {
        fireDead = true;
        if (!noFire) { noFire = true; scene.setParams(sceneParams()); }
        const note = $('jet-fire-note');
        if (note) note.hidden = false;
    }

    // ---------- Frames: only while the stage is on screen and the tab is showing ----------
    let raf = 0;
    let last = 0;
    let visible = true;
    let fps = 0;
    let fpsN = 0;
    let fpsT = 0;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0;
        last = now;
        fpsN++;
        if (now - fpsT > 1000) { fps = Math.round((fpsN * 1000) / (now - fpsT)); fpsN = 0; fpsT = now; }
        if (!scene.width) return;
        scene.step(dt);
        if (tutorial.on) tutorial.tick(dt);
        const bytes = scene.render();
        if (!image) image = new ImageData(bytes, scene.width, scene.height);
        ctx.putImageData(image, 0, 0);
        const flames = scene.flames;
        if (fire && flames.count > 0 && !layer && !fireDead) {
            layer = E.createFlameLayer(fire);
            if (!layer) loseFire();
        }
        if (fire && layer) layer.draw(flames.count, flames.data, fire.width / scene.width, now / 1000);
    }
    const run = () => {
        const want = visible && !document.hidden;
        if (want && !raf) { last = 0; fpsT = performance.now(); fpsN = 0; raf = requestAnimationFrame(frame); }
        else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; }
        setLink(want ? 'live' : 'idle');
    };
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }).observe(wrap);
    }
    document.addEventListener('visibilitychange', run);

    // ---------- Line of help ----------
    const HINTS = {
        top: 'move to steer · click: roll · hold: thrust · right-click: gun · M: missile · space: chase',
        chase: 'point to fly · click: roll · hold: thrust · right-click: gun · M: missile · space: cockpit',
        cockpit: 'point to fly · click: roll · hold: thrust · right-click: gun · M: missile · space: overhead',
    };
    const TOUCH_HINTS = {
        top: 'touch to steer · tap to roll · hold boost / gun · view: chase',
        chase: 'touch to turn, climb + dive · tap to roll · hold boost / gun · view: cockpit',
        cockpit: 'touch to turn, climb + dive · tap to roll · hold boost / gun · view: overhead',
    };
    const VIEW_NAME = { top: 'overhead', chase: 'chase', cockpit: 'cockpit' };
    const hintEl = $('jet-hint');
    let hintTimer = 0;
    let fingerScreen = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    function revealHint(mode, seconds) {
        if (!hintEl) return;
        hintEl.textContent = (fingerScreen ? TOUCH_HINTS : HINTS)[mode];
        wrap.dataset.view = mode;
        hintEl.classList.add('is-on');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => hintEl.classList.remove('is-on'), seconds * 1000);
    }
    function showView(mode) {
        wrap.dataset.view = mode;
        document.querySelectorAll('[data-set="view"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === mode)));
        const tag = $('jet-view-tag');
        if (tag) tag.textContent = VIEW_NAME[mode];
    }
    revealHint(scene.view, 9);
    showView(scene.view);
    const setTouch = (on) => { fingerScreen = on; wrap.classList.toggle('is-touch', on); };
    setTouch(fingerScreen);

    // ---------- Keys: arrows / WASD fly it, Shift fires the thrusters, Space moves the camera on ----------
    const FLY = {
        ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
        ShiftLeft: 'boost', ShiftRight: 'boost', TouchBoost: 'boost',
    };
    // one-shot keys: a missile, a loop over the top (F) or forward and under (G)
    const ACT = { KeyM: () => scene.missile(), KeyF: () => scene.loop(1), KeyG: () => scene.loop(-1) };
    const GUN_KEYS = new Set(['KeyJ']);
    const triggers = new Set(); // what is holding the cannon's trigger: a key, the right mouse button, the touch button
    const trigger = (who, on) => {
        const had = triggers.size > 0;
        if (on) triggers.add(who); else triggers.delete(who);
        if (had !== triggers.size > 0) scene.setFire(triggers.size > 0);
    };
    const held = new Set();
    function sendKeys() {
        let turn = 0, climb = 0, boost = false;
        held.forEach((code) => {
            const k = FLY[code];
            if (k === 'left') turn -= 1;
            else if (k === 'right') turn += 1;
            else if (k === 'up') climb += 1;
            else if (k === 'down') climb -= 1;
            else if (k === 'boost') boost = true;
        });
        scene.setKeys(turn, climb, boost);
    }
    function nextView() {
        scene.toggleView();
        settings.view = scene.view;
        save();
        showView(scene.view);
        revealHint(scene.view, 7);
    }
    // The stage takes the keys while it has focus (a click, or the pointer over it outside the home page's preview)
    wrap.addEventListener('keydown', (e) => {
        if (e.target !== wrap) return;
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) nextView();
            return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (FLY[e.code]) {
            e.preventDefault();
            held.add(e.code);
            sendKeys();
        } else if (GUN_KEYS.has(e.code)) {
            e.preventDefault();
            trigger(e.code, true);
        } else if (ACT[e.code]) {
            e.preventDefault();
            if (!e.repeat) ACT[e.code]();
        }
    });
    wrap.addEventListener('keyup', (e) => {
        if (held.delete(e.code)) sendKeys();
        if (GUN_KEYS.has(e.code)) trigger(e.code, false);
    });
    const letGo = () => {
        held.clear();
        sendKeys();
        triggers.clear();
        scene.setFire(false);
        boostBtn && boostBtn.classList.remove('is-on');
        gunBtn && gunBtn.classList.remove('is-on');
    };
    wrap.addEventListener('blur', () => { if (!held.has('TouchBoost')) letGo(); });
    window.addEventListener('blur', letGo);
    const grab = () => wrap.focus({ preventScroll: true });

    // ---------- Pointer: a mouse points and clicks; a finger steers while it's down and taps to roll ----------
    const toScene = (e) => {
        const r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
    };
    let steer = null; // the finger that is steering
    const byFinger = (e) => e.pointerType === 'touch';
    function endFinger(e, tap) {
        if (!steer || steer.id !== e.pointerId) return;
        const s = steer;
        steer = null;
        if (tap && !s.moved && performance.now() - s.t < 260) { scene.press(); scene.release(); }
        scene.pointerLeave();
    }
    wrap.addEventListener('pointerenter', () => { if (!embedded()) grab(); });
    wrap.addEventListener('pointermove', (e) => {
        if (byFinger(e)) {
            if (!steer || steer.id !== e.pointerId) return;
            if (Math.hypot(e.clientX - steer.x, e.clientY - steer.y) > 12) steer.moved = true;
        }
        const [x, y] = toScene(e);
        scene.pointerMove(x, y);
    });
    wrap.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        const [x, y] = toScene(e);
        if (byFinger(e)) {
            if (!fingerScreen) { setTouch(true); revealHint(scene.view, 7); }
            if (steer) return; // one finger steers; a second one is for the buttons
            steer = { id: e.pointerId, t: performance.now(), x: e.clientX, y: e.clientY, moved: false };
            scene.pointerMove(x, y);
        } else {
            if (fingerScreen) setTouch(false);
            scene.pointerMove(x, y);
            if (e.button === 2) trigger('mouse', true);
            else if (e.button === 0) scene.press();
        }
        if (tutorial.on) tutorial.setFlyer(byFinger(e) ? 'touch' : 'pointer');
        grab();
    });
    wrap.addEventListener('pointerup', (e) => {
        if (byFinger(e)) endFinger(e, true);
        else if (e.button === 2) trigger('mouse', false);
        else if (e.button === 0) scene.release();
    });
    const pointerGone = (e) => {
        if (byFinger(e)) { endFinger(e, false); return; }
        trigger('mouse', false);
        scene.pointerLeave();
        if (triggers.size) scene.setFire(true); // (pointerLeave lets go of the trigger: a held key keeps it)
    };
    wrap.addEventListener('pointerleave', pointerGone);
    wrap.addEventListener('pointercancel', pointerGone);
    wrap.addEventListener('contextmenu', (e) => e.preventDefault()); // the right button is the cannon

    // Touch buttons: View, and Boost held like a key
    const viewBtn = $('jet-view-btn');
    const boostBtn = $('jet-boost-btn');
    const gunBtn = $('jet-gun-btn');
    const missileBtn = $('jet-missile-btn');
    const loopBtn = $('jet-loop-btn');
    const mine = (e) => e.stopPropagation();
    if (viewBtn) {
        ['pointerdown', 'pointermove', 'pointerup'].forEach((t) => viewBtn.addEventListener(t, mine));
        viewBtn.addEventListener('click', () => { nextView(); grab(); });
    }
    if (boostBtn) {
        const on = (e) => {
            e.stopPropagation();
            try { boostBtn.setPointerCapture(e.pointerId); } catch (_) {}
            held.add('TouchBoost');
            sendKeys();
            boostBtn.classList.add('is-on');
            boostBtn.setAttribute('aria-pressed', 'true');
        };
        const off = (e) => {
            e.stopPropagation();
            if (!held.delete('TouchBoost')) return;
            sendKeys();
            boostBtn.classList.remove('is-on');
            boostBtn.setAttribute('aria-pressed', 'false');
            grab();
        };
        boostBtn.addEventListener('pointerdown', on);
        boostBtn.addEventListener('pointermove', mine);
        boostBtn.addEventListener('pointerup', off);
        boostBtn.addEventListener('pointercancel', off);
        boostBtn.addEventListener('lostpointercapture', off);
        boostBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    if (gunBtn) {
        const on = (e) => {
            e.stopPropagation();
            try { gunBtn.setPointerCapture(e.pointerId); } catch (_) {}
            trigger('touch', true);
            gunBtn.classList.add('is-on');
            gunBtn.setAttribute('aria-pressed', 'true');
        };
        const off = (e) => {
            e.stopPropagation();
            if (!triggers.has('touch')) return;
            trigger('touch', false);
            gunBtn.classList.remove('is-on');
            gunBtn.setAttribute('aria-pressed', 'false');
            grab();
        };
        gunBtn.addEventListener('pointerdown', on);
        gunBtn.addEventListener('pointermove', mine);
        gunBtn.addEventListener('pointerup', off);
        gunBtn.addEventListener('pointercancel', off);
        gunBtn.addEventListener('lostpointercapture', off);
        gunBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    [[missileBtn, () => scene.missile()], [loopBtn, () => scene.loop(1)]].forEach(([btn, act]) => {
        if (!btn) return;
        ['pointerdown', 'pointermove', 'pointerup'].forEach((t) => btn.addEventListener(t, mine));
        btn.addEventListener('click', () => { act(); grab(); });
    });

    // ---------- Controls: input[data-param] and [data-set][data-value] buttons write settings ----------
    const FMT = {
        clouds: (v) => Math.round(v * 100) + '%',
        land: (v) => Math.round(v * 100) + '%',
        afterburner: (v) => Math.round(v * 100) + '%',
        cameraFollow: (v) => Math.round(v * 100) + '%',
        boost: (v) => v.toFixed(1) + '×',
        agility: (v) => v.toFixed(2),
        jetScale: (v) => v.toFixed(2) + '×',
        chaseDistance: (v) => v.toFixed(1),
        chaseAngle: (v) => Math.round(v) + '°',
        bank: (v) => Math.round(v) + '°',
        pixelSize: (v) => (v > 0 ? v + 'x' : 'auto'),
        bloom: (v) => Math.round(v * 100) + '%',
        vivid: (v) => Math.round(v * 100) + '%',
        vignette: (v) => Math.round(v * 100) + '%',
        grain: (v) => Math.round(v * 100) + '%',
        shake: (v) => Math.round(v * 100) + '%',
        slowMo: (v) => (v > 0 ? v.toFixed(1) + ' s' : 'off'),
    };
    const inputs = Array.from(document.querySelectorAll('[data-param]'));
    const setters = Array.from(document.querySelectorAll('[data-set]'));
    function paint() {
        inputs.forEach((el) => {
            const k = el.dataset.param;
            const v = settings[k];
            if (el.type === 'checkbox') el.checked = !!v;
            else el.value = String(v);
            const out = document.querySelector(`output[for="${el.id}"]`);
            if (out) out.textContent = FMT[k] ? FMT[k](Number(v)) : String(v);
        });
        setters.forEach((b) => b.setAttribute('aria-pressed', String(String(settings[b.dataset.set]) === b.dataset.value)));
        const name = $('jet-livery-name');
        if (name) name.textContent = settings.preset;
        const sw = $('jet-swatch');
        if (sw) sw.style.setProperty('--jet-accent', settings.accentColor);
        wrap.style.setProperty('--jet-accent', settings.accentColor);
        wrap.classList.toggle('is-unarmed', !settings.weapons);
    }
    function apply(k, v) {
        settings[k] = v;
        if (k === 'bodyColor' || k === 'accentColor' || k === 'canopyColor') settings.preset = 'custom';
        if (k === 'preset' && PRESETS[v]) Object.assign(settings, PRESETS[v]);
        if (k === 'pixelSize') layout();
        else scene.setParams(sceneParams());
        if (k === 'view') { showView(v); revealHint(v, 7); }
        paint();
        save();
    }
    inputs.forEach((el) => {
        el.addEventListener('input', () => {
            const k = el.dataset.param;
            const v = el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? Number(el.value) : el.value;
            apply(k, v);
        });
    });
    setters.forEach((b) => {
        b.addEventListener('click', () => {
            const k = b.dataset.set;
            const raw = b.dataset.value;
            apply(k, typeof settings[k] === 'number' ? Number(raw) : raw);
        });
    });
    const reseed = $('jet-reseed');
    if (reseed) reseed.addEventListener('click', () => apply('seed', 1 + Math.floor(Math.random() * 9999)));
    const replay = $('jet-replay');
    if (replay) replay.addEventListener('click', () => { scene.replayIntro(); grab(); });
    const reset = $('jet-reset');
    if (reset) reset.addEventListener('click', () => {
        Object.assign(settings, E.DEFAULT_PARAMS, PAGE_DEFAULTS, { pixelSize: 0, preset: 'deepdish' });
        try { localStorage.removeItem(STORE); } catch (_) {}
        scene.setParams(sceneParams());
        layout();
        showView(settings.view);
        paint();
    });
    paint();
    window.addEventListener('hashchange', () => { const v = hashView(); if (v && v !== scene.view) apply('view', v); });

    // ---------- Training flight: a card on the deck, one drill at a time ----------
    const card = {
        el: $('jet-lesson'), step: $('jet-lesson-step'), group: $('jet-lesson-group'), title: $('jet-lesson-title'),
        how: $('jet-lesson-how'), hint: $('jet-lesson-hint'), bar: $('jet-lesson-bar'),
    };
    const trainBtn = $('jet-train');
    const tutorial = E.createTutorial(scene, {
        change(l) {
            wrap.classList.toggle('is-training', !!l);
            if (trainBtn) trainBtn.textContent = l ? 'end training' : 'start training';
            if (!card.el) return;
            card.el.hidden = !l;
            if (!l) return;
            const flyer = fingerScreen ? 'touch' : 'pointer';
            const w = E.lessonWords(l.id, flyer, !!settings.invertY, l.view);
            card.el.classList.toggle('is-done', l.phase !== 'do');
            card.step.textContent = l.phase === 'end' ? 'done' : `${l.index + 1} / ${l.count}`;
            card.group.textContent = l.group;
            card.title.textContent = l.phase === 'end' ? 'Training complete' : (l.phase === 'done' ? '✓ ' : '') + w.title;
            card.how.textContent = l.phase === 'end' ? 'The sky is yours. Enemies are back.' : w.how;
            card.hint.textContent = l.phase === 'do' ? l.hint : '';
            card.bar.style.width = (l.progress * 100).toFixed(1) + '%';
        },
        chime() { /* no sound */ },
    });
    const meta = $('jet-train-meta');
    function startTraining() {
        if (tutorial.on) { tutorial.stop(); return; }
        tutorial.setFlyer(fingerScreen ? 'touch' : 'pointer');
        tutorial.start({ armed: !!settings.weapons, crash: !!settings.crash });
        grab();
    }
    if (trainBtn) trainBtn.addEventListener('click', startTraining);
    const skipBtn = $('jet-lesson-skip');
    if (skipBtn) skipBtn.addEventListener('click', (e) => { e.stopPropagation(); tutorial.skip(); grab(); });
    const stopBtn = $('jet-lesson-stop');
    if (stopBtn) stopBtn.addEventListener('click', (e) => { e.stopPropagation(); tutorial.stop(); grab(); });
    if (card.el) ['pointerdown', 'pointermove', 'pointerup'].forEach((t) => card.el.addEventListener(t, mine));
    if (meta) meta.textContent = 'guided';

    // ---------- Flight data ----------
    const out = {
        hdg: $('jet-hdg'), spd: $('jet-spd'), alt: $('jet-alt'), agl: $('jet-agl'), g: $('jet-g'),
        bank: $('jet-bank'), pos: $('jet-pos'), thr: $('jet-thr'), fps: $('jet-fps'),
        spdBar: $('jet-spd-bar'), altBar: $('jet-alt-bar'),
        hudHdg: $('jet-hud-hdg'), hudSpd: $('jet-hud-spd'), hudAlt: $('jet-hud-alt'),
        status: $('jet-status'),
        hull: $('jet-hull'), kills: $('jet-kills'), rounds: $('jet-rounds'), missiles: $('jet-missiles'), radar: $('jet-radar'),
        hudHull: $('jet-hud-hull'), hudKills: $('jet-hud-kills'), hudAmmo: $('jet-hud-ammo'), alert: $('jet-alert'),
    };
    const load = (n, max, reloading) => (reloading > 0 ? `RELOAD ${Math.round(reloading * 100)}%` : max > 0 ? `${n} / ${max}` : '∞');
    const pad3 = (n) => String(n).padStart(3, '0');
    const deg = (r) => (r * 180) / Math.PI;
    const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
    const N = 2048; // the world wraps every 2048 px
    function readouts() {
        if (!raf) return;
        const t = scene.telemetry;
        if (!t) return;
        const hdg = pad3(((Math.round(deg(t.heading)) % 360) + 360) % 360);
        const spd = Math.round(t.speed);
        const alt = Math.round(t.alt);
        set(out.hdg, hdg + '°');
        set(out.spd, spd + ' px/s');
        set(out.alt, alt + ' px');
        set(out.agl, Math.max(0, Math.round(t.alt - t.ground)) + ' px');
        set(out.g, Math.round(t.g * 100) + '%');
        set(out.bank, (t.rolling ? 'ROLL ' : '') + Math.round(Math.abs(deg(Math.atan2(Math.sin(t.roll), Math.cos(t.roll))))) + '°');
        const gx = ((Math.floor(t.x) % N) + N) % N;
        const gy = ((Math.floor(t.y) % N) + N) % N;
        set(out.pos, `${String.fromCharCode(65 + Math.floor(gx / 256))}${1 + Math.floor(gy / 256)} · ${pad3(gx >> 3)}/${pad3(gy >> 3)}`);
        set(out.thr, t.boost > 0.3 ? 'AFTERBURNER' : 'CRUISE');
        if (out.thr) out.thr.classList.toggle('is-hot', t.boost > 0.3);
        set(out.fps, fps + ' fps');
        if (out.spdBar) out.spdBar.style.width = Math.min(100, (t.speed / t.speedMax) * 100).toFixed(1) + '%';
        if (out.altBar) out.altBar.style.width = Math.min(100, (t.alt / t.altMax) * 100).toFixed(1) + '%';
        set(out.hudHdg, 'HDG ' + hdg);
        set(out.hudSpd, 'SPD ' + pad3(spd));
        set(out.hudAlt, 'ALT ' + pad3(alt));
        set(out.status, `HDG ${hdg} · ALT ${alt}`);

        // combat
        const hull = scene.hull;
        const a = scene.ammo;
        const r = scene.radar;
        const bars = '█'.repeat(Math.max(0, hull)) + '░'.repeat(Math.max(0, scene.hullMax - hull));
        set(out.hull, t.out ? 'EJECTED' : `${hull} / ${scene.hullMax}`);
        set(out.kills, String(scene.kills));
        set(out.rounds, load(a.rounds, a.roundsMax, a.gunLoad));
        set(out.missiles, load(a.missiles, a.missilesMax, a.missileLoad));
        const up = r.foes.filter((f) => f.state === 0).length;
        set(out.radar, `${up} hostile${up === 1 ? '' : 's'}${r.attackers ? ` · ${r.attackers} attacking` : ''}`);
        set(out.hudHull, t.out ? 'HULL ──────' : 'HULL ' + bars);
        if (out.hudHull) out.hudHull.classList.toggle('is-low', !t.out && hull <= 2);
        set(out.hudKills, 'KILLS ' + scene.kills);
        set(out.hudAmmo, `RDS ${a.gunLoad > 0 ? '--' : a.roundsMax > 0 ? a.rounds : '∞'} · MSL ${a.missileLoad > 0 ? '-' : a.missilesMax > 0 ? a.missiles : '∞'}`);
        let alert = '';
        let cls = '';
        if (settings.weapons && !t.out) {
            if (scene.counterOpen) { alert = 'COUNTER · FIRE NOW'; cls = 'is-now'; }
            else if (scene.threat < 90) { alert = scene.threat < 0.6 ? 'ROLL!' : 'MISSILE INBOUND'; cls = scene.threat < 0.6 ? 'is-now' : ''; }
            else if (r.locked) { alert = 'LOCKED'; cls = 'is-lock'; }
            else if (r.lock >= 0) { alert = 'LOCKING'; cls = 'is-lock'; }
        }
        set(out.alert, alert);
        if (out.alert) out.alert.className = 'jet-alert ' + cls;
    }
    setInterval(readouts, 100);

    function setLink(state) {
        const el = $('jet-link');
        if (!el) return;
        el.innerHTML = state === 'live'
            ? '<i class="g-dot tone-green"></i>SIM LIVE'
            : '<i class="g-dot tone-orange"></i>SIM PAUSED';
    }
    run();
})();
