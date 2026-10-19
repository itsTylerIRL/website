/* Page scripts for rocketry.html: renders the Gotham-style missile program workspace from VEHICLES */

// ---------- Program data (edit here to update the page) ----------
// Milestones: [phase, date 'YYYY-MM-DD' or null, 'complete' | 'active' | 'pending']. IDs (MS-01...) come from the order.
// tone: status colour for the vehicle chip ('green' | 'orange' | 'blue' | 'red').
// footage: flight media for the Flight Footage gallery, e.g.
//   { type: 'video', src: '/assets/rocketry/patriot-onboard.mp4', poster: '/assets/rocketry/patriot-onboard.jpg', caption: 'ONBOARD · ASCENT', date: '2026-11-02' }
//   { type: 'image', src: '/assets/rocketry/patriot-pad.jpg', caption: 'PAD · PRE-LAUNCH', date: '2026-11-02' }
// Leave it empty until there is footage; the panel shows a "pending" feed screen instead.
const PROGRAM = { name: 'DEEPDISH HPR', originator: 'TYLER' };

const VEHICLES = [
    {
        key: 'patriot',
        designation: 'PATRIOT',
        docId: 'RCKT-2026-0107',
        image: '/assets/rocketry/rocket.png',
        figure: 'PATRIOT VEHICLE ASSEMBLY',
        brief: 'Construction and deployment of a high-power rocket system designated PATRIOT. Program initiated January 2026. Vehicle is currently in final pre-flight preparation following completion of paint and finishing.',
        notice: 'Launch window pending site selection and weather clearance. Final pre-flight inspection required before ignition authorization.',
        vehicleClass: 'HIGH POWER',
        propulsion: 'SOLID MOTOR',
        recovery: 'PARACHUTE',
        start: '2026-01-07',
        status: 'BUILD COMPLETE',
        tone: 'green',
        milestones: [
            ['Kit Received', '2026-01-07', 'complete'],
            ['Parts Inventory & Planning', '2026-01-10', 'complete'],
            ['Body Tube Assembly', '2026-01-31', 'complete'],
            ['Fin Installation', '2026-02-20', 'complete'],
            ['Recovery System', '2026-02-26', 'complete'],
            ['Paint & Finishing', '2026-02-27', 'complete'],
            ['Pre-Flight Checks', null, 'pending'],
            ['Launch', null, 'pending']
        ],
        footage: []
    },
    {
        key: 'bullpup',
        designation: 'BULLPUP',
        docId: 'RCKT-2026-0308',
        image: '/assets/rocketry/bullpup-h.png',
        figure: 'BULLPUP VEHICLE ASSEMBLY',
        brief: 'Construction and deployment of a high-power rocket system designated BULLPUP. Program initiated March 2026. Vehicle is currently in early construction phase.',
        notice: 'Build in early stages. Timeline estimates pending completion of initial assembly phases.',
        vehicleClass: 'HIGH POWER',
        propulsion: 'SOLID MOTOR',
        recovery: 'PARACHUTE',
        start: '2026-03-08',
        status: 'IN PROGRESS',
        tone: 'orange',
        milestones: [
            ['Kit Received', '2026-03-08', 'complete'],
            ['Parts Inventory & Planning', null, 'active'],
            ['Body Tube Assembly', null, 'pending'],
            ['Fin Installation', null, 'pending'],
            ['Recovery System', null, 'pending'],
            ['Paint & Finishing', null, 'pending'],
            ['Pre-Flight Checks', null, 'pending'],
            ['Launch', null, 'pending']
        ],
        footage: []
    }
];

