/* Embed mode for workspace pages. The home page's live preview frames a page with ?embed (OBJECTS embed: true
   in js/objects.js) so it can be used in place: the page shows only its main panels, at full size
   (css/workspace.css, html.is-embed), and its column panels are handed to the home page: data-embed="side"
   ones show under Results, data-embed="rail" ones in its left column between the explorer and Recently
   Viewed. They stay this page's elements, so its scripts keep driving them.
   Input in here never reaches the home page, so activity and the home page's keys are passed up.
   <html data-embed-focus> pages take the keyboard as soon as they're selected (the timer's space bar);
   others wait for a click, so arrowing through the home page's Results doesn't get caught in them.
   Load it first, before the page's other scripts (js/background.js and js/escape-home.js check window.TirlEmbed). */
// Anchors, embedded or not: a part of the page marked data-anchor="name" (a card, a section) is where #name
// takes it, scrolled into view and lit for a moment (css/workspace.css .is-anchored). The home page sends its
// deep links here (/#deepdish/middle-management) and its command palette lists them (js/palette.js reads
// data-anchor, data-anchor-name, data-anchor-kind and data-anchor-sub, or the part's panel title).
(function() {
    'use strict';
    function land() {
        let h = location.hash.slice(1);
        try { h = decodeURIComponent(h); } catch (_) {}
        if (!h) return;
        // document.querySelector also finds panels handed to the home page (below)
        const el = document.querySelector(`[data-anchor="${CSS.escape(h)}"]`);
        if (!el) return;
        if (el.ownerDocument === document && el.isConnected) el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        el.classList.remove('is-anchored');
        void el.offsetWidth;
        el.classList.add('is-anchored');
        clearTimeout(el._anchored);
        el._anchored = setTimeout(() => el.classList.remove('is-anchored'), 2600);
    }
    window.addEventListener('hashchange', land);
    // After the page's scripts have drawn (and the column panels have moved)
    window.addEventListener('load', () => setTimeout(land, 120));
})();

(function() {
    'use strict';
    if (window.parent === window || !new URLSearchParams(location.search).has('embed')) return;
    let host = null;
    try { host = window.parent.TirlEmbedHost || null; } catch (_) {} // framed somewhere else
    if (!host) return;
    const root = document.documentElement;
    root.classList.add('is-embed');

    // The page's one-screen desktop layout (columns fill the height, panels scroll inside themselves) is what
    // the frame wants at any width from 900px, so its rules are mirrored under that condition, scoped to
    // html.is-embed by nesting. Inserted first, so the html.is-embed rules in the page's stylesheets still win.
    const ONE_SCREEN = '(min-width: 1360px) and (min-height: 600px)';
    let oneScreen = '';
    for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (_) { continue; } // cross-origin (fonts)
        for (const r of rules) {
            if (r instanceof CSSMediaRule && r.conditionText === ONE_SCREEN) oneScreen += Array.from(r.cssRules, (x) => x.cssText).join('\n');
        }
    }
    if (oneScreen) {
        const style = document.createElement('style');
        style.textContent = `@media (min-width: 900px) { html.is-embed {\n${oneScreen}\n} }`;
        document.head.prepend(style);
    }

    // Column panels move to the home page once this page has loaded. Scripts that look one up later
    // (getElementById / querySelector on the document) still find it there.
    const side = Array.from(document.querySelectorAll('[data-embed="side"]'));
    const rail = Array.from(document.querySelectorAll('[data-embed="rail"]'));
    const moved = side.concat(rail);
    const byId = Document.prototype.getElementById;
    const query = Document.prototype.querySelector;
    document.getElementById = function(id) {
        const hit = byId.call(this, id);
        if (hit || !moved[0] || moved[0].ownerDocument === document) return hit;
        for (const el of moved) {
            if (el.id === id) return el;
            const inner = el.querySelector('#' + CSS.escape(id));
            if (inner) return inner;
        }
        return null;
    };
    document.querySelector = function(sel) {
        const hit = query.call(this, sel);
        if (hit || !moved[0] || moved[0].ownerDocument === document) return hit;
        for (const el of moved) {
            if (el.matches(sel)) return el;
            const inner = el.querySelector(sel);
            if (inner) return inner;
        }
        return null;
    };

    // Keeps the home page's idle timer (ambient mode) from touring away while this page is in use
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((t) => window.addEventListener(t, (e) => {
        if (e.isTrusted) host.activity();
    }, { capture: true, passive: true }));
    // A click anywhere gives this page the keyboard, even where the page cancels the press (the timer stage)
    window.addEventListener('pointerdown', () => { if (!document.hasFocus()) window.focus(); }, true);

    const typing = (t) => t && t.closest('input, textarea, select, [contenteditable="true"]');
    // This page's search box is hidden, so / and Ctrl/Cmd+K open the home page's command palette before the
    // page can claim them
    window.addEventListener('keydown', (e) => {
        const palette = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k';
        if (!palette && (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || typing(e.target instanceof Element ? e.target : null))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        host.key('/');
    }, true);
    // ← → and Enter work as they do on the home page, unless this page used the key or you're typing
    // (Escape comes from js/escape-home.js, which knows about this page's modals)
    document.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        const t = e.target instanceof Element ? e.target : null;
        if (typing(t) || (e.key === 'Enter' && t && t.closest('a, button'))) return;
        setTimeout(() => { if (!e.defaultPrevented) host.key(e.key); });
    });

    // Links to other pages in the workspace (/#key, /#key/part, an object's own page) switch the home page's
    // preview in place; anything else opens in the window, not inside the preview
    document.addEventListener('click', (e) => {
        const a = e.target instanceof Element && e.target.closest('a[href]');
        if (!a || a.target || a.getAttribute('href').startsWith('#') || a.hasAttribute('download')) return;
        if (!e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && host.go && host.go(window, a.href)) {
            e.preventDefault();
            return;
        }
        a.target = '_top';
    }, true);

    // side, rail, styles and focus are read by the home page once this page has loaded (its scripts hold on to
    // the column elements by then). Page scripts report through the rest, guarded with window.TirlEmbed && so
    // they do nothing on their own:
    // - status(text): one short line on where the page is (the preview's title bar shows it)
    // - event({ kind, html, tone, mood, status }): something happened (the home page's ticker, the object's row
    //   in Results; with mood, the status-bar RadGotchi reacts, saying status). html is the page's own markup.
    window.TirlEmbed = {
        side,
        rail,
        styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.href),
        focus: root.hasAttribute('data-embed-focus'),
        key: (k) => host.key(k),
        status: (text) => host.status(window, text),
        event: (e) => host.event(window, e),
        // display(on): the home page's idle tour has this page up (or has moved on). The first time, js/display.js is
        // loaded, which runs a small demo of the page from its own controls; 'tirl:display' says when to start and stop.
        display(on) {
            window.__tirlDisplay = !!on;
            if (on && !document.getElementById('tirl-display')) {
                const s = document.createElement('script');
                s.id = 'tirl-display';
                s.src = '/js/display.js?v=1.0';
                document.head.append(s);
            }
            window.dispatchEvent(new CustomEvent('tirl:display', { detail: { on: !!on } }));
        }
    };
})();
