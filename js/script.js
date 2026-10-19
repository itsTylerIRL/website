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

// Market data for markets.html lives in js/markets.js

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

// Gallery popup + filters live in js/gallery.js

// Radbro - Dynamic Mouse Reactive Display
(function() {
    const radbroImg = document.getElementById('radbroImage');
    
    if (!radbroImg) return;
    
    // Radbro image states
    const radbros = {
        lookLeft: '/assets/radbros/LOOK_L.png',
        lookLeftHappy: '/assets/radbros/LOOK_L_HAPPY.png',
        lookRight: '/assets/radbros/LOOK_R.png',
        lookRightHappy: '/assets/radbros/LOOK_R_HAPPY.png',
        happy: '/assets/radbros/HAPPY.png',
        grateful: '/assets/radbros/GRATEFUL.png',
        intense: '/assets/radbros/INTENSE.png',
        lonely: '/assets/radbros/LONELY.png',
        sad: '/assets/radbros/SAD.png',
        sleep: '/assets/radbros/SLEEP.png',
        sleep2: '/assets/radbros/SLEEP2.png',
        cool: '/assets/radbros/COOL.png',
        smart: '/assets/radbros/SMART.png',
        upload: '/assets/radbros/UPLOAD.png',
        excited: '/assets/radbros/EXCITED.png'
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
        const galleryTile = e.target.closest('a[href="/pages/gallery.html"]');
        const likesTile = e.target.closest('a[href="/pages/likes.html"]');
        const marketsTile = e.target.closest('a[href="/pages/markets.html"]');
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

// Page transitions fallback: browsers with cross-document view transitions animate navigations
// from CSS alone (@view-transition in css/styles.css). Elsewhere, fade the page out on internal
// link clicks, then fade the next page in.
(function() {
    if ('CSSViewTransitionRule' in window) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    if (!reduced) {
        root.classList.add('tirl-entering');
        setTimeout(() => root.classList.remove('tirl-entering'), 400);
    }
    // Back/forward cache restores the page as it was left: clear the fade-out
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) root.classList.remove('tirl-leaving');
    });
    document.addEventListener('click', (e) => {
        if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target instanceof Element && e.target.closest('a[href]');
        if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return; // same page / hash link
        e.preventDefault();
        root.classList.add('tirl-leaving');
        setTimeout(() => { location.href = url.href; }, 180);
    });
})();
