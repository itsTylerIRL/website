/* Page scripts for deepdish_ocs.html: the preset palette, render viewer and golden frames.
   Contents, search and the source map come from js/docs.js. */

// ---------- Data ----------
// Eye presets, copied from the OCS repo's presets.json (version 1)
const OCS_PRESETS = {"hal9000": {"label": "🔴 HAL 9000", "primary": "#ff0000", "secondary": "#0066ff", "glow": "#ff3300", "pupil": "#000000", "ring": "#ff3300", "inner_ring": "#ff3300", "iris": "minimal", "outer": "solid", "middle": "gradient", "inner": "glow", "fill": "nebula", "intensity": 1.3, "pulse": 0.004, "depth": 0.5}, "christmas": {"label": "🎄 Christmas", "primary": "#ff0000", "secondary": "#00ff00", "glow": "#ff0000", "pupil": "#006600", "ring": "#00ff00", "inner_ring": "#ff0000", "iris": "holographic", "outer": "orbs", "middle": "static", "inner": "segments", "fill": "starfield", "intensity": 1.4, "pulse": 0.006, "depth": 0.6}, "matrix": {"label": "💚 Matrix", "primary": "#00ff00", "secondary": "#003300", "glow": "#00ff00", "pupil": "#001100", "ring": "#00ff00", "inner_ring": "#00ff00", "iris": "machine", "outer": "dashed", "middle": "circuit", "inner": "segments", "fill": "lattice", "intensity": 1.3, "pulse": 0.009, "depth": 0.4}, "cyberpunk": {"label": "💜 Cyberpunk", "primary": "#ff00ff", "secondary": "#00ffff", "glow": "#ff00aa", "pupil": "#110022", "ring": "#00ffff", "inner_ring": "#ff00ff", "iris": "holographic", "outer": "shards", "middle": "plasma", "inner": "electric", "fill": "contour", "intensity": 1.6, "pulse": 0.011, "depth": 0.8}, "ocean": {"label": "🌊 Ocean", "primary": "#0088ff", "secondary": "#00ffff", "glow": "#0044aa", "pupil": "#001133", "ring": "#00ffff", "inner_ring": "#0088ff", "iris": "vortex", "outer": "pulse", "middle": "ripple", "inner": "pulse", "fill": "aurora", "intensity": 1.2, "pulse": 0.005, "depth": 0.7}, "sunset": {"label": "🌅 Sunset", "primary": "#ff6600", "secondary": "#ff0066", "glow": "#ff4400", "pupil": "#220000", "ring": "#ff0066", "inner_ring": "#ff6600", "iris": "eclipse", "outer": "helix", "middle": "gradient", "inner": "glow", "fill": "aurora", "intensity": 1.4, "pulse": 0.004, "depth": 0.6}, "purple": {"label": "💎 Purple", "primary": "#aa00ff", "secondary": "#ff00ff", "glow": "#8800cc", "pupil": "#110022", "ring": "#ff00ff", "inner_ring": "#aa00ff", "iris": "classic", "outer": "helix", "middle": "hexagon", "inner": "double", "fill": "starfield", "intensity": 1.4, "pulse": 0.006, "depth": 0.6}, "gold": {"label": "✨ Gold", "primary": "#ffcc00", "secondary": "#ff9900", "glow": "#ffaa00", "pupil": "#221100", "ring": "#ff9900", "inner_ring": "#ffcc00", "iris": "machine", "outer": "reactor", "middle": "aperture", "inner": "reticle", "fill": "nebula", "intensity": 1.5, "pulse": 0.006, "depth": 0.5}, "horizon": {"label": "🕳 Event Horizon", "primary": "#ff7a00", "secondary": "#ffd27f", "glow": "#ff4500", "pupil": "#000000", "ring": "#ffb347", "inner_ring": "#ffe0a0", "iris": "eclipse", "outer": "solid", "middle": "none", "inner": "glow", "fill": "starfield", "intensity": 1.5, "pulse": 0.003, "depth": 0.4}, "reactor": {"label": "⚛ Arc Reactor", "primary": "#00b4ff", "secondary": "#bff6ff", "glow": "#0077ff", "pupil": "#000814", "ring": "#7fe3ff", "inner_ring": "#e0fbff", "iris": "minimal", "outer": "reactor", "middle": "hexagon", "inner": "glow", "fill": "lattice", "intensity": 1.6, "pulse": 0.007, "depth": 0.5}, "sentinel": {"label": "🛰 Sentinel", "primary": "#ff2020", "secondary": "#ffffff", "glow": "#ff0000", "pupil": "#000000", "ring": "#ff4040", "inner_ring": "#ffffff", "iris": "machine", "outer": "pulse", "middle": "aperture", "inner": "reticle", "fill": "lattice", "intensity": 1.4, "pulse": 0.008, "depth": 0.5}, "dragon": {"label": "🐉 Dragon", "primary": "#ff8a00", "secondary": "#ffd34d", "glow": "#ff3b00", "pupil": "#0a0300", "ring": "#ff6a00", "inner_ring": "#ffc233", "iris": "serpent", "outer": "shards", "middle": "static", "inner": "glow", "fill": "embers", "intensity": 1.5, "pulse": 0.005, "depth": 0.6}, "supernova": {"label": "☀️ Supernova", "primary": "#ffb000", "secondary": "#fff2c2", "glow": "#ff5a00", "pupil": "#120500", "ring": "#ffd27f", "inner_ring": "#ffffff", "iris": "nova", "outer": "pulse", "middle": "plasma", "inner": "electric", "fill": "warp", "intensity": 1.6, "pulse": 0.008, "depth": 0.7}, "mainframe": {"label": "🖥 Mainframe", "primary": "#00ff9c", "secondary": "#00c2ff", "glow": "#00ff66", "pupil": "#001a10", "ring": "#00ffc8", "inner_ring": "#7dffd6", "iris": "circuit", "outer": "dashed", "middle": "circuit", "inner": "segments", "fill": "glyphs", "intensity": 1.4, "pulse": 0.007, "depth": 0.4}, "prism": {"label": "💠 Prism", "primary": "#7a5cff", "secondary": "#00e5ff", "glow": "#ff4fd8", "pupil": "#07021a", "ring": "#b388ff", "inner_ring": "#e0f7ff", "iris": "crystal", "outer": "helix", "middle": "hexagon", "inner": "double", "fill": "plasma", "intensity": 1.5, "pulse": 0.005, "depth": 0.6}, "optic": {"label": "📷 Optic", "primary": "#5aa9ff", "secondary": "#e8f1ff", "glow": "#2f6bff", "pupil": "#02060f", "ring": "#9cc8ff", "inner_ring": "#ffffff", "iris": "shutter", "outer": "reactor", "middle": "aperture", "inner": "reticle", "fill": "hex", "intensity": 1.4, "pulse": 0.004, "depth": 0.4}, "hyperdrive": {"label": "🚀 Hyperdrive", "primary": "#3d7bff", "secondary": "#bfe3ff", "glow": "#00a2ff", "pupil": "#00040f", "ring": "#66b3ff", "inner_ring": "#e6f4ff", "iris": "vortex", "outer": "orbs", "middle": "ripple", "inner": "pulse", "fill": "warp", "intensity": 1.5, "pulse": 0.01, "depth": 0.7}, "netrunner": {"label": "⚡ Netrunner", "primary": "#fcee0a", "secondary": "#00f0ff", "glow": "#ff003c", "pupil": "#0d0d00", "ring": "#fcee0a", "inner_ring": "#00f0ff", "iris": "holographic", "outer": "dashed", "middle": "circuit", "inner": "reticle", "fill": "rain", "intensity": 1.5, "pulse": 0.011, "depth": 0.6}, "toxic": {"label": "☣ Toxic", "primary": "#9dff00", "secondary": "#eaff8a", "glow": "#39ff14", "pupil": "#061000", "ring": "#c6ff3d", "inner_ring": "#eaff8a", "iris": "serpent", "outer": "solid", "middle": "plasma", "inner": "electric", "fill": "vortex", "intensity": 1.5, "pulse": 0.007, "depth": 0.7}, "glacier": {"label": "🧊 Glacier", "primary": "#8fe6ff", "secondary": "#ffffff", "glow": "#3fb8ff", "pupil": "#020a12", "ring": "#c9f3ff", "inner_ring": "#ffffff", "iris": "crystal", "outer": "solid", "middle": "ripple", "inner": "glow", "fill": "aurora", "intensity": 1.3, "pulse": 0.003, "depth": 0.5}};
// Presets that have a golden frame from the OCS test suite (tests/golden), in assets/OCS/docs/
const OCS_GOLDEN = ['hal9000', 'cyberpunk', 'horizon', 'ocean', 'reactor', 'sentinel'];
// Presets added in the uncommitted showpiece work (not in presets.json at dbe8022)
const OCS_NEW = ['dragon', 'supernova', 'mainframe', 'prism', 'optic', 'hyperdrive', 'netrunner', 'toxic', 'glacier'];

