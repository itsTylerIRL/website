// Bracket Content Containment - constrain page content within corner brackets
// Background particles (canvas) and corner brackets remain fullscreen
window.initBracketContainment = function() {
    const mainContent = document.querySelector('.main-content');
    const cornerBrackets = document.querySelector('.corner-brackets');
    if (!mainContent || !cornerBrackets) return;

    // Don't double-initialize
    if (document.querySelector('.bracket-content-area')) return;

    // Lock body/html scrolling
    document.documentElement.classList.add('bracket-contained');
    document.body.classList.add('bracket-contained');

    // Create scroll wrapper positioned inside the corner brackets
    const wrapper = document.createElement('div');
    wrapper.className = 'bracket-content-area';

    // Insert wrapper before main content
    mainContent.parentNode.insertBefore(wrapper, mainContent);

    // Move main content into wrapper
    wrapper.appendChild(mainContent);

    // Move footer into wrapper if present
    const footer = document.querySelector('body > footer');
    if (footer) wrapper.appendChild(footer);

    // Move floating-home button outside content area so it's not clipped by overflow
    const floatingHome = wrapper.querySelector('.floating-home');
    if (floatingHome) {
        document.body.appendChild(floatingHome);
    }

    // Expose for scroll tracking (used by background3d.js)
    window.bracketContentArea = wrapper;

    // Forward scroll position so background parallax still works
    wrapper.addEventListener('scroll', function() {
        window._contentScrollY = wrapper.scrollTop;
        window.dispatchEvent(new Event('scroll'));
    });
};

// Initialize bracket containment immediately
window.initBracketContainment();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// NFT pricing data fetcher
function formatUSD(amount) {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
    } else {
        return amount.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            maximumFractionDigits: 0 
        });
    }
}

// Collections shown on the markets page. prefix maps to element ids:
// {prefix}-floor, {prefix}-volume, {prefix}-owners, {prefix}-avg, {prefix}-change, {prefix}-spark
const NFT_COLLECTIONS = [
    { slug: 'milady', prefix: 'milady' },
    { slug: 'remilio-babies', prefix: 'remilio' },
    { slug: 'schizoposters', prefix: 'schizo' },
    { slug: 'radbro-webring', prefix: 'radbro' },
    { slug: 'milady-fumo-baby-404', prefix: 'fumo' }
];

function setMarketText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatEth(v) {
    return `${v.toFixed(v < 0.1 ? 3 : 2)} ETH`;
}

// Tiny SVG sparkline of avg sale price: 30d -> 7d -> 24h -> current floor
function renderMarketSparkline(prefix, points) {
    const host = document.getElementById(prefix + '-spark');
    if (!host) return;
    const pts = points.filter(p => typeof p === 'number' && isFinite(p) && p > 0);
    if (pts.length < 2) { host.innerHTML = ''; return; }

    const w = 100, h = 28, pad = 3;
    const min = Math.min(...pts), max = Math.max(...pts);
    const span = (max - min) || 1;
    const step = (w - pad * 2) / (pts.length - 1);
    const coords = pts.map((p, i) => [
        pad + i * step,
        h - pad - ((p - min) / span) * (h - pad * 2)
    ]);
    const line = coords.map(c => c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
    const rising = pts[pts.length - 1] >= pts[0];
    const color = rising ? '#50fa7b' : '#ff5555';
    const area = 'M' + coords[0][0].toFixed(1) + ',' + (h - pad) +
        ' L' + coords.map(c => c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' L') +
        ' L' + coords[coords.length - 1][0].toFixed(1) + ',' + (h - pad) + ' Z';
    const last = coords[coords.length - 1];

    host.innerHTML =
        '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="' + area + '" fill="' + color + '" opacity="0.08"></path>' +
        '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>' +
        '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2" fill="' + color + '"></circle>' +
        '</svg>';
    host.classList.add('has-data');
}

function updateMarketCard(prefix, stats, ethPriceUSD) {
    const total = stats.total || {};
    const intervals = {};
    (stats.intervals || []).forEach(i => { intervals[i.interval] = i; });
    const d1 = intervals.one_day || {};
    const d7 = intervals.seven_day || {};
    const d30 = intervals.thirty_day || {};

    // Floor price
    const floor = total.floor_price || 0;
    const floorUSD = (floor * ethPriceUSD).toLocaleString('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0
    });
    setMarketText(prefix + '-floor', `${formatEth(floor)} (${floorUSD})`);

    // 24h volume + sales count
    const vol1d = d1.volume || 0;
    const sales1d = d1.sales || 0;
    setMarketText(prefix + '-volume', `${vol1d.toFixed(1)} ETH · ${sales1d} sale${sales1d === 1 ? '' : 's'}`);

    // Unique owners
    if (total.num_owners) {
        setMarketText(prefix + '-owners', total.num_owners.toLocaleString('en-US'));
    }

    // 24h average sale price
    const avg1d = d1.average_price || 0;
    if (avg1d) {
        setMarketText(prefix + '-avg', formatEth(avg1d));
    }

    // Price change badge: 24h avg sale price vs 7d avg
    const changeEl = document.getElementById(prefix + '-change');
    if (changeEl && avg1d && d7.average_price) {
        const pct = ((avg1d - d7.average_price) / d7.average_price) * 100;
        const up = pct >= 0;
        changeEl.textContent = `${up ? '\u25b2' : '\u25bc'} ${Math.abs(pct).toFixed(1)}%`;
        changeEl.classList.remove('up', 'down');
        changeEl.classList.add(up ? 'up' : 'down');
        changeEl.title = '24h avg sale price vs 7d avg';
    }

    // Price history sparkline: 30d avg -> 7d avg -> 24h avg -> current floor
    renderMarketSparkline(prefix, [d30.average_price, d7.average_price, avg1d, floor]);
}

