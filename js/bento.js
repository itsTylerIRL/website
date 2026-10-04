/* Shared bento card behavior (index.html, pages/deepdish.html): CRT/glow/specular layers,
   per-card accent from data-accent, tilt + parallax, entrance reveal, idle shuffle. */
(function() {
    const cards = document.querySelectorAll('.bento-item');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cards.forEach(card => {
        // Add CRT scanline overlay to entire card
        const crtOverlay = document.createElement('div');
        crtOverlay.className = 'crt-overlay';
        card.appendChild(crtOverlay);

        // Add CRT vignette overlay to entire card
        const crtVignette = document.createElement('div');
        crtVignette.className = 'crt-vignette';
        card.appendChild(crtVignette);

        const glow = document.createElement('div');
        glow.className = 'tilt-glow';
        card.appendChild(glow);

        // #5 Glass refraction layer (SVG displacement on hover via CSS)
        const refract = document.createElement('div');
        refract.className = 'bento-refract';
        card.appendChild(refract);

        // #6 Specular highlight layer (cursor-tracking white glint)
        const spec = document.createElement('div');
        spec.className = 'spec-highlight';
        card.appendChild(spec);

        // Per-card accent color (RGB triplet, defaults to cyan); also exposed to CSS
        const accent = card.dataset.accent || '139,233,253';
        card.style.setProperty('--accent', accent);

        // External link indicator
        if (card.target === '_blank') {
            const ext = document.createElement('span');
            ext.className = 'bento-ext';
            ext.setAttribute('aria-hidden', 'true');
            ext.textContent = '\u2197';
            card.appendChild(ext);
        }
        const image = card.querySelector('.bento-image');
        const content = card.querySelector('.bento-content');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const nx = (x - centerX) / centerX; // -1..1
            const ny = (y - centerY) / centerY;

            const rotateX = ny * -10;
            const rotateY = nx * 10;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.03)`;

            const glowX = (x / rect.width) * 100;
            const glowY = (y / rect.height) * 100;
            glow.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(${accent}, 0.22) 0%, rgba(${accent}, 0.05) 35%, transparent 70%)`;

            // #6 Specular cursor-tracking highlight (tight white spot)
            spec.style.background = `radial-gradient(circle 80px at ${glowX}% ${glowY}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 25%, transparent 55%)`;

            // Tinted outer glow on the card itself
            card.style.boxShadow = `
                0 20px 50px rgba(0, 0, 0, 0.4),
                0 0 40px rgba(${accent}, 0.25),
                0 0 80px rgba(${accent}, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.15),
                inset 0 0 30px rgba(${accent}, 0.08)`;
            card.style.borderColor = `rgba(${accent}, 0.55)`;

            // #6 Parallax: image floats out, content drifts opposite (depth)
            if (image) {
                const moveX = nx * 10;
                const moveY = ny * 10;
                image.style.transform = `translate3d(${moveX}px, ${moveY - 5}px, 40px) scale(1.08)`;
            }
            if (content) {
                content.style.transform = `translate3d(${nx * -4}px, ${ny * -3}px, 18px)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.boxShadow = '';
            card.style.borderColor = '';
            glow.style.background = 'transparent';
            spec.style.background = '';

            if (image) {
                image.style.transform = '';
                image.style.transition = 'transform 0.5s ease-out';
            }
            if (content) {
                content.style.transform = '';
                content.style.transition = 'transform 0.5s ease-out';
            }
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'all 0.1s ease-out';
            if (image) image.style.transition = 'transform 0.1s ease-out';
            if (content) content.style.transition = 'transform 0.1s ease-out';
        });

        // Trigger a packet burst from this card on click (uses background3d.js)
        card.addEventListener('click', () => {
            if (typeof window.spawnCardPacketBurst === 'function') {
                const rect = card.getBoundingClientRect();
                window.spawnCardPacketBurst(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    accent
                );
            }
        });
    });

    // Staggered entrance animation via IntersectionObserver
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach((card, i) => {
        card.style.setProperty('--reveal-delay', `${i * 0.08}s`);
        revealObserver.observe(card);
    });

    // ---------- #11 Idle bento shuffle ----------
    // After IDLE_MS of no interaction, swap two random cards with a
    // glitch-slice transition. Repeats every SHUFFLE_INTERVAL while idle.
    const grid = document.querySelector('.bento-grid');
    if (grid && !prefersReducedMotion) {
        const IDLE_MS = 30000;
        const SHUFFLE_INTERVAL = 12000;
        let idleTimer = null;
        let shuffleTimer = null;
        let isIdle = false;
        let hoveringCard = false;

        cards.forEach(c => {
            c.addEventListener('mouseenter', () => { hoveringCard = true; });
            c.addEventListener('mouseleave', () => { hoveringCard = false; });
        });

        function shuffleOnce() {
            if (hoveringCard || document.hidden) return;
            const items = Array.from(grid.querySelectorAll('.bento-item'));
            if (items.length < 2) return;
            const i = Math.floor(Math.random() * items.length);
            let j = Math.floor(Math.random() * items.length);
            while (j === i) j = Math.floor(Math.random() * items.length);
            const a = items[i], b = items[j];

            a.classList.add('shuffle-out');
            b.classList.add('shuffle-out');

            setTimeout(() => {
                // Swap DOM positions (use a placeholder to swap safely)
                const aNext = a.nextSibling;
                const bNext = b.nextSibling;
                const parent = a.parentNode;
                if (bNext === a) {
                    parent.insertBefore(a, b);
                } else if (aNext === b) {
                    parent.insertBefore(b, a);
                } else {
                    parent.insertBefore(a, bNext);
                    parent.insertBefore(b, aNext);
                }
                a.classList.remove('shuffle-out');
                b.classList.remove('shuffle-out');
                a.classList.add('shuffle-in');
                b.classList.add('shuffle-in');
                setTimeout(() => {
                    a.classList.remove('shuffle-in');
                    b.classList.remove('shuffle-in');
                }, 600);
            }, 450);
        }

        function enterIdle() {
            if (isIdle) return;
            isIdle = true;
            grid.classList.add('idle-pulse');
            shuffleTimer = setInterval(shuffleOnce, SHUFFLE_INTERVAL);
            // First shuffle shortly after entering idle
            setTimeout(shuffleOnce, 800);
        }

        function exitIdle() {
            if (!isIdle) return;
            isIdle = false;
            grid.classList.remove('idle-pulse');
            if (shuffleTimer) { clearInterval(shuffleTimer); shuffleTimer = null; }
        }

        function resetIdle() {
            exitIdle();
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(enterIdle, IDLE_MS);
        }

        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(ev => {
            window.addEventListener(ev, resetIdle, { passive: true });
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) exitIdle(); else resetIdle();
        });
        resetIdle();
    }
})();
