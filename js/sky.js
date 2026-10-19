/* Day and night on the Host panel: the grid floor, scan beam and glow take their colour from where the sun
   is over Chicago (Tyler's time zone), so the panel drifts through the day: the usual cyan by day, warm
   coral around sunrise and sunset, deep indigo with stars at night. Sets --sky-rgb, --sky-a and --night on
   .g-home (css/objects.css) once a minute.
   Testing: ?sky=-8 pins the sun at that altitude in degrees; ?sky=cycle runs a whole day in a minute. */
(function () {
    'use strict';
    const home = document.querySelector('.g-home');
    if (!home) return;
    const LAT = 41.88, LON = -87.63; // Chicago
    const DAY = [139, 233, 253], DUSK = [255, 138, 112], NIGHT = [104, 112, 255];
    const rad = Math.PI / 180;

    // Sun altitude in degrees (a low-precision solar position; good to a fraction of a degree)
    function altitude(ms) {
        const d = ms / 86400000 - 10957.5; // days since J2000
        const g = (357.529 + 0.98560028 * d) * rad;
        const q = 280.459 + 0.98564736 * d;
        const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
        const e = (23.439 - 0.00000036 * d) * rad;
        const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
        const dec = Math.asin(Math.sin(e) * Math.sin(L));
        const gmst = 18.697374558 + 24.06570982441908 * d;
        const hour = ((gmst * 15 + LON) * rad) - ra;
        return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(hour)) / rad;
    }
    const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

    function paint(alt) {
        const day = smooth(-6, 8, alt);                        // night 0 .. day 1
        const warm = Math.max(0, 1 - Math.abs(alt - 1) / 9);   // strongest with the sun on the horizon
        const night = 1 - smooth(-14, -4, alt);                // stars come out
        const rgb = mix(mix(NIGHT, DAY, day), DUSK, warm * 0.75);
        home.style.setProperty('--sky-rgb', rgb.join(', '));
        home.style.setProperty('--sky-a', (0.75 + 0.25 * day).toFixed(3));
        home.style.setProperty('--night', night.toFixed(3));
    }

    const pin = new URLSearchParams(location.search).get('sky');
    if (pin === 'cycle') {
        // A day in a minute, from midnight
        const start = Date.now(), midnight = new Date().setHours(0, 0, 0, 0);
        setInterval(() => paint(altitude(midnight + ((Date.now() - start) % 60000) * 1440)), 100);
    } else if (pin !== null && Number.isFinite(+pin)) {
        paint(+pin);
    } else {
        const run = () => paint(altitude(Date.now()));
        run();
        setInterval(run, 60000);
    }
})();