function markMarketCardOffline(prefix) {
    ['-floor', '-volume', '-owners', '-avg'].forEach(suffix => {
        const el = document.getElementById(prefix + suffix);
        if (el && el.textContent === 'Loading...') el.textContent = '\u2014';
    });
}

async function fetchNFTData() {
    // Only relevant on the markets page
    if (!document.getElementById('milady-floor')) return;

    const apiKey = '5a79fc7192de4ababec6b822f0ca4635';
    const headers = {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
    };

    // Get current ETH price in USD first
    let ethPriceUSD = 2500; // fallback price
    try {
        const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        if (ethResponse.ok) {
            const ethData = await ethResponse.json();
            ethPriceUSD = ethData.ethereum.usd;
        }
    } catch (e) {
        console.log('Using fallback ETH price');
    }

    // Fetch all collections in parallel; one failure doesn't break the rest
    const results = await Promise.allSettled(NFT_COLLECTIONS.map(async c => {
        const res = await fetch(`https://api.opensea.io/api/v2/collections/${c.slug}/stats`, { headers });
        if (!res.ok) throw new Error(`${c.slug}: HTTP ${res.status}`);
        return res.json();
    }));

    results.forEach((result, i) => {
        const prefix = NFT_COLLECTIONS[i].prefix;
        if (result.status === 'fulfilled') {
            try {
                updateMarketCard(prefix, result.value, ethPriceUSD);
            } catch (e) {
                console.error('Error rendering ' + prefix + ':', e);
                markMarketCardOffline(prefix);
            }
        } else {
            console.error('Error fetching ' + prefix + ':', result.reason);
            markMarketCardOffline(prefix);
        }
    });

    // "last updated" stamp in the section header
    const updated = document.getElementById('markets-updated');
    if (updated) {
        const t = new Date().toLocaleTimeString('en-US', { hour12: false });
        updated.textContent = `feed synced ${t}`;
    }
}

// Load NFT data when page loads + wire up the range toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('market-range-toggle');
    if (toggle) {
        toggle.addEventListener('click', e => {
            const btn = e.target.closest('.range-btn');
            if (btn && btn.dataset.range) applyMarketRange(btn.dataset.range);
        });
        applyMarketRange(marketRange); // restore persisted range (labels + active button)
    }
    fetchNFTData();
});

// Refresh data every 5 minutes
setInterval(fetchNFTData, 5 * 60 * 1000);

