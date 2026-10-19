// Interactions module - handles drag-and-drop, sound effects, and hover interactions
// Author: Tyler (in real life)

document.addEventListener('DOMContentLoaded', function() {
    // Corner brackets click/hold interaction
    const cornerBrackets = document.querySelector('.corner-brackets');
    if (cornerBrackets) {
        document.addEventListener('mousedown', function() {
            cornerBrackets.classList.add('active');
        });
        
        document.addEventListener('mouseup', function() {
            cornerBrackets.classList.remove('active');
        });
        
        // Also handle touch events for mobile
        document.addEventListener('touchstart', function() {
            cornerBrackets.classList.add('active');
        }, { passive: true });
        
        document.addEventListener('touchend', function() {
            cornerBrackets.classList.remove('active');
        }, { passive: true });
    }

    const pfpGrid = document.querySelector('.pfp-grid');
    const pfpCards = document.querySelectorAll('.pfp-card');
    let draggedElement = null;
    let draggedOverElement = null;

    // Sound effects for drag and drop
    const soundEffects = [
        '/assets/sfx/alien-computer-program-blip-03.mp3',
        '/assets/sfx/button-press-synthetic-short-hi-tech-button-beep-zvinbergsa.mp3',
        '/assets/sfx/hi-tech-beepsbuzz-com.mp3',
        '/assets/sfx/killswitch.mp3',
        '/assets/sfx/multimedia-page-turn-blip-beep-high-tech-02.mp3',
        '/assets/sfx/poe-laugh.mp3',
        '/assets/sfx/sound-design-multimedia-accent-error-message-negative-chime-beep-high-tech.mp3',
        '/assets/sfx/tech-rollover-5.mp3',
        '/assets/sfx/the-undertaker-bell-meme-sound-effect-soundboard-link.mp3'
    ];

    // Hover sound effect for PFPs - DISABLED (now using sounds.js)
    // const hoverSound = new Audio('/assets/sfx/high-tech-interface-sounds-lv-htis-beeps-simple-03.mp3');
    // hoverSound.volume = 0.3;
    // let isPlayingHoverSound = false;
    let isPlayingHoverSound = false; // Keep for drag/drop compatibility

    // Function to play hover sound - DISABLED (now using sounds.js)
    function playHoverSound() {
        // Old sounds disabled - using sounds.js instead
        return;
        /*
        if (!isPlayingHoverSound) {
            isPlayingHoverSound = true;
            hoverSound.currentTime = 0; // Reset to start
            hoverSound.play().then(() => {
                // Reset flag when sound finishes or fails
                setTimeout(() => {
                    isPlayingHoverSound = false;
                }, 200); // Prevent too rapid firing
            }).catch(e => {
                console.log('Hover audio play failed:', e);
                isPlayingHoverSound = false;
            });
        }
        */
    }

    // Function to play random sound effect
    function playRandomSFX() {
        const randomIndex = Math.floor(Math.random() * soundEffects.length);
        const audio = new Audio(soundEffects[randomIndex]);
        audio.volume = 0.3; // Set volume to 30% to not be too loud
        audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // Add draggable attribute and event listeners to each PFP card
    pfpCards.forEach(card => {
        card.draggable = true;
        card.style.transition = 'transform 0.2s ease, border 0.2s ease';

        // Add hover sound effect
        card.addEventListener('mouseenter', function() {
            playHoverSound();
        });

        // Drag start
        card.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            this.style.transform = 'scale(0.95)';
            e.dataTransfer.effectAllowed = 'move';
        });

        // Drag end
        card.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            
            // Remove all drag indicators
            pfpCards.forEach(c => {
                c.classList.remove('drag-over');
                c.style.transform = 'scale(1)';
            });
            
            draggedElement = null;
            draggedOverElement = null;
        });

        // Drag over
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this !== draggedElement) {
                draggedOverElement = this;
                this.style.transform = 'scale(1.05)';
                this.classList.add('drag-over');
            }
        });

        // Drag leave
        card.addEventListener('dragleave', function(e) {
            this.style.transform = 'scale(1)';
            this.classList.remove('drag-over');
        });

        // Drop
        card.addEventListener('drop', function(e) {
            e.preventDefault();
            
            if (this !== draggedElement && draggedElement) {
                // Swap the elements in the DOM
                const draggedParent = draggedElement.parentNode;
                const draggedSibling = draggedElement.nextSibling === this ? draggedElement : draggedElement.nextSibling;
                
                // Insert dragged element before the drop target
                this.parentNode.insertBefore(draggedElement, this);
                
                // Insert drop target where dragged element was
                draggedParent.insertBefore(this, draggedSibling);
                
                // Play random sound effect
                playRandomSFX();
                
                // Add a subtle animation to indicate the swap
                draggedElement.style.animation = 'pfpSwap 0.3s ease';
                this.style.animation = 'pfpSwap 0.3s ease';
                
                setTimeout(() => {
                    draggedElement.style.animation = '';
                    this.style.animation = '';
                }, 300);
            }
            
            this.style.transform = 'scale(1)';
            this.classList.remove('drag-over');
        });
    });

    // Add CSS for drag states and animations
    const dragStyles = document.createElement('style');
    dragStyles.textContent = `
        .pfp-card.drag-over {
            border-color: #8be9fd !important;
            box-shadow: 0 0 15px rgba(139, 233, 253, 0.3) !important;
        }
        
        .pfp-card[draggable="true"] {
            cursor: grab;
        }
        
        .pfp-card[draggable="true"]:active {
            cursor: grabbing;
        }
        
        @keyframes pfpSwap {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .pfp-card:hover {
            transform: translateY(-2px) !important;
        }
        
        .pfp-grid {
            user-select: none;
        }
    `;
    document.head.appendChild(dragStyles);

    // Skill Cards Drag and Drop Functionality
    const skillsGrid = document.querySelector('.skills-grid');
    const skillCards = document.querySelectorAll('.skill-card');
    let draggedSkillElement = null;
    let draggedOverSkillElement = null;

    // Add draggable attribute and event listeners to each skill card
    skillCards.forEach(card => {
        card.draggable = true;
        card.style.transition = 'transform 0.2s ease, border 0.2s ease';

        // Add hover sound effect
        card.addEventListener('mouseenter', function() {
            playHoverSound();
        });

        // Drag start
        card.addEventListener('dragstart', function(e) {
            draggedSkillElement = this;
            this.style.opacity = '0.5';
            this.style.transform = 'scale(0.95)';
            e.dataTransfer.effectAllowed = 'move';
        });

        // Drag end
        card.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            
            // Remove all drag indicators
            skillCards.forEach(c => {
                c.classList.remove('drag-over');
                c.style.transform = 'scale(1)';
            });
            
            draggedSkillElement = null;
            draggedOverSkillElement = null;
        });

        // Drag over
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this !== draggedSkillElement) {
                draggedOverSkillElement = this;
                this.style.transform = 'scale(1.05)';
                this.classList.add('drag-over');
            }
        });

        // Drag leave
        card.addEventListener('dragleave', function(e) {
            this.style.transform = 'scale(1)';
            this.classList.remove('drag-over');
        });

        // Drop
        card.addEventListener('drop', function(e) {
            e.preventDefault();
            
            if (this !== draggedSkillElement && draggedSkillElement) {
                // Swap the elements in the DOM
                const draggedParent = draggedSkillElement.parentNode;
                const draggedSibling = draggedSkillElement.nextSibling === this ? draggedSkillElement : draggedSkillElement.nextSibling;
                
                // Insert dragged element before the drop target
                this.parentNode.insertBefore(draggedSkillElement, this);
                
                // Insert drop target where dragged element was
                draggedParent.insertBefore(this, draggedSibling);
                
                // Play random sound effect
                playRandomSFX();
                
                // Add a subtle animation to indicate the swap
                draggedSkillElement.style.animation = 'pfpSwap 0.3s ease';
                this.style.animation = 'pfpSwap 0.3s ease';
                
                setTimeout(() => {
                    draggedSkillElement.style.animation = '';
                    this.style.animation = '';
                }, 300);
            }
            
            this.style.transform = 'scale(1)';
            this.classList.remove('drag-over');
        });
    });

    // Add CSS for skill card drag states (reuse existing pfpSwap animation)
    const skillDragStyles = document.createElement('style');
    skillDragStyles.textContent = `
        .skill-card.drag-over {
            border-color: #8be9fd !important;
            box-shadow: 0 0 15px rgba(139, 233, 253, 0.3) !important;
        }
        
        .skill-card[draggable="true"] {
            cursor: none !important;
        }
        
        .skill-card[draggable="true"]:active {
            cursor: none !important;
        }
        
        .skill-card:hover {
            transform: translateY(-2px) !important;
        }
        
        .skills-grid {
            user-select: none;
        }
    `;
    document.head.appendChild(skillDragStyles);

    // Bento Items Hover Sound Effects - DISABLED (now using sounds.js)
    // const bentoItems = document.querySelectorAll('.bento-item');
    // bentoItems.forEach(item => {
    //     item.addEventListener('mouseenter', function() {
    //         playHoverSound();
    //     });
    // });

    // Custom Cursor - desktop (fine pointer) only
    // Performance notes: position is a compositor-only translate3d snapped to device pixels (crisp,
    // no layout); hover is detected on pointerover with a per-element cache instead of hit-testing
    // every mousemove; the rAF loop runs only while the cursor is catching up, with frame-rate
    // independent easing so it feels the same at 60Hz and 144Hz.
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || !window.matchMedia('(pointer: fine)').matches;
    if (isMobile) return;

    // Reuse cursor markup a page already has (grep.html ships one), otherwise build it
    let cursor = document.querySelector('.custom-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
            const bracket = document.createElement('div');
            bracket.className = `cursor-bracket ${pos}`;
            cursor.appendChild(bracket);
        });
        ['horizontal', 'vertical'].forEach((dir) => {
            const line = document.createElement('div');
            line.className = `cursor-line ${dir}`;
            cursor.appendChild(line);
        });
        document.body.appendChild(cursor);
    }
    cursor.style.opacity = '0'; // hidden until the first pointer move places it

    const INTERACTIVE = 'a, button, img, label, select, summary, [role="button"], [onclick], [draggable="true"], ' +
        '.pfp-card, .filter-btn, .project-link, .contact-link, .social-icon, .kol-badge, ' +
        '[style*="cursor: pointer"], [style*="cursor:pointer"]';
    const interactiveCache = new WeakMap();
    const isInteractive = (el) => {
        if (!(el instanceof Element)) return false;
        let hit = interactiveCache.get(el);
        if (hit === undefined) {
            hit = !!el.closest(INTERACTIVE);
            interactiveCache.set(el, hit);
        }
        return hit;
    };

    const SMOOTHING_MS = 40; // time constant of the follow easing; lower = snappier
    let targetX = 0, targetY = 0, x = 0, y = 0;
    let placed = false, raf = 0, last = 0;
    let isHoveringInteractive = false;
    let isMouseDown = false;

    function render() {
        const dpr = window.devicePixelRatio || 1;
        // Snap to the device pixel grid so the glow never resamples between pixels
        const sx = Math.round(x * dpr) / dpr, sy = Math.round(y * dpr) / dpr;
        cursor.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    }
    function tick(now) {
        const dt = last ? Math.min(now - last, 100) : 16;
        last = now;
        const k = 1 - Math.exp(-dt / SMOOTHING_MS);
        x += (targetX - x) * k;
        y += (targetY - y) * k;
        if (Math.abs(targetX - x) < 0.1 && Math.abs(targetY - y) < 0.1) {
            x = targetX; y = targetY;
            render();
            raf = 0; last = 0; // settled: stop until the pointer moves again
            return;
        }
        render();
        raf = requestAnimationFrame(tick);
    }

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        targetX = e.clientX;
        targetY = e.clientY;
        if (!placed) { // first move: appear at the pointer instead of flying in from the corner
            placed = true;
            x = targetX; y = targetY;
            render();
            cursor.style.opacity = '1';
        }
        if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    function setHover(on) {
        isHoveringInteractive = on;
        if (on) cursor.classList.add('hover');
        else if (!cursor.classList.contains('clicked')) cursor.classList.remove('hover');
    }
    document.addEventListener('pointerover', (e) => setHover(isInteractive(e.target)), { passive: true });

    function releaseClick() {
        cursor.classList.remove('clicked');
        if (!isHoveringInteractive) cursor.classList.remove('hover');
    }

    // Click animation - lock-on effect
    document.addEventListener('mousedown', () => {
        isMouseDown = true;
        cursor.classList.add('clicked', 'hover');
    });
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        // Small delay so drag operations complete first
        setTimeout(() => { if (!isMouseDown) releaseClick(); }, 50);
    });
    document.addEventListener('dragend', () => {
        isMouseDown = false;
        releaseClick();
    });

    // Hide when the pointer leaves the window, show again on return
    document.documentElement.addEventListener('mouseleave', () => {
        isMouseDown = false;
        cursor.classList.remove('clicked', 'hover');
        cursor.style.opacity = '0';
    });
    document.documentElement.addEventListener('mouseenter', () => {
        if (placed) cursor.style.opacity = '1';
    });

    // Add hover sound effects to navigation cards on index page
    const navCards = document.querySelectorAll('.nav-card');
    // Nav cards and contact icons hover sounds - DISABLED (now using sounds.js)
    // console.log('Found nav cards:', navCards.length);
    // navCards.forEach(card => {
    //     card.addEventListener('mouseenter', function() {
    //         console.log('Nav card hover detected');
    //         playHoverSound();
    //     });
    // });

    // // Add hover sound effects to contact icons on index page
    // const contactIcons = document.querySelectorAll('.contact-icon-link');
    // console.log('Found contact icons:', contactIcons.length);
    // contactIcons.forEach(icon => {
    //     icon.addEventListener('mouseenter', function() {
    //         console.log('Contact icon hover detected');
    //         playHoverSound();
    //     });
    // });
});