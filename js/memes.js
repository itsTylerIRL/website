/* Page scripts for memes.html: the meme generator. Paste, drop or open images of any size, then:
   - layouts: classic, a white caption bar, a demotivational poster, a two-row yes/no, stacked, side by side and a
     2x2 grid. A layout has image panels (slots): pasting fills the next empty one, then adds layers
   - image layers: drag, corner-drag or scroll to resize, shift+scroll to rotate; opacity, blend, flip, order, and a
     cut-out (remove a background colour, keep a circle or a lasso'd shape, feathered)
   - stickers: emoji, laser eyes and pixel shades, added as image layers
   - text: Impact / caption / subtitle / comic presets, five fonts, outline, shadow, glow, rotation
   - effects: bulge (negative pinches), swirl, pixelate and blur circles, added by clicking in their mode
   - deep fry: saturation, contrast, sharpen, noise, a warm tint and JPEG crush, with presets
   - undo / redo (Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y), duplicate (Ctrl+D), arrows nudge
   Everything is kept as settings over the untouched images and rendered on demand: the canvas shows a preview (at
   most PREVIEW px on the long side) and export renders the same pipeline at full resolution.
   Pipeline: layout (fills, panels, frames) -> image layers -> effects -> text (when it's fried) -> deep fry -> text. */