// Profile picture click functionality
document.addEventListener('DOMContentLoaded', function() {
    const profilePics = document.querySelectorAll('.profile-pic');
    const enlargedContainer = document.getElementById('enlargedContainer');
    let currentEnlarged = null;
    
    profilePics.forEach(pic => {
        pic.addEventListener('click', function() {
            const imgSrc = this.querySelector('img').src;
            const imgAlt = this.querySelector('img').alt;
            const name = this.dataset.name;
            const artist = this.dataset.artist;
            const twitter = this.dataset.twitter;
            const description = this.dataset.description;
            
            // If clicking the same picture that's already enlarged, remove it
            if (currentEnlarged === this) {
                enlargedContainer.classList.remove('active');
                enlargedContainer.innerHTML = '';
                currentEnlarged = null;
                return;
            }
            
            // Create enlarged picture with info
            enlargedContainer.innerHTML = `
                <div class="profile-pic enlarged">
                    <img src="${imgSrc}" alt="${imgAlt}">
                </div>
                <div class="enlarged-pic-info">
                    <h4>${name}</h4>
                    <p><strong>artist:</strong> <a href="https://x.com/${twitter}" target="_blank">${artist}</a></p>
                    <p><strong>info:</strong> ${description}</p>
                </div>
            `;
            
            // Show the enlarged container
            enlargedContainer.classList.add('active');
            currentEnlarged = this;
        });
    });
});

// PFP Card Popup Functionality
document.addEventListener('DOMContentLoaded', function() {
    const pfpCards = document.querySelectorAll('.pfp-card');
    const popup = document.getElementById('pfpPopup');
    
    pfpCards.forEach(card => {
        card.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            const artist = this.getAttribute('data-artist');
            const description = this.getAttribute('data-description');
            const opensea = this.getAttribute('data-opensea');
            const etherscan = this.getAttribute('data-etherscan');
            
            // Check if it's a video or image
            const mediaElement = this.querySelector('img, video');
            const isVideo = mediaElement.tagName.toLowerCase() === 'video';
            const mediaSrc = isVideo ? mediaElement.src : mediaElement.src;
            
            // Update popup content - show appropriate element
            const popupImage = document.getElementById('popupImage');
            const popupVideo = document.getElementById('popupVideo');
            
            if (isVideo) {
                popupVideo.src = mediaSrc;
                popupVideo.style.display = 'block';
                popupImage.style.display = 'none';
            } else {
                popupImage.src = mediaSrc;
                popupImage.style.display = 'block';
                popupVideo.style.display = 'none';
            }
            document.getElementById('popupName').textContent = name;
            document.getElementById('popupArtist').textContent = `by ${artist}`;
            document.getElementById('popupDescription').textContent = description;
            
            // Update icon links
            const openseaLink = document.getElementById('openseaLink');
            const etherscanLink = document.getElementById('etherscanLink');
            
            if (opensea) {
                openseaLink.href = opensea;
                openseaLink.style.display = 'inline-flex';
            } else {
                openseaLink.style.display = 'none';
            }
            
            if (etherscan) {
                etherscanLink.href = etherscan;
                etherscanLink.style.display = 'inline-flex';
            } else {
                etherscanLink.style.display = 'none';
            }
            
            // Show popup
            popup.classList.add('active');
            
            // Show popup scanline and hide main scanline
            const popupScanline = popup.querySelector('.scanline-popup');
            const mainScanline = document.querySelector('.scanline');
            if (popupScanline) {
                popupScanline.style.display = 'block';
            }
            if (mainScanline) {
                mainScanline.style.display = 'none';
            }
            
            // Hide floating home button
            const floatingHome = document.querySelector('.floating-home');
            if (floatingHome) {
                floatingHome.style.display = 'none';
            }
        });
    });
    
    // Close popup when clicking outside content
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closePfpPopup();
        }
    });
    
    // Close with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePfpPopup();
        }
    });
});

function closePfpPopup() {
    const popup = document.getElementById('pfpPopup');
    popup.classList.remove('active');
    
    // Hide popup scanline and show main scanline
    const popupScanline = popup.querySelector('.scanline-popup');
    const mainScanline = document.querySelector('.scanline');
    if (popupScanline) {
        popupScanline.style.display = 'none';
    }
    if (mainScanline) {
        mainScanline.style.display = 'block';
    }
    
    // Show floating home button again
    const floatingHome = document.querySelector('.floating-home');
    if (floatingHome) {
        floatingHome.style.display = 'block';
    }
}

