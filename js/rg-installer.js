/* Radgotchi installer card (index.html, pages/deepdish.html): OS tabs, click-to-copy, title scramble */
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
    const copied = () => {
        element.classList.add('copied');
        flashInstallTitle(element);
        setTimeout(() => element.classList.remove('copied'), 1500);
    };
    // Fallback: temporary textarea + execCommand (non-secure contexts, or the clipboard API refusing)
    const legacyCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = cmd;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            if (document.execCommand('copy')) copied();
        } catch (e) {
            console.error('Copy failed:', e);
        }
        document.body.removeChild(textarea);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).then(copied, legacyCopy);
    } else {
        legacyCopy();
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
