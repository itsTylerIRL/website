// Isoline Background
// Raw WebGL fragment shader, no three.js. Near-total black with hairline contour lines
// of a slowly warping noise field drifting in and out of the dark, energy pulses racing
// along them. Clicks send shockwave ripples through the field. Rendered at reduced resolution
// (the glass panels blur it anyway) with adaptive quality.
//
// Keeps the public API of the old background3d.js so existing callers still work:
// setParticleCount, setPacketsEnabled, spawnCardPacketBurst, set/removeExclusionZone.

(function() {
    'use strict';
    if (window.TirlEmbed) return; // embedded in the home page's preview (js/embed.js): its background shows through

    const MAX_RIPPLES = 8;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

    const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

    const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uScroll;
uniform float uOctaves;
uniform float uStarDensity;
uniform vec4  uRipples[${MAX_RIPPLES}];   // xy center, z start time, w strength
uniform vec3  uRippleCol[${MAX_RIPPLES}];

const vec3 CYAN   = vec3(0.545, 0.914, 0.992);
const vec3 VIOLET = vec3(0.741, 0.576, 0.976);
const vec3 PINK   = vec3(1.0, 0.475, 0.776);

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

const mat2 OCT = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 7; i++) {
        if (float(i) >= uOctaves) break;
        v += a * noise(p);
        p = OCT * p * 2.03 + 17.1;
        a *= 0.5;
    }
    return v;
}