// PFP Filter Functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const pfpCards = document.querySelectorAll('.pfp-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterCategory = this.getAttribute('data-filter');
            
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter PFP cards
            pfpCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (filterCategory === 'tyler' && cardCategory === 'tyler') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else if (filterCategory === 'schizo' && cardCategory === 'schizo') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else if (filterCategory === 'remilia' && cardCategory === 'remilia') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Handle remilia filter - show message if no images available
            if (filterCategory === 'remilia') {
                const pfpGrid = document.querySelector('.pfp-grid');
                const remiliaCards = document.querySelectorAll('.pfp-card[data-category="remilia"]');
                
                if (remiliaCards.length === 0) {
                    // Create temporary message if not exists
                    let messageCard = document.querySelector('.remilia-message');
                    if (!messageCard) {
                        messageCard = document.createElement('div');
                        messageCard.className = 'remilia-message';
                        messageCard.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 2rem; color: #00ff41; font-family: "Courier New", monospace;';
                        messageCard.innerHTML = '<p>Remilia PFPs coming soon...</p>';
                        pfpGrid.appendChild(messageCard);
                    }
                    messageCard.style.display = 'block';
                } else {
                    // Hide message if remilia cards exist
                    const messageCard = document.querySelector('.remilia-message');
                    if (messageCard) {
                        messageCard.style.display = 'none';
                    }
                }
            } else {
                // Hide message for other filters
                const messageCard = document.querySelector('.remilia-message');
                if (messageCard) {
                    messageCard.style.display = 'none';
                }
            }
        });
    });
});

// Radbro - Dynamic Mouse Reactive Display
(function() {
    const radbroImg = document.getElementById('radbroImage');
    
    if (!radbroImg) return;
    
    // Radbro image states
    const radbros = {
        lookLeft: 'assets/radbros/LOOK_L.png',
        lookLeftHappy: 'assets/radbros/LOOK_L_HAPPY.png',
        lookRight: 'assets/radbros/LOOK_R.png',
        lookRightHappy: 'assets/radbros/LOOK_R_HAPPY.png',
        happy: 'assets/radbros/HAPPY.png',
        grateful: 'assets/radbros/GRATEFUL.png',
        intense: 'assets/radbros/INTENSE.png',
        lonely: 'assets/radbros/LONELY.png',
        sad: 'assets/radbros/SAD.png',
        sleep: 'assets/radbros/SLEEP.png',
        sleep2: 'assets/radbros/SLEEP2.png',
        cool: 'assets/radbros/COOL.png',
        smart: 'assets/radbros/SMART.png',
        upload: 'assets/radbros/UPLOAD.png',
        excited: 'assets/radbros/EXCITED.png'
    };
    
    // Preload all images
    Object.values(radbros).forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    let lastMouseMove = Date.now();
    let currentState = 'happy';
    let isIdle = false;
    let sleepToggle = false;
    let idleTimeout = null;
    let sleepInterval = null;
    
    // Random mood states for variety
    const happyMoods = ['happy', 'grateful', 'intense'];
    
    function setRadbro(state) {
        if (currentState === state) return;
        currentState = state;
        radbroImg.src = radbros[state];
    }
    
    function getRandomHappyMood() {
        return happyMoods[Math.floor(Math.random() * happyMoods.length)];
    }
    
    function startSleeping() {
        isIdle = true;
        setRadbro('sleep');
        // Alternate between sleep frames
        sleepInterval = setInterval(() => {
            sleepToggle = !sleepToggle;
            setRadbro(sleepToggle ? 'sleep2' : 'sleep');
        }, 1500);
    }
    
    function wakeUp() {
        isIdle = false;
        if (sleepInterval) {
            clearInterval(sleepInterval);
            sleepInterval = null;
        }
    }
    
    function resetIdleTimer() {
        if (idleTimeout) clearTimeout(idleTimeout);
        if (isIdle) wakeUp();
        
        // Go to sleep after 5 seconds of no mouse movement
        idleTimeout = setTimeout(() => {
            startSleeping();
        }, 5000);
    }
    
    // Mouse position tracking
    document.addEventListener('mousemove', (e) => {
        lastMouseMove = Date.now();
        resetIdleTimer();
        
        if (isIdle) return;
        
        const windowWidth = window.innerWidth;
        const mouseX = e.clientX;
        const relativeX = mouseX / windowWidth; // 0 to 1
        
        // Check for specific hover targets
        const kolBadge = e.target.closest('a[href*="kingdomofloathing"]');
        const urbitTile = e.target.closest('a[href*="nosfyl"], a[href*="urbit.tylerirl"]');
        const guestBook = e.target.closest('a[href*="guest-book"]');
        const galleryTile = e.target.closest('a[href="gallery.html"]');
        const likesTile = e.target.closest('a[href="likes.html"]');
        const marketsTile = e.target.closest('a[href="markets.html"]');
        const isHovering = e.target.closest('a, button, .bento-item, .contact-icon-link');
        
        // Priority hover reactions
        if (kolBadge) {
            setRadbro('cool');
            return;
        }
        if (urbitTile || guestBook) {
            setRadbro('smart');
            return;
        }
        if (galleryTile) {
            setRadbro('excited');
            return;
        }
        if (likesTile) {
            setRadbro('grateful');
            return;
        }
        if (marketsTile) {
            setRadbro('upload');
            return;
        }
        
        if (relativeX < 0.33) {
            // Mouse on left side - look left
            setRadbro(isHovering ? 'lookLeftHappy' : 'lookLeft');
        } else if (relativeX > 0.66) {
            // Mouse on right side - look right
            setRadbro(isHovering ? 'lookRightHappy' : 'lookRight');
        } else {
            // Mouse in center - look forward with mood
            if (isHovering) {
                setRadbro('happy');
            } else {
                // Occasionally show different moods
                if (Math.random() < 0.02) {
                    setRadbro(getRandomHappyMood());
                }
            }
        }
    });
    
    // React to clicks
    document.addEventListener('click', () => {
        if (isIdle) {
            wakeUp();
            setRadbro('intense');
            setTimeout(() => {
                if (!isIdle) setRadbro('happy');
            }, 500);
        } else {
            // Brief intense reaction
            const prevState = currentState;
            setRadbro('intense');
            setTimeout(() => {
                if (!isIdle && currentState === 'intense') {
                    setRadbro(prevState.includes('look') ? prevState : 'happy');
                }
            }, 300);
        }
        resetIdleTimer();
    });
    
    // Start idle timer
    resetIdleTimer();
})();

