/* Page scripts for deepdish_ocs.html (DeepDish OCS @ 925ea62): the preset palette and render viewer, the galleries,
   the golden frames, and the BUSY Bar page cycle.
   Contents, search, the source map and the dense layout's scroll-in (cells easing up, tiles counting up) come
   from js/docs.js. */

// ---------- Data ----------
// Eye presets, from the OCS repo's presets.json; every one has a real render in assets/OCS/docs/r/preset-<key>.webp
const OCS_PRESETS = {"hal9000": {"label": "🔴 HAL 9000", "primary": "#ff0000", "secondary": "#0066ff", "glow": "#ff3300", "pupil": "#000000", "ring": "#ff3300", "inner_ring": "#ff3300", "iris": "minimal", "outer": "solid", "middle": "gradient", "inner": "glow", "fill": "nebula", "intensity": 1.3, "pulse": 0.004, "depth": 0.5}, "christmas": {"label": "🎄 Christmas", "primary": "#ff0000", "secondary": "#00ff00", "glow": "#ff0000", "pupil": "#006600", "ring": "#00ff00", "inner_ring": "#ff0000", "iris": "holographic", "outer": "orbs", "middle": "static", "inner": "segments", "fill": "starfield", "intensity": 1.4, "pulse": 0.006, "depth": 0.6}, "matrix": {"label": "💚 Matrix", "primary": "#00ff00", "secondary": "#003300", "glow": "#00ff00", "pupil": "#001100", "ring": "#00ff00", "inner_ring": "#00ff00", "iris": "machine", "outer": "dashed", "middle": "circuit", "inner": "segments", "fill": "lattice", "intensity": 1.3, "pulse": 0.009, "depth": 0.4}, "cyberpunk": {"label": "💜 Cyberpunk", "primary": "#ff00ff", "secondary": "#00ffff", "glow": "#ff00aa", "pupil": "#110022", "ring": "#00ffff", "inner_ring": "#ff00ff", "iris": "holographic", "outer": "shards", "middle": "plasma", "inner": "electric", "fill": "contour", "intensity": 1.6, "pulse": 0.011, "depth": 0.8}, "ocean": {"label": "🌊 Ocean", "primary": "#0088ff", "secondary": "#00ffff", "glow": "#0044aa", "pupil": "#001133", "ring": "#00ffff", "inner_ring": "#0088ff", "iris": "vortex", "outer": "pulse", "middle": "ripple", "inner": "pulse", "fill": "aurora", "intensity": 1.2, "pulse": 0.005, "depth": 0.7}, "sunset": {"label": "🌅 Sunset", "primary": "#ff6600", "secondary": "#ff0066", "glow": "#ff4400", "pupil": "#220000", "ring": "#ff0066", "inner_ring": "#ff6600", "iris": "eclipse", "outer": "helix", "middle": "gradient", "inner": "glow", "fill": "aurora", "intensity": 1.4, "pulse": 0.004, "depth": 0.6}, "purple": {"label": "💎 Purple", "primary": "#aa00ff", "secondary": "#ff00ff", "glow": "#8800cc", "pupil": "#110022", "ring": "#ff00ff", "inner_ring": "#aa00ff", "iris": "classic", "outer": "helix", "middle": "hexagon", "inner": "double", "fill": "starfield", "intensity": 1.4, "pulse": 0.006, "depth": 0.6}, "gold": {"label": "✨ Gold", "primary": "#ffcc00", "secondary": "#ff9900", "glow": "#ffaa00", "pupil": "#221100", "ring": "#ff9900", "inner_ring": "#ffcc00", "iris": "machine", "outer": "reactor", "middle": "aperture", "inner": "reticle", "fill": "nebula", "intensity": 1.5, "pulse": 0.006, "depth": 0.5}, "horizon": {"label": "🕳 Event Horizon", "primary": "#ff7a00", "secondary": "#ffd27f", "glow": "#ff4500", "pupil": "#000000", "ring": "#ffb347", "inner_ring": "#ffe0a0", "iris": "eclipse", "outer": "solid", "middle": "none", "inner": "glow", "fill": "starfield", "intensity": 1.5, "pulse": 0.003, "depth": 0.4}, "reactor": {"label": "⚛ Arc Reactor", "primary": "#00b4ff", "secondary": "#bff6ff", "glow": "#0077ff", "pupil": "#000814", "ring": "#7fe3ff", "inner_ring": "#e0fbff", "iris": "minimal", "outer": "reactor", "middle": "hexagon", "inner": "glow", "fill": "lattice", "intensity": 1.6, "pulse": 0.007, "depth": 0.5}, "sentinel": {"label": "🛰 Sentinel", "primary": "#ff2020", "secondary": "#ffffff", "glow": "#ff0000", "pupil": "#000000", "ring": "#ff4040", "inner_ring": "#ffffff", "iris": "machine", "outer": "pulse", "middle": "aperture", "inner": "reticle", "fill": "lattice", "intensity": 1.4, "pulse": 0.008, "depth": 0.5}, "dragon": {"label": "🐉 Dragon", "primary": "#ff8a00", "secondary": "#ffd34d", "glow": "#ff3b00", "pupil": "#0a0300", "ring": "#ff6a00", "inner_ring": "#ffc233", "iris": "serpent", "outer": "shards", "middle": "static", "inner": "glow", "fill": "embers", "intensity": 1.5, "pulse": 0.005, "depth": 0.6}, "supernova": {"label": "☀️ Supernova", "primary": "#ffb000", "secondary": "#fff2c2", "glow": "#ff5a00", "pupil": "#120500", "ring": "#ffd27f", "inner_ring": "#ffffff", "iris": "nova", "outer": "pulse", "middle": "plasma", "inner": "electric", "fill": "warp", "intensity": 1.6, "pulse": 0.008, "depth": 0.7}, "mainframe": {"label": "🖥 Mainframe", "primary": "#00ff9c", "secondary": "#00c2ff", "glow": "#00ff66", "pupil": "#001a10", "ring": "#00ffc8", "inner_ring": "#7dffd6", "iris": "circuit", "outer": "dashed", "middle": "circuit", "inner": "segments", "fill": "glyphs", "intensity": 1.4, "pulse": 0.007, "depth": 0.4}, "prism": {"label": "💠 Prism", "primary": "#7a5cff", "secondary": "#00e5ff", "glow": "#ff4fd8", "pupil": "#07021a", "ring": "#b388ff", "inner_ring": "#e0f7ff", "iris": "crystal", "outer": "helix", "middle": "hexagon", "inner": "double", "fill": "plasma", "intensity": 1.5, "pulse": 0.005, "depth": 0.6}, "optic": {"label": "📷 Optic", "primary": "#5aa9ff", "secondary": "#e8f1ff", "glow": "#2f6bff", "pupil": "#02060f", "ring": "#9cc8ff", "inner_ring": "#ffffff", "iris": "shutter", "outer": "reactor", "middle": "aperture", "inner": "reticle", "fill": "hex", "intensity": 1.4, "pulse": 0.004, "depth": 0.4}, "hyperdrive": {"label": "🚀 Hyperdrive", "primary": "#3d7bff", "secondary": "#bfe3ff", "glow": "#00a2ff", "pupil": "#00040f", "ring": "#66b3ff", "inner_ring": "#e6f4ff", "iris": "vortex", "outer": "orbs", "middle": "ripple", "inner": "pulse", "fill": "warp", "intensity": 1.5, "pulse": 0.01, "depth": 0.7}, "netrunner": {"label": "⚡ Netrunner", "primary": "#fcee0a", "secondary": "#00f0ff", "glow": "#ff003c", "pupil": "#0d0d00", "ring": "#fcee0a", "inner_ring": "#00f0ff", "iris": "holographic", "outer": "dashed", "middle": "circuit", "inner": "reticle", "fill": "rain", "intensity": 1.5, "pulse": 0.011, "depth": 0.6}, "toxic": {"label": "☣ Toxic", "primary": "#9dff00", "secondary": "#eaff8a", "glow": "#39ff14", "pupil": "#061000", "ring": "#c6ff3d", "inner_ring": "#eaff8a", "iris": "serpent", "outer": "solid", "middle": "plasma", "inner": "electric", "fill": "vortex", "intensity": 1.5, "pulse": 0.007, "depth": 0.7}, "glacier": {"label": "🧊 Glacier", "primary": "#8fe6ff", "secondary": "#ffffff", "glow": "#3fb8ff", "pupil": "#020a12", "ring": "#c9f3ff", "inner_ring": "#ffffff", "iris": "crystal", "outer": "solid", "middle": "ripple", "inner": "glow", "fill": "aurora", "intensity": 1.3, "pulse": 0.003, "depth": 0.5}};
// Presets with a golden frame in the OCS test suite (tests/golden), in assets/OCS/docs/
const OCS_GOLDEN = ['hal9000', 'cyberpunk', 'horizon', 'ocean', 'reactor', 'sentinel'];
const OCS_RENDER = '/assets/OCS/docs/r';

