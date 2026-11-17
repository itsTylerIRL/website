/* Pet panel on the home page (index.html, right column between the Object Explorer and the Signal Log): your own
   DigiFlip pet, live, whatever object is showing. It runs in a small frame (pages/pet.html, the same
   js/digimon.js and saves as the DigiFlip page), so its keys stay inside it: click it to play. [EXPAND] opens
   DigiFlip in the workspace.
   One pet at a time: while DigiFlip itself is in the preview, the panel saves its pet, unloads it and hides (the
   page then loads those saves), and comes back, from the page's saves, once you move on. The call light shows in
   the panel's title too.
   Coming and going it moves like the panels a previewed page hands over (css/objects.css g-embed-in / g-embed-out):
   out toward the column's edge, then the column eases shut (js/objects.js tweenHeight); back, the column eases
   open as it slides in. On the workspace's first reveal it rises in with the others (css/index.css). */
(function() {
    'use strict';
    const pane = document.getElementById('g-petpane');
    const box = document.getElementById('g-petbox');
    const meta = document.getElementById('g-petpane-meta');
    if (!pane || !box) return;
    const DIGIFLIP = 'digiflip';
    let frame = null, led = null, gen = 0;
    const tween = (change) => (window.ObjectsTween ? window.ObjectsTween(pane, change) : change());
    const LEAVE_MS = 180; // g-embed-out
    function show() {
        if (!pane.hidden) return;
        pane.classList.remove('is-leaving');
        tween(() => { pane.hidden = false; });
        pane.classList.remove('is-entering');
        void pane.offsetWidth;
        pane.classList.add('is-entering');
    }
    function hide(my) {
        pane.classList.remove('is-entering');
        pane.classList.add('is-leaving');
        setTimeout(() => {
            if (my !== gen) return; // came back in the meantime
            tween(() => { pane.hidden = true; });
            pane.classList.remove('is-leaving');
        }, LEAVE_MS);
    }
    pane.addEventListener('animationend', (e) => { if (e.target === pane && e.animationName === 'g-embed-in') pane.classList.remove('is-entering'); });
    function setMeta(text, tone) {
        meta.textContent = text;
        meta.className = 'g-meta' + (tone ? ' tone-' + tone : '');
    }
    function mount() {
        if (frame) return;
        const my = ++gen;
        frame = document.createElement('iframe');
        frame.src = '/pages/pet.html';
        frame.title = 'Your DigiFlip pet';
        frame.className = 'g-pet-frame';
        box.replaceChildren(frame);
        show();
        setMeta('WAKING…');
        frame.addEventListener('load', () => {
            if (my !== gen) return;
            setMeta('LIVE', 'green');
            // The call light, mirrored in the title
            try {
                const el = frame.contentDocument.getElementById('digimon-led');
                led?.disconnect();
                led = new MutationObserver(() => {
                    const on = el.classList.contains('on');
                    pane.classList.toggle('is-calling', on);
                    setMeta(on ? 'CALLING YOU' : 'LIVE', on ? 'orange' : 'green');
                });
                led.observe(el, { attributes: true, attributeFilter: ['class'] });
            } catch (_) {}
        });
    }
    // Save first (the game's own save, then the write to IndexedDB), then unload, and the panel steps out
    function unmount() {
        const f = frame;
        frame = null;
        const my = ++gen;
        led?.disconnect();
        led = null;
        pane.classList.remove('is-calling');
        hide(my);
        const done = () => { if (f) f.remove(); };
        if (!f) return done();
        let M = null;
        try { M = f.contentWindow.__digimon && f.contentWindow.__digimon.module; } catch (_) {}
        if (!M) return done();
        let finished = false;
        const finish = () => { if (!finished) { finished = true; done(); } };
        try {
            if (M._web_save) M._web_save();
            M.FS.syncfs(false, finish);
        } catch (_) { return finish(); }
        setTimeout(finish, 1500);
    }

    let wait = null;
    function follow(key) {
        clearTimeout(wait);
        if (key === DIGIFLIP) unmount();
        // coming back from DigiFlip: give its page a moment to save before reading the saves here
        else if (!frame) wait = setTimeout(mount, 700);
    }
    window.addEventListener('tirl:select', (e) => follow(e.detail.key));
    if (window.ObjectsCurrent === DIGIFLIP) unmount(); else mount();
})();
