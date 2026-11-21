/* Page scripts for memes.html: the meme generator. Paste, drop or open an image of any size, then:
   - text: Impact with an outline, dragged into place on the canvas (wraps to the image's width)
   - bulge: click the image in BULGE mode to bulge it there (negative strength pinches), drag to move
   - deep fry: saturation, contrast, sharpen, noise, a warm tint and JPEG crush, with presets
   Everything is kept as settings over the untouched original and rendered on demand: the canvas shows a preview
   (at most PREVIEW px on the long side), and export renders the same pipeline at full resolution.
   Pipeline: original -> bulges -> text (when it's fried too) -> deep fry -> text (when it isn't). */
(function () {
    'use strict';
    const app = document.getElementById('memes');
    if (!app) return;

    const PREVIEW = 1400;    // preview long side
    const MAX_EXPORT = 8192; // canvases past this fail in some browsers
    const FONT = "Impact, 'Anton', 'Haettenschweiler', 'Arial Narrow Bold', sans-serif";
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const FRY_PRESETS = {
        MILD: { sat: 0.35, contrast: 0.3, sharpen: 0.3, noise: 0.15, tint: 0.2, crush: 0.25 },
        CRISPY: { sat: 0.65, contrast: 0.55, sharpen: 0.6, noise: 0.35, tint: 0.45, crush: 0.55 },
        NUCLEAR: { sat: 1, contrast: 0.9, sharpen: 1, noise: 0.7, tint: 0.8, crush: 0.9 }
    };
    let uid = 0;
    const newText = (text, y) => ({ id: ++uid, kind: 'text', text, x: 0.5, y, size: 0.1, color: '#ffffff', stroke: '#000000', strokeW: 0.08, upper: true });
    const S = {
        img: null, name: '', w: 0, h: 0,
        texts: [newText('TOP TEXT', 0.1), newText('BOTTOM TEXT', 0.9)],
        bulges: [],
        fry: { on: false, fryText: true, ...FRY_PRESETS.CRISPY },
        sel: null,          // the selected layer (a text or a bulge)
        mode: 'text'        // what a click on empty canvas does: 'text' deselects, 'bulge' adds a bulge
    };

    const els = {
        stage: $('mm-stage'), wrap: $('mm-wrap'), canvas: $('mm-canvas'), overlay: $('mm-overlay'), empty: $('mm-empty'), shot: $('mm-shot'),
        copyNow: $('mm-copy-now'), flash: $('mm-flash'),
        stageMeta: $('mm-stage-meta'), mode: $('mm-mode'), hint: $('mm-hint'),
        open: $('mm-open'), sample: $('mm-sample'), clear: $('mm-clear'), file: $('mm-file'), info: $('mm-info'),
        layers: $('mm-layers'), addText: $('mm-add-text'), addBulge: $('mm-add-bulge'),
        selPane: $('mm-sel'), selMeta: $('mm-sel-meta'),
        fry: $('mm-fry'), fryOn: $('mm-fry-on'), fryText: $('mm-fry-text'), fryPresets: $('mm-fry-presets'),
        png: $('mm-png'), jpg: $('mm-jpg'), copy: $('mm-copy'), exportState: $('mm-export-state'),
        sbImage: $('mm-sb-image')
    };
    const ctx = els.canvas.getContext('2d');
    const octx = els.overlay.getContext('2d');

    // ---------- Loading ----------
    async function loadBlob(blob, name) {
        if (!blob || !/^image\//.test(blob.type)) return say('that is not an image');
        let img;
        try { img = await createImageBitmap(blob); }
        catch (_) {
            // Some formats (or browsers) only decode through an <img>
            img = await new Promise((res, rej) => {
                const i = new Image();
                i.onload = () => res(i);
                i.onerror = rej;
                i.src = URL.createObjectURL(blob);
            }).catch(() => null);
        }
        if (!img) return say('could not read that image');
        S.img = img;
        S.w = img.width || img.naturalWidth;
        S.h = img.height || img.naturalHeight;
        S.name = (name || 'pasted image').replace(/\.[^.]+$/, '');
        S.bulges = [];
        S.sel = null;
        app.classList.add('has-image');
        renderInfo();
        renderLayers();
        renderSel();
        sizePreview();
        draw();
        say(`loaded ${S.w}×${S.h}`);
    }
    els.open.addEventListener('click', () => els.file.click());
    els.file.addEventListener('change', () => { const f = els.file.files[0]; els.file.value = ''; if (f) loadBlob(f, f.name); });
    els.sample.addEventListener('click', async () => {
        try { const r = await fetch('/assets/5031.png'); loadBlob(await r.blob(), 'remilio-5031'); }
        catch (_) { say('could not load the sample'); }
    });
    els.clear.addEventListener('click', () => {
        S.img = null;
        S.bulges = [];
        S.sel = null;
        app.classList.remove('has-image');
        els.shot.removeAttribute('src');
        renderInfo();
        renderLayers();
        renderSel();
        drawOverlay();
    });
    // Paste anywhere on the page (an image file, or an image copied from another page)
    document.addEventListener('paste', (e) => {
        const t = e.target;
        if (t instanceof Element && t.closest('input, textarea')) return;
        const item = Array.from((e.clipboardData || {}).items || []).find((i) => i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault();
        loadBlob(item.getAsFile(), 'pasted image');
    });
    // Drop on the stage
    ['dragenter', 'dragover'].forEach((t) => els.stage.addEventListener(t, (e) => { e.preventDefault(); els.stage.classList.add('is-drop'); }));
    ['dragleave', 'drop'].forEach((t) => els.stage.addEventListener(t, () => els.stage.classList.remove('is-drop')));
    els.stage.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = Array.from(e.dataTransfer.files || []).find((x) => x.type.startsWith('image/'));
        if (f) loadBlob(f, f.name);
        else say('drop an image file');
    });
    els.empty.addEventListener('click', (e) => { if (!e.target.closest('button')) els.file.click(); });

    function renderInfo() {
        if (!S.img) { els.info.innerHTML = '<dt>image</dt><dd>&mdash;</dd>'; els.sbImage.textContent = 'NO IMAGE'; return; }
        const mp = (S.w * S.h / 1e6).toFixed(1);
        els.info.innerHTML = `<dt>name</dt><dd title="${esc(S.name)}">${esc(S.name)}</dd><dt>size</dt><dd>${S.w}&times;${S.h}</dd><dt>pixels</dt><dd>${mp} MP</dd>`;
        els.sbImage.textContent = `IMAGE: ${S.w}×${S.h}`;
    }

    // ---------- Rendering ----------
    // A small seeded random, so noise holds still between redraws
    const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    function applyBulges(c, W, H) {
        if (!S.bulges.length) return;
        const g = c.getContext('2d');
        const img = g.getImageData(0, 0, W, H);
        const d = img.data;
        for (const b of S.bulges) {
            const src = new Uint8ClampedArray(d);
            const cx = b.x * W, cy = b.y * H, R = b.r * Math.min(W, H);
            const k = Math.pow(2.5, b.s); // > 1 magnifies the middle, < 1 pinches it
            const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
            const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const dx = x - cx, dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist >= R || dist === 0) continue;
                    const f = Math.pow(dist / R, k) * R / dist;
                    const sx = clamp(cx + dx * f, 0, W - 1.001), sy = clamp(cy + dy * f, 0, H - 1.001);
                    // bilinear sample
                    const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
                    const i00 = (iy * W + ix) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4;
                    const o = (y * W + x) * 4;
                    for (let ch = 0; ch < 4; ch++) {
                        const top = src[i00 + ch] + (src[i10 + ch] - src[i00 + ch]) * fx;
                        const bot = src[i01 + ch] + (src[i11 + ch] - src[i01 + ch]) * fx;
                        d[o + ch] = top + (bot - top) * fy;
                    }
                }
            }
        }
        g.putImageData(img, 0, 0);
    }

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
    let boxes = []; // text boxes in preview pixels, for picking and the selection outline
    function drawTexts(c, W, H, collect) {
        const g = c.getContext('2d');
        if (collect) boxes = [];
        for (const t of S.texts) {
            const text = t.upper ? t.text.toUpperCase() : t.text;
            if (!text.trim()) continue;
            const px = Math.max(4, t.size * H);
            g.font = `${px}px ${FONT}`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.lineJoin = 'round';
            g.miterLimit = 2;
            const lines = wrap(g, text, W * 0.94);
            const lh = px * 1.05, total = lh * lines.length;
            const cx = t.x * W, top = t.y * H - total / 2;
            let maxW = 0;
            lines.forEach((l, i) => {
                const y = top + lh * (i + 0.5);
                maxW = Math.max(maxW, g.measureText(l).width);
                if (t.strokeW > 0) {
                    g.lineWidth = px * t.strokeW * 2;
                    g.strokeStyle = t.stroke;
                    g.strokeText(l, cx, y);
                }
                g.fillStyle = t.color;
                g.fillText(l, cx, y);
            });
            if (collect) {
                const pad = px * t.strokeW + 4;
                boxes.push({ id: t.id, x0: cx - maxW / 2 - pad, x1: cx + maxW / 2 + pad, y0: top - pad, y1: top + total + pad });
            }
        }
    }

    const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
    async function deepFry(c, W, H, fast) {
        const f = S.fry, g = c.getContext('2d');
        // Crunch: down and back up, blocky
        if (f.crush > 0.02) {
            const k = 1 - f.crush * 0.55;
            const sw = Math.max(1, Math.round(W * k)), sh = Math.max(1, Math.round(H * k));
            const t = document.createElement('canvas');
            t.width = sw;
            t.height = sh;
            t.getContext('2d').drawImage(c, 0, 0, sw, sh);
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

    // Render the whole pipeline into a new canvas at the given scale of the original
    async function render(scale, fast, collect) {
        const W = Math.max(1, Math.round(S.w * scale)), H = Math.max(1, Math.round(S.h * scale));
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(S.img, 0, 0, W, H);
        applyBulges(c, W, H);
        const friedText = S.fry.on && S.fry.fryText;
        if (friedText) drawTexts(c, W, H, collect);
        if (S.fry.on) await deepFry(c, W, H, fast);
        if (!friedText) drawTexts(c, W, H, collect);
        return c;
    }

    let pscale = 1, drawing = 0, queued = null;
    function sizePreview() {
        pscale = Math.min(1, PREVIEW / Math.max(S.w, S.h));
        els.canvas.width = els.overlay.width = Math.round(S.w * pscale);
        els.canvas.height = els.overlay.height = Math.round(S.h * pscale);
        els.stageMeta.textContent = `${S.w}×${S.h}${pscale < 1 ? ` · PREVIEW ${Math.round(pscale * 100)}%` : ''}`;
        fitCanvas();
    }
    // The canvas keeps the image's shape and fits the stage
    function fitCanvas() {
        if (!S.img) return;
        const r = els.stage.getBoundingClientRect();
        const k = Math.min((r.width - 24) / S.w, (r.height - 24) / S.h);
        const w = Math.max(40, Math.floor(S.w * k)), h = Math.max(40, Math.floor(S.h * k));
        els.wrap.style.width = w + 'px';
        els.wrap.style.height = h + 'px';
    }
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(els.stage);
    else window.addEventListener('resize', fitCanvas);

    // Redraw the preview: one at a time, the latest request wins; fast skips the JPEG passes (while dragging)
    function draw(fast) {
        if (!S.img) return;
        if (drawing) { queued = { fast: queued ? queued.fast && fast : fast }; return; }
        drawing = 1;
        render(pscale, fast, true).then((c) => {
            ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
            ctx.drawImage(c, 0, 0);
            drawOverlay();
            if (!fast) refreshShot(c);
        }).finally(() => {
            drawing = 0;
            if (queued) { const q = queued; queued = null; draw(q.fast); }
        });
    }
    // The copyable picture: an invisible <img> of the latest settled render under the overlay, so the browser's own
    // right-click "Copy image" / "Save image as" works on the canvas (a right-click falls through the overlay to it).
    // It's the preview's size: the full original when that's up to PREVIEW px, else Ctrl+C / COPY for full size.
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
    els.overlay.addEventListener('pointerdown', (e) => {
        if (e.button !== 2) return;
        els.overlay.style.pointerEvents = 'none';
        const back = () => { els.overlay.style.pointerEvents = ''; };
        window.addEventListener('contextmenu', () => setTimeout(back, 0), { once: true });
        setTimeout(back, 1500); // in case no menu opens
    }, true);

    let settle = 0;
    // While a control is moving: fast redraws, then a full one once it stops
    function drawSoon() {
        draw(true);
        clearTimeout(settle);
        settle = setTimeout(() => draw(false), 160);
    }

    // Selection outline and bulge rings, on their own canvas so they don't need a re-render
    function drawOverlay() {
        const W = els.overlay.width, H = els.overlay.height;
        octx.clearRect(0, 0, W, H);
        if (!S.img) return;
        const lw = Math.max(1.5, W / 500);
        octx.lineWidth = lw;
        if (S.mode === 'bulge' || (S.sel && S.sel.kind === 'bulge')) {
            for (const b of S.bulges) {
                const on = S.sel === b;
                octx.setLineDash(on ? [] : [lw * 4, lw * 3]);
                octx.strokeStyle = on ? 'rgba(80, 250, 123, 0.95)' : 'rgba(139, 233, 253, 0.6)';
                octx.beginPath();
                octx.arc(b.x * W, b.y * H, b.r * Math.min(W, H), 0, Math.PI * 2);
                octx.stroke();
                octx.beginPath();
                octx.arc(b.x * W, b.y * H, lw * 2.5, 0, Math.PI * 2);
                octx.fillStyle = octx.strokeStyle;
                octx.fill();
            }
        }
        if (S.sel && S.sel.kind === 'text') {
            const bx = boxes.find((x) => x.id === S.sel.id);
            if (bx) {
                octx.setLineDash([lw * 4, lw * 3]);
                octx.strokeStyle = 'rgba(139, 233, 253, 0.95)';
                octx.strokeRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0);
            }
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
        if (S.mode === 'bulge') {
            // the nearest bulge whose middle third you're on, else nothing
            let best = null, bd = Infinity;
            for (const b of S.bulges) {
                const dd = Math.hypot(p.px - b.x * W, p.py - b.y * H);
                if (dd < b.r * Math.min(W, H) * 0.5 && dd < bd) { best = b; bd = dd; }
            }
            if (best) return best;
        }
        for (let i = boxes.length - 1; i >= 0; i--) {
            const b = boxes[i];
            if (p.px >= b.x0 && p.px <= b.x1 && p.py >= b.y0 && p.py <= b.y1) return S.texts.find((t) => t.id === b.id);
        }
        return null;
    }
    let drag = null;
    els.overlay.addEventListener('pointerdown', (e) => {
        if (!S.img || e.button) return;
        e.preventDefault();
        const p = toImg(e);
        let hit = pick(p);
        if (!hit && S.mode === 'bulge') {
            hit = { id: ++uid, kind: 'bulge', x: p.x, y: p.y, r: 0.22, s: 0.8 };
            S.bulges.push(hit);
            renderLayers();
            drawSoon();
        }
        select(hit);
        if (!hit) return;
        els.overlay.setPointerCapture(e.pointerId);
        drag = { item: hit, ox: hit.x - p.x, oy: hit.y - p.y };
    });
    els.overlay.addEventListener('pointermove', (e) => {
        if (!S.img) return;
        const p = toImg(e);
        if (!drag) { els.overlay.style.cursor = pick(p) ? 'move' : S.mode === 'bulge' ? 'crosshair' : 'default'; return; }
        drag.item.x = clamp(p.x + drag.ox, 0, 1);
        drag.item.y = clamp(p.y + drag.oy, 0, 1);
        draw(true);
    });
    const endDrag = () => { if (drag) { drag = null; draw(false); } };
    els.overlay.addEventListener('pointerup', endDrag);
    els.overlay.addEventListener('pointercancel', endDrag);
    // Scroll over a bulge to resize it
    els.overlay.addEventListener('wheel', (e) => {
        if (!S.sel || S.sel.kind !== 'bulge') return;
        e.preventDefault();
        S.sel.r = clamp(S.sel.r * (e.deltaY < 0 ? 1.06 : 1 / 1.06), 0.03, 1);
        renderSel();
        drawSoon();
    }, { passive: false });

    els.mode.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-mode]');
        if (b) setMode(b.dataset.mode);
    });
    function setMode(m) {
        S.mode = m;
        els.mode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
        els.hint.textContent = m === 'bulge' ? 'click to bulge · drag to move · scroll to resize' : 'drag text to move · double-click to edit';
        drawOverlay();
    }
    els.overlay.addEventListener('dblclick', () => {
        if (S.sel && S.sel.kind === 'text') { const ta = els.selPane.querySelector('textarea'); if (ta) { ta.focus(); ta.select(); } }
    });

    // ---------- Layers ----------
    function select(item) {
        S.sel = item || null;
        renderLayers();
        renderSel();
        drawOverlay();
    }
    function remove(item) {
        if (!item) return;
        S.texts = S.texts.filter((t) => t !== item);
        S.bulges = S.bulges.filter((b) => b !== item);
        if (S.sel === item) S.sel = null;
        renderLayers();
        renderSel();
        draw(false);
    }
    function renderLayers() {
        const rows = [
            ...S.texts.map((t) => ({ item: t, icon: 'T', label: t.text.trim() || '(empty)' })),
            ...S.bulges.map((b, i) => ({ item: b, icon: b.s < 0 ? '⊙' : '◉', label: `${b.s < 0 ? 'pinch' : 'bulge'} ${i + 1}` }))
        ];
        els.layers.innerHTML = rows.length ? rows.map(({ item, icon, label }) => `<li><button type="button" class="mm-layer" data-id="${item.id}" aria-current="${S.sel === item}">
                <span class="mm-layer-icon">${icon}</span><span class="mm-layer-name">${esc(label)}</span>
                <span class="mm-layer-del" data-del="${item.id}" title="Remove">&times;</span></button></li>`).join('')
            : '<li class="mm-empty-row">no layers</li>';
    }
    const byId = (id) => S.texts.find((t) => t.id === id) || S.bulges.find((b) => b.id === id);
    els.layers.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (del) return remove(byId(+del.dataset.del));
        const b = e.target.closest('.mm-layer');
        if (b) {
            const item = byId(+b.dataset.id);
            if (item.kind === 'bulge') setMode('bulge');
            select(item);
        }
    });
    els.addText.addEventListener('click', () => {
        const t = newText('TEXT', 0.5);
        S.texts.push(t);
        setMode('text');
        select(t);
        draw(false);
        const ta = els.selPane.querySelector('textarea');
        if (ta) { ta.focus(); ta.select(); }
    });
    els.addBulge.addEventListener('click', () => {
        if (!S.img) return say('load an image first');
        const b = { id: ++uid, kind: 'bulge', x: 0.5, y: 0.5, r: 0.25, s: 0.8 };
        S.bulges.push(b);
        setMode('bulge');
        select(b);
        draw(false);
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
    function renderSel() {
        const it = S.sel, box = els.selPane;
        box.innerHTML = '';
        if (!it) {
            els.selMeta.textContent = 'NONE';
            box.innerHTML = '<p class="mm-note">Click text on the canvas to edit it, or switch to BULGE and click the image.</p>';
            return;
        }
        if (it.kind === 'text') {
            els.selMeta.textContent = 'TEXT';
            const ta = document.createElement('textarea');
            ta.className = 'mm-textarea';
            ta.rows = 2;
            ta.spellcheck = false;
            ta.value = it.text;
            ta.addEventListener('input', () => { it.text = ta.value; renderLayersSoon(); draw(true); clearTimeout(settle); settle = setTimeout(() => draw(false), 250); });
            const colors = document.createElement('div');
            colors.className = 'mm-colors';
            colors.innerHTML = `<label>fill <input type="color" value="${it.color}" data-k="color"></label><label>outline <input type="color" value="${it.stroke}" data-k="stroke"></label>
                <label class="mm-check"><input type="checkbox" ${it.upper ? 'checked' : ''} data-k="upper"> CAPS</label>`;
            colors.addEventListener('input', (e) => {
                const k = e.target.dataset.k;
                if (!k) return;
                it[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                drawSoon();
            });
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'mm-btn is-danger';
            del.textContent = 'DELETE TEXT';
            del.addEventListener('click', () => remove(it));
            box.append(ta,
                slider('SIZE', 0.02, 0.3, 0.005, () => it.size, (v) => { it.size = v; }, pct),
                slider('OUTLINE', 0, 0.25, 0.005, () => it.strokeW, (v) => { it.strokeW = v; }, pct),
                colors, del);
            return;
        }
        els.selMeta.textContent = it.s < 0 ? 'PINCH' : 'BULGE';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'mm-btn is-danger';
        del.textContent = 'DELETE BULGE';
        del.addEventListener('click', () => remove(it));
        box.append(
            slider('RADIUS', 0.03, 1, 0.005, () => it.r, (v) => { it.r = v; }, pct),
            slider('STRENGTH', -1, 1.5, 0.01, () => it.s, (v) => { it.s = v; els.selMeta.textContent = v < 0 ? 'PINCH' : 'BULGE'; renderLayersSoon(); }, (v) => (v > 0 ? '+' : '') + v.toFixed(2)),
            del);
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
    async function full() {
        if (!S.img) { say('load an image first'); return null; }
        const scale = Math.min(1, MAX_EXPORT / Math.max(S.w, S.h));
        say(`rendering ${Math.round(S.w * scale)}×${Math.round(S.h * scale)}…`);
        await new Promise((r) => setTimeout(r, 20)); // let the status paint before the heavy work
        return render(scale, 'export', false);
    }
    const slug = () => (S.name || 'meme').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'meme';
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
        if (!S.img) return say('load an image first');
        if (!navigator.clipboard || !window.ClipboardItem) return say('copying images is not supported here: right-click the canvas instead');
        try {
            // The promise goes straight into ClipboardItem so Safari keeps the gesture's permission
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': full().then((c) => (c ? toBlob(c, 'image/png') : Promise.reject())) })]);
            say(`copied ${Math.round(S.w * Math.min(1, MAX_EXPORT / Math.max(S.w, S.h)))}×${Math.round(S.h * Math.min(1, MAX_EXPORT / Math.max(S.w, S.h)))} to the clipboard`);
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
    document.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t instanceof Element && t.closest('input, textarea, select')) return;
        // Ctrl/Cmd+C copies the meme, unless some text on the page is selected (then it's a normal copy)
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'c' && S.img && !String(getSelection())) { e.preventDefault(); copyMeme(); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); remove(S.sel); }
        else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 't' || e.key === 'b')) setMode(e.key === 'b' ? 'bulge' : 'text');
    });

    // ---------- Boot ----------
    renderInfo();
    renderLayers();
    renderSel();
    renderFry();
    setMode('text');
    // Impact isn't on every system: Anton (loaded by the page) stands in, so wait for it before the first text draw
    if (document.fonts && document.fonts.load) document.fonts.load(`40px ${FONT}`).then(() => draw(false)).catch(() => {});
})();
