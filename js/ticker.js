/* Live feed ticker in the home status bar: a slow crawl of what the page's live sources already know (music,
   status, X, Steam, GitHub, the cancel crown, repo pushes), so the screen keeps changing while it idles.
   Sources write their items to window.tirlFeed[key] (load order doesn't matter; the ticker reads it each
   time it needs the next item): { text (a string, or a function so "ago"s stay current), tone, href }.
   Status comes from the 'tirl:presence' event (js/presence.js). window.tirlTicker.push(item) slots one-off news
   (what just happened in the page embedded in the live preview, js/objects.js) in as the very next item.
   The crawl is one track moved by transform; an item that has left on the left is dropped and the next one
   in rotation joins on the right, so new data slides in without the line ever jumping. Hovering pauses it;
   reduced motion swaps one item at a time instead. */
(function () {
    'use strict';
    const box = document.getElementById('g-ticker');
    if (!box) return;
    const track = box.querySelector('.g-ticker-track');
    const ORDER = ['music', 'presence', 'x', 'github', 'steam', 'cancel', 'repos'];
    const SPEED = 34; // px per second
    const ago = t => {
        const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
        return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const feed = () => window.tirlFeed || {};

    // Status, from the Discord presence card's shared state
    function presence(p) {
        if (!p) return;
        const items = [];
        if (p.kind === 'activity') items.push({ text: `▸ ${p.label.toLowerCase()} ${p.title}`, tone: p.label === 'PLAYING' ? 'purple' : 'blue' });
        else if (p.kind === 'custom' && p.sub) items.push({ text: `status: “${p.sub}”`, tone: p.tone });
        if (p.word === 'offline') items.push({ text: () => p.seen ? `last seen ${ago(p.seen)}` : 'offline · comms still open', tone: 'muted' });
        else if (p.kind !== 'activity') items.push({ text: `currently ${p.word}`, tone: p.tone });
        (window.tirlFeed = window.tirlFeed || {}).presence = items;
    }
    presence(window.tirlPresence);
    window.addEventListener('tirl:presence', e => presence(e.detail));

    // The rotation: one item from each source in turn, so no single source floods the line; pushed news first
    let turn = 0;
    const depth = {};
    const news = [];
    let onNews = null;
    window.tirlTicker = { push: (it) => { news.push(it); news.splice(0, news.length - 5); if (onNews) onNews(); } };
    function nextItem() {
        if (news.length) return { ...news.shift(), news: true };
        const f = feed();
        const keys = ORDER.filter(k => f[k] && f[k].length);
        if (!keys.length) return null;
        const key = keys[turn++ % keys.length];
        const i = (depth[key] = (depth[key] || 0) + 1);
        return f[key][(i - 1) % f[key].length];
    }
    function build(it) {
        const el = document.createElement(it.href ? 'a' : 'span');
        el.className = `g-ticker-item${it.tone ? ' tone-' + it.tone : ''}`;
        if (it.href) { el.href = it.href; el.target = '_blank'; el.rel = 'noopener'; }
        el.textContent = typeof it.text === 'function' ? it.text() : it.text;
        if (it.news) el.dataset.news = '';
        return el;
    }

    // Reduced motion: no crawl, one item at a time
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const swap = () => { const it = nextItem(); if (it) track.replaceChildren(build(it)); };
        onNews = swap;
        swap();
        setInterval(swap, 8000);
        setTimeout(swap, 3000); // the sources' first answers
        return;
    }

    let x = 0, last = 0, paused = false;
    // News cuts in: regular items queued past the right edge make way, so it's next to scroll into view
    onNews = () => {
        const right = box.getBoundingClientRect().right;
        for (let el = track.lastElementChild; el && !('news' in el.dataset) && el.getBoundingClientRect().left > right; el = track.lastElementChild) el.remove();
    };
    box.addEventListener('mouseenter', () => { paused = true; });
    box.addEventListener('mouseleave', () => { paused = false; });
    box.addEventListener('focusin', () => { paused = true; });
    box.addEventListener('focusout', () => { paused = false; });
    function frame(t) {
        const dt = Math.min(0.1, (t - (last || t)) / 1000);
        last = t;
        const width = box.clientWidth;
        if (width && !paused) {
            x -= SPEED * dt;
            const first = track.firstElementChild;
            if (first && -x >= first.offsetWidth) { x += first.offsetWidth; first.remove(); }
            // Keep the track a little longer than the box
            while (track.offsetWidth + x < width + 160) {
                const it = nextItem();
                if (!it) break;
                track.append(build(it));
            }
            track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