(function() {
    if (!document.getElementById('g-presets')) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const els = {
        presets: document.getElementById('g-presets'),
        render: document.getElementById('g-render'),
        renderMeta: document.getElementById('g-render-meta'),
        golden: document.getElementById('doc-golden')
    };

    // ---------- Presets + render viewer ----------
    const keys = Object.keys(OCS_PRESETS);
    const swatchKeys = ['primary', 'secondary', 'glow', 'ring', 'inner_ring', 'pupil'];
    els.presets.innerHTML = keys.map((k) => {
        const p = OCS_PRESETS[k];
        const label = p.label.replace(/^\S+\s/, ''); // drop the leading emoji
        return `<li><button type="button" class="g-preset" data-key="${k}" aria-current="false">
            <span class="g-preset-sw">${swatchKeys.map((c) => `<i style="background:${esc(p[c])}"></i>`).join('')}</span>
            <span class="g-preset-text"><span class="g-preset-name">${esc(label)}${OCS_GOLDEN.includes(k) ? ' <span class="g-golden-tag">GOLDEN</span>' : ''}${OCS_NEW.includes(k) ? ' <span class="doc-new">NEW</span>' : ''}</span>
            <span class="g-preset-styles">${esc(p.iris)} &middot; ${esc(p.outer)} &middot; ${esc(p.fill)}</span></span>
        </button></li>`;
    }).join('');

    function eyeSchema(p) {
        // Schematic eye from the preset colors (for presets without a golden frame)
        return `<div class="g-eye" style="--pu:${p.pupil};--pr:${p.primary};--se:${p.secondary};--gl:${p.glow};--ri:${p.ring};--ir:${p.inner_ring}">
            <i class="g-eye-ring"></i><i class="g-eye-iris"></i><i class="g-eye-inner"></i><i class="g-eye-pupil"></i></div>`;
    }
    function selectPreset(k, scrollList) {
        const p = OCS_PRESETS[k];
        if (!p) return;
        const golden = OCS_GOLDEN.includes(k);
        els.presets.querySelectorAll('.g-preset').forEach((b) => {
            const on = b.dataset.key === k;
            b.setAttribute('aria-current', on);
            if (on && scrollList) b.scrollIntoView({ block: 'nearest' });
        });
        els.renderMeta.textContent = golden ? 'GOLDEN FRAME · 400×400' : 'SCHEMA · NO GOLDEN FRAME';
        els.render.innerHTML = `<div class="g-render-stage">
                <i class="g-reticle tl"></i><i class="g-reticle tr"></i><i class="g-reticle bl"></i><i class="g-reticle br"></i>
                ${golden ? `<img src="/assets/OCS/docs/golden-${k}.webp" alt="${esc(p.label)} rendered by OCS" width="400" height="400">` : eyeSchema(p)}
            </div>
            <dl class="g-props g-render-props">
                <dt>preset</dt><dd>${esc(p.label)}</dd>
                <dt>iris</dt><dd>${esc(p.iris)}</dd>
                <dt>outer &middot; middle</dt><dd>${esc(p.outer)} &middot; ${esc(p.middle)}</dd>
                <dt>inner &middot; fill</dt><dd>${esc(p.inner)} &middot; ${esc(p.fill)}</dd>
                <dt>intensity</dt><dd>${p.intensity} &middot; pulse ${p.pulse} &middot; depth ${p.depth}</dd>
            </dl>`;
        els.golden && els.golden.querySelectorAll('.g-golden').forEach((b) => b.setAttribute('aria-current', b.dataset.key === k));
    }
    els.presets.addEventListener('click', (e) => {
        const b = e.target.closest('.g-preset');
        if (b) selectPreset(b.dataset.key);
    });

    // Golden frames in §13 double as preset pickers
    if (els.golden) {
        els.golden.innerHTML = OCS_GOLDEN.map((k) => `<button type="button" class="g-golden" data-key="${k}" title="${esc(OCS_PRESETS[k].label)}">
            <img src="/assets/OCS/docs/golden-${k}.webp" alt="${esc(OCS_PRESETS[k].label)} golden frame" loading="lazy" decoding="async" width="400" height="400">
            <span>${k}.png</span></button>`).join('');
        els.golden.addEventListener('click', (e) => {
            const b = e.target.closest('.g-golden');
            if (b) selectPreset(b.dataset.key, true);
        });
    }

    // ---------- Boot ----------
    selectPreset('reactor', false);
})();
