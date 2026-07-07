/* Page scripts for deepdish_rg.html (extracted from inline <script> blocks, in original order) */
function copyInstallCommand(el) {
    const cmd = el.getAttribute('data-cmd');
    navigator.clipboard.writeText(cmd).then(() => {
        el.classList.add('copied');
        setTimeout(() => el.classList.remove('copied'), 2000);
    });
}
function switchInstallTab(tab, tabEl) {
    document.querySelectorAll('.install-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    document.getElementById('install-bash').hidden = (tab !== 'bash');
    document.getElementById('install-ps').hidden = (tab !== 'ps');
}
function toggleDeepDive(toggleEl) {
    const content = toggleEl.nextElementSibling;
    const hint = toggleEl.querySelector('.deep-dive-toggle-hint');
    const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
    if (isOpen) {
        content.style.maxHeight = '0px';
        hint.textContent = '[ click to expand ]';
        toggleEl.classList.remove('active');
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        hint.textContent = '[ click to collapse ]';
        toggleEl.classList.add('active');
    }
}