(function() {
    const $ = (id) => document.getElementById(id);
    const doc = $('doc');
    if (!doc) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('sys-calm');
    const els = { presets: $('g-presets'), render: $('g-render'), renderMeta: $('g-render-meta'), golden: $('doc-golden') };
    const keys = Object.keys(OCS_PRESETS);
    const label = (p) => p.label.replace(/^\S+\s/, ''); // without the leading emoji

    // ---------- Presets: the side list, the gallery (§03) and the golden frames (§15) all pick one ----------
    const swatchKeys = ['primary', 'secondary', 'glow', 'ring', 'inner_ring', 'pupil'];
    if (els.presets) {
        els.presets.innerHTML = keys.map((k) => {
            const p = OCS_PRESETS[k];
            return `<li><button type="button" class="g-preset" data-key="${k}" aria-current="false">
                <span class="g-preset-sw">${swatchKeys.map((c) => `<i style="background:${esc(p[c])}"></i>`).join('')}</span>
                <span class="g-preset-text"><span class="g-preset-name">${esc(label(p))}${OCS_GOLDEN.includes(k) ? ' <span class="g-golden-tag">GOLDEN</span>' : ''}</span>
                <span class="g-preset-styles">${esc(p.iris)} &middot; ${esc(p.outer)} &middot; ${esc(p.fill)}</span></span>
            </button></li>`;
        }).join('');
    }
    // The side list may have moved to the home page (js/embed.js); its pick is kept in view by scrolling only the list
    function revealInList(item) {
        const box = els.presets;
        if (!box || !item || box.scrollHeight <= box.clientHeight) return;
        const lr = box.getBoundingClientRect(), ir = item.getBoundingClientRect();
        if (ir.top < lr.top || ir.bottom > lr.bottom) box.scrollTop += ir.top - lr.top - (lr.height - ir.height) / 2;
    }
    function selectPreset(k, from) {
        const p = OCS_PRESETS[k];
        if (!p) return;
        const sel = (root) => root && root.querySelectorAll('.g-preset, .oc-preset, .g-golden').forEach((b) => b.setAttribute('aria-current', String(b.dataset.key === k)));
        sel(doc);
        sel(els.presets);
        if (from !== 'list') revealInList(els.presets && els.presets.querySelector(`[data-key="${k}"]`));
        if (!els.render) return;
        els.renderMeta.textContent = OCS_GOLDEN.includes(k) ? 'OCS RENDER · GOLDEN FRAME' : 'OCS RENDER · 400×400';
        els.render.innerHTML = `<div class="g-render-stage">
                <i class="g-reticle tl"></i><i class="g-reticle tr"></i><i class="g-reticle bl"></i><i class="g-reticle br"></i>
                <img src="${OCS_RENDER}/preset-${k}.webp" alt="${esc(p.label)} rendered by OCS" width="320" height="320">
            </div>
            <dl class="g-props g-render-props">
                <dt>preset</dt><dd>${esc(p.label)}</dd>
                <dt>iris</dt><dd>${esc(p.iris)}</dd>
                <dt>outer &middot; middle</dt><dd>${esc(p.outer)} &middot; ${esc(p.middle)}</dd>
                <dt>inner &middot; fill</dt><dd>${esc(p.inner)} &middot; ${esc(p.fill)}</dd>
                <dt>intensity</dt><dd>${p.intensity} &middot; pulse ${p.pulse} &middot; depth ${p.depth}</dd>
            </dl>`;
    }
    els.presets && els.presets.addEventListener('click', (e) => {
        const b = e.target.closest('.g-preset');
        if (b) selectPreset(b.dataset.key, 'list');
    });
    doc.addEventListener('click', (e) => {
        const b = e.target.closest('.oc-preset, .g-golden');
        if (b) selectPreset(b.dataset.key, 'doc');
    });
    if (els.golden) {
        els.golden.innerHTML = OCS_GOLDEN.map((k) => `<button type="button" class="g-golden" data-key="${k}" title="${esc(OCS_PRESETS[k].label)}">
            <img src="/assets/OCS/docs/golden-${k}.webp" alt="${esc(OCS_PRESETS[k].label)} golden frame" loading="lazy" decoding="async" width="400" height="400">
            <span>${k}.png</span></button>`).join('');
    }
    selectPreset('reactor');

    // ---------- BUSY Bar (§08): the front matrix steps through its pages, as the wheel would ----------
    const bar = doc.querySelector('.oc-bar-front');
    const pages = Array.from(doc.querySelectorAll('.oc-pages li'));
    if (bar && pages.length) {
        const VAL = { EYE: 'ARC REACTOR', TRACK: 'FACE LOCK', MOOD: 'CURIOUS', PRESET: 'SENTINEL', HUE: '+40°', GLOW: '1.6', EXPRESS: 'HAPPY', ACTION: 'BLINK', FLYOVER: '3.0 NM', SYSTEM: '30 FPS' };
        const EDIT = new Set(['PRESET', 'HUE', 'GLOW', 'EXPRESS', 'ACTION']);
        const led = doc.querySelector('.oc-led');
        let i = 0;
        const show = () => {
            const name = pages[i].textContent;
            pages.forEach((li, j) => li.classList.toggle('is-on', j === i));
            bar.style.setProperty('--p', i);
            bar.querySelector('.oc-bar-page').textContent = name;
            bar.querySelector('.oc-bar-val').textContent = VAL[name] || '';
            if (led) led.style.setProperty('--led', name === 'FLYOVER' ? '#00a0ff' : EDIT.has(name) ? '#ffffff' : 'var(--g-blue)');
            bar.classList.remove('is-flip');
            void bar.offsetWidth;
            bar.classList.add('is-flip');
        };
        show();
        let timer = null;
        const run = (on) => {
            clearInterval(timer);
            if (on && !calm()) timer = setInterval(() => { i = (i + 1) % pages.length; show(); }, 1700);
        };
        // Only while it's on screen; a click on a page picks it
        new IntersectionObserver(([en]) => run(en.isIntersecting)).observe(bar);
        doc.querySelector('.oc-pages').addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            i = pages.indexOf(li);
            show();
        });
    }
})();