// CEG Filler Dynamic Visibility
(function() {
    const cegContainer = document.getElementById('cegFiller');
    const MIN_HEIGHT = 50; // Minimum height in pixels to show the filler
    
    if (!cegContainer) return;
    
    function checkVisibility() {
        const containerHeight = cegContainer.offsetHeight;
        if (containerHeight < MIN_HEIGHT) {
            cegContainer.classList.add('hidden');
        } else {
            cegContainer.classList.remove('hidden');
        }
    }
    
    window.addEventListener('load', checkVisibility);
    window.addEventListener('resize', checkVisibility);
    setTimeout(checkVisibility, 100);
})();

// Footer particle count slider (shared across pages; extracted from inline <script> blocks)
// - drag / value change: sets particle count
// - clean tap on the thumb (no drag, no value change): toggles all animations on/off
(function() {
    const slider = document.getElementById('particleSlider');

    function setAnimationsPaused(paused) {
        document.body.classList.toggle('animations-paused', paused);
        // Manual pause flag for the 3D background loop (independent of tab visibility)
        window._bgManualPause = paused;
        if (slider) {
            slider.title = paused ? 'animations paused — tap thumb to resume' : 'particle count — tap thumb to pause animations';
        }
        try { localStorage.setItem('animationsPaused', paused ? '1' : '0'); } catch (e) { /* ignore */ }
    }

    // Restore persisted pause state (carries across pages / refreshes),
    // even on pages that don't have the slider.
    let savedPaused = false;
    try { savedPaused = localStorage.getItem('animationsPaused') === '1'; } catch (e) { /* ignore */ }
    setAnimationsPaused(savedPaused);

    if (!slider) return;
    slider.addEventListener('input', function(e) {
        const count = parseInt(e.target.value);
        if (window.setParticleCount) {
            window.setParticleCount(count);
        }
    });

    // Tap-without-drag detection
    let downX = 0, downY = 0, downValue = null, moved = false;
    const DRAG_THRESHOLD = 4; // px

    function toggleAnimations() {
        setAnimationsPaused(!document.body.classList.contains('animations-paused'));
    }

    slider.addEventListener('pointerdown', function(e) {
        downX = e.clientX;
        downY = e.clientY;
        downValue = slider.value;
        moved = false;
    });
    slider.addEventListener('pointermove', function(e) {
        if (downValue !== null &&
            (Math.abs(e.clientX - downX) > DRAG_THRESHOLD || Math.abs(e.clientY - downY) > DRAG_THRESHOLD)) {
            moved = true;
        }
    });
    slider.addEventListener('pointerup', function() {
        // A "clean tap": pointer didn't travel and the value didn't jump
        // (clicking elsewhere on the track changes the value = intent to set count)
        const isTap = !moved && slider.value === downValue;
        downValue = null;
        if (isTap) toggleAnimations();
    });
    slider.addEventListener('pointercancel', function() {
        downValue = null;
        moved = false;
    });
})();
