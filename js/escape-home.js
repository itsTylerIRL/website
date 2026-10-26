/* Escape goes back to the home page, from every page (home itself handles it in js/objects.js: back to the
   home object). Left alone:
   - while typing: search boxes clear themselves on the first Escape, the next one goes home
   - inside the home page's live preview frame, unless the page is embedded there (js/embed.js): then the
     Escape is handed to the home page, which goes back to its home object
   - when the page uses Escape itself: anything that calls preventDefault on it keeps it (the Digimon
     game's BACK button, the gallery's zoom reset)
   - while a modal is open (an element with an id ending -modal and .show): its close button is pressed if
     it has one, otherwise nothing happens, so a game's own buttons stay in charge */
(function () {
    'use strict';
    if (window.top !== window && !window.TirlEmbed) return;
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
        const t = e.target instanceof Element ? e.target : null;
        if (t && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        const modal = document.querySelector('[id$="-modal"].show');
        if (modal) {
            const close = modal.querySelector('[id$="-close"], [class$="-close"], [data-action="close"], .close');
            if (close) close.click();
            return;
        }
        // The page's own handlers (on document or window, some registered after this one) get the first say
        setTimeout(() => {
            if (e.defaultPrevented) return;
            if (window.TirlEmbed) window.TirlEmbed.key('Escape');
            else location.href = '/';
        });
    });
})();
