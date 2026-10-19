/* Shared DEEPDISH workspace helpers for pages without their own workspace script (digimon.html, timer.html):
   the status bar's UTC "SYNC" clock. */
(function() {
    const clock = document.getElementById('g-clock');
    if (!clock) return;
    const tick = () => {
        const d = new Date();
        clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);
})();