(function () {
    'use strict';
    const app = document.getElementById('memes');
    if (!app) return;

    const PREVIEW = 1400;    // preview long side
    const MAX_EXPORT = 8192; // canvases past this fail in some browsers
    const PROC_MAX = 1600;   // long side image layers are cut out at
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const cleanName = (n) => String(n || 'pasted image').replace(/\.[^.]+$/, '') || 'pasted image';

    const FONTS = {
        impact: "Impact, 'Anton', 'Haettenschweiler', 'Arial Narrow Bold', sans-serif",
        sans: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif",
        serif: "'Times New Roman', Times, 'Liberation Serif', serif",
        comic: "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', cursive",
        mono: "'Courier New', 'Liberation Mono', monospace"
    };
    const FONT_NAMES = [['impact', 'Impact'], ['sans', 'Arial'], ['serif', 'Times'], ['comic', 'Comic'], ['mono', 'Mono']];
    const STYLES = {
        meme: { font: 'impact', bold: false, color: '#ffffff', stroke: '#000000', strokeW: 0.08, upper: true, shadow: 0, glow: 0 },
        caption: { font: 'sans', bold: false, color: '#000000', stroke: '#ffffff', strokeW: 0, upper: false, shadow: 0, glow: 0 },
        subtitle: { font: 'sans', bold: true, color: '#ffe14d', stroke: '#000000', strokeW: 0.07, upper: false, shadow: 0.6, glow: 0 },
        comic: { font: 'comic', bold: true, color: '#ffffff', stroke: '#000000', strokeW: 0.1, upper: false, shadow: 0, glow: 0 },
        poster: { font: 'serif', bold: false, color: '#ffffff', stroke: '#000000', strokeW: 0, upper: true, shadow: 0, glow: 0 },
        posterSub: { font: 'serif', bold: false, color: '#ffffff', stroke: '#000000', strokeW: 0, upper: false, shadow: 0, glow: 0 }
    };
    const STYLE_BUTTONS = [['meme', 'MEME'], ['caption', 'CAPTION'], ['subtitle', 'SUBTITLE'], ['comic', 'COMIC']];
    const FRY_PRESETS = {
        MILD: { sat: 0.35, contrast: 0.3, sharpen: 0.3, noise: 0.15, tint: 0.2, crush: 0.25 },
        CRISPY: { sat: 0.65, contrast: 0.55, sharpen: 0.6, noise: 0.35, tint: 0.45, crush: 0.55 },
        NUCLEAR: { sat: 1, contrast: 0.9, sharpen: 1, noise: 0.7, tint: 0.8, crush: 0.9 }
    };
    // Effects: what a click does in each mode, and the strength range of each
    const FX = {
        bulge: { label: 'BULGE', r: 0.22, s: 0.8, min: -1, max: 1.5, color: '139, 233, 253', hint: 'click to bulge (negative strength pinches)' },
        swirl: { label: 'SWIRL', r: 0.22, s: 0.6, min: -1, max: 1, color: '189, 147, 249', hint: 'click to swirl' },
        pixel: { label: 'PIXEL', r: 0.12, s: 0.5, min: 0, max: 1, color: '255, 184, 108', hint: 'click to pixelate' },
        blur: { label: 'BLUR', r: 0.12, s: 0.5, min: 0, max: 1, color: '241, 250, 140', hint: 'click to blur' }
    };
    const BLENDS = [['source-over', 'normal'], ['multiply', 'multiply'], ['screen', 'screen'], ['overlay', 'overlay'], ['darken', 'darken'], ['lighten', 'lighten'], ['difference', 'difference'], ['hard-light', 'hard light'], ['color-dodge', 'dodge'], ['luminosity', 'luminosity']];

    // ---------- Layouts ----------
    // slots: image panels; texts: the template texts it starts with (TPL)
    const LAYOUTS = {
        classic: { label: 'CLASSIC', slots: 1, texts: ['top', 'bottom'], icon: '<rect x="2" y="2" width="28" height="20" rx="1.5"/><path d="M9 6h14M9 18h14" class="i-t"/>' },
        caption: { label: 'CAPTION', slots: 1, texts: ['caption'], icon: '<rect x="2" y="2" width="28" height="20" rx="1.5"/><rect x="2" y="2" width="28" height="7" class="i-f"/><path d="M7 5.5h18" class="i-d"/>' },
        demot: { label: 'POSTER', slots: 1, texts: ['title', 'sub'], icon: '<rect x="2" y="1" width="28" height="22" rx="1.5" class="i-k"/><rect x="7" y="4" width="18" height="11"/><path d="M10 18.5h12M12 21h8" class="i-t"/>' },
        yesno: { label: 'YES/NO', slots: 2, texts: ['no', 'yes'], icon: '<rect x="2" y="2" width="14" height="10"/><rect x="2" y="12" width="14" height="10"/><rect x="16" y="2" width="14" height="20" class="i-f"/><path d="M19 7h8M19 17h8" class="i-d"/>' },
        stack: { label: 'STACK', slots: 2, texts: [], icon: '<rect x="6" y="2" width="20" height="10"/><rect x="6" y="12" width="20" height="10"/>' },
        side: { label: 'SIDE', slots: 2, texts: [], icon: '<rect x="2" y="5" width="14" height="14"/><rect x="16" y="5" width="14" height="14"/>' },
        grid: { label: '2×2', slots: 4, texts: [], icon: '<rect x="4" y="2" width="12" height="10"/><rect x="16" y="2" width="12" height="10"/><rect x="4" y="12" width="12" height="10"/><rect x="16" y="12" width="12" height="10"/>' }
    };
    // Template texts: where they sit in a layout (recomputed until you move them)
    const TPL = {
        top: { text: 'TOP TEXT', style: 'meme', at: () => ({ x: 0.5, y: 0.1, size: 0.1, maxW: 0.94, fitH: 0 }) },
        bottom: { text: 'BOTTOM TEXT', style: 'meme', at: () => ({ x: 0.5, y: 0.9, size: 0.1, maxW: 0.94, fitH: 0 }) },
        caption: { text: 'caption goes here', style: 'caption', at: (G) => ({ x: 0.5, y: G.bar / 2 / G.H, size: G.W * 0.07 / G.H, maxW: 0.92, fitH: G.bar * 0.84 / G.H }) },
        title: { text: 'TITLE', style: 'poster', at: (G) => ({ x: 0.5, y: G.ty / G.H, size: G.tpx / G.H, maxW: 0.9, fitH: G.tpx * 1.2 / G.H }) },
        sub: { text: 'something profound goes here', style: 'posterSub', at: (G) => ({ x: 0.5, y: G.sy / G.H, size: G.spx / G.H, maxW: 0.86, fitH: G.spx * 2.5 / G.H }) },
        no: { text: 'nah', style: 'caption', at: (G) => ({ x: 0.75, y: 0.25, size: G.c * 0.11 / G.H, maxW: 0.44, fitH: 0.42 }) },
        yes: { text: 'yeah', style: 'caption', at: (G) => ({ x: 0.75, y: 0.75, size: G.c * 0.11 / G.H, maxW: 0.44, fitH: 0.42 }) }
    };

    let uid = 0;
    const newText = (text, tpl, style) => ({ id: ++uid, kind: 'text', text, tpl: tpl || null, moved: false, x: 0.5, y: 0.5, size: 0.1, maxW: 0.94, fitH: 0, rot: 0, glowColor: '#ff2a2a', ...STYLES[style || 'meme'] });
    const S = {
        slots: [null, null, null, null], // { img, w, h, name }
        layout: { kind: 'classic', bar: 0.3 },
        G: null,            // the current layout's geometry, or null when there's nothing to show
        w: 0, h: 0,         // canvas size (full resolution)
        texts: [newText('TOP TEXT', 'top'), newText('BOTTOM TEXT', 'bottom')],
        images: [],         // image layers, bottom first
        fx: [],             // effect circles, applied in order
        fry: { on: false, fryText: true, ...FRY_PRESETS.CRISPY },
        sel: null,          // the selected layer
        mode: 'move',       // what a click on empty canvas does: 'move' or an effect type
        tool: null          // a one-shot tool on the selected image layer: 'lasso' or 'pick'
    };

    const els = {
        stage: $('mm-stage'), wrap: $('mm-wrap'), canvas: $('mm-canvas'), overlay: $('mm-overlay'), empty: $('mm-empty'), shot: $('mm-shot'),
        copyNow: $('mm-copy-now'), flash: $('mm-flash'), undo: $('mm-undo'), redo: $('mm-redo'),
        stageMeta: $('mm-stage-meta'), mode: $('mm-mode'), hint: $('mm-hint'),
        open: $('mm-open'), sample: $('mm-sample'), clear: $('mm-clear'), file: $('mm-file'), info: $('mm-info'),
        layerFile: $('mm-layer-file'), addImage: $('mm-add-image'),
        layouts: $('mm-layouts'), layoutOpts: $('mm-layout-opts'), layoutMeta: $('mm-layout-meta'), stickers: $('mm-stickers'),
        layers: $('mm-layers'), addText: $('mm-add-text'), addFx: $('mm-add-bulge'),
        selPane: $('mm-sel'), selMeta: $('mm-sel-meta'),
        fry: $('mm-fry'), fryOn: $('mm-fry-on'), fryText: $('mm-fry-text'), fryPresets: $('mm-fry-presets'),
        png: $('mm-png'), jpg: $('mm-jpg'), copy: $('mm-copy'), exportState: $('mm-export-state'),
        sbImage: $('mm-sb-image')
    };
    const ctx = els.canvas.getContext('2d');
    const octx = els.overlay.getContext('2d');

    // ---------- Loading ----------
    async function decode(blob) {
        try { return await createImageBitmap(blob); }
        catch (_) {
            // Some formats (or browsers) only decode through an <img>
            return new Promise((res) => {
                const i = new Image();
                i.onload = () => res(i);
                i.onerror = () => res(null);
                i.src = URL.createObjectURL(blob);
            });
        }
    }
    const isImage = (b) => b && /^image\//.test(b.type);
    const dims = (img) => ({ w: img.width || img.naturalWidth, h: img.height || img.naturalHeight });
    const nSlots = () => LAYOUTS[S.layout.kind].slots;
    function emptySlot() {
        for (let i = 0; i < nSlots(); i++) if (!S.slots[i]) return i;
        return null;
    }
    function setSlot(i, img, name) {
        const { w, h } = dims(img);
        S.slots[i] = { img, w, h, name };
        relayout();
        renderLayers();
        draw(false);
        say(nSlots() > 1 ? `panel ${i + 1}: ${w}×${h}` : `loaded ${w}×${h}`);
    }
    // Images in: into the given panel (the first one), else the next empty panel, else as layers
    async function addAll(blobs, at) {
        let first = true;
        for (const b of blobs) {
            if (!isImage(b)) { say('that is not an image'); continue; }
            const img = await decode(b);
            if (!img) { say('could not read that image'); continue; }
            const slot = first && at != null ? at : emptySlot();
            first = false;
            if (slot != null) setSlot(slot, img, cleanName(b.name));
            else addLayer(img, cleanName(b.name));
        }
    }
    let slotTarget = 0;
    function openSlot(i) { slotTarget = i; els.file.click(); }
    els.open.addEventListener('click', () => { const e = emptySlot(); openSlot(e == null ? 0 : e); });
    els.file.addEventListener('change', () => { const f = els.file.files[0]; els.file.value = ''; if (f) addAll([f], slotTarget); });
    els.addImage.addEventListener('click', () => els.layerFile.click());
    els.layerFile.addEventListener('change', () => { const fs = Array.from(els.layerFile.files); els.layerFile.value = ''; addAll(fs); });
    els.sample.addEventListener('click', async () => {
        try { const r = await fetch('/assets/5031.png'); addAll([new File([await r.blob()], 'remilio-5031.png', { type: 'image/png' })]); }
        catch (_) { say('could not load the sample'); }
    });
    els.clear.addEventListener('click', () => {
        S.slots = [null, null, null, null];
        S.images = [];
        S.fx = [];
        S.texts = LAYOUTS[S.layout.kind].texts.map((id) => newText(TPL[id].text, id, TPL[id].style));
        S.sel = null;
        S.tool = null;
        relayout();
        renderLayers();
        renderSel();
        draw(false);
    });
    // Paste anywhere on the page (an image file, or an image copied from another page)
    document.addEventListener('paste', (e) => {
        const t = e.target;
        if (t instanceof Element && t.closest('input, textarea')) return;
        const files = Array.from((e.clipboardData || {}).items || []).filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
        if (!files.length) return;
        e.preventDefault();
        addAll(files);
    });
    // Drop on the stage: onto a panel replaces that panel
    ['dragenter', 'dragover'].forEach((t) => els.stage.addEventListener(t, (e) => { e.preventDefault(); els.stage.classList.add('is-drop'); }));
    ['dragleave', 'drop'].forEach((t) => els.stage.addEventListener(t, () => els.stage.classList.remove('is-drop')));
    els.stage.addEventListener('drop', (e) => {
        e.preventDefault();
        const fs = Array.from(e.dataTransfer.files || []).filter(isImage);
        if (!fs.length) return say('drop an image file');
        let at = null;
        if (S.G && nSlots() > 1) { const c = cellAt(toImg(e)); if (c) at = c.slot; }
        addAll(fs, at);
    });
    els.empty.addEventListener('click', (e) => { if (!e.target.closest('button')) openSlot(0); });

    function renderInfo() {
        if (!S.G) { els.info.innerHTML = '<dt>image</dt><dd>&mdash;</dd>'; els.sbImage.textContent = 'NO IMAGE'; return; }
        const a = S.slots[0], mp = (S.w * S.h / 1e6).toFixed(1);
        els.info.innerHTML = `<dt>name</dt><dd title="${esc(a ? a.name : '')}">${esc(a ? a.name : '—')}</dd><dt>canvas</dt><dd>${S.w}&times;${S.h}</dd><dt>pixels</dt><dd>${mp} MP</dd>`;
        els.sbImage.textContent = `CANVAS: ${S.w}×${S.h}`;
    }

    // ---------- Layout geometry ----------
    // In full-resolution canvas pixels: fills, image panels (cells), frames and divider lines
    function geom() {
        const k = S.layout.kind, a = S.slots[0];
        if (LAYOUTS[k].slots === 1 && !a) return null;
        const G = { kind: k, cells: [], fills: [], frames: [], lines: [] };
        const ref = a || { w: 800, h: 800 };
        if (k === 'classic') {
            G.W = a.w; G.H = a.h;
            G.cells.push({ slot: 0, x: 0, y: 0, w: a.w, h: a.h });
        } else if (k === 'caption') {
            const bar = Math.max(20, Math.round(a.h * S.layout.bar));
            G.W = a.w; G.H = a.h + bar; G.bar = bar;
            G.fills.push({ x: 0, y: 0, w: a.w, h: bar, c: '#ffffff' });
            G.cells.push({ slot: 0, x: 0, y: bar, w: a.w, h: a.h });
        } else if (k === 'demot') {
            const m = Math.max(a.w, a.h), pad = Math.round(m * 0.08), th = Math.round(a.h * 0.3 + m * 0.05);
            const gap = Math.max(2, Math.round(m * 0.01)), bw = Math.max(1, Math.round(m * 0.003));
            G.W = a.w + 2 * pad; G.H = pad + a.h + th;
            G.fills.push({ x: 0, y: 0, w: G.W, h: G.H, c: '#000000' });
            G.cells.push({ slot: 0, x: pad, y: pad, w: a.w, h: a.h });
            G.frames.push({ x: pad - gap, y: pad - gap, w: a.w + 2 * gap, h: a.h + 2 * gap, lw: bw, c: '#ffffff' });
            G.ty = pad + a.h + th * 0.38; G.tpx = th * 0.32;
            G.sy = pad + a.h + th * 0.72; G.spx = th * 0.12;
        } else if (k === 'yesno') {
            const c = clamp(Math.round(Math.min(ref.w, ref.h)), 400, 900);
            G.W = 2 * c; G.H = 2 * c; G.c = c;
            G.fills.push({ x: c, y: 0, w: c, h: 2 * c, c: '#ffffff' });
            G.cells.push({ slot: 0, x: 0, y: 0, w: c, h: c }, { slot: 1, x: 0, y: c, w: c, h: c });
            G.lines.push({ x: 0, y: c, w: 2 * c, h: 0 }, { x: c, y: 0, w: 0, h: 2 * c });
        } else {
            const cw = clamp(Math.round(ref.w), 400, 1200), ch = Math.round(cw * clamp(ref.h / ref.w, 0.5, 1.6));
            const cols = k === 'stack' ? 1 : 2, rows = k === 'side' ? 1 : 2;
            G.W = cw * cols; G.H = ch * rows;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) G.cells.push({ slot: r * cols + c, x: c * cw, y: r * ch, w: cw, h: ch });
            for (let c = 1; c < cols; c++) G.lines.push({ x: c * cw, y: 0, w: 0, h: G.H });
            for (let r = 1; r < rows; r++) G.lines.push({ x: 0, y: r * ch, w: G.W, h: 0 });
        }
        G.lw = Math.max(2, Math.round(Math.min(G.W, G.H) * 0.006));
        return G;
    }
    // Recompute the canvas after the layout or a panel changed; opts=false keeps the layout panel's controls
    function relayout(opts) {
        S.G = geom();
        app.classList.toggle('has-image', !!S.G);
        if (S.G) {
            S.w = S.G.W;
            S.h = S.G.H;
            for (const t of S.texts) if (t.tpl && !t.moved && TPL[t.tpl]) Object.assign(t, TPL[t.tpl].at(S.G));
            sizePreview();
        } else {
            S.w = S.h = 0;
            els.shot.removeAttribute('src');
            els.stageMeta.textContent = 'NO IMAGE';
        }
        renderInfo();
        renderLayoutButtons();
        if (opts !== false) renderLayoutOpts();
        drawOverlay();
    }
    function switchLayout(k) {
        if (k === S.layout.kind) return;
        const keep = LAYOUTS[k].texts;
        // Untouched template texts go; edited ones stay as ordinary text
        S.texts = S.texts.filter((t) => !(t.tpl && !keep.includes(t.tpl) && t.text === TPL[t.tpl].text));
        for (const t of S.texts) if (t.tpl && !keep.includes(t.tpl)) { t.tpl = null; t.moved = true; }
        for (const id of keep) if (!S.texts.some((t) => t.tpl === id)) S.texts.push(newText(TPL[id].text, id, TPL[id].style));
        S.layout.kind = k;
        if (S.sel && S.sel.kind === 'text' && !S.texts.includes(S.sel)) S.sel = null;
        relayout();
        renderLayers();
        renderSel();
        draw(false);
        if (!S.G) say('now paste or open an image');
    }
    function cellAt(p) {
        if (!S.G) return null;
        const x = p.x * S.G.W, y = p.y * S.G.H;
        return S.G.cells.find((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) || null;
    }

    function renderLayoutButtons() {
        els.layouts.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === S.layout.kind)));
        els.layoutMeta.textContent = LAYOUTS[S.layout.kind].label;
    }
    function renderLayoutOpts() {
        const box = els.layoutOpts, k = S.layout.kind;
        box.innerHTML = '';
        if (k === 'caption') {
            box.append(slider('BAR', 0.08, 0.8, 0.01, () => S.layout.bar, (v) => { S.layout.bar = v; relayout(false); }, pct));
        }
        if (nSlots() > 1) {
            const list = document.createElement('ol');
            list.className = 'mm-slots';
            for (let i = 0; i < nSlots(); i++) {
                const s = S.slots[i];
                list.insertAdjacentHTML('beforeend', `<li class="mm-slot${s ? '' : ' is-empty'}"><span class="mm-slot-n">${i + 1}</span>
                    <span class="mm-slot-name" title="${esc(s ? s.name : '')}">${s ? esc(s.name) : 'empty: paste or click'}</span>
                    <button type="button" class="mm-btn" data-slot-open="${i}">${s ? 'SWAP' : 'OPEN'}</button>
                    ${s ? `<button type="button" class="mm-btn is-danger" data-slot-clear="${i}" title="Empty this panel">&times;</button>` : ''}</li>`);
            }
            box.append(list);
        }
    }
    els.layouts.innerHTML = Object.entries(LAYOUTS).map(([k, L]) => `<button type="button" class="mm-layout" data-layout="${k}" aria-pressed="false" title="${L.label}${L.slots > 1 ? ` · ${L.slots} panels` : ''}">
        <svg viewBox="0 0 32 24" aria-hidden="true">${L.icon}</svg><span>${L.label}</span></button>`).join('');
    els.layouts.addEventListener('click', (e) => { const b = e.target.closest('[data-layout]'); if (b) switchLayout(b.dataset.layout); });
    els.layoutOpts.addEventListener('click', (e) => {
        const o = e.target.closest('[data-slot-open]'), c = e.target.closest('[data-slot-clear]');
        if (o) openSlot(+o.dataset.slotOpen);
        if (c) { S.slots[+c.dataset.slotClear] = null; relayout(); draw(false); }
    });

    // ---------- Rendering ----------
    // A small seeded random, so noise holds still between redraws
    const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const CANVAS_FILTER = (() => { try { const g = canvas(1, 1).getContext('2d'); g.filter = 'blur(2px)'; return g.filter === 'blur(2px)'; } catch (_) { return false; } })();
    // Blur a canvas in place (ctx.filter where there is one, else down and back up)
    function blurCanvas(c, r) {
        if (r < 0.5) return;
        const g = c.getContext('2d'), t = canvas(c.width, c.height);
        if (CANVAS_FILTER) {
            t.getContext('2d').drawImage(c, 0, 0);
            g.clearRect(0, 0, c.width, c.height);
            g.filter = `blur(${r}px)`;
            g.drawImage(t, 0, 0);
            g.filter = 'none';
            return;
        }
        const k = clamp(1.5 / r, 0.01, 1), s = canvas(c.width * k, c.height * k), sg = s.getContext('2d');
        sg.imageSmoothingQuality = 'high';
        sg.drawImage(c, 0, 0, s.width, s.height);
        g.clearRect(0, 0, c.width, c.height);
        g.imageSmoothingQuality = 'high';
        g.drawImage(s, 0, 0, c.width, c.height);
    }

    function drawCover(g, img, iw, ih, c) {
        const k = Math.max(c.w / iw, c.h / ih), sw = c.w / k, sh = c.h / k;
        g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, c.x, c.y, c.w, c.h);
    }
    function drawLayout(g, W, H, preview) {
        const G = S.G;
        g.save();
        g.scale(W / G.W, H / G.H);
        for (const f of G.fills) { g.fillStyle = f.c; g.fillRect(f.x, f.y, f.w, f.h); }
        for (const c of G.cells) {
            const s = S.slots[c.slot];
            if (s) { drawCover(g, s.img, s.w, s.h, c); continue; }
            if (!preview) continue;
            // An empty panel, in the preview only
            g.fillStyle = '#141c22';
            g.fillRect(c.x, c.y, c.w, c.h);
            const m = Math.min(c.w, c.h);
            g.fillStyle = '#5f8a99';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.font = `${m * 0.22}px 'Share Tech Mono', monospace`;
            g.fillText(String(c.slot + 1), c.x + c.w / 2, c.y + c.h / 2 - m * 0.08);
            g.font = `${m * 0.055}px 'Share Tech Mono', monospace`;
            g.fillText('PASTE · DROP · CLICK', c.x + c.w / 2, c.y + c.h / 2 + m * 0.12);
        }
        for (const f of G.frames) { g.strokeStyle = f.c; g.lineWidth = f.lw; g.strokeRect(f.x, f.y, f.w, f.h); }
        g.fillStyle = '#000000';
        for (const l of G.lines) g.fillRect(l.x - (l.w ? 0 : G.lw / 2), l.y - (l.h ? 0 : G.lw / 2), l.w || G.lw, l.h || G.lw);
        g.restore();
    }

    // ----- Image layers -----
    // An image layer's size in pixels of a W-wide render
    const lsize = (L, W) => { const w = L.w * W; return { w, h: w * L.ih / L.iw }; };
    // The layer's pixels at cut-out resolution (cached per source image)
    function srcOf(L) {
        if (L._src && L._src.img === L.img) return L._src;
        const k = Math.min(1, PROC_MAX / Math.max(L.iw, L.ih)), c = canvas(L.iw * k, L.ih * k);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(L.img, 0, 0, c.width, c.height);
        L._src = { img: L.img, w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
        return L._src;
    }
    const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    // The commonest colour round the edge: usually the background to remove
    function edgeColor(L) {
        const s = srcOf(L), d = s.data, buckets = new Map();
        const add = (x, y) => {
            const o = (y * s.w + x) * 4;
            if (d[o + 3] < 128) return;
            const k = (d[o] >> 4) << 8 | (d[o + 1] >> 4) << 4 | d[o + 2] >> 4;
            const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
            b.n++; b.r += d[o]; b.g += d[o + 1]; b.b += d[o + 2];
            buckets.set(k, b);
        };
        const step = Math.max(1, Math.floor((s.w + s.h) / 400));
        for (let x = 0; x < s.w; x += step) { add(x, 0); add(x, s.h - 1); }
        for (let y = 0; y < s.h; y += step) { add(0, y); add(s.w - 1, y); }
        let best = null;
        for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
        return best ? hex(best.r / best.n, best.g / best.n, best.b / best.n) : '#ffffff';
    }
    // Clear pixels near the colour: everywhere, or only the region connected to the edges; soft at the boundary
    function knockout(id, k) {
        const d = id.data, W = id.width, H = id.height, [tr, tg, tb] = rgb(k.color);
        const tol = k.tol, soft = 0.06 + tol * 0.25;
        const dist = (o) => Math.sqrt((d[o] - tr) ** 2 + (d[o + 1] - tg) ** 2 + (d[o + 2] - tb) ** 2) / 441.7;
        const fade = (o) => { const dd = dist(o); if (dd < tol + soft) d[o + 3] *= clamp((dd - tol) / soft, 0, 1); };
        if (!k.edges) { for (let o = 0; o < d.length; o += 4) fade(o); return; }
        const gone = new Uint8Array(W * H), q = new Int32Array(W * H);
        let qh = 0, qt = 0;
        const seed = (i) => { if (!gone[i] && (d[i * 4 + 3] < 16 || dist(i * 4) <= tol)) { gone[i] = 1; q[qt++] = i; } };
        for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
        for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
        while (qh < qt) {
            const i = q[qh++], x = i % W;
            if (x > 0) seed(i - 1);
            if (x < W - 1) seed(i + 1);
            if (i >= W) seed(i - W);
            if (i < W * (H - 1)) seed(i + W);
        }
        for (let i = 0; i < W * H; i++) if (gone[i]) d[i * 4 + 3] = 0;
        // Feather the rim: neighbours of removed pixels that are close to the colour
        for (let i = 0; i < W * H; i++) {
            if (gone[i]) continue;
            const x = i % W;
            if ((x > 0 && gone[i - 1]) || (x < W - 1 && gone[i + 1]) || (i >= W && gone[i - W]) || (i < W * (H - 1) && gone[i + W])) fade(i * 4);
        }
    }
    // The layer as drawn: the source, or its cut-out (cached until its cut-out settings change)
    function processed(L) {
        if (!L.knock.on && L.shape === 'none') return L.img;
        const key = JSON.stringify([L.knock, L.shape, L.feather, L.shape === 'lasso' ? L.cut : 0]);
        if (L._pk === key && L._pfor === L.img) return L._pimg;
        const s = srcOf(L), c = canvas(s.w, s.h), g = c.getContext('2d');
        const id = new ImageData(new Uint8ClampedArray(s.data), s.w, s.h);
        if (L.knock.on) knockout(id, L.knock);
        g.putImageData(id, 0, 0);
        if (L.shape === 'circle' || (L.shape === 'lasso' && L.cut && L.cut.length > 2)) {
            const m = canvas(s.w, s.h), mg = m.getContext('2d'), f = L.feather * 0.06 * Math.min(s.w, s.h);
            mg.fillStyle = '#fff';
            mg.beginPath();
            if (L.shape === 'circle') mg.ellipse(s.w / 2, s.h / 2, Math.max(1, s.w / 2 - f), Math.max(1, s.h / 2 - f), 0, 0, Math.PI * 2);
            else L.cut.forEach(([u, v], i) => (i ? mg.lineTo(u * s.w, v * s.h) : mg.moveTo(u * s.w, v * s.h)));
            mg.fill();
            blurCanvas(m, f);
            g.globalCompositeOperation = 'destination-in';
            g.drawImage(m, 0, 0);
            g.globalCompositeOperation = 'source-over';
        }
        L._pk = key;
        L._pfor = L.img;
        L._pimg = c;
        return c;
    }
    function drawImages(g, W, H) {
        for (const L of S.images) {
            const { w, h } = lsize(L, W);
            g.save();
            g.globalAlpha = L.opacity;
            g.globalCompositeOperation = L.blend;
            g.imageSmoothingEnabled = !L.pixelArt;
            g.translate(L.x * W, L.y * H);
            g.rotate(L.rot * Math.PI / 180);
            if (L.flip) g.scale(-1, 1);
            g.drawImage(processed(L), -w / 2, -h / 2, w, h);
            g.restore();
        }
    }

    // ----- Effects -----
    function warp(g, f, cx, cy, R, W, H) {
        const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W, Math.ceil(cx + R));
        const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H, Math.ceil(cy + R));
        const bw = x1 - x0, bh = y1 - y0;
        if (bw < 2 || bh < 2) return;
        const img = g.getImageData(x0, y0, bw, bh), d = img.data, src = new Uint8ClampedArray(d);
        const k = Math.pow(2.5, f.s); // bulge: > 1 magnifies the middle, < 1 pinches it
        const turn = f.s * Math.PI * 2.2; // swirl: how far the middle turns
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= R || dist === 0) continue;
                let sx, sy;
                if (f.type === 'swirl') {
                    const t = 1 - dist / R, a = turn * t * t, cs = Math.cos(a), sn = Math.sin(a);
                    sx = cx + dx * cs - dy * sn;
                    sy = cy + dx * sn + dy * cs;
                } else {
                    const m = Math.pow(dist / R, k) * R / dist;
                    sx = cx + dx * m;
                    sy = cy + dy * m;
                }
                sx = clamp(sx - x0, 0, bw - 1.001);
                sy = clamp(sy - y0, 0, bh - 1.001);
                // bilinear sample
                const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
                const i00 = (iy * bw + ix) * 4, i10 = i00 + 4, i01 = i00 + bw * 4, i11 = i01 + 4;
                const o = ((y - y0) * bw + (x - x0)) * 4;
                for (let ch = 0; ch < 4; ch++) {
                    const top = src[i00 + ch] + (src[i10 + ch] - src[i00 + ch]) * fx;
                    const bot = src[i01 + ch] + (src[i11 + ch] - src[i01 + ch]) * fx;
                    d[o + ch] = top + (bot - top) * fy;
                }
            }
        }
        g.putImageData(img, x0, y0);
    }
    function circleFx(c, f, cx, cy, R, W, H) {
        const g = c.getContext('2d'), m = Math.min(W, H);
        const pad = f.type === 'blur' ? Math.ceil(R * 0.5 + 4) : 0;
        const x0 = Math.max(0, Math.floor(cx - R - pad)), x1 = Math.min(W, Math.ceil(cx + R + pad));
        const y0 = Math.max(0, Math.floor(cy - R - pad)), y1 = Math.min(H, Math.ceil(cy + R + pad));
        const bw = x1 - x0, bh = y1 - y0;
        if (bw < 2 || bh < 2) return;
        let t;
        if (f.type === 'pixel') {
            const block = Math.max(2, Math.round((0.008 + f.s * 0.06) * m));
            t = canvas(Math.ceil(bw / block), Math.ceil(bh / block));
            t.getContext('2d').drawImage(c, x0, y0, t.width * block, t.height * block, 0, 0, t.width, t.height);
            g.save();
            g.beginPath();
            g.arc(cx, cy, R, 0, Math.PI * 2);
            g.clip();
            g.imageSmoothingEnabled = false;
            g.drawImage(t, x0, y0, t.width * block, t.height * block);
            g.restore();
            return;
        }
        t = canvas(bw, bh);
        t.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh);
        blurCanvas(t, (0.003 + f.s * 0.03) * m);
        g.save();
        g.beginPath();
        g.arc(cx, cy, R, 0, Math.PI * 2);
        g.clip();
        g.drawImage(t, x0, y0);
        g.restore();
    }
    function applyFx(c, W, H) {
        if (!S.fx.length) return;
        const g = c.getContext('2d', { willReadFrequently: true });
        for (const f of S.fx) {
            const cx = f.x * W, cy = f.y * H, R = f.r * Math.min(W, H);
            if (f.type === 'bulge' || f.type === 'swirl') warp(g, f, cx, cy, R, W, H);
            else circleFx(c, f, cx, cy, R, W, H);
        }
    }

    // ----- Text -----
    // Wrap one text layer into lines that fit maxW
    function wrap(g, text, maxW) {
        const out = [];
        for (const para of text.split('\n')) {
            const words = para.split(/\s+/).filter(Boolean);
            if (!words.length) { out.push(''); continue; }
            let line = words[0];
            for (const w of words.slice(1)) {
                if (g.measureText(line + ' ' + w).width <= maxW) line += ' ' + w;
                else { out.push(line); line = w; }
            }
            out.push(line);
        }
        return out;
    }
    let boxes = []; // text boxes in preview pixels (centre, size, rotation), for picking and the selection outline
    function drawTexts(c, W, H, collect) {
        const g = c.getContext('2d');
        if (collect) boxes = [];
        for (const t of S.texts) {
            const text = t.upper ? t.text.toUpperCase() : t.text;
            if (!text.trim()) continue;
            const fam = FONTS[t.font] || FONTS.impact, maxW = W * (t.maxW || 0.94), lhK = t.font === 'impact' ? 1.05 : 1.18;
            let px = Math.max(4, t.size * H), lines;
            const setFont = () => { g.font = `${t.bold ? 'bold ' : ''}${px}px ${fam}`; lines = wrap(g, text, maxW); };
            const widest = () => lines.reduce((m, l) => Math.max(m, g.measureText(l).width), 0);
            setFont();
            // Template texts shrink to fit their box
            if (t.fitH) for (let i = 0; i < 40 && px > 6 && (lines.length * px * lhK > t.fitH * H || widest() > maxW); i++) { px *= 0.93; setFont(); }
            const lh = px * lhK, total = lh * lines.length, top = -total / 2, cx = t.x * W, cy = t.y * H;
            const ys = lines.map((_, i) => top + lh * (i + 0.5));
            g.save();
            g.translate(cx, cy);
            g.rotate(t.rot * Math.PI / 180);
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.lineJoin = 'round';
            g.miterLimit = 2;
            if (t.glow > 0) {
                g.shadowColor = t.glowColor;
                g.shadowBlur = px * 0.7 * t.glow;
                g.fillStyle = t.glowColor;
                for (let p = 0; p < 2; p++) lines.forEach((l, i) => g.fillText(l, 0, ys[i]));
            }
            const shadow = (on) => {
                g.shadowColor = on ? 'rgba(0, 0, 0, 0.85)' : 'transparent';
                g.shadowBlur = on ? px * 0.15 * t.shadow : 0;
                g.shadowOffsetX = g.shadowOffsetY = on ? px * 0.08 * t.shadow : 0;
            };
            shadow(t.shadow > 0);
            if (t.strokeW > 0) {
                g.lineWidth = px * t.strokeW * 2;
                g.strokeStyle = t.stroke;
                lines.forEach((l, i) => g.strokeText(l, 0, ys[i]));
                shadow(false);
            }
            g.fillStyle = t.color;
            lines.forEach((l, i) => g.fillText(l, 0, ys[i]));
            g.restore();
            if (collect) {
                const pad = px * t.strokeW + 4;
                boxes.push({ id: t.id, cx, cy, w: widest() + 2 * pad, h: total + 2 * pad, rot: t.rot });
            }
        }
    }

    // ----- Deep fry -----
    const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
    async function deepFry(c, W, H, fast) {
        const f = S.fry, g = c.getContext('2d');
        // Crunch: down and back up, blocky
        if (f.crush > 0.02) {
            const k = 1 - f.crush * 0.55;
            const t = canvas(W * k, H * k);
            t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
            g.imageSmoothingEnabled = false;
            g.clearRect(0, 0, W, H);
            g.drawImage(t, 0, 0, W, H);
            g.imageSmoothingEnabled = true;
        }
        // Colour: saturation, contrast, a warm tint and noise
        const img = g.getImageData(0, 0, W, H), d = img.data;
        const sat = 1 + f.sat * 2.5, con = 1 + f.contrast * 2, bright = f.contrast * 12;
        const tr = 1 + f.tint * 0.35, tg = 1 + f.tint * 0.06, tb = 1 - f.tint * 0.4;
        const noise = f.noise * 90, rand = rng(5031);
        for (let i = 0; i < d.length; i += 4) {
            let r = d[i], gg = d[i + 1], b = d[i + 2];
            const l = 0.299 * r + 0.587 * gg + 0.114 * b;
            r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
            r = (r - 128) * con + 128 + bright; gg = (gg - 128) * con + 128 + bright; b = (b - 128) * con + 128 + bright;
            const n = noise ? (rand() - 0.5) * noise : 0;
            d[i] = r * tr + n; d[i + 1] = gg * tg + n; d[i + 2] = b * tb + n;
        }
        // Sharpen (unsharp 3x3)
        if (f.sharpen > 0.02) {
            const a = f.sharpen * 1.6, src = new Uint8ClampedArray(d), row = W * 4;
            for (let y = 1; y < H - 1; y++) {
                for (let x = 1; x < W - 1; x++) {
                    const o = y * row + x * 4;
                    for (let ch = 0; ch < 3; ch++) {
                        const v = src[o + ch];
                        d[o + ch] = v * (1 + 4 * a) - a * (src[o - 4 + ch] + src[o + 4 + ch] + src[o - row + ch] + src[o + row + ch]);
                    }
                }
            }
        }
        g.putImageData(img, 0, 0);
        // JPEG crush: re-encode at low quality (skipped while dragging). Most of the damage is done by the first pass
        // at a given quality, so the preview does one and the export up to three
        if (fast !== true && f.crush > 0.02) {
            const passes = fast === 'export' ? 1 + Math.round(f.crush * 2) : 1, q = Math.max(0.03, 0.55 - f.crush * 0.5);
            for (let p = 0; p < passes; p++) {
                const blob = await toBlob(c, 'image/jpeg', q);
                if (!blob) break;
                const bmp = await createImageBitmap(blob);
                g.drawImage(bmp, 0, 0);
                bmp.close && bmp.close();
            }
        }
    }

    // Render the whole pipeline into a new canvas at the given scale of the full canvas
    async function render(scale, fast, preview) {
        const W = Math.max(1, Math.round(S.w * scale)), H = Math.max(1, Math.round(S.h * scale));
        const c = canvas(W, H), g = c.getContext('2d', { willReadFrequently: true });
        g.imageSmoothingQuality = 'high';
        drawLayout(g, W, H, preview);
        drawImages(g, W, H);
        applyFx(c, W, H);
        const friedText = S.fry.on && S.fry.fryText;
        if (friedText) drawTexts(c, W, H, preview);
        if (S.fry.on) await deepFry(c, W, H, fast);
        if (!friedText) drawTexts(c, W, H, preview);
        return c;
    }

    let pscale = 1, drawing = 0, queued = null;
    function sizePreview() {
        pscale = Math.min(1, PREVIEW / Math.max(S.w, S.h));
        const w = Math.round(S.w * pscale), h = Math.round(S.h * pscale);
        if (els.canvas.width !== w || els.canvas.height !== h) {
            els.canvas.width = els.overlay.width = w;
            els.canvas.height = els.overlay.height = h;
        }
        els.stageMeta.textContent = `${S.w}×${S.h}${pscale < 1 ? ` · PREVIEW ${Math.round(pscale * 100)}%` : ''}`;
        fitCanvas();
    }
    // The canvas keeps its shape and fits the stage
    function fitCanvas() {
        if (!S.G) return;
        const r = els.stage.getBoundingClientRect();
        const k = Math.min((r.width - 24) / S.w, (r.height - 24) / S.h);
        els.wrap.style.width = Math.max(40, Math.floor(S.w * k)) + 'px';
        els.wrap.style.height = Math.max(40, Math.floor(S.h * k)) + 'px';
    }
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(els.stage);
    else window.addEventListener('resize', fitCanvas);

    // Redraw the preview: one at a time, the latest request wins; fast skips the JPEG passes (while dragging).
    // A settled (not fast) draw also records an undo step when anything changed.
    function draw(fast) {
        if (!fast) commit();
        if (!S.G) return;
        if (drawing) { queued = { fast: queued ? queued.fast && fast : fast }; return; }
        drawing = 1;
        render(pscale, fast, true).then((c) => {
            if (c.width !== els.canvas.width || c.height !== els.canvas.height) return; // the canvas changed size meanwhile
            ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
            ctx.drawImage(c, 0, 0);
            drawOverlay();
            if (!fast) refreshShot(c);
        }).catch((e) => console.error(e)).finally(() => {
            drawing = 0;
            if (queued) { const q = queued; queued = null; draw(q.fast === undefined ? true : q.fast); }
        });
    }
    // The copyable picture: an invisible <img> of the latest settled render on top of the canvases, so the browser's own
    // right-click "Copy image" / "Save image as" gets the meme (never the overlay's rings and outlines). It takes every
    // pointer event, so the editing handlers below listen on the wrap.
    // It's the preview's size: the full canvas when that's up to PREVIEW px, else Ctrl+C / COPY for full size.
    let shotURL = '', shotGen = 0;
    function refreshShot(c) {
        const gen = ++shotGen;
        c.toBlob((blob) => {
            if (!blob || gen !== shotGen) return;
            if (shotURL) URL.revokeObjectURL(shotURL);
            shotURL = URL.createObjectURL(blob);
            els.shot.src = shotURL;
        }, 'image/png');
    }
    els.shot.addEventListener('dragstart', (e) => e.preventDefault());

    let settle = 0;
    // While a control is moving: fast redraws, then a full one once it stops
    function drawSoon() {
        draw(true);
        clearTimeout(settle);
        settle = setTimeout(() => draw(false), 180);
    }

    // ---------- Undo ----------
    // Snapshots of everything but the selection; a step is recorded when a settled draw finds the state changed
    const imgIds = new WeakMap();
    let imgN = 0;
    const isPixels = (v) => (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap) || v instanceof HTMLImageElement || v instanceof HTMLCanvasElement;
    const pixId = (v) => { if (!imgIds.has(v)) imgIds.set(v, ++imgN); return '#img' + imgIds.get(v); };
    const cloneImg = (L) => ({ ...L, knock: { ...L.knock } });
    const snap = () => ({
        slots: S.slots.slice(), layout: { ...S.layout }, texts: S.texts.map((t) => ({ ...t })),
        images: S.images.map(cloneImg), fx: S.fx.map((f) => ({ ...f })), fry: { ...S.fry }
    });
    const keyOf = (s) => JSON.stringify(s, (k, v) => (k[0] === '_' ? undefined : v && typeof v === 'object' && isPixels(v) ? pixId(v) : v));
    const hist = [];
    let hi = -1;
    function commit() {
        const s = snap(), k = keyOf(s);
        if (hi >= 0 && hist[hi].k === k) return;
        hist.splice(hi + 1);
        hist.push({ s, k });
        if (hist.length > 80) hist.shift();
        hi = hist.length - 1;
        syncUndo();
    }
    function restore(s) {
        const selId = S.sel && S.sel.id;
        S.slots = s.slots.slice();
        S.layout = { ...s.layout };
        S.texts = s.texts.map((t) => ({ ...t }));
        S.images = s.images.map(cloneImg);
        S.fx = s.fx.map((f) => ({ ...f }));
        Object.assign(S.fry, s.fry);
        S.sel = byId(selId) || null;
        S.tool = null;
        relayout();
        renderLayers();
        renderSel();
        renderFry();
        setHint();
        draw(false);
    }
    function undo() { if (hi > 0) { hi--; restore(hist[hi].s); syncUndo(); say('undone'); } }
    function redo() { if (hi < hist.length - 1) { hi++; restore(hist[hi].s); syncUndo(); say('redone'); } }
    function syncUndo() {
        els.undo.disabled = hi <= 0;
        els.redo.disabled = hi >= hist.length - 1;
    }
    els.undo.addEventListener('click', undo);
    els.redo.addEventListener('click', redo);

    // ---------- Overlay ----------
    const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // A handle's size in overlay pixels (about 10 screen pixels)
    const handle = () => 10 * els.overlay.width / Math.max(1, els.overlay.getBoundingClientRect().width);
    // The selected text or image layer's box in overlay pixels: centre, size, rotation
    function boxOf(it) {
        if (!it) return null;
        if (it.kind === 'image') { const { w, h } = lsize(it, els.overlay.width); return { cx: it.x * els.overlay.width, cy: it.y * els.overlay.height, w, h, rot: it.rot }; }
        if (it.kind === 'text') return boxes.find((b) => b.id === it.id) || null;
        return null;
    }
    // p in a box's own (unrotated) frame, centred on it
    function local(b, p) {
        const a = -b.rot * Math.PI / 180, dx = p.px - b.cx, dy = p.py - b.cy;
        return { lx: dx * Math.cos(a) - dy * Math.sin(a), ly: dx * Math.sin(a) + dy * Math.cos(a) };
    }
    const inBox = (b, p) => { const { lx, ly } = local(b, p); return Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2; };
    function onHandle(p) {
        const b = boxOf(S.sel);
        if (!b || S.tool) return false;
        const { lx, ly } = local(b, p), r = handle();
        return CORNERS.some(([sx, sy]) => Math.abs(lx - sx * b.w / 2) <= r && Math.abs(ly - sy * b.h / 2) <= r);
    }
    let lassoPts = null;
    function drawOverlay() {
        const W = els.overlay.width, H = els.overlay.height;
        octx.clearRect(0, 0, W, H);
        if (!S.G) return;
        const lw = Math.max(1.5, W / 500);
        octx.lineWidth = lw;
        if (S.mode !== 'move' || (S.sel && S.sel.kind === 'fx')) {
            for (const f of S.fx) {
                const on = S.sel === f, col = FX[f.type].color;
                octx.setLineDash(on ? [] : [lw * 4, lw * 3]);
                octx.strokeStyle = on ? 'rgba(80, 250, 123, 0.95)' : `rgba(${col}, 0.7)`;
                octx.beginPath();
                octx.arc(f.x * W, f.y * H, f.r * Math.min(W, H), 0, Math.PI * 2);
                octx.stroke();
                octx.beginPath();
                octx.arc(f.x * W, f.y * H, lw * 2.5, 0, Math.PI * 2);
                octx.fillStyle = octx.strokeStyle;
                octx.fill();
            }
        }
        const b = boxOf(S.sel);
        if (b) {
            octx.save();
            octx.translate(b.cx, b.cy);
            octx.rotate(b.rot * Math.PI / 180);
            octx.setLineDash([lw * 4, lw * 3]);
            octx.strokeStyle = 'rgba(139, 233, 253, 0.95)';
            octx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
            octx.setLineDash([]);
            if (!S.tool) {
                const hs = handle();
                octx.fillStyle = 'rgba(80, 250, 123, 0.95)';
                for (const [sx, sy] of CORNERS) octx.fillRect(sx * b.w / 2 - hs / 2, sy * b.h / 2 - hs / 2, hs, hs);
            }
            octx.restore();
        }
        if (lassoPts && lassoPts.length > 1) {
            octx.setLineDash([lw * 3, lw * 2]);
            octx.strokeStyle = 'rgba(80, 250, 123, 0.95)';
            octx.fillStyle = 'rgba(80, 250, 123, 0.12)';
            octx.beginPath();
            lassoPts.forEach((p, i) => (i ? octx.lineTo(p.px, p.py) : octx.moveTo(p.px, p.py)));
            octx.closePath();
            octx.fill();
            octx.stroke();
        }
        octx.setLineDash([]);
    }

    // ---------- Canvas interaction ----------
    function toImg(e) {
        const r = els.overlay.getBoundingClientRect();
        return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), px: (e.clientX - r.left) / r.width * els.overlay.width, py: (e.clientY - r.top) / r.height * els.overlay.height };
    }
    function pick(p) {
        const W = els.overlay.width, H = els.overlay.height;
        if (S.mode !== 'move') {
            // an effect whose middle half you're on, else nothing (so a click adds one)
            let best = null, bd = Infinity;
            for (const f of S.fx) {
                const dd = Math.hypot(p.px - f.x * W, p.py - f.y * H);
                if (dd < f.r * Math.min(W, H) * 0.5 && dd < bd) { best = f; bd = dd; }
            }
            return best;
        }
        for (let i = boxes.length - 1; i >= 0; i--) if (inBox(boxes[i], p)) return S.texts.find((t) => t.id === boxes[i].id);
        for (let i = S.images.length - 1; i >= 0; i--) if (inBox(boxOf(S.images[i]), p)) return S.images[i];
        return null;
    }
    // Where p falls in an image layer's source, as 0..1 (flip undone), or null when it's outside
    function layerUV(L, p) {
        const b = boxOf(L);
        let { lx, ly } = local(b, p);
        if (L.flip) lx = -lx;
        const u = lx / b.w + 0.5, v = ly / b.h + 0.5;
        return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
    }
    let drag = null;
    els.wrap.addEventListener('pointerdown', (e) => {
        if (!S.G || e.button) return;
        e.preventDefault();
        const p = toImg(e);
        if (S.tool === 'lasso') {
            els.wrap.setPointerCapture(e.pointerId);
            lassoPts = [p];
            drag = { lasso: true };
            return;
        }
        if (S.tool === 'pick') {
            const L = S.sel, uv = layerUV(L, p);
            S.tool = null;
            setHint();
            if (!uv.inside) { drawOverlay(); return say('pick a colour on the selected layer'); }
            const s = srcOf(L), o = (Math.min(s.h - 1, Math.floor(uv.v * s.h)) * s.w + Math.min(s.w - 1, Math.floor(uv.u * s.w))) * 4;
            L.knock.color = hex(s.data[o], s.data[o + 1], s.data[o + 2]);
            L.knock.on = true;
            L.knock.picked = true;
            renderSel();
            draw(false);
            return;
        }
        if (onHandle(p)) {
            const it = S.sel, b = boxOf(it);
            els.wrap.setPointerCapture(e.pointerId);
            drag = { item: it, resize: true, v0: it.kind === 'image' ? it.w : it.size, d0: Math.max(1, Math.hypot(p.px - b.cx, p.py - b.cy)), cx: b.cx, cy: b.cy };
            return;
        }
        let hit = pick(p);
        if (!hit && S.mode !== 'move') {
            const d = FX[S.mode];
            hit = { id: ++uid, kind: 'fx', type: S.mode, x: p.x, y: p.y, r: d.r, s: d.s };
            S.fx.push(hit);
            renderLayers();
            drawSoon();
        }
        if (!hit && S.mode === 'move') {
            // A click on an empty panel opens a picker for it
            const c = cellAt(p);
            if (c && !S.slots[c.slot]) { select(null); return openSlot(c.slot); }
        }
        select(hit);
        if (!hit) return;
        els.wrap.setPointerCapture(e.pointerId);
        drag = { item: hit, ox: hit.x - p.x, oy: hit.y - p.y };
    });
    els.wrap.addEventListener('pointermove', (e) => {
        if (!S.G) return;
        const p = toImg(e);
        if (!drag) {
            els.wrap.style.cursor = S.tool ? 'crosshair' : onHandle(p) ? 'nwse-resize' : pick(p) ? 'move' : S.mode !== 'move' ? 'crosshair'
                : (() => { const c = cellAt(p); return c && !S.slots[c.slot] ? 'pointer' : 'default'; })();
            return;
        }
        if (drag.lasso) {
            const last = lassoPts[lassoPts.length - 1];
            if (Math.hypot(p.px - last.px, p.py - last.py) > handle() * 0.3) { lassoPts.push(p); drawOverlay(); }
            return;
        }
        const it = drag.item;
        if (drag.resize) {
            const k = Math.hypot(p.px - drag.cx, p.py - drag.cy) / drag.d0;
            if (it.kind === 'image') it.w = clamp(drag.v0 * k, 0.01, 4);
            else { it.size = clamp(drag.v0 * k, 0.01, 0.8); it.moved = true; }
            draw(true);
            return;
        }
        it.x = clamp(p.x + drag.ox, 0, 1);
        it.y = clamp(p.y + drag.oy, 0, 1);
        if (it.kind === 'text') it.moved = true;
        draw(true);
    });
    const endDrag = () => {
        if (!drag) return;
        const d = drag;
        drag = null;
        if (d.lasso) {
            const L = S.sel, pts = lassoPts || [];
            lassoPts = null;
            S.tool = null;
            setHint();
            if (pts.length > 2) {
                L.cut = pts.map((p) => { const uv = layerUV(L, p); return [+uv.u.toFixed(4), +uv.v.toFixed(4)]; });
                L.shape = 'lasso';
                say('cut out · undo to try again');
            }
            renderSel();
            draw(false);
            return;
        }
        if (d.resize) renderSel();
        draw(false);
    };
    els.wrap.addEventListener('pointerup', endDrag);
    els.wrap.addEventListener('pointercancel', endDrag);
    // Scroll to resize the selected layer; shift+scroll rotates text and images
    els.wrap.addEventListener('wheel', (e) => {
        const it = S.sel;
        if (!it || !S.G) return;
        e.preventDefault();
        const up = (e.deltaY || e.deltaX) < 0, k = up ? 1.06 : 1 / 1.06;
        if (it.kind === 'fx') it.r = clamp(it.r * k, 0.02, 1);
        else if (e.shiftKey) it.rot = ((it.rot + (up ? 5 : -5) + 540) % 360) - 180;
        else if (it.kind === 'image') it.w = clamp(it.w * k, 0.01, 4);
        else it.size = clamp(it.size * k, 0.01, 0.8);
        if (it.kind === 'text') it.moved = true;
        renderSel();
        drawSoon();
    }, { passive: false });
    els.wrap.addEventListener('dblclick', () => {
        if (S.sel && S.sel.kind === 'text') { const ta = els.selPane.querySelector('textarea'); if (ta) { ta.focus(); ta.select(); } }
    });

    els.mode.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-mode]');
        if (b) setMode(b.dataset.mode);
    });
    function setMode(m) {
        S.mode = m;
        S.tool = null;
        lassoPts = null;
        els.mode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
        setHint();
        drawOverlay();
    }
    function setHint() {
        els.hint.textContent = S.tool === 'lasso' ? 'draw round the part to keep · esc cancels'
            : S.tool === 'pick' ? 'click the colour to remove · esc cancels'
                : S.mode === 'move' ? 'drag to move · corners or scroll resize · shift+scroll rotates · double-click edits text'
                    : `${FX[S.mode].hint} · drag to move · scroll to resize`;
        app.classList.toggle('is-tool', !!S.tool);
    }

    // ---------- Layers ----------
    function select(item) {
        S.sel = item || null;
        if (S.tool && (!item || item.kind !== 'image')) { S.tool = null; setHint(); }
        renderLayers();
        renderSel();
        drawOverlay();
    }
    const listOf = (it) => (it.kind === 'text' ? S.texts : it.kind === 'image' ? S.images : S.fx);
    function remove(item) {
        if (!item) return;
        const list = listOf(item), i = list.indexOf(item);
        if (i >= 0) list.splice(i, 1);
        if (S.sel === item) { S.sel = null; S.tool = null; setHint(); }
        renderLayers();
        renderSel();
        draw(false);
    }
    function duplicate(item) {
        if (!item) return;
        const list = listOf(item);
        const copy = item.kind === 'image' ? cloneImg(item) : { ...item };
        copy.id = ++uid;
        copy.x = clamp(item.x + 0.04, 0, 1);
        copy.y = clamp(item.y + 0.04, 0, 1);
        if (copy.kind === 'text') { copy.tpl = null; copy.moved = true; }
        list.splice(list.indexOf(item) + 1, 0, copy);
        select(copy);
        draw(false);
        say('duplicated');
    }
    const fxName = (f) => (f.type === 'bulge' && f.s < 0 ? 'pinch' : f.type === 'pixel' ? 'pixelate' : f.type);
    const FX_ICON = { bulge: '◉', swirl: '@', pixel: '▦', blur: '◌' };
    function renderLayers() {
        const rows = [
            ...S.texts.map((t) => ({ item: t, icon: 'T', label: t.text.trim() || '(empty)' })),
            ...S.images.map((L) => ({ item: L, icon: '▣', label: L.name })),
            ...S.fx.map((f, i) => ({ item: f, icon: f.type === 'bulge' && f.s < 0 ? '⊙' : FX_ICON[f.type], label: `${fxName(f)} ${i + 1}` }))
        ];
        els.layers.innerHTML = rows.length ? rows.map(({ item, icon, label }) => `<li><button type="button" class="mm-layer" data-id="${item.id}" aria-current="${S.sel === item}">
                <span class="mm-layer-icon">${icon}</span><span class="mm-layer-name">${esc(label)}</span>
                <span class="mm-layer-del" data-del="${item.id}" title="Remove">&times;</span></button></li>`).join('')
            : '<li class="mm-empty-row">no layers</li>';
    }
    const byId = (id) => (id == null ? null : S.texts.find((t) => t.id === id) || S.images.find((L) => L.id === id) || S.fx.find((f) => f.id === id));
    els.layers.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (del) return remove(byId(+del.dataset.del));
        const b = e.target.closest('.mm-layer');
        if (!b) return;
        const item = byId(+b.dataset.id);
        setMode(item.kind === 'fx' ? item.type : 'move');
        select(item);
    });
    els.addText.addEventListener('click', () => {
        const t = newText('TEXT');
        t.moved = true;
        S.texts.push(t);
        setMode('move');
        select(t);
        draw(false);
        const ta = els.selPane.querySelector('textarea');
        if (ta) { ta.focus(); ta.select(); }
    });
    els.addFx.addEventListener('click', () => {
        if (!S.G) return say('load an image first');
        const type = S.mode === 'move' ? 'bulge' : S.mode, d = FX[type];
        const f = { id: ++uid, kind: 'fx', type, x: 0.5, y: 0.5, r: d.r + 0.03, s: d.s };
        S.fx.push(f);
        setMode(type);
        select(f);
        draw(false);
    });

    // An image (or a canvas) as a new layer
    function addLayer(img, name, o) {
        if (!S.G) return say('load an image first');
        const { w: iw, h: ih } = dims(img);
        // Fit inside half the canvas, and never start bigger than its own pixels
        const w = o && o.w ? o.w : Math.min(0.5, 0.5 * S.h * iw / (S.w * ih), iw / S.w);
        const L = {
            id: ++uid, kind: 'image', img, iw, ih, name, x: 0.5, y: 0.5, w, rot: 0, opacity: 1, flip: false, blend: 'source-over', pixelArt: false,
            knock: { on: false, color: '#ffffff', tol: 0.12, edges: true }, shape: 'none', feather: 0, cut: null, ...(o || {})
        };
        S.images.push(L);
        setMode('move');
        select(L);
        draw(false);
        say(`added ${name}`);
        return L;
    }

    // ---------- Stickers ----------
    // Crop a canvas to its visible pixels
    function trim(c) {
        const g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) return c;
        const t = canvas(x1 - x0 + 5, y1 - y0 + 5);
        t.getContext('2d').drawImage(c, x0 - 2, y0 - 2, t.width, t.height, 0, 0, t.width, t.height);
        return t;
    }
    function emojiCanvas(ch) {
        const c = canvas(320, 320), g = c.getContext('2d');
        g.font = "240px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif";
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(ch, 160, 172);
        return trim(c);
    }
    function laserCanvas() {
        const c = canvas(600, 600), g = c.getContext('2d'), m = 300;
        g.globalCompositeOperation = 'lighter';
        const streak = (rot, sy, r, a) => {
            g.save();
            g.translate(m, m);
            g.rotate(rot);
            g.scale(1, sy);
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, `rgba(255, 255, 255, ${a})`);
            gr.addColorStop(0.2, `rgba(255, 70, 60, ${a * 0.9})`);
            gr.addColorStop(1, 'rgba(255, 0, 0, 0)');
            g.fillStyle = gr;
            g.beginPath();
            g.arc(0, 0, r, 0, Math.PI * 2);
            g.fill();
            g.restore();
        };
        streak(0, 0.06, 300, 1);
        streak(0.45, 0.035, 170, 0.7);
        streak(-0.45, 0.035, 170, 0.7);
        streak(Math.PI / 2, 0.04, 120, 0.5);
        const core = g.createRadialGradient(m, m, 0, m, m, 120);
        core.addColorStop(0, 'rgba(255, 255, 255, 1)');
        core.addColorStop(0.15, 'rgba(255, 220, 220, 1)');
        core.addColorStop(0.35, 'rgba(255, 40, 40, 0.75)');
        core.addColorStop(1, 'rgba(255, 0, 0, 0)');
        g.fillStyle = core;
        g.beginPath();
        g.arc(m, m, 120, 0, Math.PI * 2);
        g.fill();
        return c;
    }
    // Pixel-art sunglasses: '#' black, 'o' white glint
    const SHADES = [
        '##############################',
        '##############################',
        '  ###########    ###########  ',
        '  ##o########    ##o########  ',
        '   ##o######      ##o######   ',
        '   #########      #########   ',
        '    #######        #######    '
    ];
    function shadesCanvas() {
        const px = 12, c = canvas(SHADES[0].length * px, SHADES.length * px), g = c.getContext('2d');
        SHADES.forEach((row, y) => [...row].forEach((ch, x) => {
            if (ch === ' ') return;
            g.fillStyle = ch === 'o' ? '#ffffff' : '#000000';
            g.fillRect(x * px, y * px, px, px);
        }));
        return c;
    }
    const EMOJI = ['😂', '💀', '😭', '🔥', '💯', '👌', '😎', '🤡', '🗿', '👀', '🙏', '🥺', '😳', '🤔', '💩', '👍', '🤣', '🫠', '❤️', '🅱️'];
    els.stickers.innerHTML = `<button type="button" class="mm-btn mm-sticker-wide" data-sticker="laser">LASER EYES</button>
        <button type="button" class="mm-btn mm-sticker-wide" data-sticker="shades">SHADES</button>`
        + EMOJI.map((e) => `<button type="button" class="mm-sticker" data-emoji="${e}" title="Add ${e}">${e}</button>`).join('');
    els.stickers.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (!S.G) return say('load an image first');
        const m = Math.min(S.w, S.h) / S.w; // a fraction of the short side, as a width
        if (b.dataset.emoji) addLayer(emojiCanvas(b.dataset.emoji), b.dataset.emoji, { w: 0.22 * m });
        else if (b.dataset.sticker === 'shades') addLayer(shadesCanvas(), 'shades', { w: 0.42 * m, y: 0.4, pixelArt: true });
        else {
            const c = laserCanvas();
            addLayer(c, 'laser eye', { w: 0.45 * m, x: 0.4, y: 0.42 });
            addLayer(c, 'laser eye', { w: 0.45 * m, x: 0.6, y: 0.42 });
            say('laser eyes: drag each onto an eye');
        }
    });

    // ---------- Selected layer panel ----------
    function slider(label, min, max, step, get, set, fmt) {
        const row = document.createElement('label');
        row.className = 'mm-slider';
        row.innerHTML = `<span class="mm-slider-lbl">${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><span class="mm-slider-val"></span>`;
        const input = row.querySelector('input'), val = row.querySelector('.mm-slider-val');
        const show = () => { val.textContent = fmt(get()); };
        input.value = get();
        show();
        input.addEventListener('input', () => { set(parseFloat(input.value)); show(); drawSoon(); });
        return row;
    }
    const pct = (v) => Math.round(v * 100) + '%';
    const deg = (v) => Math.round(v) + '°';
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    function btn(label, fn, cls, title) {
        const b = el('button', 'mm-btn' + (cls ? ' ' + cls : ''));
        b.type = 'button';
        b.textContent = label;
        if (title) b.title = title;
        b.addEventListener('click', fn);
        return b;
    }
    function seg(options, value, fn, cls) {
        const s = el('div', 'mm-seg is-small' + (cls ? ' ' + cls : ''));
        for (const [v, label] of options) {
            const b = el('button');
            b.type = 'button';
            b.textContent = label;
            b.setAttribute('aria-pressed', String(v === value));
            b.addEventListener('click', () => fn(v));
            s.append(b);
        }
        return s;
    }
    const sub = (text) => el('div', 'mm-sub', text);
    const row = (...kids) => { const r = el('div', 'mm-actions'); r.append(...kids); return r; };
    function colorInput(label, get, set) {
        const l = el('label', '', `${label} <input type="color">`), i = l.querySelector('input');
        i.value = get();
        i.addEventListener('input', () => { set(i.value); drawSoon(); });
        return l;
    }

    function renderSel() {
        const it = S.sel, box = els.selPane;
        box.innerHTML = '';
        if (!it) {
            els.selMeta.textContent = 'NONE';
            box.innerHTML = '<p class="mm-note">Click a layer on the canvas to edit it. Pick a mode above the canvas to add bulges, swirls, pixelation or blur; paste another image or add a sticker for a new layer.</p>';
            return;
        }
        if (it.kind === 'text') return textPanel(it, box);
        if (it.kind === 'image') return imagePanel(it, box);
        fxPanel(it, box);
    }

    function textPanel(t, box) {
        els.selMeta.textContent = 'TEXT';
        const ta = el('textarea', 'mm-textarea');
        ta.rows = 2;
        ta.spellcheck = false;
        ta.value = t.text;
        ta.addEventListener('input', () => { t.text = ta.value; renderLayersSoon(); draw(true); clearTimeout(settle); settle = setTimeout(() => draw(false), 300); });
        const styles = row(...STYLE_BUTTONS.map(([k, label]) => btn(label, () => { Object.assign(t, STYLES[k]); renderSel(); draw(false); }, 'is-small', `${label.toLowerCase()} style`)));
        const font = el('label', 'mm-slider', `<span class="mm-slider-lbl">FONT</span><select class="mm-select">${FONT_NAMES.map(([v, l]) => `<option value="${v}"${v === t.font ? ' selected' : ''}>${l}</option>`).join('')}</select>`);
        font.querySelector('select').addEventListener('change', (e) => { t.font = e.target.value; draw(false); });
        const colors = el('div', 'mm-colors');
        colors.append(
            colorInput('fill', () => t.color, (v) => { t.color = v; }),
            colorInput('outline', () => t.stroke, (v) => { t.stroke = v; }),
            colorInput('glow', () => t.glowColor, (v) => { t.glowColor = v; }));
        const toggles = el('div', 'mm-colors');
        for (const [k, label] of [['upper', 'CAPS'], ['bold', 'BOLD']]) {
            const l = el('label', 'mm-check', `<input type="checkbox"${t[k] ? ' checked' : ''}> ${label}`);
            l.querySelector('input').addEventListener('change', (e) => { t[k] = e.target.checked; draw(false); });
            toggles.append(l);
        }
        box.append(ta, styles, font,
            slider('SIZE', 0.02, 0.3, 0.005, () => t.size, (v) => { t.size = v; t.moved = true; }, pct),
            slider('OUTLINE', 0, 0.25, 0.005, () => t.strokeW, (v) => { t.strokeW = v; }, pct),
            slider('ROTATE', -180, 180, 1, () => t.rot, (v) => { t.rot = v; t.moved = true; }, deg),
            slider('SHADOW', 0, 1, 0.01, () => t.shadow, (v) => { t.shadow = v; }, pct),
            slider('GLOW', 0, 1, 0.01, () => t.glow, (v) => { t.glow = v; }, pct),
            colors, toggles,
            row(btn('DUPLICATE', () => duplicate(t), '', 'Ctrl+D'), btn('DELETE', () => remove(t), 'is-danger')));
    }

    function imagePanel(L, box) {
        els.selMeta.textContent = 'IMAGE';
        const blend = el('label', 'mm-slider', `<span class="mm-slider-lbl">BLEND</span><select class="mm-select">${BLENDS.map(([v, l]) => `<option value="${v}"${v === L.blend ? ' selected' : ''}>${l}</option>`).join('')}</select>`);
        blend.querySelector('select').addEventListener('change', (e) => { L.blend = e.target.value; draw(false); });
        const move = (d) => {
            const i = S.images.indexOf(L), j = clamp(i + d, 0, S.images.length - 1);
            if (i === j) return;
            S.images.splice(i, 1);
            S.images.splice(j, 0, L);
            renderLayers();
            draw(false);
        };
        box.append(
            slider('SIZE', 0.01, 2, 0.005, () => L.w, (v) => { L.w = v; }, pct),
            slider('ROTATE', -180, 180, 1, () => L.rot, (v) => { L.rot = v; }, deg),
            slider('OPACITY', 0, 1, 0.01, () => L.opacity, (v) => { L.opacity = v; }, pct),
            blend,
            row(btn('FLIP', () => { L.flip = !L.flip; draw(false); }), btn('FORWARD', () => move(1)), btn('BACK', () => move(-1))));

        // Cut-out: remove a colour, then keep a shape
        box.append(sub('CUT OUT'));
        const removeBg = btn(L.knock.on ? 'BACKGROUND REMOVED' : 'REMOVE BACKGROUND', () => {
            L.knock.on = !L.knock.on;
            if (L.knock.on && !L.knock.picked) L.knock.color = edgeColor(L);
            renderSel();
            draw(false);
        }, L.knock.on ? 'is-on is-wide' : 'is-wide', 'Clear the colour round its edges (click again to undo)');
        box.append(removeBg);
        if (L.knock.on) {
            const colorRow = el('div', 'mm-colors');
            colorRow.append(colorInput('colour', () => L.knock.color, (v) => { L.knock.color = v; L.knock.picked = true; }));
            colorRow.append(btn('PICK', () => { S.tool = 'pick'; setHint(); drawOverlay(); }, 'is-small', 'Click a colour on the layer'));
            const edges = el('label', 'mm-check', `<input type="checkbox"${L.knock.edges ? ' checked' : ''}> only from edges`);
            edges.title = 'Only clear the colour where it touches the edges (keeps the same colour inside, like eyes)';
            edges.querySelector('input').addEventListener('change', (e) => { L.knock.edges = e.target.checked; draw(false); });
            colorRow.append(edges);
            box.append(slider('TOLERANCE', 0, 0.6, 0.01, () => L.knock.tol, (v) => { L.knock.tol = v; }, pct), colorRow);
        }
        box.append(seg([['none', 'FULL'], ['circle', 'CIRCLE'], ['lasso', 'LASSO']], L.shape, (v) => {
            if (v === 'lasso') { S.tool = 'lasso'; setHint(); drawOverlay(); renderSel(); say('draw round the part to keep'); return; }
            L.shape = v;
            renderSel();
            draw(false);
        }, 'is-fill'));
        if (S.tool === 'lasso') box.lastChild.querySelectorAll('button')[2].setAttribute('aria-pressed', 'true');
        if (L.shape !== 'none') box.append(slider('FEATHER', 0, 1, 0.01, () => L.feather, (v) => { L.feather = v; }, pct));

        const acts = [btn('DUPLICATE', () => duplicate(L), '', 'Ctrl+D')];
        if (nSlots() === 1) acts.push(btn('MAKE BG', () => {
            S.images = S.images.filter((x) => x !== L);
            S.slots[0] = { img: L.img, w: L.iw, h: L.ih, name: L.name };
            S.sel = null;
            relayout();
            renderLayers();
            renderSel();
            draw(false);
            say(`background is now ${L.iw}×${L.ih}`);
        }, '', 'Replace the background with this image'));
        acts.push(btn('DELETE', () => remove(L), 'is-danger'));
        box.append(sub('LAYER'), row(...acts));
    }

    function fxPanel(f, box) {
        const d = () => FX[f.type];
        els.selMeta.textContent = fxName(f).toUpperCase();
        box.append(seg(Object.entries(FX).map(([k, v]) => [k, v.label]), f.type, (v) => {
            f.type = v;
            if (f.s < FX[v].min || f.s > FX[v].max) f.s = FX[v].s;
            setMode(v);
            renderSel();
            renderLayers();
            draw(false);
        }, 'is-fill'));
        box.append(
            slider('RADIUS', 0.02, 1, 0.005, () => f.r, (v) => { f.r = v; }, pct),
            slider('STRENGTH', d().min, d().max, 0.01, () => f.s, (v) => { f.s = v; els.selMeta.textContent = fxName(f).toUpperCase(); renderLayersSoon(); }, (v) => (d().min < 0 && v > 0 ? '+' : '') + v.toFixed(2)),
            row(btn('DUPLICATE', () => duplicate(f), '', 'Ctrl+D'), btn('DELETE', () => remove(f), 'is-danger')));
    }
    let layersT = 0;
    const renderLayersSoon = () => { clearTimeout(layersT); layersT = setTimeout(renderLayers, 120); };

    // ---------- Deep fry ----------
    const FRY = [['sat', 'SATURATE'], ['contrast', 'CONTRAST'], ['sharpen', 'SHARPEN'], ['noise', 'NOISE'], ['tint', 'TINT'], ['crush', 'JPEG CRUSH']];
    function renderFry() {
        els.fry.innerHTML = '';
        FRY.forEach(([k, label]) => els.fry.append(slider(label, 0, 1, 0.01, () => S.fry[k], (v) => { S.fry[k] = v; if (!S.fry.on) { S.fry.on = true; syncFry(); } }, pct)));
        syncFry();
    }
    function syncFry() {
        els.fryOn.setAttribute('aria-pressed', String(S.fry.on));
        els.fryOn.textContent = S.fry.on ? 'FRYING' : 'OFF';
        els.fryText.checked = S.fry.fryText;
        app.classList.toggle('is-fried', S.fry.on);
    }
    els.fryOn.addEventListener('click', () => { S.fry.on = !S.fry.on; syncFry(); draw(false); });
    els.fryText.addEventListener('change', () => { S.fry.fryText = els.fryText.checked; draw(false); });
    els.fryPresets.addEventListener('click', (e) => {
        const b = e.target.closest('[data-preset]');
        if (!b) return;
        Object.assign(S.fry, FRY_PRESETS[b.dataset.preset], { on: true });
        renderFry();
        draw(false);
    });

    // ---------- Export (full resolution) ----------
    const exportScale = () => Math.min(1, MAX_EXPORT / Math.max(S.w, S.h));
    async function full() {
        if (!S.G) { say('load an image first'); return null; }
        const scale = exportScale();
        say(`rendering ${Math.round(S.w * scale)}×${Math.round(S.h * scale)}…`);
        await new Promise((r) => setTimeout(r, 20)); // let the status paint before the heavy work
        return render(scale, 'export', false);
    }
    const slug = () => ((S.slots[0] && S.slots[0].name) || 'meme').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'meme';
    function download(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    async function exportAs(type) {
        const c = await full();
        if (!c) return;
        const blob = await toBlob(c, type, 0.92);
        if (!blob) return say('export failed in this browser');
        download(blob, `${slug()}-meme.${type === 'image/png' ? 'png' : 'jpg'}`);
        say(`saved ${c.width}×${c.height} · ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    }
    els.png.addEventListener('click', () => exportAs('image/png'));
    els.jpg.addEventListener('click', () => exportAs('image/jpeg'));
    // Copy the meme at full resolution (COPY buttons, Ctrl/Cmd+C)
    async function copyMeme() {
        if (!S.G) return say('load an image first');
        if (!navigator.clipboard || !window.ClipboardItem) return say('copying images is not supported here: right-click the canvas instead');
        try {
            // The promise goes straight into ClipboardItem so Safari keeps the gesture's permission
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': full().then((c) => (c ? toBlob(c, 'image/png') : Promise.reject())) })]);
            say(`copied ${Math.round(S.w * exportScale())}×${Math.round(S.h * exportScale())} to the clipboard`);
            flash('COPIED');
        } catch (_) { say('copy was blocked: right-click the canvas → Copy image'); flash('BLOCKED'); }
    }
    els.copy.addEventListener('click', copyMeme);
    els.copyNow.addEventListener('click', copyMeme);
    let flashT = 0;
    function flash(text) {
        els.flash.textContent = text;
        els.flash.classList.remove('is-on');
        void els.flash.offsetWidth;
        els.flash.classList.add('is-on');
        clearTimeout(flashT);
        flashT = setTimeout(() => els.flash.classList.remove('is-on'), 1200);
    }
    function say(text) { els.exportState.textContent = text; }

    // ---------- Keys ----------
    const MODE_KEYS = { v: 'move', t: 'move', b: 'bulge', s: 'swirl', p: 'pixel', l: 'blur' };
    document.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t instanceof Element && t.closest('input, textarea, select')) return;
        const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
        if (mod && !e.altKey && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (mod && !e.altKey && key === 'y') { e.preventDefault(); redo(); }
        else if (mod && !e.altKey && key === 'd' && S.sel) { e.preventDefault(); duplicate(S.sel); }
        // Ctrl/Cmd+C copies the meme, unless some text on the page is selected (then it's a normal copy)
        else if (mod && !e.altKey && !e.shiftKey && key === 'c' && S.G && !String(getSelection())) { e.preventDefault(); copyMeme(); }
        else if (e.key === 'Escape') {
            if (S.tool) { S.tool = null; lassoPts = null; drag = null; setHint(); renderSel(); drawOverlay(); }
            else if (S.sel) select(null);
        }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); remove(S.sel); }
        else if (S.sel && /^Arrow(Left|Right|Up|Down)$/.test(e.key) && !mod && !e.altKey) {
            // Nudge the selected layer: 1 preview pixel, or 10 with Shift
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1, it = S.sel;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') it.x = clamp(it.x + (e.key === 'ArrowLeft' ? -step : step) / els.overlay.width, 0, 1);
            else it.y = clamp(it.y + (e.key === 'ArrowUp' ? -step : step) / els.overlay.height, 0, 1);
            if (it.kind === 'text') it.moved = true;
            drawSoon();
        }
        else if (!mod && !e.altKey && MODE_KEYS[key]) setMode(MODE_KEYS[key]);
    });

    // ---------- Boot ----------
    relayout();
    renderLayers();
    renderSel();
    renderFry();
    setMode('move');
    commit();
    // Impact isn't on every system: Anton (loaded by the page) stands in, so wait for the fonts before the first text draw
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`40px ${FONTS.impact}`), document.fonts.load(`bold 40px ${FONTS.comic}`)]).then(() => draw(false)).catch(() => {});
})();
