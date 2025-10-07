// Interactions module - handles drag-and-drop, sound effects, and hover interactions
// Author: Tyler (in real life)

document.addEventListener('DOMContentLoaded', function() {
    const pfpGrid = document.querySelector('.pfp-grid');
    const pfpCards = document.querySelectorAll('.pfp-card');
    let draggedElement = null;
    let draggedOverElement = null;

    // Sound effects for drag and drop
    const soundEffects = [
        'assets/sfx/alien-computer-program-blip-03.mp3',
        'assets/sfx/button-press-synthetic-short-hi-tech-button-beep-zvinbergsa.mp3',
        'assets/sfx/hi-tech-beepsbuzz-com.mp3',
        'assets/sfx/killswitch.mp3',
        'assets/sfx/multimedia-page-turn-blip-beep-high-tech-02.mp3',
        'assets/sfx/poe-laugh.mp3',
        'assets/sfx/sound-design-multimedia-accent-error-message-negative-chime-beep-high-tech.mp3',
        'assets/sfx/tech-rollover-5.mp3',
        'assets/sfx/the-undertaker-bell-meme-sound-effect-soundboard-link.mp3'
    ];

    // Hover sound effect for PFPs
    const hoverSound = new Audio('assets/sfx/high-tech-interface-sounds-lv-htis-beeps-simple-03.mp3');
    hoverSound.volume = 0.3;
    let isPlayingHoverSound = false;

    // Function to play hover sound
    function playHoverSound() {
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
});