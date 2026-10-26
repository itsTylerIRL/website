/* Workspace panels for digimon.html, alongside js/digimon.js (which it never modifies):
   live telemetry and an event log, built by watching the device: key presses and on-screen buttons,
   the call light (#digimon-led), the loader status and the sound toggle. */
(function() {
    const els = {
        log: document.getElementById('g-events'),
        logMeta: document.getElementById('g-events-meta'),
        uptime: document.getElementById('t-uptime'),
        inputs: document.getElementById('t-inputs'),
        calls: document.getElementById('t-calls'),
        light: document.getElementById('t-light'),
        link: document.getElementById('t-link'),
        sound: document.getElementById('t-sound'),
        led: document.getElementById('digimon-led'),
        status: document.getElementById('digimon-status'),
        soundBtn: document.getElementById('digimon-sound')
    };
    if (!els.log) return;

    // Same mapping as js/digimon.js
    const KEYS = {
        ArrowUp: 'UP', KeyW: 'UP', ArrowDown: 'DOWN', KeyS: 'DOWN',
        ArrowRight: 'RIGHT', KeyD: 'RIGHT', ArrowLeft: 'LEFT', KeyA: 'LEFT',
        Enter: 'OK', NumpadEnter: 'OK', Space: 'OK', KeyZ: 'OK',
        Escape: 'BACK', Backspace: 'BACK', KeyX: 'BACK'
    };
    const BUTTONS = ['UP', 'DOWN', 'RIGHT', 'LEFT', 'OK', 'BACK']; // data-key 0..5
    const GLYPH = { UP: '&uarr;', DOWN: '&darr;', LEFT: '&larr;', RIGHT: '&rarr;', OK: '&#9679;', BACK: '&#8617;' };

    const started = Date.now();
    let inputs = 0;
    let calls = 0;
    const events = [];

    const stamp = () => {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    };
    function log(kind, html, tone) {
        events.unshift({ t: stamp(), kind, html, tone });
        events.length = Math.min(events.length, 80);
        els.log.innerHTML = events.map((e) => `<li><i class="g-dot tone-${e.tone}"></i><div>
            <time>${e.t} &middot; ${e.kind}</time><span>${e.html}</span></div></li>`).join('');
        els.logMeta.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
        // Embedded on the home page (js/embed.js): the call light and device errors go to its ticker, and a call
        // gets the pet's attention
        if (window.TirlEmbed && (kind === 'CALL' || (kind === 'SYS' && tone === 'red'))) {
            const call = kind === 'CALL' && tone === 'orange';
            window.TirlEmbed.event(call ? { kind, html, tone, mood: 'sad', status: 'YOUR DIGIMON IS CALLING' } : { kind, html, tone });
        }
    }
    function setBox(el, text, on) {
        if (!el) return;
        el.textContent = text;
        if (on !== undefined) el.closest('.stat-box').classList.toggle('is-on', !!on);
    }

    // Inputs: keyboard (not while typing in a field) and the on-screen buttons
    function onInput(name, via) {
        inputs++;
        setBox(els.inputs, String(inputs));
        log('INPUT', `${GLYPH[name]} ${name} <small>${via}</small>`, 'blue');
    }
    window.addEventListener('keydown', (e) => {
        const name = KEYS[e.code];
        if (!name || e.repeat) return;
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        onInput(name, 'key');
    });
    document.querySelectorAll('.flipper [data-key]').forEach((btn) => {
        btn.addEventListener('pointerdown', () => onInput(BUTTONS[+btn.dataset.key], 'button'));
    });

    // Call light: the pet wants attention
    if (els.led) {
        let on = els.led.classList.contains('on');
        new MutationObserver(() => {
            const now = els.led.classList.contains('on');
            if (now === on) return;
            on = now;
            setBox(els.light, on ? 'ON' : 'OFF', on);
            if (on) {
                calls++;
                setBox(els.calls, String(calls));
                log('CALL', 'call light on &mdash; your digimon needs something', 'orange');
            } else {
                log('CALL', 'call light off', 'muted');
            }
        }).observe(els.led, { attributes: true, attributeFilter: ['class'] });
    }

    // Loader status: hidden once the WebAssembly build is running
    if (els.status) {
        let state = '';
        const check = () => {
            const err = els.status.classList.contains('error');
            const ready = els.status.classList.contains('hidden');
            const next = err ? 'error' : ready ? 'online' : 'loading';
            if (next === state) return;
            state = next;
            setBox(els.link, next.toUpperCase(), next === 'online');
            if (window.TirlEmbed) window.TirlEmbed.status(`flipper zero · wasm ${next}`.toUpperCase());
            if (next === 'online') log('SYS', 'wasm module online &middot; save restored from IndexedDB', 'green');
            else if (next === 'error') log('SYS', els.status.textContent || 'device error', 'red');
            else log('SYS', 'loading wasm module&hellip;', 'muted');
        };
        new MutationObserver(check).observe(els.status, { attributes: true, childList: true, characterData: true, subtree: true });
        check();
    }

    // Sound toggle (js/digimon.js rewrites the button text)
    if (els.soundBtn) {
        const read = () => /on/i.test(els.soundBtn.textContent.split(':').pop()) ? 'ON' : 'OFF';
        setBox(els.sound, read(), read() === 'ON');
        new MutationObserver(() => {
            const v = read();
            if (els.sound.textContent === v) return;
            setBox(els.sound, v, v === 'ON');
            log('SYS', `sound ${v.toLowerCase()}`, 'muted');
        }).observe(els.soundBtn, { childList: true, characterData: true, subtree: true });
    }

    // Uptime
    const tick = () => {
        const s = Math.floor((Date.now() - started) / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        setBox(els.uptime, (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'));
    };
    tick();
    setInterval(tick, 1000);
})();
