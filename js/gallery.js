/* Page scripts for gallery.html (extracted from inline <script> blocks, in original order) */
(function() {
    const wrap = document.getElementById('pfpMediaWrap');
    const popup = document.getElementById('pfpPopup');
    if (!wrap || !popup) return;

    const MIN = 1, MAX = 6, STEP = 0.25;
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

    function activeMedia() {
        const img = document.getElementById('popupImage');
        const vid = document.getElementById('popupVideo');
        if (img && img.style.display !== 'none') return img;
        if (vid && vid.style.display !== 'none') return vid;
        return null;
    }
    function apply() {
        const el = activeMedia();
        if (!el) return;
        el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        wrap.classList.toggle('zoomed', scale > 1);
    }
    function clampPan() {
        const el = activeMedia();
        if (!el) return;
        const wr = wrap.getBoundingClientRect();
        const w = el.clientWidth * scale;
        const h = el.clientHeight * scale;
        const maxX = Math.max(0, w - wr.width);
        const maxY = Math.max(0, h - wr.height);
        if (tx > 0) tx = 0;
        if (ty > 0) ty = 0;
        if (tx < -maxX) tx = -maxX;
        if (ty < -maxY) ty = -maxY;
    }
    function reset() {
        scale = 1; tx = 0; ty = 0;
        apply();
    }
    function zoomAt(factor, cx, cy) {
        const el = activeMedia();
        if (!el) return;
        const wr = wrap.getBoundingClientRect();
        // pointer coords relative to wrap top-left
        const px = (cx ?? wr.width / 2) - wr.left;
        const py = (cy ?? wr.height / 2) - wr.top;
        const newScale = Math.min(MAX, Math.max(MIN, scale * factor));
        if (newScale === scale) return;
        // keep point under cursor stable
        const ratio = newScale / scale;
        tx = px - (px - tx) * ratio;
        ty = py - (py - ty) * ratio;
        scale = newScale;
        clampPan();
        apply();
    }

    // Buttons
    // (zoom button UI removed; wheel / click / drag / keyboard handle zoom)

    // Mouse wheel zoom
    wrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        zoomAt(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Click to toggle zoom (only when not panning)
    wrap.addEventListener('click', (e) => {
        if (e.detail === 0) return; // ignore keyboard-synthesized
        if (scale === 1) zoomAt(2, e.clientX, e.clientY);
    });

    // Drag to pan
    wrap.addEventListener('pointerdown', (e) => {
        if (scale === 1) return;
        dragging = true;
        wrap.classList.add('panning');
        sx = e.clientX; sy = e.clientY; ox = tx; oy = ty;
        wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        tx = ox + (e.clientX - sx);
        ty = oy + (e.clientY - sy);
        clampPan();
        apply();
    });
    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        wrap.classList.remove('panning');
        try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    // Keyboard: +, -, 0
    document.addEventListener('keydown', (e) => {
        if (!popup.classList.contains('active')) return;
        if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1 + STEP); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / (1 + STEP)); }
        else if (e.key === '0') { e.preventDefault(); reset(); }
    });

    // Reset on close / new image
    document.querySelectorAll('.pfp-card').forEach(c => c.addEventListener('click', () => setTimeout(reset, 0)));
    const observer = new MutationObserver(() => {
        if (!popup.classList.contains('active')) reset();
    });
    observer.observe(popup, { attributes: true, attributeFilter: ['class'] });
})();

// Sync bracket "press" effect on sidebar + popup with main corner brackets
(function() {
    const targets = () => document.querySelectorAll('.pfp-filter-sidebar, .pfp-popup-content');
    const on = () => targets().forEach(el => el.classList.add('brackets-active'));
    const off = () => targets().forEach(el => el.classList.remove('brackets-active'));
    document.addEventListener('mousedown', on);
    document.addEventListener('mouseup', off);
    document.addEventListener('mouseleave', off);
    document.addEventListener('touchstart', on, { passive: true });
    document.addEventListener('touchend', off, { passive: true });
    document.addEventListener('touchcancel', off, { passive: true });
})();
