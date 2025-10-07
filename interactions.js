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

    // Custom Cursor Implementation
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    let isHoveringInteractive = false;
    let isMouseDown = false;
    let isDragging = false;

    // Update mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Detect if we're dragging (mouse down + movement)
        if (isMouseDown) {
            isDragging = true;
        }
        
        // Check if hovering over interactive elements
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        isHoveringInteractive = elementUnderCursor && (
            elementUnderCursor.tagName === 'A' ||
            elementUnderCursor.tagName === 'BUTTON' ||
            elementUnderCursor.classList.contains('pfp-card') ||
            elementUnderCursor.classList.contains('filter-btn') ||
            elementUnderCursor.classList.contains('project-link') ||
            elementUnderCursor.classList.contains('contact-link') ||
            elementUnderCursor.style.cursor === 'pointer' ||
            window.getComputedStyle(elementUnderCursor).cursor === 'pointer'
        );
        
        // Always maintain hover state when over interactive elements
        if (isHoveringInteractive) {
            cursor.classList.add('hover');
        } else if (!cursor.classList.contains('clicked')) {
            cursor.classList.remove('hover');
        }
    });

    // Smooth cursor animation
    function updateCursor() {
        // Add smooth easing to cursor movement
        const ease = 0.15;
        cursorX += (mouseX - cursorX) * ease;
        cursorY += (mouseY - cursorY) * ease;
        
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        
        requestAnimationFrame(updateCursor);
    }

    updateCursor();

    // Function to snap rotations to cardinal directions with animation
    function snapToCardinalDirections() {
        // Calculate elapsed time to determine current rotation angles
        const now = Date.now();
        const rotationDuration = 2000; // 2 seconds per full rotation
        
        // Calculate current angles based on animation timing
        const outerAngle = ((now / rotationDuration) * 360) % 360;
        const innerAngle = 360 - ((now / rotationDuration) * 360) % 360; // Counter-clockwise
        
        // Find nearest 45° increment for outer square (corners facing NSEW)
        let outerTargetAngle;
        const outerRemainder = outerAngle % 90;
        if (outerRemainder <= 45) {
            outerTargetAngle = Math.floor(outerAngle / 90) * 90 + 45;
        } else {
            outerTargetAngle = (Math.floor(outerAngle / 90) + 1) * 90 + 45;
        }
        
        // Normalize to 0-360 range
        outerTargetAngle = ((outerTargetAngle % 360) + 360) % 360;
        
        // Find nearest 45° increment for inner square
        let innerTargetAngle;
        const innerRemainder = innerAngle % 90;
        if (innerRemainder <= 45) {
            innerTargetAngle = Math.floor(innerAngle / 90) * 90 + 45;
        } else {
            innerTargetAngle = (Math.floor(innerAngle / 90) + 1) * 90 + 45;
        }
        
        // Normalize to 0-360 range
        innerTargetAngle = ((innerTargetAngle % 360) + 360) % 360;
        
        // Set current positions as animation start points
        cursor.style.setProperty('--current-rotation-outer', `${outerAngle}deg`);
        cursor.style.setProperty('--current-rotation-inner', `${innerAngle}deg`);
        
        // Set target positions for animation end points
        cursor.style.setProperty('--frozen-rotation-outer', `${outerTargetAngle}deg`);
        cursor.style.setProperty('--frozen-rotation-inner', `${innerTargetAngle}deg`);
    }

    // Click animation - snap to cardinal directions and maintain size
    document.addEventListener('mousedown', () => {
        isMouseDown = true;
        isDragging = false; // Reset dragging state
        cursor.classList.add('clicked');
        cursor.classList.add('hover'); // Keep enlarged when clicked
        snapToCardinalDirections();
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        
        // Only remove clicked state if we're not in the middle of a drag operation
        // or if the drag has completed
        setTimeout(() => {
            // Small delay to ensure drag operations complete first
            if (!isMouseDown) {
                cursor.classList.remove('clicked');
                cursor.style.removeProperty('--frozen-rotation-outer');
                cursor.style.removeProperty('--frozen-rotation-inner');
                
                // Only remove hover if not actually hovering over interactive element
                if (!isHoveringInteractive) {
                    cursor.classList.remove('hover');
                }
            }
            isDragging = false; // Reset dragging state
        }, 50); // 50ms delay to handle drag completion
    });

    // Handle drag end events specifically
    document.addEventListener('dragend', () => {
        isMouseDown = false;
        isDragging = false;
        cursor.classList.remove('clicked');
        cursor.style.removeProperty('--frozen-rotation-outer');
        cursor.style.removeProperty('--frozen-rotation-inner');
        
        // Only remove hover if not actually hovering over interactive element
        if (!isHoveringInteractive) {
            cursor.classList.remove('hover');
        }
    });

    // Also handle mouse leave during click/drag
    document.addEventListener('mouseleave', () => {
        isMouseDown = false;
        isDragging = false;
        cursor.classList.remove('clicked');
        cursor.classList.remove('hover');
        cursor.style.removeProperty('--frozen-rotation-outer');
        cursor.style.removeProperty('--frozen-rotation-inner');
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
    });
});