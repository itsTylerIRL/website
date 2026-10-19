/* Page scripts for index.html (extracted from inline <script> blocks, in original order) */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

// Live RemiliaNET profile stats in the Host dossier
(function() {
    const box = document.getElementById('reminet-stats');
    if (!box) return;

    const fmt = (n) => {
        if (typeof n !== 'number' || !isFinite(n)) return '—';
        if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
        return String(n);
    };

    fetch('https://www.remilia.net/api/v1/users/tyler')
        .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
        .then((data) => {
            const u = data && data.user;
            if (!u) throw new Error('no user');
            let any = false;
            box.querySelectorAll('[data-stat]').forEach((el) => {
                const v = u[el.dataset.stat];
                if (typeof v === 'number') { el.textContent = fmt(v); any = true; }
            });
            if (any) {
                box.hidden = false;
                requestAnimationFrame(() => box.classList.add('ready'));
            }
        })
        .catch((e) => {
            box.classList.add('offline');
            console.log('RemiliaNET stats unavailable:', e.message);
        });
})();

// GitHub card in the Host dossier: a contributions heatmap (a column per week, Sunday on top, newest on the
// right; as many weeks as the card has room for) beside the past year, the last 12 weeks, the current and best
// streaks and active days (css/objects.css drops the later stats as the card narrows).
// github-contributions-api.jogruber.de reads the public profile and allows CORS.
(function() {
    const box = document.getElementById('g-gh');
    if (!box) return;
    fetch('https://github-contributions-api.jogruber.de/v4/itstylerirl?y=last')
        .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
        .then((data) => {
            const days = data && data.contributions;
            if (!Array.isArray(days) || !days.length) throw new Error('no contributions');
            const last = days.length - 1;
            // Start on a Sunday so every column is a whole week
            const first = (7 - ((new Date(days[last].date + 'T12:00:00Z').getUTCDay() - last) % 7 + 7) % 7) % 7;
            const cells = days.slice(first);
            const sum = (list) => list.reduce((n, d) => n + d.count, 0);
            // Today isn't over: a streak still counts if it ran through yesterday
            let streak = 0;
            for (let i = days[last].count ? last : last - 1; i >= 0 && days[i].count; i--) streak++;
            let best = 0;
            days.reduce((run, d) => { run = d.count ? run + 1 : 0; best = Math.max(best, run); return run; }, 0);
            const active = days.filter((d) => d.count).length;
            const stat = (n, label) => `<span class="g-gh-stat"><b>${n.toLocaleString('en-US')}</b><small>${label}</small></span>`;
            box.innerHTML = `<span class="g-gh-map"><span class="g-gh-grid">${cells.map((d) => `<i class="l${d.level}"></i>`).join('')}</span></span>`
                + `<span class="g-gh-stats">${stat(sum(days), 'past year')}${stat(sum(days.slice(-84)), '12 weeks')}${stat(streak, 'day streak')}${stat(best, 'best streak')}${stat(active, 'active days')}</span>`;
            box.title = `${sum(days)} GitHub contributions in the past year`;
            box.setAttribute('aria-label', box.title);
            box.hidden = false;
        })
        .catch((e) => console.log('GitHub activity unavailable:', e.message));
})();

// Dossier: one live card at a time (Discord, RemiNET, GitHub). It rotates every 7 s; hovering or focusing a
// comms tile with data-dossier shows that card and holds it until the pointer leaves, and so does hovering
// the card. Cards still loading (hidden) sit out of the rotation and join it once their data lands.
(function() {
    const box = document.getElementById('g-dossier');
    const src = document.getElementById('g-dossier-src');
    const dots = document.getElementById('g-dossier-dots');
    if (!box || !src || !dots) return;
    const ROTATE_MS = 7000;
    const slides = [...box.querySelectorAll('[data-slide]')];
    const ready = () => slides.filter((s) => !s.hidden);
    let active = null;
    let held = false;
    let rotated = false;
    let timer = null;

    function show(slide) {
        if (!slide || slide.hidden) return;
        active = slide;
        slides.forEach((s) => s.classList.toggle('is-active', s === slide));
        src.textContent = slide.dataset.label;
        dots.innerHTML = ready().map((s) => `<button type="button" role="tab" data-go="${s.dataset.slide}" aria-selected="${s === slide}" aria-label="${s.dataset.label}"></button>`).join('');
    }
    function start() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (held || document.hidden) return;
            const r = ready();
            if (r.length < 2) return;
            rotated = true;
            show(r[(r.indexOf(active) + 1) % r.length]);
        }, ROTATE_MS);
    }
    const byKey = (key) => slides.find((s) => s.dataset.slide === key);

    dots.addEventListener('click', (e) => {
        const b = e.target.closest('[data-go]');
        if (!b) return;
        rotated = true;
        show(byKey(b.dataset.go));
        start();
    });
    document.querySelectorAll('.g-chan[data-dossier]').forEach((chan) => {
        const hold = () => {
            const slide = byKey(chan.dataset.dossier);
            if (!slide || slide.hidden) return;
            held = rotated = true;
            show(slide);
        };
        const release = () => { held = false; start(); };
        chan.addEventListener('mouseenter', hold);
        chan.addEventListener('focus', hold);
        chan.addEventListener('mouseleave', release);
        chan.addEventListener('blur', release);
    });
    box.addEventListener('mouseenter', () => { held = true; });
    box.addEventListener('mouseleave', () => { held = false; });

    // Until the first rotation, the first card in order that has loaded leads (Discord once it answers)
    new MutationObserver(() => {
        if (!active || active.hidden || !rotated) show(ready()[0]);
        else show(active);
    }).observe(box, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    show(ready()[0]);
    start();
})();