// ---------- Workspace ----------
(function() {
    const main = document.getElementById('g-main');
    if (!main) return;

    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const STATUS_TONE = { complete: 'green', active: 'orange', pending: 'muted' };
    const ROCKET_ICON = '<svg class="g-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .5c2.2 1.6 3.2 4 3.2 6.8v3.1l1.8 1.9V14H10.4l-.6-1.2H6.2L5.6 14H3v-1.7l1.8-1.9V7.3C4.8 4.5 5.8 2.1 8 .5zm0 4.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/></svg>';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const els = {
        list: document.getElementById('g-vehicles'),
        count: document.getElementById('g-count'),
        crumb: document.getElementById('g-crumb'),
        search: document.getElementById('g-search'),
        graph: document.getElementById('g-graph'),
        graphMeta: document.getElementById('g-graph-meta'),
        activity: document.getElementById('g-activity'),
        milestones: document.getElementById('g-milestones'),
        msMeta: document.getElementById('g-ms-meta'),
        statusObjects: document.getElementById('g-status-objects'),
        clock: document.getElementById('g-clock')
    };

    let current = -1;

    // ---------- Helpers ----------
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const parseDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    const fmtDate = (t) => { const d = new Date(t); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
    const now = new Date();
    const TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const msId = (i) => 'MS-' + String(i + 1).padStart(2, '0');

    function milestonesOf(v) {
        return v.milestones.map(([phase, date, status], i) => ({ id: msId(i), phase, date: date ? parseDate(date) : null, status }));
    }
    function progressOf(v) {
        const ms = v.milestones;
        const done = ms.filter((m) => m[2] === 'complete').length;
        return { done, total: ms.length, pct: ms.length ? Math.round((done / ms.length) * 100) : 0 };
    }

    // ---------- Object explorer ----------
    function renderExplorer() {
        const q = els.search.value.trim().toLowerCase();
        els.list.innerHTML = '';
        let shown = 0;
        VEHICLES.forEach((v, i) => {
            const hay = [v.designation, v.docId, v.status, v.vehicleClass].join(' ').toLowerCase();
            if (q && !hay.includes(q)) return;
            shown++;
            const li = document.createElement('li');
            li.innerHTML = `<button type="button" class="g-obj-btn" data-index="${i}" aria-current="${i === current}">
                ${ROCKET_ICON}<span>${esc(v.designation)}</span><i class="g-dot tone-${esc(v.tone)}" title="${esc(v.status)}"></i>
                <span class="g-id">${esc(v.docId.slice(-4))}</span></button>`;
            els.list.appendChild(li);
        });
        if (!shown) els.list.innerHTML = '<li class="g-no-results">No matching objects</li>';
        els.count.textContent = shown;
    }
    els.list.addEventListener('click', (e) => {
        const btn = e.target.closest('.g-obj-btn');
        if (btn) select(+btn.dataset.index);
    });

    // ---------- Object view ----------
    function renderObject(v, index) {
        const ms = milestonesOf(v);
        const prog = progressOf(v);
        const confidence = (0.9 + (v.designation.length % 9) / 100).toFixed(2);
        const brief = esc(v.brief).replace(esc(v.designation), `<mark>${esc(v.designation)}</mark>`);

        main.innerHTML = `<div class="g-object">
            <div class="g-objhead">
                <div class="g-objrow">
                    <div class="g-objicon">${ROCKET_ICON}</div>
                    <div class="g-objtitle">
                        <div class="g-objtype">VEHICLE &middot; ${esc(v.docId)}</div>
                        <h1>${esc(v.designation)}</h1>
                    </div>
                    <span class="g-chip tone-${esc(v.tone)}"><i class="g-dot tone-${esc(v.tone)}"></i>${esc(v.status)}</span>
                    <div class="g-objnav">
                        <button type="button" class="g-btn" data-step="-1" aria-label="Previous object" ${index === 0 ? 'disabled' : ''}>&lsaquo;</button>
                        <span>${index + 1} / ${VEHICLES.length}</span>
                        <button type="button" class="g-btn" data-step="1" aria-label="Next object" ${index === VEHICLES.length - 1 ? 'disabled' : ''}>&rsaquo;</button>
                    </div>
                </div>
                <p class="g-summary">${brief}</p>
                <div class="g-callout"><b>NOTICE</b><span>${esc(v.notice)}</span></div>
            </div>
            <div class="g-grid">
                <section class="g-card">
                    <div class="g-panel-title">Media <span class="g-meta">FIG 1 &middot; EO / VISIBLE</span></div>
                    <figure class="g-figure">
                        <i class="g-reticle tl"></i><i class="g-reticle tr"></i><i class="g-reticle bl"></i><i class="g-reticle br"></i>
                        <div class="g-detect">
                            <span class="g-detect-tag">VEHICLE ${confidence}</span>
                            <img src="${esc(v.image)}" alt="${esc(v.designation)} vehicle" decoding="async">
                        </div>
                        <figcaption><span>FIG 1 &mdash; ${esc(v.figure)}</span><span>${esc(v.docId)}</span></figcaption>
                    </figure>
                </section>
                <section class="g-card">
                    <div class="g-panel-title">Properties <span class="g-meta">5 fields</span></div>
                    <dl class="g-props">
                        <dt>Class</dt><dd>${esc(v.vehicleClass)}</dd>
                        <dt>Propulsion</dt><dd>${esc(v.propulsion)}</dd>
                        <dt>Recovery</dt><dd>${esc(v.recovery)}</dd>
                        <dt>Program start</dt><dd>${fmtDate(parseDate(v.start))}</dd>
                        <dt>Progress</dt><dd><span class="g-meter"><span class="g-meter-track"><span class="g-meter-fill" style="width: ${prog.pct}%"></span></span>${prog.done} / ${prog.total}</span></dd>
                    </dl>
                </section>
                ${renderFootage(v, ms)}
                <section class="g-card g-span2">
                    <div class="g-panel-title">Timeline <span class="g-meta">${fmtDate(parseDate(v.start))} &rarr; today</span></div>
                    <div class="g-timeline">
                        <div class="g-tl-wrap">
                            <div class="g-tl-plot" id="g-tl-plot"></div>
                            <div class="g-tl-tbd" id="g-tl-tbd"></div>
                        </div>
                        <div class="g-tooltip" id="g-tooltip" hidden></div>
                    </div>
                </section>
            </div>
        </div>`;

        main.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
        renderTimeline(v, ms);
    }

    // ---------- Flight footage gallery ----------
    // Grid of flight videos / photos from v.footage; until there are any, a "no signal" feed screen.
    const CAMERAS = ['CAM-01 · ONBOARD', 'CAM-02 · FIN', 'CAM-03 · GROUND'];

    function renderFootage(v, ms) {
        const items = v.footage || [];
        const title = `<div class="g-panel-title">Flight Footage <span class="g-meta">${items.length} asset${items.length === 1 ? '' : 's'}${items.length ? '' : ' · awaiting launch'}</span></div>`;
        if (items.length) {
            return `<section class="g-card g-span2 g-footage-card">${title}
                <div class="g-footage-grid">${items.map((f) => {
                    const media = f.type === 'video'
                        ? `<video src="${esc(f.src)}"${f.poster ? ` poster="${esc(f.poster)}"` : ''} controls preload="metadata" playsinline></video>`
                        : `<a href="${esc(f.src)}" target="_blank" rel="noopener"><img src="${esc(f.src)}" alt="${esc(f.caption || v.designation)}" loading="lazy" decoding="async"></a>`;
                    return `<figure class="g-shot">${media}<figcaption><span>${esc(f.caption || '')}</span><span>${f.date ? fmtDate(parseDate(f.date)) : ''}</span></figcaption></figure>`;
                }).join('')}</div>
            </section>`;
        }
        const launch = ms.find((m) => /launch/i.test(m.phase));
        const after = launch ? `${launch.id} ${esc(launch.phase).toUpperCase()}` : 'LAUNCH';
        return `<section class="g-card g-span2 g-footage-card">${title}
            <div class="g-nosignal" role="img" aria-label="Flight footage pending">
                <i class="g-reticle tl"></i><i class="g-reticle tr"></i><i class="g-reticle bl"></i><i class="g-reticle br"></i>
                <div class="g-nosignal-top">
                    <span class="g-nosignal-feed">FEED 0 / ${CAMERAS.length}</span>
                    <span class="g-nosignal-live"><i></i>NO SIGNAL</span>
                </div>
                <div class="g-nosignal-msg">
                    <strong>[ FLIGHT FOOTAGE PENDING ]</strong>
                    <span>onboard + ground video will populate after ${after}</span>
                </div>
                <div class="g-nosignal-cams">${CAMERAS.map((c) => `<span class="g-chip tone-muted">${c} · STBY</span>`).join('')}</div>
            </div>
        </section>`;
    }

    // ---------- Timeline ----------
    // Month axis from the program start to today; dated milestones as diamonds (stacked into lanes when close),
    // an undated active milestone sits on "today", pending ones are listed as unscheduled.
    let timelineState = null;

    function renderTimeline(v, ms) {
        const plot = document.getElementById('g-tl-plot');
        const tbd = document.getElementById('g-tl-tbd');
        const startD = new Date(parseDate(v.start));
        const domainStart = Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), 1);
        const lastDated = Math.max(...ms.filter((m) => m.date).map((m) => m.date), TODAY);
        const endD = new Date(lastDated);
        const domainEnd = Math.max(lastDated, Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), endD.getUTCDate() + 3));
        const pos = (t) => ((t - domainStart) / (domainEnd - domainStart)) * 100;

        let html = '<div class="g-tl-axis"></div>';
        // Month ticks (thin out on long ranges)
        const months = [];
        for (let d = new Date(domainStart); d.getTime() <= domainEnd; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.getTime());
        const every = Math.ceil(months.length / 10);
        months.forEach((t, i) => {
            html += `<div class="g-tl-grid" style="left:${pos(t)}%"></div>`;
            if (i % every === 0) {
                const d = new Date(t);
                const label = MONTHS[d.getUTCMonth()] + (d.getUTCMonth() === 0 || i === 0 ? ' ' + String(d.getUTCFullYear()).slice(-2) : '');
                html += `<div class="g-tl-tick" style="left:${pos(t)}%">${label}</div>`;
            }
        });
        html += `<div class="g-tl-today" style="left:${pos(TODAY)}%"><span>TODAY</span></div>`;

        const events = ms.filter((m) => m.date || m.status === 'active')
            .map((m) => ({ ...m, at: m.date || TODAY }))
            .sort((a, b) => a.at - b.at);
        events.forEach((m) => {
            const active = m.status === 'active';
            html += `<button type="button" class="g-tl-event tone-${STATUS_TONE[m.status]}${active ? ' is-active' : ''}" style="left:${pos(m.at)}%"
                data-id="${m.id}" data-phase="${esc(m.phase)}" data-when="${m.date ? fmtDate(m.date) : 'IN PROGRESS'}" data-status="${m.status}">
                <span class="lbl">${m.id}</span><span class="stem"></span><span class="pip"></span></button>`;
        });
        plot.innerHTML = html;

        const pending = ms.filter((m) => !m.date && m.status === 'pending');
        tbd.innerHTML = `<div class="g-tl-tbd-inner"><h4>UNSCHEDULED (${pending.length})</h4>` +
            (pending.length ? '<ul>' + pending.map((m) => `<li><span>${m.id}</span><span>${esc(m.phase)}</span></li>`).join('') + '</ul>' : '<span>none</span>') +
            '</div>';

        timelineState = { plot, events: Array.from(plot.querySelectorAll('.g-tl-event')) };
        layoutLanes();

        const tip = document.getElementById('g-tooltip');
        const show = (btn) => {
            const wrapRect = tip.parentElement.getBoundingClientRect();
            const r = btn.getBoundingClientRect();
            tip.innerHTML = `<div class="t-id">${btn.dataset.id} &middot; ${btn.dataset.when}</div><div>${btn.dataset.phase}</div>`;
            tip.style.left = Math.min(Math.max(r.left + r.width / 2 - wrapRect.left, 90), wrapRect.width - 90) + 'px';
            tip.style.top = (r.top - wrapRect.top) + 'px';
            tip.hidden = false;
        };
        const hide = () => { tip.hidden = true; };
        timelineState.events.forEach((btn) => {
            btn.addEventListener('mouseenter', () => show(btn));
            btn.addEventListener('focus', () => show(btn));
            btn.addEventListener('mouseleave', hide);
            btn.addEventListener('blur', hide);
        });
    }

    // Stack events whose labels would collide into higher lanes (depends on rendered width)
    function layoutLanes() {
        if (!timelineState) return;
        const width = timelineState.plot.clientWidth || 1;
        const minGap = (44 / width) * 100;
        const lanes = [];
        timelineState.events.forEach((btn) => {
            const left = parseFloat(btn.style.left);
            let lane = lanes.findIndex((last) => left - last >= minGap);
            if (lane === -1) lane = lanes.length < 4 ? lanes.length : lanes.indexOf(Math.min(...lanes));
            lanes[lane] = left;
            btn.style.bottom = '17px';
            btn.querySelector('.stem').style.height = (8 + lane * 22) + 'px';
        });
    }
    window.addEventListener('resize', layoutLanes);

    // ---------- Build milestones (side column) ----------
    // Compact list: status dot, ID, phase, and the date (or ACTIVE / PENDING while undated)
    function renderMilestones(v) {
        const prog = progressOf(v);
        els.msMeta.textContent = `${prog.done} / ${prog.total} complete`;
        els.milestones.innerHTML = milestonesOf(v).map((m) => {
            const tone = STATUS_TONE[m.status];
            const when = m.date ? fmtDate(m.date) : m.status.toUpperCase();
            return `<li class="g-ms is-${m.status}" title="${m.id} · ${esc(m.phase)} · ${esc(m.status)}">
                <i class="g-dot tone-${tone}"></i>
                <span class="g-ms-id">${m.id}</span>
                <span class="g-ms-phase">${esc(m.phase)}</span>
                <span class="g-ms-when tone-${tone}">${when}</span>
            </li>`;
        }).join('');
    }

    // ---------- Link analysis ----------
    function renderGraph(v, index) {
        const W = 300;
        const root = { x: 150, y: 118, r: 20, glyph: 'VEH', label: v.designation, type: 'VEHICLE', cls: 'root' };
        const program = { x: 150, y: 36, r: 14, glyph: 'PRG', label: PROGRAM.name, type: 'PROGRAM' };
        const nodes = [
            root,
            program,
            { x: 46, y: 104, r: 13, glyph: 'PER', label: PROGRAM.originator, type: 'PERSON', edge: 'built by' },
            { x: 58, y: 186, r: 13, glyph: 'MTR', label: v.propulsion, type: 'PROPULSION', edge: 'propelled by' },
            { x: 150, y: 200, r: 13, glyph: 'REC', label: v.recovery, type: 'RECOVERY', edge: 'recovers via' },
            { x: 244, y: 178, r: 13, glyph: 'LOC', label: 'TBD', type: 'LAUNCH SITE', edge: 'launches from', cls: 'pending' }
        ];
        const edges = [[root, program, 'member of'], ...nodes.slice(2).map((n) => [root, n, n.edge, n.cls === 'pending'])];

        // Other vehicles in the program hang off the program node; click to pivot to them
        const siblingSlots = [[254, 40], [46, 40], [254, 96], [46, 150]];
        VEHICLES.forEach((o, i) => {
            if (i === index) return;
            const slot = siblingSlots[nodes.filter((n) => n.cls === 'sibling').length];
            if (!slot) return;
            const n = { x: slot[0], y: slot[1], r: 12, glyph: 'VEH', label: o.designation, type: 'VEHICLE', cls: 'sibling', index: i };
            nodes.push(n);
            edges.push([program, n, 'member']);
        });

        let svg = '';
        edges.forEach(([a, b, label, dashed]) => {
            svg += `<line class="edge${dashed ? ' dashed' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"><title>${esc(label)}</title></line>`;
        });
        nodes.forEach((n) => {
            const attrs = n.cls === 'sibling' ? ` tabindex="0" role="button" aria-label="Open ${esc(n.label)}" data-index="${n.index}"` : '';
            svg += `<g class="node ${n.cls || ''}"${attrs}>
                <circle cx="${n.x}" cy="${n.y}" r="${n.r}"/>
                <text class="node-glyph" x="${n.x}" y="${n.y}">${n.glyph}</text>
                <text class="node-label" x="${n.x}" y="${n.y + n.r + 11}">${esc(n.label)}</text>
                <text class="node-type" x="${n.x}" y="${n.y + n.r + 20}">${n.type}</text>
            </g>`;
        });
        els.graph.setAttribute('viewBox', `0 0 ${W} 244`);
        els.graph.innerHTML = svg;
        els.graphMeta.textContent = `${nodes.length} nodes · ${edges.length} links`;
    }
    const pivot = (e) => {
        const g = e.target.closest('.node.sibling');
        if (!g) return;
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        select(+g.dataset.index);
    };
    els.graph.addEventListener('click', pivot);
    els.graph.addEventListener('keydown', pivot);

    // ---------- Activity feed ----------
    function renderActivity(v) {
        // `at` orders the feed (newest first); `when` is what's shown
        const items = [{ at: Infinity, when: 'NOW', tone: 'blue', html: 'You opened this object' }];
        milestonesOf(v).forEach((m) => {
            if (m.status === 'complete' && m.date) items.push({ at: m.date, when: fmtDate(m.date), tone: 'green', html: `<b>${m.id} ${esc(m.phase)}</b> marked complete` });
            if (m.status === 'active') items.push({ at: TODAY + 1, when: 'CURRENT', tone: 'orange', html: `<b>${m.id} ${esc(m.phase)}</b> in progress` });
        });
        // Creation sorts just before same-day milestones
        const start = parseDate(v.start);
        items.push({ at: start - 1, when: fmtDate(start), tone: 'muted', html: `Object <b>${esc(v.designation)}</b> created by ${esc(PROGRAM.originator)}` });
        items.sort((a, b) => b.at - a.at);
        els.activity.innerHTML = items.map((it) => `<li><i class="g-dot tone-${it.tone}"></i><div>
            <time>${it.when}</time>${it.html}</div></li>`).join('');
    }

    // ---------- Selection ----------
    function select(index, opts = {}) {
        if (index < 0 || index >= VEHICLES.length) return;
        const v = VEHICLES[index];
        const changed = index !== current;
        current = index;
        els.crumb.textContent = v.designation;
        renderExplorer();
        renderGraph(v, index);
        renderActivity(v);
        renderMilestones(v);
        if (!opts.fromHash) {
            const hash = index === 0 ? '' : '#' + v.key;
            if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
        }
        if (!changed && main.firstElementChild && main.firstElementChild.classList.contains('g-object')) return;
        if (reducedMotion || opts.instant) {
            renderObject(v, index);
            return;
        }
        main.classList.add('is-swapping');
        setTimeout(() => {
            renderObject(v, index);
            requestAnimationFrame(() => main.classList.remove('is-swapping'));
        }, 120);
    }
    function step(dir) { select(current + dir); }

    function indexFromHash() {
        const key = location.hash.slice(1).toLowerCase();
        const i = VEHICLES.findIndex((v) => v.key === key);
        return i === -1 ? 0 : i;
    }
    window.addEventListener('hashchange', () => select(indexFromHash(), { fromHash: true }));

    // ---------- Search + keyboard ----------
    els.search.addEventListener('input', renderExplorer);
    els.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = els.list.querySelector('.g-obj-btn');
            if (first) select(+first.dataset.index);
        } else if (e.key === 'Escape') {
            els.search.value = '';
            renderExplorer();
            els.search.blur();
        }
    });
    document.addEventListener('keydown', (e) => {
        const typing = e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"]');
        if (e.key === '/' && !typing) {
            e.preventDefault();
            els.search.focus();
        } else if (!typing && e.key === 'ArrowLeft') {
            step(-1);
        } else if (!typing && e.key === 'ArrowRight') {
            step(1);
        }
    });

    // ---------- Status bar ----------
    const totals = VEHICLES.reduce((acc, v) => { const p = progressOf(v); acc.done += p.done; acc.total += p.total; return acc; }, { done: 0, total: 0 });
    els.statusObjects.textContent = `${VEHICLES.length} OBJECTS · ${totals.done}/${totals.total} MILESTONES`;
    const tick = () => {
        const d = new Date();
        els.clock.textContent = 'SYNC ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick();
    setInterval(tick, 1000);

    select(indexFromHash(), { fromHash: true, instant: true });
})();
