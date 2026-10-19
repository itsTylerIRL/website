/* Page scripts for guest-book.html: watches the urbit chat iframe and reports the uplink
   (status, handshake time, session length, reloads) in the side panels, chip and status bar. */
(function() {
    const $ = (id) => document.getElementById(id);
    const frame = $('g-frame');
    if (!frame) return;

    const TIMEOUT_MS = 20000;
    const els = {
        wait: $('g-chat-wait'), chip: $('g-link-chip'), reload: $('g-reload'),
        status: $('u-status'), handshake: $('u-handshake'), session: $('u-session'), reloads: $('u-reloads'),
        bar: $('g-status'), barDot: $('g-status-dot'), log: $('g-log'), logMeta: $('g-log-meta')
    };

    const started = Date.now();
    let reloads = 0;
    let t0 = 0;
    let timer = null;

    const stamp = () => {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    };
    const events = [];
    function log(kind, html, tone) {
        events.unshift({ t: stamp(), kind, html, tone });
        events.length = Math.min(events.length, 40);
        els.log.innerHTML = events.map((e) => `<li><i class="g-dot tone-${e.tone}"></i><div>
            <time>${e.t} &middot; ${e.kind}</time><span>${e.html}</span></div></li>`).join('');
        els.logMeta.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
    }

    // One state drives the chip, the uplink panel, the status bar and the overlay
    const STATES = {
        connecting: { label: 'Connecting', tone: 'orange', wait: 'ESTABLISHING UPLINK…' },
        online: { label: 'Online', tone: 'green', wait: '' },
        timeout: { label: 'No Response', tone: 'red', wait: '[ NO RESPONSE ] · TRY RELOAD OR OPEN ↗' }
    };
    function setState(key) {
        const s = STATES[key];
        els.chip.className = `g-chip tone-${s.tone}`;
        els.chip.innerHTML = `<i class="g-dot tone-${s.tone}"></i>${s.label}`;
        els.status.textContent = s.label.toLowerCase();
        els.status.className = `tone-${s.tone}`;
        els.bar.textContent = s.label.toUpperCase();
        els.barDot.className = `g-dot tone-${s.tone}`;
        els.wait.textContent = s.wait;
        els.wait.hidden = !s.wait;
        els.wait.classList.toggle('is-error', key === 'timeout');
        frame.classList.toggle('ready', key === 'online');
    }

    function connect(first) {
        t0 = performance.now();
        setState('connecting');
        log('LINK', first ? 'dialing ~raddem-tidwyt at urbit.tylerirl.com' : 'redialing ~raddem-tidwyt', 'muted');
        clearTimeout(timer);
        timer = setTimeout(() => {
            setState('timeout');
            log('LINK', `no response after ${TIMEOUT_MS / 1000}s: the ship may be offline`, 'red');
        }, TIMEOUT_MS);
    }
    frame.addEventListener('load', () => {
        clearTimeout(timer);
        const ms = Math.round(performance.now() - t0);
        els.handshake.textContent = `${ms.toLocaleString('en-US')} ms`;
        setState('online');
        log('LINK', `channel up · handshake ${ms.toLocaleString('en-US')} ms`, 'green');
    });
    els.reload.addEventListener('click', () => {
        reloads++;
        els.reloads.textContent = String(reloads);
        connect(false);
        frame.src = frame.src;
    });

    // Session length
    const tick = () => {
        const s = Math.floor((Date.now() - started) / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        els.session.textContent = (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);

    connect(true);
})();
