/* DEEPDISH documentation pages (deepdish_ocs.html, deepdish_top.html, deepdish_rg.html, deepdish_sin.html):
   contents with scroll-spy, docs search (with text highlights where the browser supports them), [ / ] section
   keys, #<section id> links, the source map, a copy button on every code block, and for the dense layout (.doc.is-dense, css/docs.css) cells easing
   up as they scroll into view and tiles counting up to their b[data-count].
   Works on #g-docs-scroll's .doc-sec sections; the source map reads JSON [[name, lines], ...] from
   #g-src's data-source attribute. */
(function() {
    const scroller = document.getElementById('g-docs-scroll');
    if (!scroller) return;
    const els = {
        toc: document.getElementById('g-toc'),
        tocMeta: document.getElementById('g-toc-meta'),
        docsMeta: document.getElementById('g-docs-meta'),
        search: document.getElementById('g-search'),
        src: document.getElementById('g-src')
    };
    const sections = Array.from(scroller.querySelectorAll('.doc-sec'));

    // ---------- Contents + scroll-spy ----------
    els.toc.innerHTML = sections.map((s) => {
        const num = s.querySelector('.doc-num').textContent;
        return `<li><button type="button" class="g-toc-item" data-id="${s.id}"><span class="g-toc-num">${num}</span><span>${s.dataset.title}</span><span class="g-toc-hits"></span></button></li>`;
    }).join('');
    const tocItems = Array.from(els.toc.querySelectorAll('.g-toc-item'));
    els.tocMeta.textContent = `${sections.length} SECTIONS`;

    // Small layouts scroll the page; desktop layouts scroll the docs panel.
    const scrollRoot = () => getComputedStyle(scroller).overflowY === 'visible'
        ? (window.bracketContentArea || document.scrollingElement)
        : scroller;
    const rootTop = (root) => root === document.scrollingElement ? 0 : root.getBoundingClientRect().top + root.clientTop;
    function goTo(section, instant) {
        const root = scrollRoot();
        const top = section.getBoundingClientRect().top - rootTop(root) + root.scrollTop - 6;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.scrollTo({ top, behavior: reduced || instant ? 'instant' : 'smooth' });
        section.classList.remove('flash');
        void section.offsetWidth; // restart the flash animation
        section.classList.add('flash');
    }
    els.toc.addEventListener('click', (e) => {
        const b = e.target.closest('.g-toc-item');
        if (b) goTo(document.getElementById(b.dataset.id));
    });

    // Scroll only the contents list (scrollIntoView would also scroll the whole rail and page)
    function revealInList(list, item) {
        const lr = list.getBoundingClientRect();
        const ir = item.getBoundingClientRect();
        if (ir.top < lr.top) list.scrollTop -= lr.top - ir.top;
        else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
    }

    let currentIdx = 0;
    function spy() {
        const root = scrollRoot();
        const top = rootTop(root) + 40;
        let idx = 0;
        sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= top) idx = i; });
        // At the very bottom, the last section is the one being read
        if (root.scrollHeight > root.clientHeight && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) idx = sections.length - 1;
        if (idx === currentIdx && tocItems[idx].getAttribute('aria-current') === 'true') return;
        currentIdx = idx;
        tocItems.forEach((b, i) => b.setAttribute('aria-current', i === idx));
        revealInList(els.toc, tocItems[idx]);
        const s = sections[idx];
        els.docsMeta.textContent = `${s.querySelector('.doc-num').textContent} · ${s.dataset.title.toUpperCase()}`;
        // Embedded on the home page (js/embed.js): the preview's status line
        if (window.TirlEmbed) window.TirlEmbed.status(els.docsMeta.textContent);
    }
    let spyQueued = false;
    function scheduleSpy() {
        if (spyQueued) return;
        spyQueued = true;
        requestAnimationFrame(() => { spyQueued = false; spy(); });
    }
    scroller.addEventListener('scroll', scheduleSpy, { passive: true });
    (window.bracketContentArea || window).addEventListener('scroll', scheduleSpy, { passive: true });
    window.addEventListener('resize', spy);

    // ---------- Search ----------
    const canHighlight = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';
    let matchSections = [];
    function search() {
        const q = els.search.value.trim().toLowerCase();
        if (canHighlight) CSS.highlights.delete('doc-search');
        matchSections = [];
        if (!q) {
            tocItems.forEach((b) => { b.classList.remove('dim'); b.querySelector('.g-toc-hits').textContent = ''; });
            els.tocMeta.textContent = `${sections.length} SECTIONS`;
            return;
        }
        const ranges = [];
        sections.forEach((s, i) => {
            let hits = 0;
            const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                const text = n.nodeValue.toLowerCase();
                let at = text.indexOf(q);
                while (at !== -1) {
                    hits++;
                    if (canHighlight) {
                        const r = new Range();
                        r.setStart(n, at);
                        r.setEnd(n, at + q.length);
                        ranges.push(r);
                    }
                    at = text.indexOf(q, at + q.length);
                }
            }
            tocItems[i].classList.toggle('dim', !hits);
            tocItems[i].querySelector('.g-toc-hits').textContent = hits ? hits : '';
            if (hits) matchSections.push(s);
        });
        if (canHighlight && ranges.length) CSS.highlights.set('doc-search', new Highlight(...ranges));
        els.tocMeta.textContent = `${matchSections.length} / ${sections.length} MATCH`;
    }
    els.search.addEventListener('input', search);
    els.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && matchSections.length) {
            // Next matching section after the one being read
            const next = matchSections.find((s) => sections.indexOf(s) > currentIdx) || matchSections[0];
            goTo(next);
        } else if (e.key === 'Escape') {
            els.search.value = '';
            search();
            els.search.blur();
        }
    });
    document.addEventListener('keydown', (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el && el.closest('input, textarea, [contenteditable="true"]')) return;
        if (e.key === '/') { e.preventDefault(); els.search.focus(); }
        else if (e.key === ']') goTo(sections[Math.min(sections.length - 1, currentIdx + 1)]);
        else if (e.key === '[') goTo(sections[Math.max(0, currentIdx - 1)]);
    });

    // ---------- Code blocks: a copy button on each ----------
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
        return legacyCopy(text);
    }
    // Non-secure contexts, or the clipboard API refusing: a temporary textarea + execCommand
    function legacyCopy(text) {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = (() => { try { return document.execCommand('copy'); } catch (_) { return false; } })();
        ta.remove();
        return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
    }
    scroller.querySelectorAll('pre.doc-code').forEach((pre) => {
        const code = pre.querySelector('code') || pre;
        const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'doc-copy', textContent: 'COPY' });
        btn.setAttribute('aria-label', 'Copy this code');
        btn.addEventListener('click', () => {
            copyText(code.textContent).then(() => {
                btn.textContent = 'COPIED';
                btn.classList.add('is-done');
            }, () => { btn.textContent = 'FAILED'; }).finally(() => {
                clearTimeout(btn._t);
                btn._t = setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('is-done'); }, 1500);
            });
        });
        // A wrapper holds the button in place while the code scrolls sideways under it
        const wrap = Object.assign(document.createElement('div'), { className: 'doc-code-wrap' });
        pre.replaceWith(wrap);
        wrap.append(pre, btn);
    });

    // ---------- Dense layout: cells ease up, tiles count up as they scroll into view ----------
    // .cell and .doc-tile, plus whatever the .doc lists in data-reveal (OCS: its preset and expression cards)
    const doc = scroller.querySelector('.doc.is-dense');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('sys-calm');
    if (doc && !calm && 'IntersectionObserver' in window) {
        const items = Array.from(doc.querySelectorAll(['.cell, .doc-tile', doc.dataset.reveal].filter(Boolean).join(', ')));
        // Siblings stagger a little
        items.forEach((el) => {
            const at = Array.prototype.indexOf.call(el.parentElement.children, el);
            el.style.setProperty('--d', `${Math.min(at, 10) * 0.035}s`);
        });
        const count = (b) => {
            const to = +b.dataset.count;
            const text = b.textContent;
            const start = performance.now();
            const step = (t) => {
                const k = Math.min(1, (t - start) / 900);
                b.textContent = text.replace(/[\d,]+/, Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US'));
                if (k < 1) requestAnimationFrame(step); else b.textContent = text;
            };
            requestAnimationFrame(step);
        };
        // Desktop layouts scroll the docs panel; phones scroll the page
        const io = new IntersectionObserver((list) => list.forEach((en) => {
            if (!en.isIntersecting) return;
            en.target.classList.add('is-in');
            io.unobserve(en.target);
            const b = en.target.matches('.doc-tile') && en.target.querySelector('b[data-count]');
            if (b) count(b);
        }), { root: getComputedStyle(scroller).overflowY !== 'visible' ? scroller : null, rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
        document.documentElement.classList.add('doc-rv');
        items.forEach((el) => io.observe(el));
    }

    // ---------- Source map ----------
    if (els.src && els.src.dataset.source) {
        const source = JSON.parse(els.src.dataset.source);
        const maxLines = Math.max(...source.map(([, n]) => n));
        els.src.innerHTML = source.map(([name, n]) => `<li><span class="g-src-name">${name}</span>
            <span class="g-src-bar"><span style="width:${(n / maxLines * 100).toFixed(1)}%"></span></span>
            <span class="g-src-n">${n.toLocaleString('en-US')}</span></li>`).join('');
    }

    // #<section id> opens at that section (the home page's command palette links here); later changes scroll to it
    const fromHash = () => sections.find((s) => s.id === decodeURIComponent(location.hash.slice(1)));
    window.addEventListener('hashchange', () => { const s = fromHash(); if (s) goTo(s); });
    // Opening at a section waits for the page's images, which move everything below them
    const initial = fromHash();
    if (initial) {
        if (document.readyState === 'complete') goTo(initial, true);
        else window.addEventListener('load', () => goTo(initial, true), { once: true });
    }

    spy();
})();
