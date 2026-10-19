/* Page scripts for deepdish_rg.html: the Deploy installer, the Specimen viewer (tint + idle routines), Sprite Roster and Clearance ladder.
   Contents, search and the source map come from js/docs.js. Data from the radgotchi repo at 28e2288. */

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
    // The #rg-tint SVG filter floods var(--rg); it resolves from the <svg>, so set it on the root
    function setTint(c) {
        document.documentElement.style.setProperty('--rg', c);
    }
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