// Sparse, dim stars on a jittered grid
float stars(vec2 p, float scale, float density) {
    p *= scale;
    vec2 cell = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hash12(cell);
    if (h > density) return 0.0;
    vec2 o = hash22(cell) - 0.5;
    float d = length(f - o * 0.7);
    float tw = 0.5 + 0.5 * sin(uTime * (0.6 + h * 2.0) + h * 40.0);
    return smoothstep(0.07, 0.0, d) * tw * fract(h * 91.7);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uTime * 0.03;
    vec2 p = uv;

    // ---- Shockwave ripples bend the field ----
    vec3 rippleGlow = vec3(0.0);
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > 2.6) continue;
        vec2 dv = uv - r.xy;
        float d = length(dv);
        float ring = exp(-pow((d - age * 0.55) * 14.0, 2.0)) * (1.0 - age / 2.6) * r.w;
        p -= (dv / (d + 1e-4)) * ring * 0.05;
        rippleGlow += uRippleCol[i] * ring * 0.12;
    }

    // Cursor pushes the field aside
    vec2 md = uv - uMouse;
    p += md * 0.12 * exp(-dot(md, md) * 7.0);

    // ---- Domain-warped scalar field ----
    // Slow continuous flow, so the whole field visibly drifts even when nothing else changes
    vec2 np = p * 0.9 + vec2(t * 0.35, t * 0.12 + uScroll * 0.25);
    vec2 w1 = vec2(fbm(np + vec2(0.0, t)), fbm(np + vec2(5.2, 1.3) - t));
    vec2 w2 = vec2(fbm(np * 1.3 + 2.8 * w1 + vec2(1.7, 9.2) + t * 1.3),
                   fbm(np * 1.3 + 2.8 * w1 + vec2(8.3, 2.8) - t * 0.8));
    float n = fbm(np * 0.8 + 2.6 * w2 + t * 0.5);

    // ---- Contour lines: thin, hairline-sharp isolines of the field ----
    float v = n * 22.0;
    float fw = max(fwidth(v), 1e-4);
    float g = abs(fract(v - 0.5) - 0.5) / fw;          // distance to nearest isoline, in pixels
    float line = 1.0 - smoothstep(0.0, 1.4, g);
    float glow = exp(-g * 0.35);

    // Most of the screen stays dark: only drifting regions are lit. Two masks at different scales
    // move in different directions and their union keeps coverage steady (one fades as the other
    // grows), so the field never goes blank; patches are small enough that several are always in view.
    float m1 = fbm(np * 2.0 + w1 * 0.8 + vec2(t * 1.1, -t * 0.7));
    float m2 = fbm(p * 1.6 + vec2(11.3 - t * 1.4, 4.7 + t * 0.9));
    float lit = max(smoothstep(0.54, 0.70, m1), smoothstep(0.53, 0.69, m2) * 0.85);
    // A broad band of light sweeps diagonally across the screen every ~14s, waking the ghost lines
    float band = exp(-pow((fract((uv.x * 0.55 + uv.y * 0.35) * 0.45 - uTime / 14.0) - 0.5) * 7.0, 2.0));
    float litv = max(0.07 + 0.93 * lit, band * 0.4);    // faint ghost lines everywhere else
    // Every few lines is a brighter "major" contour
    float idx = floor(v + 0.5);
    float major = mod(idx, 4.0) < 0.5 ? 1.0 : 0.35;
    // Pulses of energy race along individual lines
    float pulse = pow(0.5 + 0.5 * sin(idx * 2.37 + uTime * 0.9 - length(p) * 3.0), 6.0);

    vec3 hue = mix(CYAN, VIOLET, smoothstep(0.3, 0.7, w2.x));
    hue = mix(hue, PINK, smoothstep(0.55, 0.85, w2.y) * 0.8);

    // Pulses stay faintly visible even in the dark, so there is always something moving
    float energy = litv * major + pulse * 1.4 * max(litv, 0.12);
    vec3 col = hue * (line * 1.5 + glow * 0.2) * energy;

    // Very faint coloured haze inside lit regions, so the glass has something to blur
    col += hue * 0.025 * litv * n;

    // ---- A few dim stars in the void ----
    float s = stars(uv + vec2(0.0, uScroll * 0.05), 40.0, 0.05 * uStarDensity)
            + stars(uv + vec2(3.1, uScroll * 0.1), 20.0, 0.03 * uStarDensity);
    col += vec3(0.75, 0.85, 1.0) * s * 0.45 * (1.0 - lit);

    // ---- Interaction light ----
    col += rippleGlow;
    col += hue * 0.04 * exp(-dot(md, md) * 10.0);

    // ---- Finishing ----
    col = 1.0 - exp(-col * 1.3);
    vec2 vq = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - 1.4 * dot(vq, vq);                       // heavy vignette into black
    col += (hash12(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.012;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

    // ---------- Public API (kept from background3d.js) ----------
    const exclusionZones = [];
    window.exclusionZones = exclusionZones;
    window.setExclusionZone = function(id, x, y, radius) {
        const z = exclusionZones.find(z => z.id === id);
        if (z) { z.x = x; z.y = y; z.radius = radius; }
        else exclusionZones.push({ id, x, y, radius });
    };
    window.removeExclusionZone = function(id) {
        const i = exclusionZones.findIndex(z => z.id === id);
        if (i !== -1) exclusionZones.splice(i, 1);
    };
    window.clearExclusionZones = function() { exclusionZones.length = 0; };

    let ripplesEnabled = true;
    window.setPacketsEnabled = function(enabled) { ripplesEnabled = !!enabled; };
    window.getPacketsSettings = () => ({ enabled: ripplesEnabled });

    // The footer slider (500..6000) used to set particle count; it now scales detail
    let particleCount = isMobile ? 1500 : 3000;
    let octaves = 5, starDensity = 1;
    function applyDetail() {
        const k = Math.min(1, Math.max(0, (particleCount - 500) / 5500));
        octaves = 3 + Math.round(k * 3);           // 3..6 fbm octaves
        starDensity = 0.4 + k * 1.2;
    }
    applyDetail();
    window.setParticleCount = function(count) { particleCount = count; applyDetail(); };
    window.getParticleCount = () => particleCount;

    // ---------- WebGL setup ----------
    const canvas = document.createElement('canvas');
    canvas.id = 'bg3d-canvas'; // Targetable by CSS (blackout on manual pause)
    Object.assign(canvas.style, {
        position: 'fixed', inset: '0', width: '100vw', height: '100vh',
        zIndex: '-1', pointerEvents: 'none', display: 'block'
    });

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
    if (!gl || !gl.getExtension('OES_standard_derivatives')) {
        document.body.style.background = '#000';
        return;
    }
    document.body.prepend(canvas);

    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Background shader error:', gl.getShaderInfoLog(s));
        }
        return s;
    }

    let prog, loc = {};
    function build() {
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        ['uRes', 'uTime', 'uMouse', 'uScroll', 'uOctaves', 'uStarDensity', 'uRipples', 'uRippleCol']
            .forEach(n => { loc[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]'); });
    }
    build();

    // ---------- Sizing & adaptive resolution ----------
    // Fraction of CSS pixels we actually shade. Glass blur hides the upscale.
    let renderScale = isMobile ? 0.45 : 0.6;
    const MIN_SCALE = 0.3, MAX_SCALE = isMobile ? 0.6 : 0.85;

    function resize() {
        const w = Math.max(1, Math.round(window.innerWidth * renderScale));
        const h = Math.max(1, Math.round(window.innerHeight * renderScale));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
    }
    resize();
    window.addEventListener('resize', resize);

    // ---------- Input ----------
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function toUv(px, py) {
        const h = window.innerHeight;
        return [(px - window.innerWidth / 2) / h, (h / 2 - py) / h];
    }
    window.addEventListener('pointermove', e => {
        const [x, y] = toUv(e.clientX, e.clientY);
        mouse.tx = x; mouse.ty = y;
    }, { passive: true });

    const ripples = new Float32Array(MAX_RIPPLES * 4);
    const rippleCols = new Float32Array(MAX_RIPPLES * 3);
    let rippleSlot = 0;
    function addRipple(px, py, rgb, strength) {
        if (!ripplesEnabled) return;
        const [x, y] = toUv(px, py);
        const i = rippleSlot++ % MAX_RIPPLES;
        ripples.set([x, y, time, strength], i * 4);
        rippleCols.set(rgb, i * 3);
    }

    window.addEventListener('pointerdown', e => {
        addRipple(e.clientX, e.clientY, [0.545, 0.914, 0.992], 0.55);
    }, { passive: true });

    // Cards call this on click with their accent colour
    window.spawnCardPacketBurst = function(screenX, screenY, accentRgb = '139,233,253') {
        const c = accentRgb.split(',').map(v => parseInt(v, 10) / 255);
        addRipple(screenX, screenY, c.map(v => (isFinite(v) ? v : 0.7)), 1.0);
    };

    // ---------- Render loop ----------
    const speed = reducedMotion ? 0.25 : 1;
    // The field's clock continues across page loads (per tab), so navigating doesn't restart the
    // pattern and page transitions can crossfade one canvas into the next without a jump
    let time = 0;
    try {
        const t0 = Number(sessionStorage.getItem('tirl_bg_t0')) || Date.now();
        sessionStorage.setItem('tirl_bg_t0', String(t0));
        time = (((Date.now() - t0) / 1000) * speed) % 3600;
    } catch (_) {}
    let lastNow = null;
    let frameAvg = 16, frameCount = 0;

    // Frame cap: the field drifts slowly, so 60 fps is plenty (high-refresh monitors would otherwise draw it
    // 120-240 times a second), and 30 fps once nobody has touched the page for a minute, for screens left
    // idling on it. Any input brings 60 back straight away.
    const ACTIVE_MS = 1000 / 60, IDLE_MS = 1000 / 30, IDLE_AFTER = 60000;
    let lastInput = performance.now();
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev =>
        window.addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true }));
    let lastDraw = 0;

    function frame(now) {
        requestAnimationFrame(frame);
        if (window._bgPaused || document.body.classList.contains('animations-paused')) {
            lastNow = null;
            return;
        }
        if (gl.isContextLost()) return;

        // Skip display refreshes until the next frame is due (1.5 ms early is close enough: timestamps wobble).
        // Carrying the overshoot keeps the average on target when the refresh rate isn't a multiple of it
        // (144 Hz); a long stall starts afresh.
        const gap = now - lastInput > IDLE_AFTER ? IDLE_MS : ACTIVE_MS;
        const since = now - lastDraw;
        if (since < gap - 1.5) return;
        const over = since - gap;
        lastDraw = over > gap ? now : now - Math.max(0, over);

        const dt = lastNow === null ? 16 : Math.min(100, now - lastNow);
        lastNow = now;
        time += (dt / 1000) * speed;

        // Adaptive quality: nudge resolution so frames keep up with the cap (frame time measured against the
        // cap, so 30 fps by choice doesn't read as a slow GPU)
        frameAvg += (dt * (ACTIVE_MS / gap) - frameAvg) * 0.05;
        if (++frameCount > 90) {
            frameCount = 0;
            if (frameAvg > 24 && renderScale > MIN_SCALE) { renderScale = Math.max(MIN_SCALE, renderScale - 0.1); resize(); }
            else if (frameAvg < 15 && renderScale < MAX_SCALE) { renderScale = Math.min(MAX_SCALE, renderScale + 0.05); resize(); }
        }

        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;

        gl.uniform2f(loc.uRes, canvas.width, canvas.height);
        gl.uniform1f(loc.uTime, time);
        gl.uniform2f(loc.uMouse, mouse.x, mouse.y);
        // Pages scroll inside .bracket-content-area (js/script.js forwards its position)
        gl.uniform1f(loc.uScroll, (window._contentScrollY || window.scrollY || 0) / window.innerHeight);
        gl.uniform1f(loc.uOctaves, octaves);
        gl.uniform1f(loc.uStarDensity, starDensity);
        gl.uniform4fv(loc.uRipples, ripples);
        gl.uniform3fv(loc.uRippleCol, rippleCols);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);

    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => { loc = {}; build(); resize(); });

    // ---------- Tab visibility: pause + CONN LOST / CONNECTED title ----------
    const originalTitle = document.title;
    let restoreTimer = null;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            window._bgPaused = true;
            if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
            document.title = 'T: ⚠ CONN. LOST';
        } else {
            window._bgPaused = false;
            document.title = 'T: ● CONNECTED';
            restoreTimer = setTimeout(() => {
                document.title = originalTitle;
                restoreTimer = null;
            }, 2000);
        }
    });
})();
