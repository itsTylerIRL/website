/* Page scripts for deepdish_rg.html: the Deploy installer, the Specimen viewer (tint + idle routines), Sprite Roster and
   Clearance ladder, and in the docs the chamber (§01) cycling moods and playing the idle routines picked in §03.
   Contents, search, the source map and the dense layout's scroll-in come from js/docs.js.
   Data from the radgotchi repo at 28e2288. */

// ---------- Deploy: OS tabs (defaults to the visitor's OS) and click-to-copy ----------
(function() {
    const pane = document.querySelector('.g-install-pane');
    if (!pane) return;
    const tabs = pane.querySelectorAll('.g-install-tab');
    const cmds = pane.querySelectorAll('.g-install-cmd');
    const src = document.getElementById('g-install-src');

    function select(os) {
        tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.os === os)));
        cmds.forEach(c => { c.hidden = c.dataset.os !== os; });
        src.href = os === 'ps' ? '/install_rg.ps1' : '/install_rg.sh';
    }
    tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.os)));
    if (/Win/.test(navigator.platform || navigator.userAgent)) select('ps');

    function copied(btn) {
        const label = btn.querySelector('.g-install-copy');
        btn.classList.add('copied');
        label.textContent = 'COPIED';
        setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'COPY'; }, 1500);
    }
    // Fallback: temporary textarea + execCommand (non-secure contexts, or the clipboard API refusing)
    function legacyCopy(btn, text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { if (document.execCommand('copy')) copied(btn); } catch (e) { console.error('Copy failed:', e); }
        ta.remove();
    }
    cmds.forEach(btn => btn.addEventListener('click', () => {
        const text = btn.dataset.cmd;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => copied(btn), () => legacyCopy(btn, text));
        } else {
            legacyCopy(btn, text);
        }
    }));
})();

// Sprites (assets/rg/sprites, copied from radgotchi/assets/gotchi) and what triggers them (src/renderer)
const RG_SPRITES = [
    ['awake', 'default; settles back here after every mood'],
    ['happy', 'petting, recoveries, waking up'],
    ['excited', '3 quick clicks, network back, 10 contacts'],
    ['cool', 'CPU back to normal; every 25 contacts past 100'],
    ['grateful', '50 contacts'],
    ['motivated', '100 contacts'],
    ['smart', 'sustained high CPU (working)'],
    ['intense', 'CPU spike, memory pressure, escalations'],
    ['angry', '5+ rapid clicks, critical alerts'],
    ['sad', 'something went offline'],
    ['lonely', 'network disconnected'],
    ['bored', 'idle routines'],
    ['demotivated', 'idle routines'],
    ['debug', 'an app stopped responding'],
    ['broken', 'failures and crashes'],
    ['upload', 'data transfer, LLM work'],
    ['upload1', 'upload cycle frame'],
    ['upload2', 'upload cycle frame'],
    ['friend', 'a RAD MESH peer comes online'],
    ['look_l', 'eyes follow the cursor left'],
    ['look_r', 'eyes follow the cursor right'],
    ['look_l_happy', 'looking left while happy'],
    ['look_r_happy', 'looking right while happy'],
    ['sleep', 'asleep after 2 idle minutes'],
    ['sleep2', 'asleep, alternate frame (every 3 s)']
];
// Idle routines (src/renderer/mood-engine.js): [name, steps, step ms]
const RG_ROUTINES = [
    ['patrol', ['look_l', 'awake', 'look_r', 'awake', 'look_l_happy', 'awake'], 1500],
    ['study', ['smart', 'smart', 'debug', 'smart', 'excited'], 2000],
    ['vibe', ['cool', 'cool', 'happy', 'cool', 'motivated'], 2200],
    ['restless', ['bored', 'look_l', 'look_r', 'bored', 'demotivated', 'bored'], 1800],
    ['workout', ['motivated', 'intense', 'motivated', 'excited', 'happy', 'cool'], 1400],
    ['nap_prep', ['bored', 'bored', 'sleep', 'sleep2', 'sleep', 'sleep2', 'sleep', 'awake'], 2500],
    ['hack', ['debug', 'smart', 'debug', 'intense', 'debug', 'excited'], 1600],
    ['social', ['look_l', 'friend', 'happy', 'look_r', 'friend', 'grateful'], 1800],
    ['upload_cycle', ['upload', 'upload1', 'upload2', 'upload1', 'upload2', 'happy'], 800],
    ['existential', ['smart', 'lonely', 'sad', 'smart', 'bored', 'cool'], 2200]
];
// Clearance ranks (src/main/xp-system.js): [min level, name, 中文]
const RG_RANKS = [
    [1, 'TRAINEE', '实习生'], [3, 'ANALYST', '分析员'], [5, 'OPERATIVE', '行动员'], [8, 'AGENT', '特工'],
    [11, 'SPECIALIST', '专家'], [14, 'HANDLER', '处理者'], [17, 'CONTROLLER', '控制者'], [20, 'DIRECTOR', '主管'],
    [24, 'EXECUTIVE', '执行官'], [28, 'OVERSEER', '监察官'], [33, 'SENTINEL', '哨兵'], [40, 'ARCHITECT', '架构师'],
    [50, 'PHANTOM', '幻影']
];

