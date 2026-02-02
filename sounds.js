/**
 * Site-wide Sound Effects
 * Cyberpunk hover/click sounds for tylerirl.com
 */
(function() {
    // Sound effect configuration
    const sounds = {
        hover: new Audio('assets/sfx/hover_soft.wav'),
        click: new Audio('assets/sfx/click_confirm.wav')
    };
    
    // Preload and configure sounds
    Object.values(sounds).forEach(sound => {
        sound.preload = 'auto';
        sound.volume = 0.3;
    });
    
    // Throttle hover sounds to prevent spam
    let lastHoverTime = 0;
    const hoverThrottle = 100; // ms between hover sounds
    
    // Play sound helper
    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {}); // Ignore autoplay errors
    }
    
    // Add hover sounds to interactive elements
    function addHoverSound(element) {
        element.addEventListener('mouseenter', () => {
            const now = Date.now();
            if (now - lastHoverTime > hoverThrottle) {
                playSound(sounds.hover);
                lastHoverTime = now;
            }
        });
    }
    
    // Add click sounds to interactive elements
    function addClickSound(element) {
        element.addEventListener('click', (e) => {
            playSound(sounds.click);
            
            // For links, delay navigation slightly to let sound play
            if (element.tagName === 'A' && element.href) {
                e.preventDefault();
                const href = element.href;
                const target = element.target;
                setTimeout(() => {
                    if (target === '_blank') {
                        window.open(href, '_blank');
                    } else {
                        window.location.href = href;
                    }
                }, 80); // Short delay for sound
            }
        });
    }
    
    // Auto-attach sounds to common interactive elements
    function initSounds() {
        // Bento items
        document.querySelectorAll('.bento-item').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Contact icons
        document.querySelectorAll('.contact-icon-link').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Links with nft-link class
        document.querySelectorAll('.nft-link').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Timeline items
        document.querySelectorAll('.timeline-item').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Floating home button
        document.querySelectorAll('.floating-home').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Generic buttons
        document.querySelectorAll('button:not(#scanlineToggle)').forEach(el => {
            addHoverSound(el);
            addClickSound(el);
        });
        
        // Sliders - lighter sound on input
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', () => {
                const now = Date.now();
                if (now - lastHoverTime > 50) {
                    sounds.hover.currentTime = 0;
                    sounds.hover.volume = 0.15;
                    sounds.hover.play().catch(() => {});
                    lastHoverTime = now;
                }
            });
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSounds);
    } else {
        initSounds();
    }
    
    // Expose API for other scripts
    window.SoundFX = {
        play: playSound,
        sounds: sounds,
        addHover: addHoverSound,
        addClick: addClickSound,
        init: initSounds
    };
})();
