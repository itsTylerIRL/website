/* Kingdom of Loathing at a glance, for the home page preview (no iframe): TylerIRL's player card, today's date, moons and stat day,
   a mall ticker, KoLmafia's latest release and commits, and the next holidays. The calendar is computed locally
   (js/kol-calendar.js); prices come from pricegun and KoLmafia from the GitHub API, both cached so flipping through
   objects doesn't refetch (GitHub allows a browser 60 calls an hour). The ticker and the commits show as many
   whole rows as the pane has room for. The full page (kol.html) has the display case and item of the day. */
(function () {
    'use strict';
    const IMG = 'https://images.kingdomofloathing.com/itemimages/';
    const MAFIA_REPO = 'kolmafia/kolmafia';
    const MAFIA_TTL = 10 * 60000;
    const PRICEGUN = 'https://pricegun.loathers.net/api/';
    const PRICES_TTL = 5 * 60000;
    // Long-running mall staples (the same list as kol.js's TICKER)
    const TICKER = [194, 10881, 9537, 8382, 3665, 4136];
    // KoL's own signature image, same card as kol.html's player feed; an hourly key keeps the stats current
    const PLAYER = 571951;
    const SIG = 'mode_bigsig/l1_created/l2_collection_8778/s1_ascensions/s2_num_all/s3_turnsplayed';
    const sigURL = () => `https://sigs.kingdomofloathing.com/player_${PLAYER}/${SIG}/playerfeed_${PLAYER}.gif?_=${Math.floor(Date.now() / 3600000)}`;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const decoder = document.createElement('textarea');
    const plain = s => { decoder.innerHTML = s; return decoder.value; };
    const pad = n => String(n).padStart(2, '0');
    const ago = iso => {
        const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
        return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
    };
    const meat = n => !Number.isFinite(n) ? '—' : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n));
    const num = v => Number(v?.__decimal__ ?? v);
    let mafia = null, mall = null;

    function today(t) {
        const moon = (who, m, file) => `<figure class="g-kol-moon">
                <img src="${IMG}${file}${m.phase + 1}.gif" alt="${esc(who)}: ${esc(m.name)}" class="g-kol-ink" width="48" height="48">
                <figcaption><b>${who}</b><span>${esc(m.name)}</span></figcaption></figure>`;
        return `<div class="g-kol-date">
                <div><b>${esc(t.monthName)} ${t.date}</b>
                    <span class="g-kol-holiday${t.holiday ? ' is-on' : ''}">${t.holiday ? esc(plain(t.holiday)) : 'no holiday today'}</span></div>
                <div class="g-kol-roll"><span>rollover in</span><b class="g-kol-rollover"></b><small>day ${t.day + 1}/96</small></div>
            </div>
            <div class="g-kol-moons">${moon('Ronald', t.ronald, 'moon')}${moon('Grimace', t.grimace, 'smoon')}</div>
            <p class="g-kol-stat">stat day <b class="${t.stat ? 'g-kol-stat-' + t.stat.toLowerCase() : ''}">${t.stat || 'none'}</b><span>${esc(t.statEffect)}</span></p>`;
    }
    // One line per holiday for the footer strip: name, then how far off
    const holidays = () => KOL.upcoming(Date.now(), 4).map(([name, days]) => `<li><i class="g-dot tone-${days <= 7 ? 'orange' : 'muted'}"></i>
            <b>${esc(plain(name))}</b><time>${days === 1 ? 'tomorrow' : `${days}d`}</time></li>`).join('');

    // Show as many whole rows of a fill list as its box holds (a list that isn't height-bound keeps them all)
    function fit(list) {
        const rows = [...list.children];
        rows.forEach(li => li.classList.remove('is-cut'));
        const room = list.clientHeight;
        rows.forEach(li => li.classList.toggle('is-cut', li.offsetTop + li.offsetHeight > room + 1));
    }

    function drawMall(box, rows) {
        box.innerHTML = `<ol class="g-kol-ticker g-kol-fill">${rows.map(r => {
            const last = r.sales?.[0];
            return `<li><a class="g-kol-tick" href="https://wiki.kingdomofloathing.com/${encodeURIComponent(plain(r.name).replace(/ /g, '_'))}" target="_blank" rel="noopener">
                <span class="g-kol-chip"><img src="${IMG}${esc(r.image)}" alt="" width="30" height="30" loading="lazy" decoding="async"></span>
                <span class="g-kol-tick-text"><b>${esc(plain(r.name))}</b><small>${last ? `last sale ${ago(last.date)}` : `${esc(r.volume)} sold`}</small></span>
                <span class="g-kol-price">${meat(num(r.value) >= 4294967295 ? NaN : num(r.value))}</span></a></li>`;
        }).join('')}</ol>`;
    }

    function drawMafia(box, { rel, commits }) {
        box.innerHTML = `<div class="g-kol-release"><div><b>${esc(rel.tag_name)}</b><span>released ${ago(rel.published_at)}</span></div>
                <a class="g-btn" href="${esc(rel.html_url)}" target="_blank" rel="noopener">NOTES &nearr;</a></div>
            <div class="g-kol-well"><ol class="g-activity g-kol-commits g-kol-fill">${commits.map(c => `<li><i class="g-dot tone-blue"></i><div>
                <time>${ago(c.commit.author.date)} · ${esc(c.author?.login || c.commit.author.name)}</time>
                <a href="${esc(c.html_url)}" target="_blank" rel="noopener">${esc(c.commit.message.split('\n')[0])}</a></div></li>`).join('')}</ol></div>`;
    }

    function render(screen, meta, pageURL) {
        let active = true;
        const controller = new AbortController();
        let t = KOL.today();
        screen.innerHTML = `<div class="g-kol-preview">
            <div class="g-kol-main">
                <a class="g-kol-sig" href="https://www.kingdomofloathing.com" target="_blank" rel="noopener">
                    <img src="${sigURL()}" alt="TylerIRL (#${PLAYER}): account age, collection, ascensions and turns played" width="500" height="100" decoding="async"></a>
                <section class="g-kol-today">${today(t)}</section>
                <section class="g-kol-mall">
                    <h3 class="g-kol-head">Mall ticker <span>pricegun</span></h3>
                    <div class="g-kol-well" aria-busy="true"><p class="g-kol-message">Reading the mall…</p></div>
                </section>
            </div>
            <section class="g-kol-side">
                <h3 class="g-kol-head">KoLmafia <span>GitHub</span></h3>
                <div class="g-kol-mafia" aria-busy="true"><p class="g-kol-message">Checking for new releases…</p></div>
            </section>
            <footer class="g-kol-foot">
                <div class="g-kol-foot-hol"><h3 class="g-kol-head">Upcoming holidays <span>KOL + IRL</span></h3>
                    <ol class="g-kol-holidays">${holidays()}</ol></div>
                <a class="g-btn g-visit g-kol-open" href="${esc(pageURL)}" title="Display case, mall ticker and item of the day">OPEN FULL PAGE &rarr;</a>
            </footer>
        </div>`;
        const sig = screen.querySelector('.g-kol-sig');
        sig.querySelector('img').addEventListener('load', () => sig.classList.add('ready'), { once: true });
        sig.querySelector('img').addEventListener('error', () => sig.remove(), { once: true });
        const todayBox = screen.querySelector('.g-kol-today');
        const mafiaBox = screen.querySelector('.g-kol-mafia');
        const mallBox = screen.querySelector('.g-kol-mall .g-kol-well');
        // Refit the fill lists whenever their boxes change size (window, layout, data arriving)
        const fitAll = () => {
            screen.querySelectorAll('.g-kol-fill').forEach(fit);
            const ticker = screen.querySelector('.g-kol-ticker');
            screen.querySelector('.g-kol-mall').classList.toggle('is-empty', !!ticker && !ticker.querySelector(':scope > :not(.is-cut)'));
        };
        const sizes = new ResizeObserver(fitAll);
        screen.querySelectorAll('.g-kol-mall, .g-kol-side').forEach(el => sizes.observe(el));
        meta.textContent = `${t.monthName.toUpperCase()} ${t.date} · DAY ${t.day + 1}/96`;

        // Rollover countdown; at rollover the day, moons and holidays move on
        function tick() {
            const left = t.nextRollover - Date.now();
            if (left <= 0) {
                t = KOL.today();
                todayBox.innerHTML = today(t);
                screen.querySelector('.g-kol-holidays').innerHTML = holidays();
                meta.textContent = `${t.monthName.toUpperCase()} ${t.date} · DAY ${t.day + 1}/96`;
                return tick();
            }
            const s = Math.floor(left / 1000);
            todayBox.querySelector('.g-kol-rollover').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
        }
        tick();
        const clock = setInterval(tick, 1000);

        const get = async url => {
            const r = await fetch(url, { signal: controller.signal, credentials: 'omit' });
            if (!r.ok) throw new Error(r.status);
            return r.json();
        };
        (async () => {
            try {
                if (!mall || Date.now() - mall.at >= PRICES_TTL) {
                    const rows = await get(PRICEGUN + TICKER.join(','));
                    mall = { rows: (Array.isArray(rows) ? rows : [rows]).filter(r => r?.name), at: Date.now() };
                }
                if (!active) return;
                if (!mall.rows.length) throw new Error('empty');
                drawMall(mallBox, mall.rows);
            } catch (_) {
                if (!active) return;
                mallBox.innerHTML = '<p class="g-kol-message">The mall feed is down. Prices come back on the next visit.</p>';
            }
            mallBox.setAttribute('aria-busy', 'false');
            fitAll();
        })();
        (async () => {
            try {
                if (!mafia || Date.now() - mafia.at >= MAFIA_TTL) {
                    const repo = `https://api.github.com/repos/${MAFIA_REPO}/`;
                    const [rel, commits] = await Promise.all([get(repo + 'releases/latest'), get(repo + 'commits?per_page=12')]);
                    mafia = { rel, commits, at: Date.now() };
                }
                if (active) drawMafia(mafiaBox, mafia);
            } catch (_) {
                if (!active) return;
                mafiaBox.innerHTML = `<p class="g-kol-message">GitHub isn’t answering right now. <a href="https://github.com/${MAFIA_REPO}/releases/latest" target="_blank" rel="noopener">Latest release &nearr;</a></p>`;
            }
            if (!active) return;
            mafiaBox.setAttribute('aria-busy', 'false');
            fitAll();
        })();

        return () => { active = false; controller.abort(); clearInterval(clock); sizes.disconnect(); };
    }
    if (typeof KOL !== 'undefined') window.KolPreview = { render };
})();
