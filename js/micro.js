/* Small things the home page does (css/micro.css): hover touches while you use it, and while it's left up as an
   idle screen, a flash on anything live that changes and screen care for the monitor it's on.
   - Featured cards tilt toward the pointer (the art floats a little); comms icons lean toward it; the Host
     hologram turns to follow it around its panel
   - Panel titles decode when hovered (once per title every few seconds)
   - Live values (dossier stats, Results telemetry lines, comms status) flash when they change in place
   - Screen care, while ambient mode is on (js/objects.js sends tirl:ambient): the layout shifts a few pixels every
     couple of minutes, so nothing sits burned into one spot. Off with SYS "Screen care" (html.sys-no-saver).
   Motion is skipped with reduced motion or SYS calm; hover touches only for a mouse. */
(function () {
    'use strict';
    const root = document.documentElement;
    const gotham = document.getElementById('gotham');
    if (!gotham) return;
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('sys-calm');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- Tilt + lean + hologram (one pointermove, one frame) ----------
    let pending = null, frame = null;
    let tilted = null, magnet = null;
    const subject = document.querySelector('.g-home');
    function apply() {
        frame = null;
        const e = pending;
        if (!e) return;
        const t = e.target instanceof Element ? e.target : null;

        // Featured card under the pointer
        const card = t && t.closest('.g-feat');
        if (tilted && tilted !== card) release(tilted, 'is-tilt', ['--rx', '--ry', '--px', '--py']);
        if (card) {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
            card.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
            card.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
            card.style.setProperty('--px', `${(x * 6).toFixed(1)}px`);
            card.style.setProperty('--py', `${(y * 5).toFixed(1)}px`);
            card.classList.add('is-tilt');
            tilted = card;
        }

        // Comms tile: its icon leans toward the pointer
        const chan = t && t.closest('.g-chan');
        if (magnet && magnet !== chan) release(magnet, 'is-magnet', ['--gx', '--gy']);
        if (chan) {
            const r = chan.getBoundingClientRect();
            chan.style.setProperty('--gx', `${clamp((e.clientX - (r.left + r.width / 2)) * 0.12, -5, 5).toFixed(1)}px`);
            chan.style.setProperty('--gy', `${clamp((e.clientY - (r.top + r.height * 0.35)) * 0.12, -4, 4).toFixed(1)}px`);
            chan.classList.add('is-magnet');
            magnet = chan;
        }

        // Host panel: the hologram turns toward the pointer
        if (subject) {
            const r = subject.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (inside) {
                const x = (e.clientX - r.left) / r.width - 0.2, y = (e.clientY - r.top) / r.height - 0.5; // the subject sits left of centre
                subject.style.setProperty('--hy', `${clamp(x * 14, -9, 9).toFixed(2)}deg`);
                subject.style.setProperty('--hx', `${clamp(-y * 8, -6, 6).toFixed(2)}deg`);
                subject.classList.add('is-turn');
            } else if (subject.classList.contains('is-turn')) release(subject, 'is-turn', ['--hx', '--hy']);
        }
    }
    function release(el, cls, props) {
        props.forEach((p) => el.style.removeProperty(p));
        el.classList.remove(cls);
        if (el === tilted) tilted = null;
        if (el === magnet) magnet = null;
    }
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || calm()) return; // mouse only: touch has no hover
        pending = e;
        if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
    document.addEventListener('pointerleave', () => {
        if (tilted) release(tilted, 'is-tilt', ['--rx', '--ry', '--px', '--py']);
        if (magnet) release(magnet, 'is-magnet', ['--gx', '--gy']);
        if (subject) release(subject, 'is-turn', ['--hx', '--hy']);
    });

    // ---------- Panel titles decode on hover ----------
    const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
    const lastDecode = new WeakMap();
    function labelNode(title) {
        for (const c of title.childNodes) {
            if (c.nodeType === 3 && c.textContent.trim()) return c;
            if (c.nodeType === 1 && !c.matches('.g-meta, button, .g-seg, .g-dossier-dots') && c.firstChild && c.firstChild.nodeType === 3) return c.firstChild;
        }
        return null;
    }
    document.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse' || calm()) return;
        const title = e.target instanceof Element && e.target.closest('.g-panel-title');
        if (!title || title.contains(e.relatedTarget)) return;
        const node = labelNode(title);
        if (!node || node.__decoding) return;
        const now = Date.now();
        if (now - (lastDecode.get(title) || 0) < 6000) return;
        lastDecode.set(title, now);
        const text = node.textContent;
        node.__decoding = true;
        let n = 0;
        const t = setInterval(() => {
            n += 0.6;
            node.textContent = text.split('').map((c, i) => /\s/.test(c) || i < n ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
            if (n >= text.length) { clearInterval(t); node.textContent = text; node.__decoding = false; }
        }, 32);
    });

    // ---------- Live values flash when they change ----------
    // Only changes to text that was already there: whole lists being redrawn (a filter, a refresh of every row)
    // are left alone, so the flash means "this just updated"
    const WATCH = '.g-op-stat b, .g-res-desc, #g-discord-status, #g-steam-status, .g-op-seen, .g-now b';
    const quietUntil = Date.now() + 6000; // the first data in isn't news
    const text = new WeakMap();
    function blip(el) {
        el.classList.remove('g-blip');
        void el.offsetWidth;
        el.classList.add('g-blip');
    }
    const mo = new MutationObserver((list) => {
        if (Date.now() < quietUntil) return;
        const hits = new Set();
        for (const m of list) {
            const node = m.target.nodeType === 3 ? m.target.parentElement : m.target;
            const el = node && node.closest(WATCH);
            if (el && el.isConnected) hits.add(el);
        }
        if (hits.size > 4) return; // a redraw, not an update
        hits.forEach((el) => {
            const now = el.textContent.trim();
            const was = text.get(el);
            text.set(el, now);
            if (was !== undefined && was !== now && now && !calm()) blip(el);
        });
    });
    // Remember what's there now (so the first change has something to differ from), then watch
    setTimeout(() => {
        document.querySelectorAll(WATCH).forEach((el) => text.set(el, el.textContent.trim()));
        ['g-dossier', 'g-results', 'g-home', 'g-objhead'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) mo.observe(el, { subtree: true, childList: true, characterData: true });
        });
    }, 5000);

    // ---------- Screen care while idle ----------
    const SHIFT_MS = 120000; // a new few-pixel offset every 2 minutes
    let shiftTimer = null;
    const saverOff = () => root.classList.contains('sys-no-saver');
    function shift() {
        if (saverOff()) return;
        const pick = () => Math.round((Math.random() * 2 - 1) * 4);
        gotham.style.setProperty('--saver-x', `${pick()}px`);
        gotham.style.setProperty('--saver-y', `${pick()}px`);
    }
    function start() {
        if (saverOff()) return;
        clearInterval(shiftTimer);
        shiftTimer = setInterval(shift, SHIFT_MS);
    }
    function stop() {
        clearInterval(shiftTimer);
        gotham.style.removeProperty('--saver-x');
        gotham.style.removeProperty('--saver-y');
    }
    window.addEventListener('tirl:ambient', (e) => (e.detail && e.detail.on ? start() : stop()));
})();
