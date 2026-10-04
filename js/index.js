/* Page scripts for index.html (extracted from inline <script> blocks, in original order) */
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

// Live RemiliaNET profile stats on the ~tyler bento card
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
        .catch((e) => console.log('RemiliaNET stats unavailable:', e.message));
})();