(function() {
    const els = {
        specimen: document.getElementById('g-specimen'),
        meta: document.getElementById('g-specimen-meta'),
        roster: document.getElementById('g-roster'),
        ranks: document.getElementById('g-ranks')
    };
    if (!els.specimen) return;
    const url = (key) => `/assets/rg/sprites/${key.toUpperCase()}.png`;
    const triggers = Object.fromEntries(RG_SPRITES);

    // ---------- Clearance ladder ----------
    els.ranks.innerHTML = RG_RANKS.map(([lvl, name, zh], i) => `<li style="--rung:${i / (RG_RANKS.length - 1)}">
        <span class="g-rank-lvl">L${lvl}</span><span class="g-rank-name">${name}</span><span class="g-rank-zh">${zh}</span></li>`).join('');

    // ---------- Specimen viewer ----------
    els.specimen.innerHTML = `<div class="g-specimen-stage">
            <i class="g-reticle tl"></i><i class="g-reticle tr"></i><i class="g-reticle bl"></i><i class="g-reticle br"></i>
            <img class="g-sprite g-sprite-big" id="g-sprite-big" alt="" width="144" height="44">
            <span class="g-specimen-status" id="g-specimen-status"></span>
        </div>
        <dl class="g-props g-specimen-props">
            <dt>mood</dt><dd id="g-spec-mood"></dd>
            <dt>trigger</dt><dd id="g-spec-trigger"></dd>
        </dl>
        <div class="g-specimen-controls">
            <label class="g-color" title="Tint (the app accepts any colour)"><input type="color" id="g-tint" value="#ff3344"><span>tint</span></label>
            <select id="g-routine" aria-label="Idle routine">${RG_ROUTINES.map(([n]) => `<option value="${n}">${n}</option>`).join('')}</select>
            <button type="button" class="g-btn" id="g-play">&#9654; play</button>
        </div>`;
    const big = document.getElementById('g-sprite-big');
    const status = document.getElementById('g-specimen-status');
    const tint = document.getElementById('g-tint');
    const playBtn = document.getElementById('g-play');
    const routineSel = document.getElementById('g-routine');

    function show(key, from) {
        big.src = url(key);
        big.alt = key;
        big.classList.remove('pop');
        void big.offsetWidth; // restart the pop animation
        big.classList.add('pop');
        document.getElementById('g-spec-mood').textContent = key;
        document.getElementById('g-spec-trigger').textContent = triggers[key] || '';
        status.textContent = from || key.toUpperCase().replace(/_/g, ' ');
        els.roster.querySelectorAll('.g-roster-item').forEach((b) => b.setAttribute('aria-current', b.dataset.key === key));
    }
    // The #rg-tint SVG filter floods var(--rg); it resolves from the <svg>, so set it on the root.
    // Embedded on the home page (js/embed.js) the column panels move into a shadow root there, out of reach of this
    // document's root and its <svg>: each panel carries the tint inline (the style moves with it), and once moved, a
    // copy of the filter goes into the first panel of each shadow root, inside the panel so it floods that tint.
    const panes = Array.from(document.querySelectorAll('[data-embed]'));
    const tintSvg = document.getElementById('rg-tint') && document.getElementById('rg-tint').closest('svg');
    function setTint(c) {
        document.documentElement.style.setProperty('--rg', c);
        panes.forEach((p) => p.style.setProperty('--rg', c));
    }
    function adoptTint() {
        panes.forEach((p) => {
            const root = p.getRootNode();
            if (root instanceof ShadowRoot && !root.getElementById('rg-tint')) p.prepend(tintSvg.cloneNode(true));
        });
    }
    // The home page can mount the panels again (a fresh shadow root), so keep checking while embedded
    if (window.TirlEmbed && tintSvg) setInterval(adoptTint, 400);
    tint.addEventListener('input', () => setTint(tint.value));

    // ---------- Routines ----------
    let timer = null;
    function stop() {
        clearTimeout(timer);
        timer = null;
        playBtn.innerHTML = '&#9654; play';
        els.meta.textContent = '';
    }
    function play(name) {
        const r = RG_ROUTINES.find(([n]) => n === name);
        if (!r) return;
        const [, steps, ms] = r;
        let i = 0;
        playBtn.innerHTML = '&#9632; stop';
        const tick = () => {
            show(steps[i], `ROUTINE ${name.toUpperCase()} · ${i + 1}/${steps.length}`);
            els.meta.textContent = `${name} · ${(ms / 1000).toFixed(1)}s / step`;
            i++;
            timer = i < steps.length ? setTimeout(tick, ms) : setTimeout(stop, ms);
        };
        tick();
    }
    playBtn.addEventListener('click', () => { if (timer) stop(); else play(routineSel.value); });

    // ---------- Roster ----------
    els.roster.innerHTML = RG_SPRITES.map(([key]) => `<li><button type="button" class="g-roster-item" data-key="${key}" aria-current="false" title="${key}: ${triggers[key]}">
        <img class="g-sprite" src="${url(key)}" alt="" width="144" height="44" loading="lazy"><span>${key}</span></button></li>`).join('');
    els.roster.addEventListener('click', (e) => {
        const b = e.target.closest('.g-roster-item');
        if (!b) return;
        stop();
        show(b.dataset.key);
    });


    setTint('#ff3344');
    show('awake');
})();

