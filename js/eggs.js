/* Small secrets on the home page (css/micro.css):
   - Classification badge: click it to raise the page's clearance, UNCLASSIFIED -> CONFIDENTIAL -> SECRET ->
     TOP SECRET, recoloured like the real banners; at TOP SECRET a few labels are redacted. Back to the start
     after that, and on reload. The level is html[data-classif] (the palette's whoami reads it).
   - Comms tiles: right-click (or long-press on a phone) copies the handle and stamps the tile. A second
     right-click on the same tile soon after opens the browser's own menu, for copying the link.
   - Leaving the tab: the title says so (js/background.js); coming back after a while puts a burst of static
     over the hologram and logs how long the link was down.
   - The hologram: click it ten times fast and it overloads, showing another Remilia piece for a moment.
   - Midnight (the visitor's clock): the handshake panel plays a date rollover.
   window.tirlEggs.{ rollover, destabilize } run them by hand. Motion is skipped with reduced motion or SYS calm. */
(function () {
    'use strict';
    const root = document.documentElement;
    const gotham = document.getElementById('gotham');
    if (!gotham) return;
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('sys-calm');
    const log = (text, tone) => window.tirlLog?.add({ text, tone });
    const pet = () => (typeof RG !== 'undefined' ? RG : null); // js/radgotchi.js
    const click = () => window.SoundFX?.play(window.SoundFX.sounds.click, 0.08);
    function replay(el, cls, ms) {
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
        if (ms) setTimeout(() => el.classList.remove(cls), ms);
    }

    // ---------- Classification badge ----------
    const LEVELS = [
        { id: 'UNCLASSIFIED', text: 'UNCLASSIFIED // FOUO', title: 'Unclassified // For Official Use Only' },
        { id: 'CONFIDENTIAL', text: 'CONFIDENTIAL // REL TO FRENS', title: 'Confidential // Releasable to frens' },
        { id: 'SECRET', text: 'SECRET // NOFORN', title: 'Secret // No foreign nationals' },
        { id: 'TOP SECRET', text: 'TOP SECRET // SI // NOFORN', title: 'Top Secret // Special Intelligence // No foreign nationals' }
    ];
    const badge = document.querySelector('.g-topbar .g-classif');
    if (badge) {
        let level = 0;
        badge.setAttribute('role', 'button');
        badge.tabIndex = 0;
        const raise = () => {
            level = (level + 1) % LEVELS.length;
            const l = LEVELS[level];
            badge.textContent = l.text;
            badge.title = l.title + ' · click to raise clearance';
            if (level) root.dataset.classif = l.id; else delete root.dataset.classif;
            root.classList.toggle('g-redact', l.id === 'TOP SECRET');
            if (!calm()) replay(badge, 'is-stamp', 500);
            click();
            log(level ? `CLEARANCE RAISED · ${l.id}` : 'CLEARANCE RESET · UNCLASSIFIED', level === 3 ? 'red' : level ? 'orange' : 'green');
            if (level === 3) pet()?.setMood('smart', { status: 'EYES ONLY', priority: true, duration: 3000 });
        };
        badge.title = LEVELS[0].title + ' · click to raise clearance';
        badge.addEventListener('click', raise);
        badge.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.stopPropagation(); // not the page's Enter shortcut (js/objects.js)
            raise();
        });
    }

    // ---------- Comms: copy the handle ----------
    const discordName = () => window.tirlPresence?.discord_user?.username || 'tylerirl';
    const HANDLES = {
        reminet: () => '~tyler',
        x: () => '@itsTylerIRL',
        discord: discordName,
        github: () => 'itstylerirl',
        steam: () => '11111x11111',
        soundcloud: () => 'itstylerirl'
    };
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            document.body.append(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            ok ? resolve() : reject(new Error('copy failed'));
        });
    }
    function stamp(chan, text, ok) {
        chan.querySelector('.g-chan-copied')?.remove();
        const s = document.createElement('span');
        s.className = 'g-chan-copied' + (ok ? '' : ' is-fail');
        s.setAttribute('role', 'status');
        s.textContent = text;
        chan.append(s);
        setTimeout(() => s.remove(), 1500);
    }
    function copyHandle(chan) {
        const get = HANDLES[chan.dataset.dossier];
        if (!get) return false;
        const handle = get();
        copyText(handle).then(() => {
            stamp(chan, 'COPIED // TX OK', true);
            click();
            log(`COMMS · copied ${handle}`, 'cyan');
        }, () => stamp(chan, 'COPY FAILED', false));
        return true;
    }
    let lastMenu = { chan: null, t: 0 };
    document.addEventListener('contextmenu', (e) => {
        const chan = e.target instanceof Element && e.target.closest('.g-home .g-chan');
        if (!chan) return;
        const now = Date.now();
        if (chan.__pressed) { e.preventDefault(); return; } // the long-press already copied
        if (lastMenu.chan === chan && now - lastMenu.t < 2500) { lastMenu = { chan: null, t: 0 }; return; } // the browser's menu
        if (copyHandle(chan)) {
            e.preventDefault();
            lastMenu = { chan, t: now };
        }
    });
    // Long-press on touch: copies at 500 ms and swallows the tap that follows
    let press = null;
    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        const chan = e.target instanceof Element && e.target.closest('.g-home .g-chan');
        if (!chan) return;
        const x = e.clientX, y = e.clientY;
        clearTimeout(press?.timer);
        press = {
            chan, x, y,
            timer: setTimeout(() => {
                if (!copyHandle(chan)) return;
                chan.__pressed = true;
                navigator.vibrate?.(15);
                setTimeout(() => { chan.__pressed = false; }, 800);
            }, 500)
        };
    }, { passive: true });
    const cancelPress = (e) => {
        if (!press) return;
        if (e.type === 'pointermove' && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10) return;
        clearTimeout(press.timer);
        press = null;
    };
    ['pointerup', 'pointercancel', 'pointermove'].forEach((t) => document.addEventListener(t, cancelPress, { passive: true }));
    document.addEventListener('click', (e) => {
        const chan = e.target instanceof Element && e.target.closest('.g-home .g-chan');
        if (chan && chan.__pressed) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // ---------- Signal lost / link restored ----------
    const holo = document.querySelector('.g-home .hologram-container');
    let hiddenAt = document.hidden ? Date.now() : 0;
    const AWAY_MS = 30000;
    const awayText = (ms) => {
        const m = Math.round(ms / 60000);
        return m < 1 ? `${Math.round(ms / 1000)}s` : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { hiddenAt = Date.now(); return; }
        const away = hiddenAt ? Date.now() - hiddenAt : 0;
        hiddenAt = 0;
        if (away < AWAY_MS) return;
        log(`LINK RESTORED · away ${awayText(away)}`, 'green');
        if (holo && !calm()) replay(holo, 'is-static', 700);
    });

    // ---------- Hologram overload ----------
    const PIECES = ['milady-1', 'milady-2', 'milady-3', 'remilio-1', 'remilio-3', 'remilio-4', 'remilio-5', 'remilio-6', 'remilio-7', 'remilio-8', 'fumo-172']
        .map((n) => `/assets/gallery-thumbs/remilia-${n}.webp`);
    const img = holo && holo.querySelector('.hologram-image');
    let hits = [], cooling = false;
    function destabilize() {
        if (!holo || !img || cooling) return;
        cooling = true;
        hits = [];
        log('SUBJECT DESTABILIZED · hologram overload', 'red');
        pet()?.setMood('intense', { status: 'CONTAINMENT BREACH', priority: true, duration: 3000 });
        const original = img.getAttribute('src');
        const swap = PIECES[(Math.random() * PIECES.length) | 0];
        const pre = new Image();
        pre.src = swap;
        if (calm()) {
            setTimeout(() => { img.src = swap; }, 0);
            setTimeout(() => { img.src = original; cooling = false; }, 1800);
            return;
        }
        replay(holo, 'is-overload', 1900);
        setTimeout(() => { img.src = swap; }, 450);
        setTimeout(() => { img.src = original; }, 1500);
        setTimeout(() => { cooling = false; }, 6000);
    }
    if (holo) holo.addEventListener('click', () => {
        if (cooling) return;
        const now = Date.now();
        hits = hits.filter((t) => now - t < 4000);
        hits.push(now);
        if (hits.length >= 10) destabilize();
        else if (hits.length >= 4 && !calm()) replay(holo, 'is-strain', 220);
    });

    // ---------- Midnight: date rollover ----------
    const pad = (n) => String(n).padStart(2, '0');
    function rollover() {
        if (document.getElementById('boot-overlay')) return;
        const d = new Date();
        const urbit = `~${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
        let visits = 0;
        try { visits = (JSON.parse(localStorage.getItem('tirl_visit')) || {}).visits || 0; } catch (_) {}
        log(`DATE ROLLOVER · ${urbit}`, 'purple');
        if (calm()) return;
        const rows = [
            ['date rollover', urbit.toUpperCase()],
            ['ledger close', 'SEALED'],
            ['crown ledger', 'CARRIED OVER'],
            ['visit log', visits ? `VISIT #${visits} KEPT` : 'KEPT'],
            ['sky model', 'RESYNCED']
        ];
        const el = document.createElement('div');
        el.id = 'boot-overlay';
        el.className = 'is-rollover';
        el.setAttribute('role', 'presentation');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `<div class="boot-panel">
            <i class="boot-reticle tl"></i><i class="boot-reticle tr"></i><i class="boot-reticle bl"></i><i class="boot-reticle br"></i>
            <div class="boot-title"><span>tirl.sys // date rollover</span><span class="boot-classif">00:00 LOCAL</span></div>
            <div class="boot-body">
                <div class="boot-brand">
                    <img src="/assets/object-icons/wee-brand.gif" alt="" width="46" height="46">
                    <div class="boot-brand-text"><span class="boot-name">${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${d.getFullYear()}</span><span class="boot-tag">a new day (in real life)</span></div>
                </div>
                <div class="boot-log">${rows.map(([label]) => `<div class="boot-row"><i class="boot-dot"></i><span class="boot-label">${label}</span><span class="boot-stat">&middot;</span></div>`).join('')}</div>
                <div class="boot-progress"><div class="boot-progress-fill"></div></div>
                <div class="boot-meta"><span class="boot-pct">000%</span><span class="boot-state">rolling over</span></div>
            </div>
            <div class="boot-skip">click or press esc to skip</div>
        </div>`;
        document.body.append(el);
        const rowEls = el.querySelectorAll('.boot-row');
        const fill = el.querySelector('.boot-progress-fill');
        const pct = el.querySelector('.boot-pct');
        const state = el.querySelector('.boot-state');
        const timers = [];
        let gone = false;
        const leave = (fast) => {
            if (gone) return;
            gone = true;
            timers.forEach(clearTimeout);
            window.removeEventListener('keydown', onKey);
            el.classList.add(fast ? 'exit-fast' : 'exit');
            setTimeout(() => el.remove(), 500);
        };
        const onKey = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); leave(true); }
        };
        el.addEventListener('click', () => leave(true));
        window.addEventListener('keydown', onKey, true);
        rows.forEach(([, status], i) => {
            timers.push(setTimeout(() => rowEls[i].classList.add('on'), 300 + i * 160));
            timers.push(setTimeout(() => {
                rowEls[i].classList.add('ok');
                rowEls[i].querySelector('.boot-stat').textContent = status;
                const k = (i + 1) / rows.length;
                fill.style.transform = `scaleX(${k})`;
                pct.textContent = String(Math.round(k * 100)).padStart(3, '0') + '%';
                state.textContent = i + 1 < rows.length ? `${i + 1}/${rows.length} rolled` : 'new day established';
                if (i + 1 === rows.length) el.classList.add('ready');
            }, 560 + i * 160));
        });
        fill.style.transform = 'scaleX(0)';
        timers.push(setTimeout(() => leave(false), 560 + rows.length * 160 + 1400));
    }
    // Checked every 15 s: the day changing while the page is up, within a few minutes of midnight
    // (a laptop waking up the next afternoon isn't midnight)
    let day = new Date().toDateString();
    setInterval(() => {
        const now = new Date();
        const today = now.toDateString();
        if (today === day) return;
        day = today;
        if (!document.hidden && now.getHours() === 0 && now.getMinutes() < 5) rollover();
    }, 15000);

    window.tirlEggs = { rollover, destabilize };
})();
