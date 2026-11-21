/* Page scripts for studio.html: Studio, a mini DAW on the DEEPDISH workspace. Every sound is synthesized with the
   Web Audio API, nothing is sampled:
   - two synth tracks (BASS, LEAD): two oscillators into a resonant low-pass with its own envelope, an ADSR amp
   - an eight-voice drum machine (kick, snare, clap, closed + open hat, tom, rim, cowbell), each voice with
     tune / decay / level; the closed hat chokes the open one
   - four 16-step patterns (A-D) per track, and a 16-bar arrangement that plays straight through or loops a
     region of bars (drag the ruler); PATTERN mode just loops each track's selected pattern
   - a mixer: per-track volume, pan, mute / solo, delay + reverb sends, into a master bus with a compressor
   - the computer keyboard as a piano (or drum pads), recording into the playing pattern while REC is armed
   - WAV export, rendered offline by the same engine (buildGraph / scheduleStep take any AudioContext)
   The project autosaves to localStorage ("tirlStudio", also read by js/live-rows.js for the home page's
   Results line); SAVE / LOAD move it between browsers as JSON. */
(function () {
    'use strict';
    const app = document.getElementById('studio');
    if (!app) return;

    const STORE = 'tirlStudio';
    const STEPS = 16, BARS = 16, PATS = 4, ROWS = 25;
    const PAT = 'ABCD';
    const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const BLACK = new Set([1, 3, 6, 8, 10]);
    const noteName = (m) => NOTE[m % 12] + (Math.floor(m / 12) - 1);
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const COLORS = ['255, 184, 108', '189, 147, 249', '80, 250, 123']; // drums, bass, lead (r, g, b)
    const VOICES = ['KICK', 'SNARE', 'CLAP', 'C.HAT', 'O.HAT', 'TOM', 'RIM', 'COWBELL'];
    const WAVES = [['sawtooth', 'SAW'], ['square', 'SQR'], ['triangle', 'TRI'], ['sine', 'SIN']];
    const DTIMES = [['1/16', 0.25], ['1/8', 0.5], ['3/16', 0.75], ['1/4', 1]];
    const PIANO = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];
    const PADS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
    const PRESETS = [
        ['ACID', { osc1: 'sawtooth', osc2: 'square', oct2: -1, detune: 0, mix: 0.25, cutoff: 300, res: 14, env: 0.7, fdec: 0.18, a: 0.003, d: 0.2, s: 0.55, r: 0.08 }],
        ['SUB', { osc1: 'sine', osc2: 'triangle', oct2: 0, detune: 4, mix: 0.35, cutoff: 900, res: 1, env: 0.2, fdec: 0.3, a: 0.005, d: 0.3, s: 0.85, r: 0.1 }],
        ['PLUCK', { osc1: 'square', osc2: 'sawtooth', oct2: 1, detune: 7, mix: 0.35, cutoff: 800, res: 4, env: 0.75, fdec: 0.16, a: 0.002, d: 0.28, s: 0, r: 0.25 }],
        ['LEAD', { osc1: 'sawtooth', osc2: 'sawtooth', oct2: 0, detune: 14, mix: 0.5, cutoff: 2200, res: 3, env: 0.3, fdec: 0.4, a: 0.01, d: 0.3, s: 0.7, r: 0.3 }],
        ['PAD', { osc1: 'sawtooth', osc2: 'triangle', oct2: 1, detune: 10, mix: 0.45, cutoff: 1300, res: 1, env: 0.25, fdec: 1.2, a: 0.35, d: 0.8, s: 0.7, r: 1.2 }]
    ];
    const preset = (name) => ({ ...PRESETS.find((p) => p[0] === name)[1] });

    // ---------- Project ----------
    function blankProject() {
        const synthTrack = (name, p, view, kb, dsend, rsend) => ({
            kind: 'synth', name, vol: 0.75, pan: 0, mute: false, solo: false, dsend, rsend, sel: 0, view, kb,
            synth: preset(p),
            patterns: Array.from({ length: PATS }, () => ({ notes: [] }))
        });
        return {
            v: 1, name: 'untitled', bpm: 120, swing: 0, mode: 'pattern', loop: { on: true, start: 0, end: 4 },
            master: { vol: 0.8, dtime: '3/16', dfb: 0.35, rvb: 0.6 },
            tracks: [
                {
                    kind: 'drums', name: 'DRUMS', vol: 0.85, pan: 0, mute: false, solo: false, dsend: 0, rsend: 0.08, sel: 0,
                    voices: VOICES.map(() => ({ tune: 0, decay: 1, level: 0.8 })),
                    patterns: Array.from({ length: PATS }, () => ({ steps: VOICES.map(() => Array(STEPS).fill(0)) }))
                },
                synthTrack('BASS', 'ACID', 24, 36, 0.05, 0.02),
                synthTrack('LEAD', 'PLUCK', 48, 60, 0.3, 0.25)
            ],
            song: [0, 1, 2].map(() => Array(BARS).fill(-1)),
            ui: { track: 0, voice: 0 }
        };
    }

    // The demo: Am - F - C - G at 118, an intro, the drop, a breakdown and the drop again
    function demoProject() {
        const P = blankProject();
        Object.assign(P, { name: 'demo · am f c g', bpm: 118, swing: 0.12, mode: 'song', loop: { on: true, start: 0, end: 16 } });
        const d = P.tracks[0];
        const put = (pat, rows) => Object.entries(rows).forEach(([v, s]) => [...s].forEach((c, i) => { pat.steps[v][i] = c === 'x' ? 2 : c === 'o' ? 1 : 0; }));
        put(d.patterns[0], { 0: 'x...x...x...x...', 2: '....x.......x...', 3: 'oo.ooo.ooo.ooo.o', 4: '..x...x...x...x.' });
        put(d.patterns[1], { 0: 'x...x...x...x.o.', 1: '....o.......x.ox', 2: '....x.......x...', 3: 'oo.ooo.ooo.o....', 4: '..x...x...x.....', 5: '..........o.o.x.' });
        put(d.patterns[2], { 0: 'x...x...x...x...', 3: '..o...o...o...o.', 6: '.......o......o.' });
        put(d.patterns[3], { 0: 'x...............', 3: 'o.o.o.o.o.o.o.o.', 6: 'x..o..o...o..o..', 7: '......x.......x.' });
        const bassline = (r) => [[0, r, 2], [3, r, 1], [4, r + 12, 1], [6, r, 1], [8, r, 2], [10, r + 12, 1], [11, r, 1], [14, r + 7, 2]]
            .map(([s, n, l]) => ({ s, n, l, v: 0.9 }));
        [33, 29, 36, 31].forEach((r, i) => { P.tracks[1].patterns[i].notes = bassline(r); });
        const arp = (c) => {
            const tones = [...c, c[0] + 12], order = [0, 1, 2, 3, 2, 1, 2, 3];
            return [0, 2, 3, 6, 8, 10, 11, 14].map((s, i) => ({ s, n: tones[order[i]], l: i % 4 === 3 ? 2 : 1, v: i % 2 ? 0.75 : 1 }));
        };
        [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]].forEach((c, i) => { P.tracks[2].patterns[i].notes = arp(c); });
        P.song = [
            [2, 2, 2, 2, 0, 0, 0, 1, 0, 0, 0, 1, 3, 3, 0, 1],
            [-1, -1, 0, 1, 0, 1, 2, 3, 0, 1, 2, 3, -1, -1, 2, 3],
            [-1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 0, 1, 2, 3]
        ];
        return P;
    }

    // Anything read back (the save, an imported file) is laid over a blank project, so a missing or mistyped
    // field takes the default and the engine never meets a shape it doesn't expect
    function merge(def, src, key) {
        if (Array.isArray(def)) {
            if (key === 'notes') {
                if (!Array.isArray(src)) return [];
                return src.filter((n) => n && [n.s, n.n, n.l].every(Number.isFinite)).slice(0, 512).map((n) => {
                    const s = clamp(Math.round(n.s), 0, STEPS - 1);
                    return { s, n: clamp(Math.round(n.n), 0, 127), l: clamp(Math.round(n.l), 1, STEPS - s), v: Number.isFinite(n.v) ? clamp(n.v, 0.1, 1.2) : 0.9 };
                });
            }
            return Array.isArray(src) && src.length === def.length ? def.map((d, i) => merge(d, src[i])) : def;
        }
        if (def && typeof def === 'object') {
            if (!src || typeof src !== 'object' || Array.isArray(src)) return def;
            const out = {};
            for (const k of Object.keys(def)) out[k] = k in src ? merge(def[k], src[k], k) : def[k];
            return out;
        }
        return typeof src === typeof def && (typeof src !== 'number' || Number.isFinite(src)) ? src : def;
    }
    function fix(src) {
        const P = merge(blankProject(), src);
        P.bpm = clamp(Math.round(P.bpm), 40, 240);
        P.swing = clamp(P.swing, 0, 0.6);
        if (!['pattern', 'song'].includes(P.mode)) P.mode = 'pattern';
        P.loop.start = clamp(Math.round(P.loop.start), 0, BARS - 1);
        P.loop.end = clamp(Math.round(P.loop.end), P.loop.start + 1, BARS);
        if (!DTIMES.some((d) => d[0] === P.master.dtime)) P.master.dtime = '3/16';
        P.song = P.song.map((l) => l.map((v) => (Number.isInteger(v) && v >= -1 && v < PATS ? v : -1)));
        P.tracks.forEach((t) => {
            t.sel = clamp(Math.round(t.sel), 0, PATS - 1);
            if (t.kind === 'drums') t.patterns.forEach((p) => { p.steps = p.steps.map((r) => r.map((v) => clamp(Math.round(v), 0, 2))); });
            else {
                t.view = clamp(Math.round(t.view), 0, 127 - ROWS);
                t.kb = clamp(Math.round(t.kb), 12, 96);
                for (const k of ['osc1', 'osc2']) if (!WAVES.some((w) => w[0] === t.synth[k])) t.synth[k] = 'sawtooth';
                t.synth.oct2 = clamp(Math.round(t.synth.oct2), -1, 1);
            }
        });
        P.ui.track = clamp(Math.round(P.ui.track), 0, 2);
        P.ui.voice = clamp(Math.round(P.ui.voice), 0, VOICES.length - 1);
        return P;
    }

    let P;
    let savedOnce = false;
    try {
        const raw = localStorage.getItem(STORE);
        savedOnce = !!raw;
        P = raw ? fix(JSON.parse(raw)) : demoProject();
    } catch (_) { P = demoProject(); }

    let saveTimer = 0;
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                localStorage.setItem(STORE, JSON.stringify(P));
                const d = new Date();
                els.saveState.textContent = 'saved ' + [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
            } catch (_) { els.saveState.textContent = 'not saved: storage is blocked'; }
        }, 300);
    }

    // ---------- Audio engine ----------
    // Shared per context: a 2 s white-noise buffer for the drums and a generated reverb impulse
    const shared = new WeakMap();
    function bufs(ctx) {
        let c = shared.get(ctx);
        if (c) return c;
        const sr = ctx.sampleRate;
        const noise = ctx.createBuffer(1, sr * 2, sr);
        const nd = noise.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const len = Math.floor(sr * 2.6);
        const imp = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = imp.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        c = { noise, imp };
        shared.set(ctx, c);
        return c;
    }

    // master <- channels (input -> vol -> pan, sending to the delay and reverb buses) -> compressor -> out
    function buildGraph(ctx, live) {
        const gain = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
        const g = { ctx, live, tracks: [], openHat: null };
        g.master = gain();
        g.comp = ctx.createDynamicsCompressor();
        g.comp.threshold.value = -12;
        g.comp.knee.value = 8;
        g.comp.ratio.value = 4;
        g.comp.attack.value = 0.004;
        g.comp.release.value = 0.2;
        g.master.connect(g.comp);
        let tail = g.comp;
        if (live) {
            g.analyser = ctx.createAnalyser();
            g.analyser.fftSize = 1024;
            g.comp.connect(g.analyser);
            tail = g.analyser;
        }
        tail.connect(ctx.destination);
        g.dIn = gain();
        g.delay = ctx.createDelay(2);
        g.dFilt = ctx.createBiquadFilter();
        g.dFilt.type = 'lowpass';
        g.dFilt.frequency.value = 3200;
        g.dFb = gain(0.35);
        g.dRet = gain(0.9);
        g.dIn.connect(g.delay);
        g.delay.connect(g.dFilt);
        g.dFilt.connect(g.dFb);
        g.dFb.connect(g.delay);
        g.dFilt.connect(g.dRet);
        g.dRet.connect(g.master);
        g.rIn = gain();
        g.conv = ctx.createConvolver();
        g.conv.buffer = bufs(ctx).imp;
        g.rRet = gain(0.6);
        g.rIn.connect(g.conv);
        g.conv.connect(g.rRet);
        g.rRet.connect(g.master);
        P.tracks.forEach(() => {
            const c = { input: gain(), vol: gain(), pan: ctx.createStereoPanner(), ds: gain(0), rs: gain(0) };
            c.input.connect(c.vol);
            c.vol.connect(c.pan);
            c.pan.connect(g.master);
            c.pan.connect(c.ds);
            c.ds.connect(g.dIn);
            c.pan.connect(c.rs);
            c.rs.connect(g.rIn);
            g.tracks.push(c);
        });
        applyMix(g);
        return g;
    }
    function applyMix(g) {
        if (!g) return;
        const sp = (param, v) => { if (g.live) param.setTargetAtTime(v, g.ctx.currentTime, 0.012); else param.value = v; };
        const solo = P.tracks.some((t) => t.solo);
        P.tracks.forEach((t, i) => {
            const c = g.tracks[i];
            sp(c.vol.gain, !t.mute && (!solo || t.solo) ? t.vol * t.vol : 0);
            sp(c.pan.pan, t.pan);
            sp(c.ds.gain, t.dsend);
            sp(c.rs.gain, t.rsend);
        });
        sp(g.master.gain, P.master.vol);
        sp(g.delay.delayTime, clamp(DTIMES.find((d) => d[0] === P.master.dtime)[1] * 60 / P.bpm, 0.01, 2));
        sp(g.dFb.gain, P.master.dfb);
        sp(g.rRet.gain, P.master.rvb);
    }

    // ---------- Drum voices ----------
    function decayEnv(ctx, t, peak, dec) {
        const e = ctx.createGain();
        e.gain.setValueAtTime(0.0001, t);
        e.gain.linearRampToValueAtTime(peak, t + 0.002);
        e.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        return e;
    }
    function tone(ctx, type, f, t, dur) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        o.start(t);
        o.stop(t + dur + 0.05);
        return o;
    }
    function noise(ctx, t, dur) {
        const s = ctx.createBufferSource();
        s.buffer = bufs(ctx).noise;
        s.start(t);
        s.stop(t + Math.min(dur + 0.05, 1.95));
        return s;
    }
    function filter(ctx, type, f, q = 1) {
        const b = ctx.createBiquadFilter();
        b.type = type;
        b.frequency.value = f;
        b.Q.value = q;
        return b;
    }
    // Six detuned squares through a band-pass, the 808's metal
    function metal(ctx, t, ratio, dur, out) {
        const bp = filter(ctx, 'bandpass', 10000, 0.8);
        const hp = filter(ctx, 'highpass', 7000);
        [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => tone(ctx, 'square', f * ratio, t, dur).connect(bp));
        bp.connect(hp);
        hp.connect(out);
    }
    const DRUMS = [
        (ctx, out, t, v, r, dc) => { // kick
            const dec = 0.5 * dc;
            const o = tone(ctx, 'sine', 160 * r, t, dec);
            o.frequency.exponentialRampToValueAtTime(42 * r, t + 0.11);
            o.connect(decayEnv(ctx, t, v, dec)).connect(out);
            tone(ctx, 'triangle', 900 * r, t, 0.02).connect(decayEnv(ctx, t, v * 0.25, 0.015)).connect(out);
        },
        (ctx, out, t, v, r, dc) => { // snare
            const o = tone(ctx, 'triangle', 190 * r, t, 0.15 * dc);
            o.frequency.exponentialRampToValueAtTime(150 * r, t + 0.1);
            o.connect(decayEnv(ctx, t, v * 0.55, 0.13 * dc)).connect(out);
            noise(ctx, t, 0.25 * dc).connect(filter(ctx, 'highpass', 1200 * r)).connect(decayEnv(ctx, t, v * 0.75, 0.22 * dc)).connect(out);
        },
        (ctx, out, t, v, r, dc) => { // clap: three quick bursts and a tail
            const e = ctx.createGain();
            e.gain.setValueAtTime(0.0001, t);
            [0, 0.011, 0.022].forEach((o) => {
                e.gain.setValueAtTime(v * 0.9, t + o);
                e.gain.exponentialRampToValueAtTime(v * 0.15, t + o + 0.009);
            });
            e.gain.setValueAtTime(v * 0.8, t + 0.033);
            e.gain.exponentialRampToValueAtTime(0.0001, t + 0.033 + 0.2 * dc);
            noise(ctx, t, 0.3 * dc).connect(filter(ctx, 'bandpass', 1100 * r, 1.2)).connect(e).connect(out);
        },
        (ctx, out, t, v, r, dc, g) => { // closed hat, chokes the open one
            if (g.openHat && g.openHat.t < t) {
                g.openHat.e.gain.cancelScheduledValues(t);
                g.openHat.e.gain.setTargetAtTime(0.0001, t, 0.008);
                g.openHat = null;
            }
            const e = decayEnv(ctx, t, v * 0.55, 0.06 * dc);
            metal(ctx, t, r, 0.08 * dc, e);
            e.connect(out);
        },
        (ctx, out, t, v, r, dc, g) => { // open hat
            const e = decayEnv(ctx, t, v * 0.45, 0.38 * dc);
            metal(ctx, t, r, 0.4 * dc, e);
            e.connect(out);
            g.openHat = { e, t };
        },
        (ctx, out, t, v, r, dc) => { // tom
            const o = tone(ctx, 'sine', 140 * r, t, 0.4 * dc);
            o.frequency.exponentialRampToValueAtTime(92 * r, t + 0.2);
            o.connect(decayEnv(ctx, t, v * 0.9, 0.35 * dc)).connect(out);
        },
        (ctx, out, t, v, r, dc) => { // rim
            tone(ctx, 'triangle', 1700 * r, t, 0.04 * dc).connect(decayEnv(ctx, t, v * 0.5, 0.03 * dc)).connect(out);
            noise(ctx, t, 0.03).connect(filter(ctx, 'bandpass', 3000 * r, 2)).connect(decayEnv(ctx, t, v * 0.5, 0.02 * dc)).connect(out);
        },
        (ctx, out, t, v, r, dc) => { // cowbell
            const bp = filter(ctx, 'bandpass', 900 * r, 1.5);
            tone(ctx, 'square', 545 * r, t, 0.3 * dc).connect(bp);
            tone(ctx, 'square', 815 * r, t, 0.3 * dc).connect(bp);
            bp.connect(decayEnv(ctx, t, v * 0.4, 0.28 * dc)).connect(out);
        }
    ];
    function drum(g, ti, v, t, vel) {
        const p = P.tracks[ti].voices[v];
        DRUMS[v](g.ctx, g.tracks[ti].input, t, p.level * vel, Math.pow(2, p.tune / 12), p.decay, g);
    }

    // ---------- Synth voice ----------
    // Returns a handle whose release(time) starts the release; sequenced notes release straight away at their end
    function synthVoice(g, ti, p, midi, t, vel, maxAttack) {
        const ctx = g.ctx, f = mtof(midi);
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = p.osc1;
        o2.type = p.osc2;
        o1.frequency.value = f;
        o2.frequency.value = f * Math.pow(2, p.oct2);
        o2.detune.value = p.detune;
        const m1 = ctx.createGain(), m2 = ctx.createGain();
        m1.gain.value = 1 - p.mix;
        m2.gain.value = p.mix;
        const lp = filter(ctx, 'lowpass', p.cutoff, p.res);
        lp.frequency.setValueAtTime(Math.min(16000, p.cutoff * Math.pow(2, p.env * 6)), t);
        lp.frequency.setTargetAtTime(p.cutoff, t, Math.max(0.005, p.fdec / 3));
        const amp = ctx.createGain();
        const lvl = 0.26 * vel, atk = Math.max(0.001, Math.min(p.a, maxAttack || Infinity));
        amp.gain.setValueAtTime(0, t);
        amp.gain.linearRampToValueAtTime(lvl, t + atk);
        amp.gain.setTargetAtTime(lvl * p.s, t + atk, Math.max(0.005, p.d / 3));
        o1.connect(m1).connect(lp);
        o2.connect(m2).connect(lp);
        lp.connect(amp).connect(g.tracks[ti].input);
        o1.start(t);
        o2.start(t);
        o1.onended = () => amp.disconnect();
        return {
            release(off) {
                off = Math.max(off, t + 0.005);
                const gp = amp.gain;
                if (gp.cancelAndHoldAtTime) gp.cancelAndHoldAtTime(off);
                else { gp.cancelScheduledValues(off); gp.setValueAtTime(off < t + atk ? lvl * (off - t) / atk : lvl * Math.max(p.s, 0.3), off); }
                gp.setTargetAtTime(0, off, Math.max(0.004, p.r / 4));
                const end = off + p.r * 1.6 + 0.05;
                o1.stop(end);
                o2.stop(end);
            }
        };
    }

    // One sixteenth for every track: the bar's pattern in SONG mode, else the track's selected pattern
    function scheduleStep(g, t, bar, step, sd, mode) {
        P.tracks.forEach((tr, ti) => {
            const pi = mode === 'song' ? P.song[ti][bar] : tr.sel;
            if (pi == null || pi < 0) return;
            const pat = tr.patterns[pi];
            if (tr.kind === 'drums') {
                pat.steps.forEach((row, v) => { if (row[step]) drum(g, ti, v, t, row[step] === 2 ? 1 : 0.62); });
            } else {
                for (const n of pat.notes) {
                    if (n.s !== step) continue;
                    const dur = n.l * sd;
                    synthVoice(g, ti, tr.synth, n.n, t, n.v, dur * 0.9).release(t + dur - 0.005);
                }
            }
        });
    }

    // ---------- Transport / scheduler ----------
    const E = { ctx: null, g: null, playing: false, rec: false, next: 0, bar: 0, step: 0, timer: 0, queue: [], recent: [], held: new Map(), stopAt: null };
    const stepDur = () => 60 / P.bpm / 4;
    const swingAt = (step, sd) => (step % 2 ? P.swing * sd * 0.5 : 0);
    function songEnd() {
        let e = 0;
        P.song.forEach((l) => l.forEach((p, b) => { if (p >= 0) e = Math.max(e, b + 1); }));
        return e;
    }
    function ensureAudio() {
        if (!E.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            E.ctx = new AC({ latencyHint: 'interactive' });
            E.g = buildGraph(E.ctx, true);
        }
        if (E.ctx.state === 'suspended') E.ctx.resume();
        els.sbAudio.textContent = `AUDIO: ${Math.round(E.ctx.sampleRate / 100) / 10} kHz`;
        return E.ctx;
    }
    function startBar() { return P.mode === 'song' && P.loop.on ? P.loop.start : 0; }
    function play() {
        if (E.playing || !ensureAudio()) return;
        E.playing = true;
        E.bar = startBar();
        E.step = 0;
        E.stopAt = null;
        E.next = E.ctx.currentTime + 0.06;
        E.timer = setInterval(tick, 25);
        tick();
        renderTransport();
        embedStatus();
    }
    function stop() {
        E.playing = false;
        E.rec = false;
        clearInterval(E.timer);
        E.queue.length = 0;
        E.recent.length = 0;
        app.classList.remove('is-playing');
        showPos(startBar(), 0, true);
        renderTransport();
        embedStatus();
    }
    const toggle = () => (E.playing ? stop() : play());
    function tick() {
        const sd = stepDur();
        while (E.next < E.ctx.currentTime + 0.12) {
            if (P.mode === 'song' && !P.loop.on && E.bar >= Math.max(1, songEnd())) {
                if (E.stopAt == null) E.stopAt = E.next;
                break;
            }
            const t = E.next + swingAt(E.step, sd);
            scheduleStep(E.g, t, E.bar, E.step, sd, P.mode);
            const q = { time: t, bar: E.bar, step: E.step };
            E.queue.push(q);
            E.recent.push(q);
            if (E.recent.length > 32) E.recent.shift();
            E.next += sd;
            if (++E.step >= STEPS) {
                E.step = 0;
                if (P.mode === 'song') {
                    E.bar++;
                    if (P.loop.on && (E.bar >= P.loop.end || E.bar < P.loop.start)) E.bar = P.loop.start;
                }
            }
        }
        if (E.stopAt != null && E.ctx.currentTime >= E.stopAt) stop();
    }

    // ---------- Elements ----------
    const $ = (id) => document.getElementById(id);
    const els = {
        play: $('st-play'), stop: $('st-stop'), rec: $('st-rec'), mode: $('st-mode'), loop: $('st-loop'), bpm: $('st-bpm'),
        swing: $('st-swing'), pos: $('st-pos'), tmeta: $('st-tmeta'), scope: $('st-scope'),
        arr: $('st-arr'), arrMeta: $('st-arr-meta'),
        tabs: $('st-tabs'), slots: $('st-slots'), tools: $('st-tools'), editor: $('st-editor'), editMeta: $('st-edit-meta'),
        inst: $('st-inst'), instMeta: $('st-inst-meta'), mix: $('st-mix'),
        name: $('st-name'), saveState: $('st-save-state'), newBtn: $('st-new'), demoBtn: $('st-demo'), wav: $('st-wav'),
        exportBtn: $('st-export'), importBtn: $('st-import'), file: $('st-file'), stats: $('st-stats'),
        sbAudio: $('st-sb-audio'), sbBpm: $('st-sb-bpm')
    };
    const embedStatus = () => window.TirlEmbed && window.TirlEmbed.status(E.playing ? `PLAYING · ${P.bpm} BPM` : 'STOPPED');
    function changed(...parts) {
        save();
        for (const p of parts) ({ arr: renderArr, editor: renderEditor, inst: renderInst, mix: renderMix, transport: renderTransport, stats: renderStats })[p]();
    }

    // ---------- Controls: knobs and switches ----------
    function knob(o) {
        const el = document.createElement('div');
        el.className = 'st-knob';
        el.tabIndex = 0;
        el.setAttribute('role', 'slider');
        el.setAttribute('aria-label', o.title || o.label);
        el.title = (o.title || o.label) + ' · drag, scroll or arrow keys · double-click resets';
        if (o.color) el.style.setProperty('--kc', o.color);
        el.innerHTML = '<div class="st-dial"><i></i></div><div class="st-kval"></div><div class="st-klbl"></div>';
        el.querySelector('.st-klbl').textContent = o.label;
        const val = el.querySelector('.st-kval');
        const { min, max } = o, log = o.curve === 'log';
        const toN = (v) => clamp(log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min), 0, 1);
        const fromN = (n) => {
            let v = log ? min * Math.pow(max / min, n) : min + (max - min) * n;
            if (o.step) v = Math.round(v / o.step) * o.step;
            return clamp(v, min, max);
        };
        const fmt = o.fmt || ((v) => String(Math.round(v * 100) / 100));
        let n = 0, drag = null;
        const show = (v) => { el.style.setProperty('--n', n.toFixed(4)); val.textContent = fmt(v); el.setAttribute('aria-valuetext', fmt(v)); };
        const draw = () => { const v = o.get(); n = toN(v); show(v); };
        const setN = (nn) => { n = clamp(nn, 0, 1); const v = fromN(n); o.set(v); show(v); save(); };
        el.addEventListener('pointerdown', (e) => {
            if (e.button) return;
            e.preventDefault();
            el.focus({ preventScroll: true });
            el.setPointerCapture(e.pointerId);
            drag = { y: e.clientY, n };
            el.classList.add('is-drag');
        });
        el.addEventListener('pointermove', (e) => { if (drag) setN(drag.n + (drag.y - e.clientY) / (e.shiftKey ? 700 : 170)); });
        const end = () => { drag = null; el.classList.remove('is-drag'); };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('wheel', (e) => { e.preventDefault(); setN(n - Math.sign(e.deltaY) * (e.shiftKey ? 0.005 : 0.025)); }, { passive: false });
        el.addEventListener('dblclick', () => { o.set(o.def); draw(); save(); });
        el.addEventListener('keydown', (e) => {
            const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
            if (!d) return;
            e.preventDefault();
            e.stopPropagation();
            setN(n + d * (e.shiftKey ? 0.005 : 0.025));
        });
        draw();
        return el;
    }
    function seg(opts, get, set, label) {
        const el = document.createElement('div');
        el.className = 'st-seg';
        if (label) {
            const l = document.createElement('span');
            l.className = 'st-seg-lbl';
            l.textContent = label;
            el.append(l);
        }
        const btns = opts.map(([v, text]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = text;
            b.addEventListener('click', () => { set(v); sync(); save(); });
            el.append(b);
            return [b, v];
        });
        const sync = () => btns.forEach(([b, v]) => b.setAttribute('aria-pressed', String(v === get())));
        sync();
        return el;
    }
    function group(title, ...kids) {
        const el = document.createElement('div');
        el.className = 'st-group';
        const h = document.createElement('div');
        h.className = 'st-group-title';
        h.textContent = title;
        el.append(h, ...kids);
        return el;
    }
    function grid(...kids) {
        const el = document.createElement('div');
        el.className = 'st-kgrid';
        el.append(...kids);
        return el;
    }
    const pct = (v) => Math.round(v * 100) + '%';
    const hz = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v) + '');
    const sec = (v) => (v < 1 ? Math.round(v * 1000) + 'ms' : v.toFixed(2) + 's');
    const panFmt = (v) => (Math.abs(v) < 0.02 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100));

    // ---------- Transport ----------
    function renderTransport() {
        app.classList.toggle('is-playing', E.playing);
        app.classList.toggle('is-song', P.mode === 'song');
        els.play.setAttribute('aria-pressed', String(E.playing));
        els.rec.setAttribute('aria-pressed', String(E.rec));
        els.loop.setAttribute('aria-pressed', String(P.loop.on));
        els.loop.disabled = P.mode !== 'song';
        els.mode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === P.mode)));
        if (document.activeElement !== els.bpm) els.bpm.value = P.bpm;
        els.sbBpm.textContent = `${P.bpm} BPM · ${P.mode.toUpperCase()}`;
        els.tmeta.textContent = E.rec ? 'RECORDING FROM THE KEYBOARD' : E.playing ? (P.mode === 'song' ? 'PLAYING THE ARRANGEMENT' : 'LOOPING THE SELECTED PATTERNS') : 'SPACE TO PLAY';
    }
    els.play.addEventListener('click', toggle);
    els.stop.addEventListener('click', stop);
    els.rec.addEventListener('click', () => { E.rec = !E.rec; if (E.rec && !E.playing) play(); renderTransport(); });
    els.mode.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b || b.dataset.v === P.mode) return;
        P.mode = b.dataset.v;
        if (E.playing) E.bar = startBar();
        changed('transport', 'arr');
    });
    els.loop.addEventListener('click', () => { P.loop.on = !P.loop.on; changed('transport', 'arr'); });
    const setBpm = (v) => {
        if (!Number.isFinite(v)) return;
        P.bpm = clamp(Math.round(v), 40, 240);
        applyMix(E.g);
        changed('transport');
    };
    els.bpm.addEventListener('change', () => setBpm(parseFloat(els.bpm.value)));
    els.bpm.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.bpm.blur(); });
    els.bpm.addEventListener('blur', () => { els.bpm.value = P.bpm; });
    els.bpm.addEventListener('wheel', (e) => { e.preventDefault(); setBpm(P.bpm - Math.sign(e.deltaY)); els.bpm.value = P.bpm; }, { passive: false });
    els.swing.append(knob({ label: 'SWING', min: 0, max: 0.6, def: 0, get: () => P.swing, set: (v) => { P.swing = v; }, fmt: pct, color: '139, 233, 253' }));

    // Where the music is: the position readout and both playheads (CSS reads --step and --pos)
    function showPos(bar, step, idle) {
        app.style.setProperty('--step', step);
        app.style.setProperty('--pos', ((bar + step / STEPS) / BARS).toFixed(4));
        els.pos.textContent = idle ? '—.—.—' : `${P.mode === 'song' ? bar + 1 : PAT[P.tracks[P.ui.track].sel]}.${(step >> 2) + 1}.${(step & 3) + 1}`;
        const tr = P.tracks[P.ui.track];
        app.classList.toggle('ph-ghost', P.mode === 'song' && P.song[P.ui.track][bar] !== tr.sel);
    }

    // ---------- Arrangement ----------
    function renderArr() {
        let h = '<div class="st-arr-labels"><span class="st-arr-corner">BAR</span>';
        P.tracks.forEach((t, i) => {
            h += `<button type="button" class="st-lane-lbl${t.mute ? ' is-mute' : ''}" data-t="${i}" style="--tc:${COLORS[i]}" aria-pressed="${P.ui.track === i}">${t.name}</button>`;
        });
        h += '</div><div class="st-arr-grid"><div class="st-ruler" title="Drag to set the loop">';
        for (let b = 0; b < BARS; b++) h += `<span${b % 4 === 0 ? ' class="is-four"' : ''}>${b + 1}</span>`;
        h += '<i class="st-loop"></i></div>';
        P.tracks.forEach((t, i) => {
            h += `<div class="st-lane" style="--tc:${COLORS[i]}">`;
            for (let b = 0; b < BARS; b++) {
                const p = P.song[i][b];
                const cur = p >= 0 && i === P.ui.track && p === t.sel;
                h += `<button type="button" class="st-cell${p >= 0 ? ' is-on' : ''}${cur ? ' is-cur' : ''}${b % 4 === 0 ? ' is-four' : ''}" data-t="${i}" data-b="${b}" aria-label="${t.name} bar ${b + 1}: ${p >= 0 ? 'pattern ' + PAT[p] : 'empty'}">${p >= 0 ? PAT[p] : ''}</button>`;
            }
            h += '</div>';
        });
        h += '<i class="st-ph st-arr-ph"></i></div>';
        els.arr.innerHTML = h;
        const loop = els.arr.querySelector('.st-loop');
        loop.style.left = (P.loop.start / BARS * 100) + '%';
        loop.style.width = ((P.loop.end - P.loop.start) / BARS * 100) + '%';
        loop.classList.toggle('is-off', !P.loop.on || P.mode !== 'song');
        const end = songEnd();
        els.arrMeta.textContent = P.mode === 'song'
            ? (P.loop.on ? `LOOP ${P.loop.start + 1}–${P.loop.end}` : `${end} BAR${end === 1 ? '' : 'S'} · ONE PASS`)
            : 'SWITCH TO SONG TO PLAY IT';
    }
    els.arr.addEventListener('click', (e) => {
        const lbl = e.target.closest('.st-lane-lbl');
        if (lbl) return selectTrack(+lbl.dataset.t);
        const c = e.target.closest('.st-cell');
        if (!c) return;
        const ti = +c.dataset.t, b = +c.dataset.b, tr = P.tracks[ti];
        const p = P.song[ti][b];
        // Empty: place the track's selected pattern. Filled: step on to the next one, past D back to empty
        const next = p < 0 ? tr.sel : p + 1 < PATS ? p + 1 : -1;
        P.song[ti][b] = next;
        if (next >= 0) tr.sel = next;
        P.ui.track = ti;
        changed('arr', 'editor', 'inst', 'stats');
    });
    els.arr.addEventListener('contextmenu', (e) => {
        const c = e.target.closest('.st-cell');
        if (!c) return;
        e.preventDefault();
        P.song[+c.dataset.t][+c.dataset.b] = -1;
        changed('arr', 'stats');
    });
    els.arr.addEventListener('pointerdown', (e) => {
        const ruler = e.target.closest('.st-ruler');
        if (!ruler || e.button) return;
        e.preventDefault();
        ruler.setPointerCapture(e.pointerId);
        const barAt = (x) => { const r = ruler.getBoundingClientRect(); return clamp(Math.floor((x - r.left) / r.width * BARS), 0, BARS - 1); };
        const a = barAt(e.clientX);
        const set = (b) => {
            P.loop.start = Math.min(a, b);
            P.loop.end = Math.max(a, b) + 1;
            P.loop.on = true;
            if (P.mode !== 'song') P.mode = 'song';
            const loop = ruler.querySelector('.st-loop');
            loop.style.left = (P.loop.start / BARS * 100) + '%';
            loop.style.width = ((P.loop.end - P.loop.start) / BARS * 100) + '%';
            loop.classList.remove('is-off');
        };
        set(a);
        const move = (ev) => set(barAt(ev.clientX));
        const up = () => {
            ruler.removeEventListener('pointermove', move);
            ruler.removeEventListener('pointerup', up);
            ruler.removeEventListener('pointercancel', up);
            changed('arr', 'transport');
        };
        ruler.addEventListener('pointermove', move);
        ruler.addEventListener('pointerup', up);
        ruler.addEventListener('pointercancel', up);
    });

    // ---------- Pattern editor ----------
    let clip = null; // COPY / PASTE, within one kind of track
    let cells = [];
    const curTrack = () => P.tracks[P.ui.track];
    const curPat = () => { const t = curTrack(); return t.patterns[t.sel]; };
    const hasContent = (t, p) => (t.kind === 'drums' ? p.steps.some((r) => r.some(Boolean)) : p.notes.length > 0);

    function selectTrack(i) {
        if (i === P.ui.track) return;
        P.ui.track = i;
        changed('arr', 'editor', 'inst');
    }
    function selectPattern(i) {
        curTrack().sel = clamp(i, 0, PATS - 1);
        changed('arr', 'editor');
    }

    function renderEditor() {
        const ti = P.ui.track, tr = curTrack();
        app.style.setProperty('--tc', COLORS[ti]);
        els.tabs.innerHTML = P.tracks.map((t, i) => `<button type="button" class="st-tab" data-t="${i}" style="--tc:${COLORS[i]}" aria-pressed="${i === ti}" title="${t.name} (${i + 1})">${t.name}</button>`).join('');
        els.slots.innerHTML = [...PAT].map((c, i) => `<button type="button" class="st-slot${hasContent(tr, tr.patterns[i]) ? ' is-full' : ''}" data-p="${i}" aria-pressed="${i === tr.sel}" title="Pattern ${c} ([ / ] to step)">${c}</button>`).join('');
        els.tools.innerHTML = (tr.kind === 'synth'
            ? '<button type="button" class="st-tool" data-a="down" title="View an octave lower">OCT ▼</button><button type="button" class="st-tool" data-a="up" title="View an octave higher">OCT ▲</button>'
            : '')
            + '<button type="button" class="st-tool" data-a="copy">COPY</button>'
            + `<button type="button" class="st-tool" data-a="paste"${clip && clip.kind === tr.kind ? '' : ' disabled'}>PASTE</button>`
            + '<button type="button" class="st-tool is-danger" data-a="clear">CLEAR</button>';
        let h = `<div class="st-seq ${tr.kind === 'drums' ? 'is-drums' : 'is-roll'}">`;
        if (tr.kind === 'drums') {
            h += '<div class="st-seq-labels">';
            VOICES.forEach((v, r) => { h += `<button type="button" class="st-row-lbl" data-r="${r}" aria-pressed="${P.ui.voice === r}" title="${v} (${PADS[r].toUpperCase()})">${v}</button>`; });
            h += '</div><div class="st-seq-grid" style="--rows:' + VOICES.length + '">';
            for (let r = 0; r < VOICES.length; r++) for (let s = 0; s < STEPS; s++) h += `<i class="st-c${s % 4 === 0 ? ' is-beat' : ''}" data-r="${r}" data-s="${s}"></i>`;
        } else {
            h += '<div class="st-seq-labels">';
            for (let r = 0; r < ROWS; r++) {
                const m = tr.view + ROWS - 1 - r;
                h += `<button type="button" class="st-row-lbl${BLACK.has(m % 12) ? ' is-black' : ''}${m % 12 === 0 ? ' is-c' : ''}" data-r="${r}" data-m="${m}" tabindex="-1">${noteName(m)}</button>`;
            }
            h += '</div><div class="st-seq-grid" style="--rows:' + ROWS + '">';
            for (let r = 0; r < ROWS; r++) {
                const m = tr.view + ROWS - 1 - r;
                for (let s = 0; s < STEPS; s++) h += `<i class="st-c${s % 4 === 0 ? ' is-beat' : ''}${BLACK.has(m % 12) ? ' is-black' : ''}" data-r="${r}" data-s="${s}"></i>`;
            }
        }
        h += '<b class="st-ph st-ed-ph"></b></div></div>';
        els.editor.innerHTML = h;
        cells = Array.from(els.editor.querySelectorAll('.st-c'));
        paint();
    }
    function paint() {
        const tr = curTrack(), pat = curPat();
        if (tr.kind === 'drums') {
            cells.forEach((c, i) => {
                const v = pat.steps[Math.floor(i / STEPS)][i % STEPS];
                c.classList.toggle('is-on', v > 0);
                c.classList.toggle('is-acc', v === 2);
            });
            els.editMeta.textContent = 'CLICK TO TOGGLE · DRAG TO PAINT · RIGHT-CLICK OR SHIFT FOR ACCENT';
        } else {
            cells.forEach((c) => c.classList.remove('is-note', 'is-head', 'is-last'));
            let above = 0, below = 0;
            for (const n of pat.notes) {
                const r = tr.view + ROWS - 1 - n.n;
                if (r < 0) { above++; continue; }
                if (r >= ROWS) { below++; continue; }
                for (let k = 0; k < n.l && n.s + k < STEPS; k++) {
                    const c = cells[r * STEPS + n.s + k];
                    c.classList.add('is-note');
                    if (!k) c.classList.add('is-head');
                    if (k === n.l - 1 || n.s + k === STEPS - 1) c.classList.add('is-last');
                }
            }
            const off = [above && `${above} ABOVE`, below && `${below} BELOW`].filter(Boolean).join(' · ');
            els.editMeta.textContent = off ? `NOTES OUT OF VIEW: ${off}` : 'CLICK TO DRAW · DRAG TO LENGTHEN · CLICK A NOTE TO ERASE';
        }
        els.slots.querySelectorAll('.st-slot').forEach((b, i) => b.classList.toggle('is-full', hasContent(tr, tr.patterns[i])));
    }

    els.tabs.addEventListener('click', (e) => { const b = e.target.closest('.st-tab'); if (b) selectTrack(+b.dataset.t); });
    els.slots.addEventListener('click', (e) => { const b = e.target.closest('.st-slot'); if (b) selectPattern(+b.dataset.p); });
    els.tools.addEventListener('click', (e) => {
        const b = e.target.closest('.st-tool');
        if (!b) return;
        const tr = curTrack();
        const a = b.dataset.a;
        if (a === 'up' || a === 'down') {
            tr.view = clamp(tr.view + (a === 'up' ? 12 : -12), 0, 127 - ROWS);
            return changed('editor');
        }
        if (a === 'copy') { clip = { kind: tr.kind, data: JSON.parse(JSON.stringify(curPat())) }; return renderEditor(); }
        if (a === 'paste' && clip && clip.kind === tr.kind) tr.patterns[tr.sel] = JSON.parse(JSON.stringify(clip.data));
        if (a === 'clear') {
            if (tr.kind === 'drums') curPat().steps.forEach((r) => r.fill(0));
            else curPat().notes = [];
        }
        changed('editor', 'stats');
    });

    // Drawing: drums paint on/off across the cells you drag over; notes draw and stretch, or erase
    let drag = null;
    const gridEl = () => els.editor.querySelector('.st-seq-grid');
    els.editor.addEventListener('contextmenu', (e) => { if (e.target.closest('.st-seq-grid')) e.preventDefault(); });
    els.editor.addEventListener('pointerdown', (e) => {
        const lbl = e.target.closest('.st-row-lbl');
        if (lbl) {
            const tr = curTrack();
            if (tr.kind === 'drums') {
                P.ui.voice = +lbl.dataset.r;
                els.editor.querySelectorAll('.st-row-lbl').forEach((l) => l.setAttribute('aria-pressed', String(l === lbl)));
                renderInst();
                audition(+lbl.dataset.r);
                save();
            } else audition(+lbl.dataset.m);
            return;
        }
        const c = e.target.closest('.st-c');
        if (!c || e.button > 2 || e.button === 1) return;
        e.preventDefault();
        const g = gridEl();
        g.setPointerCapture(e.pointerId);
        const r = +c.dataset.r, s = +c.dataset.s, tr = curTrack(), pat = curPat();
        if (tr.kind === 'drums') {
            const cur = pat.steps[r][s];
            const v = e.button === 2 || e.shiftKey ? (cur === 2 ? 1 : 2) : cur ? 0 : 1;
            drag = { kind: 'drum', v };
            setStep(r, s, v);
        } else {
            const m = tr.view + ROWS - 1 - r;
            const i = pat.notes.findIndex((n) => n.n === m && s >= n.s && s < n.s + n.l);
            if (i >= 0 || e.button === 2) {
                if (i >= 0) pat.notes.splice(i, 1);
                drag = { kind: 'erase' };
            } else {
                const note = { s, n: m, l: 1, v: 0.9 };
                pat.notes.push(note);
                drag = { kind: 'draw', note };
                audition(m);
            }
            paint();
        }
    });
    els.editor.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const g = gridEl();
        const rect = g.getBoundingClientRect();
        const s = clamp(Math.floor((e.clientX - rect.left) / rect.width * STEPS), 0, STEPS - 1);
        if (drag.kind === 'draw') {
            const l = clamp(s - drag.note.s + 1, 1, STEPS - drag.note.s);
            if (l !== drag.note.l) { drag.note.l = l; paint(); }
            return;
        }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const c = el && el.closest && el.closest('.st-c');
        if (!c) return;
        const r = +c.dataset.r, cs = +c.dataset.s, pat = curPat();
        if (drag.kind === 'drum') {
            if (pat.steps[r][cs] !== drag.v) setStep(r, cs, drag.v);
        } else {
            const m = curTrack().view + ROWS - 1 - r;
            const i = pat.notes.findIndex((n) => n.n === m && cs >= n.s && cs < n.s + n.l);
            if (i >= 0) { pat.notes.splice(i, 1); paint(); }
        }
    });
    const endDrag = () => { if (drag) { drag = null; paint(); changed('stats'); } };
    els.editor.addEventListener('pointerup', endDrag);
    els.editor.addEventListener('pointercancel', endDrag);
    function setStep(r, s, v) {
        curPat().steps[r][s] = v;
        const c = cells[r * STEPS + s];
        c.classList.toggle('is-on', v > 0);
        c.classList.toggle('is-acc', v === 2);
        if (v && !E.playing) audition(r, v === 2 ? 1 : 0.62);
    }
    function audition(x, vel = 0.9) {
        if (!ensureAudio()) return;
        const now = E.ctx.currentTime, ti = P.ui.track, tr = curTrack();
        if (tr.kind === 'drums') drum(E.g, ti, x, now, vel);
        else synthVoice(E.g, ti, tr.synth, x, now, vel).release(now + 0.22);
    }

    // ---------- Instrument ----------
    function renderInst() {
        const ti = P.ui.track, tr = curTrack();
        const color = COLORS[ti];
        els.inst.innerHTML = '';
        els.inst.style.setProperty('--tc', color);
        if (tr.kind === 'drums') {
            const v = P.ui.voice, vp = tr.voices[v];
            els.instMeta.textContent = `DRUMS · ${VOICES[v]}`;
            const pads = document.createElement('div');
            pads.className = 'st-pads';
            VOICES.forEach((name, i) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'st-pad';
                b.textContent = name;
                b.title = `${name} (${PADS[i].toUpperCase()})`;
                b.setAttribute('aria-pressed', String(i === v));
                b.addEventListener('pointerdown', () => {
                    P.ui.voice = i;
                    audition(i, 1);
                    renderInst();
                    els.editor.querySelectorAll('.st-row-lbl').forEach((l) => l.setAttribute('aria-pressed', String(+l.dataset.r === i)));
                    save();
                });
                pads.append(b);
            });
            els.inst.append(
                group('VOICES', pads),
                group(VOICES[v], grid(
                    knob({ label: 'TUNE', min: -12, max: 12, step: 1, def: 0, get: () => vp.tune, set: (x) => { vp.tune = x; }, fmt: (x) => (x > 0 ? '+' : '') + x + 'st', color }),
                    knob({ label: 'DECAY', min: 0.2, max: 2.5, def: 1, curve: 'log', get: () => vp.decay, set: (x) => { vp.decay = x; }, fmt: (x) => x.toFixed(2) + '×', color }),
                    knob({ label: 'LEVEL', min: 0, max: 1, def: 0.8, get: () => vp.level, set: (x) => { vp.level = x; }, fmt: pct, color })
                ))
            );
            return;
        }
        const p = tr.synth;
        els.instMeta.textContent = `${tr.name} · SYNTH`;
        const presets = document.createElement('div');
        presets.className = 'st-presets';
        PRESETS.forEach(([name, vals]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'st-tool';
            b.textContent = name;
            b.addEventListener('click', () => { Object.assign(p, vals); renderInst(); save(); audition(tr.kb + 12); });
            presets.append(b);
        });
        const k = (label, key, min, max, def, fmt, curve, step) => knob({ label, min, max, def, fmt, curve, step, color, get: () => p[key], set: (x) => { p[key] = x; } });
        els.inst.append(
            group('PRESETS', presets),
            group('OSCILLATORS',
                seg(WAVES, () => p.osc1, (v) => { p.osc1 = v; }, 'OSC 1'),
                seg(WAVES, () => p.osc2, (v) => { p.osc2 = v; }, 'OSC 2'),
                seg([[-1, '−1'], [0, '0'], [1, '+1']], () => p.oct2, (v) => { p.oct2 = v; }, 'OSC 2 OCT'),
                grid(k('DETUNE', 'detune', 0, 50, 7, (x) => Math.round(x) + 'c'), k('MIX', 'mix', 0, 1, 0.35, pct))
            ),
            group('FILTER', grid(
                k('CUTOFF', 'cutoff', 40, 12000, 1200, hz, 'log'),
                k('RESO', 'res', 0.1, 20, 3, (x) => x.toFixed(1)),
                k('ENV', 'env', 0, 1, 0.4, pct),
                k('F.DEC', 'fdec', 0.02, 2, 0.3, sec, 'log')
            )),
            group('AMP', grid(
                k('ATK', 'a', 0.001, 2, 0.005, sec, 'log'),
                k('DEC', 'd', 0.01, 2, 0.3, sec, 'log'),
                k('SUS', 's', 0, 1, 0.6, pct),
                k('REL', 'r', 0.01, 3, 0.2, sec, 'log')
            ))
        );
    }

    // ---------- Mixer ----------
    function renderMix() {
        els.mix.innerHTML = '';
        const strips = document.createElement('div');
        strips.className = 'st-strips';
        P.tracks.forEach((t, i) => {
            const color = COLORS[i];
            const s = document.createElement('div');
            s.className = 'st-strip';
            s.style.setProperty('--tc', color);
            const name = document.createElement('div');
            name.className = 'st-strip-name';
            name.textContent = t.name;
            const k = (label, key, min, max, def, fmt) => knob({ label, title: `${t.name} ${label}`, min, max, def, fmt, color, get: () => t[key], set: (x) => { t[key] = x; applyMix(E.g); } });
            const ms = document.createElement('div');
            ms.className = 'st-ms';
            [['mute', 'M', 'Mute'], ['solo', 'S', 'Solo']].forEach(([key, text, title]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'st-ms-btn is-' + key;
                b.textContent = text;
                b.title = `${title} ${t.name}`;
                b.setAttribute('aria-pressed', String(t[key]));
                b.addEventListener('click', () => {
                    t[key] = !t[key];
                    b.setAttribute('aria-pressed', String(t[key]));
                    applyMix(E.g);
                    changed('arr');
                });
                ms.append(b);
            });
            s.append(name, k('VOL', 'vol', 0, 1, 0.75, pct), k('PAN', 'pan', -1, 1, 0, panFmt), k('DLY', 'dsend', 0, 1, 0, pct), k('RVB', 'rsend', 0, 1, 0, pct), ms);
            strips.append(s);
        });
        const m = P.master, color = '139, 233, 253';
        const s = document.createElement('div');
        s.className = 'st-strip is-master';
        s.style.setProperty('--tc', color);
        const name = document.createElement('div');
        name.className = 'st-strip-name';
        name.textContent = 'MASTER';
        const k = (label, key, min, max, def, fmt) => knob({ label, title: `Master ${label}`, min, max, def, fmt, color, get: () => m[key], set: (x) => { m[key] = x; applyMix(E.g); } });
        s.append(name, k('VOL', 'vol', 0, 1, 0.8, pct), k('FDBK', 'dfb', 0, 0.9, 0.35, pct), k('RVB', 'rvb', 0, 1, 0.6, pct));
        strips.append(s);
        els.mix.append(strips, seg(DTIMES.map((d) => [d[0], d[0]]), () => m.dtime, (v) => { m.dtime = v; applyMix(E.g); }, 'DELAY TIME'));
    }

    // ---------- Scope ----------
    const scope = els.scope.getContext('2d');
    let scopeBuf = null;
    function sizeScope() {
        const r = els.scope.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
        els.scope.width = Math.max(1, Math.round(r.width * dpr));
        els.scope.height = Math.max(1, Math.round(r.height * dpr));
    }
    if (window.ResizeObserver) new ResizeObserver(sizeScope).observe(els.scope);
    sizeScope();
    function drawScope() {
        const w = els.scope.width, h = els.scope.height, dpr = window.devicePixelRatio || 1;
        scope.clearRect(0, 0, w, h);
        scope.strokeStyle = 'rgba(139, 233, 253, 0.12)';
        scope.lineWidth = 1;
        scope.beginPath();
        for (let i = 1; i < 4; i++) { scope.moveTo((w * i) / 4, 0); scope.lineTo((w * i) / 4, h); }
        scope.moveTo(0, h / 2);
        scope.lineTo(w, h / 2);
        scope.stroke();
        scope.strokeStyle = `rgb(${COLORS[P.ui.track]})`;
        scope.lineWidth = 1.5 * dpr;
        scope.shadowColor = scope.strokeStyle;
        scope.shadowBlur = 6 * dpr;
        scope.beginPath();
        if (E.g && E.ctx.state === 'running') {
            const a = E.g.analyser;
            if (!scopeBuf) scopeBuf = new Uint8Array(a.fftSize);
            a.getByteTimeDomainData(scopeBuf);
            // Start on a rising zero crossing so the wave stands still
            let start = 0;
            for (let i = 1; i < scopeBuf.length / 2; i++) if (scopeBuf[i - 1] < 128 && scopeBuf[i] >= 128) { start = i; break; }
            const n = scopeBuf.length / 2;
            for (let i = 0; i < n; i++) {
                const x = (i / (n - 1)) * w, y = h / 2 + ((scopeBuf[start + i] - 128) / 128) * (h / 2) * 0.9;
                if (i) scope.lineTo(x, y); else scope.moveTo(x, y);
            }
        } else {
            scope.moveTo(0, h / 2);
            scope.lineTo(w, h / 2);
        }
        scope.stroke();
        scope.shadowBlur = 0;
    }
    let lastStep = -1;
    (function frame() {
        requestAnimationFrame(frame);
        if (E.playing) {
            const now = E.ctx.currentTime;
            let q = null;
            while (E.queue.length && E.queue[0].time <= now + 0.005) q = E.queue.shift();
            if (q && q.step !== lastStep) { lastStep = q.step; showPos(q.bar, q.step); }
        }
        drawScope();
    })();

    // ---------- Keyboard: transport, piano / pads, recording ----------
    function nearestStep(now) {
        let best = null;
        for (const q of E.recent) if (!best || Math.abs(q.time - now) < Math.abs(best.time - now)) best = q;
        return best && Math.abs(best.time - now) < stepDur() ? best : null;
    }
    // The pattern a recorded note goes into: the one playing on the track at that bar (SONG mode places the
    // selected pattern in an empty bar so you hear what you played)
    function recPattern(ti, bar) {
        const tr = P.tracks[ti];
        if (P.mode !== 'song') return tr.sel;
        if (P.song[ti][bar] < 0) { P.song[ti][bar] = tr.sel; renderArr(); }
        return P.song[ti][bar];
    }
    function lightKey(ti, x, on) {
        if (ti !== P.ui.track) return;
        const sel = curTrack().kind === 'drums' ? `.st-row-lbl[data-r="${x}"]` : `.st-row-lbl[data-m="${x}"]`;
        const l = els.editor.querySelector(sel);
        if (l) l.classList.toggle('is-held', on);
    }
    function noteOn(k) {
        if (E.held.has(k)) return false;
        const ti = P.ui.track, tr = P.tracks[ti];
        if (tr.kind === 'drums') {
            const v = PADS.indexOf(k);
            if (v < 0 || !ensureAudio()) return false;
            const now = E.ctx.currentTime;
            drum(E.g, ti, v, now, 1);
            if (E.rec && E.playing) {
                const q = nearestStep(now);
                if (q) {
                    const pi = recPattern(ti, q.bar);
                    tr.patterns[pi].steps[v][q.step] = Math.max(1, tr.patterns[pi].steps[v][q.step]);
                    if (pi === tr.sel) paint();
                    save();
                }
            }
            E.held.set(k, { ti, x: v });
            lightKey(ti, v, true);
            return true;
        }
        const semi = PIANO.indexOf(k);
        if (semi < 0 || !ensureAudio()) return false;
        const n = clamp(tr.kb + semi, 0, 127), now = E.ctx.currentTime;
        const held = { ti, x: n, h: synthVoice(E.g, ti, tr.synth, n, now, 0.9), on: now, note: null, pi: -1 };
        if (E.rec && E.playing) {
            const q = nearestStep(now);
            if (q) {
                const pi = recPattern(ti, q.bar), pat = tr.patterns[pi];
                pat.notes = pat.notes.filter((o) => !(o.n === n && o.s === q.step));
                held.note = { s: q.step, n, l: 1, v: 0.9 };
                held.pi = pi;
                pat.notes.push(held.note);
                if (pi === tr.sel && ti === P.ui.track) paint();
            }
        }
        E.held.set(k, held);
        lightKey(ti, n, true);
        return true;
    }
    function noteOff(k) {
        const held = E.held.get(k);
        if (!held) return;
        E.held.delete(k);
        lightKey(held.ti, held.x, false);
        if (held.h) held.h.release(E.ctx.currentTime);
        if (held.note) {
            held.note.l = clamp(Math.round((E.ctx.currentTime - held.on) / stepDur()), 1, STEPS - held.note.s);
            const tr = P.tracks[held.ti];
            if (held.ti === P.ui.track && held.pi === tr.sel) paint();
            changed('stats');
        }
    }
    const allOff = () => [...E.held.keys()].forEach(noteOff);
    const typing = (t) => t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]');
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
        const k = e.key.toLowerCase();
        if (e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) toggle();
            return;
        }
        if (e.repeat) { if (PIANO.includes(k)) e.preventDefault(); return; }
        if (k === 'r') { E.rec = !E.rec; if (E.rec && !E.playing) play(); renderTransport(); }
        else if (k === '1' || k === '2' || k === '3') selectTrack(+k - 1);
        else if (k === '[' || k === ']') selectPattern(curTrack().sel + (k === ']' ? 1 : -1));
        else if (k === 'z' || k === 'x') {
            const tr = curTrack();
            if (tr.kind !== 'synth') return;
            tr.kb = clamp(tr.kb + (k === 'x' ? 12 : -12), 12, 96);
            // keep the piano roll on the keys you're playing
            if (tr.kb < tr.view || tr.kb + 12 > tr.view + ROWS) { tr.view = clamp(tr.kb - 6 - ((tr.kb - 6) % 12), 0, 127 - ROWS); renderEditor(); }
            els.editMeta.textContent = `KEYBOARD AT ${noteName(tr.kb)}`;
            save();
        } else if (!noteOn(k)) return;
        e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === ' ' && !typing(e.target)) e.preventDefault(); // a focused button doesn't also get clicked
        noteOff(e.key.toLowerCase());
    });
    window.addEventListener('blur', allOff);

    // ---------- Project ----------
    function renderStats() {
        const pats = P.tracks.reduce((a, t) => a + t.patterns.filter((p) => hasContent(t, p)).length, 0);
        const end = songEnd(), secs = Math.round(end * STEPS * stepDur());
        els.stats.innerHTML = `<dt>tempo</dt><dd>${P.bpm} bpm</dd><dt>patterns</dt><dd>${pats} / ${PATS * 3}</dd>`
            + `<dt>song</dt><dd>${end} bar${end === 1 ? '' : 's'} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</dd>`;
    }
    function renderAll() {
        els.name.value = P.name;
        renderTransport();
        renderArr();
        renderEditor();
        renderInst();
        renderMix();
        renderStats();
        showPos(startBar(), 0, true);
        applyMix(E.g);
    }
    function replace(next) {
        stop();
        allOff();
        P = next;
        // the engine's channels are per track: same three tracks, so the graph stays
        renderAll();
        save();
    }
    els.name.addEventListener('input', () => { P.name = els.name.value.slice(0, 60); save(); });
    els.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.name.blur(); });
    els.newBtn.addEventListener('click', () => { if (confirm('Start a new empty project? The current one is replaced.')) replace(blankProject()); });
    els.demoBtn.addEventListener('click', () => { if (confirm('Load the demo song? The current project is replaced.')) replace(demoProject()); });
    const slug = () => (P.name || 'studio').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'studio';
    function download(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    els.exportBtn.addEventListener('click', () => download(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }), slug() + '.studio.json'));
    els.importBtn.addEventListener('click', () => els.file.click());
    els.file.addEventListener('change', async () => {
        const f = els.file.files[0];
        els.file.value = '';
        if (!f) return;
        try { replace(fix(JSON.parse(await f.text()))); }
        catch (_) { els.saveState.textContent = 'that file is not a Studio project'; }
    });

    // WAV: the loop (or the whole song) in SONG mode, else four bars of the selected patterns, plus the tails
    function encodeWav(buf) {
        const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
        const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
        const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
        str(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE');
        str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
        out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
        str(36, 'data'); out.setUint32(40, len * ch * 2, true);
        const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
        let o = 44;
        for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = clamp(data[c][i], -1, 1); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
        return new Blob([out], { type: 'audio/wav' });
    }
    els.wav.addEventListener('click', async () => {
        const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OAC || els.wav.disabled) return;
        const mode = P.mode;
        const [a, b] = mode === 'song' ? (P.loop.on ? [P.loop.start, P.loop.end] : [0, Math.max(1, songEnd())]) : [0, 4];
        const sd = stepDur(), steps = (b - a) * STEPS, sr = 44100;
        const label = els.wav.textContent;
        els.wav.disabled = true;
        els.wav.textContent = 'RENDERING…';
        try {
            const off = new OAC(2, Math.ceil((steps * sd + 3) * sr), sr);
            const g = buildGraph(off, false);
            for (let i = 0; i < steps; i++) {
                const step = i % STEPS;
                scheduleStep(g, 0.05 + i * sd + swingAt(step, sd), a + Math.floor(i / STEPS), step, sd, mode);
            }
            download(encodeWav(await off.startRendering()), slug() + '.wav');
            els.saveState.textContent = `bounced ${b - a} bar${b - a === 1 ? '' : 's'} to WAV`;
        } catch (err) {
            els.saveState.textContent = 'WAV export failed in this browser';
        }
        els.wav.disabled = false;
        els.wav.textContent = label;
    });

    renderAll();
    if (!savedOnce) els.saveState.textContent = 'demo loaded · edits autosave here';
    else els.saveState.textContent = 'restored from this browser';
    embedStatus();
})();