// ---------- Docs: the chamber (§01) behaves like the pet (§03) ----------
// Left alone it drifts through moods. Pet it: one click is happy, 3 quick clicks excited, 5+ angry. Its eyes follow
// the cursor around the hero. Idle for a while, it falls asleep (sleep / sleep2 every 3 s) and wakes up happy.
// A routine picked in §03 plays in it frame by frame. Each takes over from the one before; calm motion keeps it still.
(function() {
    const sprite = document.getElementById('rg-hero-sprite');
    const tag = document.getElementById('rg-hero-tag');
    if (!sprite) return;
    const chamber = sprite.closest('.rg-chamber');
    const hero = sprite.closest('.rg-hero');
    const doc = document.getElementById('doc');
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('sys-calm');
    const url = (key) => `/assets/rg/sprites/${key.toUpperCase()}.png`;
    RG_SPRITES.forEach(([key]) => { new Image().src = url(key); }); // frames swap without a flash
    let shown = '';
    function show(key, label, pop = true) {
        if (key !== shown) {
            sprite.src = url(key);
            sprite.alt = `RadGotchi, ${key.replace(/_/g, ' ')}`;
            shown = key;
        }
        if (pop) {
            sprite.classList.remove('pop');
            void sprite.offsetWidth; // restart the pop
            sprite.classList.add('pop');
        }
        tag.textContent = label || key.toUpperCase().replace(/_/g, ' ');
    }

    // What it's doing: 'ambient' | 'react' | 'routine' | 'sleep'. One timer drives whichever it is.
    let mode = 'ambient', timer = null, visible = false, n = 0;
    const clear = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
    function ambient() {
        clear();
        mode = 'ambient';
        if (!visible || calm()) return;
        const AMBIENT = ['happy', 'cool', 'smart', 'excited', 'bored', 'intense', 'grateful', 'motivated'];
        timer = setInterval(() => {
            n++;
            show(n % 2 ? AMBIENT[(n >> 1) % AMBIENT.length] : 'awake');
        }, 2600);
    }
    // A mood for a few seconds, then back to drifting (moods settle back to awake in the app too)
    function react(key, label, ms = 2400) {
        clear();
        stopRoutine();
        mode = 'react';
        show(key, label);
        timer = setTimeout(() => { show('awake'); ambient(); }, ms);
    }

    // ---------- Petting ----------
    chamber.setAttribute('role', 'button');
    chamber.setAttribute('tabindex', '0');
    chamber.setAttribute('aria-label', 'Pet RadGotchi');
    let clicks = [];
    function pet() {
        const now = performance.now();
        clicks = clicks.filter((t) => now - t < 1500).concat(now);
        wake(true);
        if (mode === 'sleep') return;
        if (clicks.length >= 5) react('angry', 'EXCESSIVE INPUT — CEASE', 3000);
        else if (clicks.length >= 3) react('excited', 'CONTACT ×' + clicks.length);
        else react('happy', 'CONTACT ACKNOWLEDGED');
    }
    chamber.addEventListener('click', pet);
    chamber.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); }
    });

    // ---------- Eyes follow the cursor over the hero ----------
    let lastLook = 0;
    hero.addEventListener('pointermove', (e) => {
        wake();
        if (mode !== 'ambient' || calm()) return;
        const now = performance.now();
        if (now - lastLook < 120) return; // no flicker
        lastLook = now;
        const r = sprite.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        clear(); // holds the drift while it watches you
        show(Math.abs(dx) < r.width * 0.2 ? 'awake' : dx < 0 ? 'look_l' : 'look_r', 'TRACKING', false);
    });
    hero.addEventListener('pointerleave', () => { if (mode === 'ambient') { show('awake'); ambient(); } });

    // ---------- Sleep: idle 2 minutes in the app; sooner here, it's a demo ----------
    const SLEEP_MS = 25000;
    let idleTimer = null;
    function armSleep() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!visible || mode === 'routine' || calm()) return armSleep();
            clear();
            mode = 'sleep';
            let alt = false;
            show('sleep', 'SLEEP MODE');
            timer = setInterval(() => { alt = !alt; show(alt ? 'sleep2' : 'sleep', 'SLEEP MODE', false); }, 3000);
        }, SLEEP_MS);
    }
    // Any input wakes it, happy to see you
    function wake(quiet) {
        armSleep();
        if (mode !== 'sleep') return;
        if (quiet) { mode = 'ambient'; return; }
        react('happy', 'WAKING UP');
    }
    ['keydown', 'wheel', 'pointerdown'].forEach((t) => window.addEventListener(t, () => wake(), { passive: true }));
    document.getElementById('g-docs-scroll').addEventListener('scroll', () => wake(), { passive: true });
    armSleep();

    new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (mode === 'ambient') ambient();
    }).observe(sprite);

    // ---------- Routines (§03): frame by frame, the routine's strip lighting the current frame ----------
    let playing = null;
    function stopRoutine() {
        if (!playing) return;
        playing.classList.remove('is-playing');
        playing.querySelectorAll('.rg-strip i').forEach((f) => f.classList.remove('is-on'));
        playing = null;
    }
    function play(btn) {
        const r = RG_ROUTINES.find(([name]) => name === btn.dataset.routine);
        if (!r) return;
        const [name, steps, ms] = r;
        const frames = btn.querySelectorAll('.rg-strip i');
        clear();
        stopRoutine();
        mode = 'routine';
        playing = btn;
        btn.classList.add('is-playing');
        let i = 0;
        const tick = () => {
            frames.forEach((f, j) => f.classList.toggle('is-on', j === i));
            show(steps[i], `${name.toUpperCase()} · ${i + 1}/${steps.length}`);
            i++;
            timer = setTimeout(i < steps.length ? tick : () => { stopRoutine(); show('awake'); ambient(); }, calm() ? Math.max(ms, 1500) : ms);
        };
        tick();
    }
    doc.addEventListener('click', (e) => {
        const btn = e.target.closest('.rg-routine');
        if (!btn) return;
        if (btn === playing) { stopRoutine(); show('awake'); ambient(); return; }
        play(btn);
    });
    // For the home page's idle tour (js/display.js)
    window.rgChamber = { play: (name) => { const b = doc.querySelector(`.rg-routine[data-routine="${name}"]`); if (b) play(b); }, playing: () => mode === 'routine' };
})();
