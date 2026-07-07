/* Page scripts for index.html (extracted from inline <script> blocks, in original order) */
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

        // Per-card accent color (RGB triplet, defaults to cyan)
        const accent = card.dataset.accent || '139,233,253';
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

function switchInstallTab(type, tabElement) {
    document.querySelectorAll('.install-tab').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');
    
    document.getElementById('install-bash').hidden = (type !== 'bash');
    document.getElementById('install-ps').hidden = (type !== 'ps');
}

function flashInstallTitle(element) {
    const titleEl = document.getElementById('install-title');
    if (!titleEl) return;
    const hint = element.id === 'install-ps' ? 'PASTE INTO POWERSHELL' : 'PASTE INTO TERMINAL';
    const original = titleEl.textContent;
    titleEl.textContent = hint;
    titleEl.style.color = '#50fa7b';
    titleEl.style.textShadow = '0 0 12px rgba(80, 250, 123, 0.9), 0 0 25px rgba(80, 250, 123, 0.5)';
    setTimeout(() => {
        titleEl.textContent = original;
        titleEl.style.color = '';
        titleEl.style.textShadow = '';
    }, 1500);
}

function copyInstallCommand(element) {
    const cmd = element.getAttribute('data-cmd');
    // Fallback for non-secure contexts (no clipboard API)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).then(() => {
            element.classList.add('copied');
            flashInstallTitle(element);
            setTimeout(() => element.classList.remove('copied'), 1500);
        });
    } else {
        // Fallback: create temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = cmd;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            element.classList.add('copied');
            flashInstallTitle(element);
            setTimeout(() => element.classList.remove('copied'), 1500);
        } catch (e) {
            console.error('Copy failed:', e);
        }
        document.body.removeChild(textarea);
    }
}

// Keyboard accessibility for install banner
document.querySelectorAll('.install-tab, .install-command').forEach(el => {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        }
    });
});

// Terminal-style scramble effect on installer title
(function() {
    const titleEl = document.getElementById('install-title');
    if (!titleEl) return;
    const target = titleEl.textContent;
    const chars = '!@#$%^&*_+-=|;:<>?/~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let iteration = 0;
    titleEl.textContent = target.split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const interval = setInterval(() => {
        titleEl.textContent = target.split('').map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iteration) return target[i];
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        iteration += 0.5;
        if (iteration >= target.length) {
            titleEl.textContent = target;
            clearInterval(interval);
        }
    }, 40);
})();

// Scroll-reactive corner brackets
(function() {
    const brackets = document.querySelector('.corner-brackets');
    if (!brackets) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                const f = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
                brackets.style.setProperty('--scroll-expand', (f * 8) + 'px');
                brackets.style.setProperty('--bracket-color', `rgba(139, 233, 253, ${(0.5 + f * 0.3).toFixed(2)})`);
                ticking = false;
            });
            ticking = true;
        }
    });
})();

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
