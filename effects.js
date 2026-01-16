// Effects module - handles scanline animations and visual effects
// Author: Tyler (in real life)

// Add animated scanline effect
function createScanline() {
    const scanline = document.createElement('div');
    scanline.className = 'scanline';
    document.body.appendChild(scanline);
    
    // Create popup scanline
    const popupScanline = document.createElement('div');
    popupScanline.className = 'scanline-popup';
    
    // Add scanline to popup when it opens/closes
    const popup = document.getElementById('pfpPopup');
    if (popup) {
        popup.querySelector('.pfp-popup-content').appendChild(popupScanline);
    }

    const scanlineStyles = document.createElement('style');
    scanlineStyles.textContent = `
        .scanline {
            position: fixed;
            top: -2px;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(139, 233, 253, 0.3) 20%, 
                rgba(139, 233, 253, 0.8) 50%, 
                rgba(139, 233, 253, 0.3) 80%, 
                transparent 100%);
            box-shadow: 
                0 0 10px rgba(139, 233, 253, 0.5),
                0 0 20px rgba(139, 233, 253, 0.3),
                0 0 30px rgba(139, 233, 253, 0.1);
            animation: scanline-move 4s linear infinite;
            z-index: 9999;
            pointer-events: none;
        }
        
        /* Hide scanline on body when popup is active */
        .pfp-popup.active ~ .scanline {
            display: none;
        }
        
        /* Scanline for popup only */
        .scanline-popup {
            position: absolute;
            top: -2px;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(139, 233, 253, 0.3) 20%, 
                rgba(139, 233, 253, 0.8) 50%, 
                rgba(139, 233, 253, 0.3) 80%, 
                transparent 100%);
            box-shadow: 
                0 0 10px rgba(139, 233, 253, 0.5),
                0 0 20px rgba(139, 233, 253, 0.3),
                0 0 30px rgba(139, 233, 253, 0.1);
            animation: scanline-move-popup 4s linear infinite;
            z-index: 10001;
            pointer-events: none;
            display: none;
        }

        @keyframes scanline-move {
            0% {
                top: -2px;
                opacity: 0;
            }
            5% {
                opacity: 1;
            }
            95% {
                opacity: 1;
            }
            100% {
                top: 100vh;
                opacity: 0;
            }
        }
        
        @keyframes scanline-move-popup {
            0% {
                top: -2px;
                opacity: 0;
            }
            5% {
                opacity: 1;
            }
            95% {
                opacity: 1;
            }
            100% {
                top: 100%;
                opacity: 0;
            }
        }

        /* Add subtle screen flicker effect */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(139, 233, 253, 0.008) 2px,
                rgba(139, 233, 253, 0.008) 4px
            );
            z-index: 9998;
            pointer-events: none;
            animation: flicker 0.15s infinite linear alternate;
        }

        @keyframes flicker {
            0% { opacity: 1; }
            100% { opacity: 0.98; }
        }

        /* Scanline border reaction effects */
        .scanline-hit {
            border-color: #8be9fd !important;
            box-shadow: 
                0 0 10px rgba(139, 233, 253, 0.4),
                0 0 20px rgba(139, 233, 253, 0.2),
                inset 0 0 10px rgba(139, 233, 253, 0.1) !important;
            transition: all 0.1s ease-out !important;
        }

        .scanline-linger {
            border-color: rgba(139, 233, 253, 0.6) !important;
            box-shadow: 
                0 0 5px rgba(139, 233, 253, 0.3),
                0 0 10px rgba(139, 233, 253, 0.1) !important;
            transition: all 0.8s ease-out !important;
        }
        
        /* Hide scanline effects when disabled */
        body.scanline-disabled::before {
            display: none !important;
        }
    `;
    document.head.appendChild(scanlineStyles);

    // Add scanline border interaction
    function addScanlineInteraction() {
        const elements = document.querySelectorAll('.skill-card, .nft-card, .card-container, .nav-card, .contact-card, .bento-item');
        
        function updateScanlineEffects() {
            const scanline = document.querySelector('.scanline');
            if (!scanline) return;
            
            const scanlineRect = scanline.getBoundingClientRect();
            const scanlineY = scanlineRect.top + (scanlineRect.height / 2);
            
            elements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top;
                const elementBottom = rect.bottom;
                const elementCenter = elementTop + (rect.height / 2);
                
                // Check if scanline is passing through element
                if (scanlineY >= elementTop && scanlineY <= elementBottom) {
                    element.classList.add('scanline-hit');
                    element.classList.remove('scanline-linger');
                } 
                // Check if scanline just passed (within linger range)
                else if (scanlineY > elementBottom && scanlineY < elementBottom + 100) {
                    element.classList.remove('scanline-hit');
                    element.classList.add('scanline-linger');
                }
                // Reset if scanline is far away
                else if (scanlineY < elementTop - 50 || scanlineY > elementBottom + 150) {
                    element.classList.remove('scanline-hit', 'scanline-linger');
                }
            });
        }
        
        // Update effects on animation frame for smooth performance
        function animateScanlineEffects() {
            updateScanlineEffects();
            requestAnimationFrame(animateScanlineEffects);
        }
        
        animateScanlineEffects();
    }

    // Start scanline interaction after a brief delay
    setTimeout(addScanlineInteraction, 100);
}

// Initialize scanline effect when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    createScanline();
    
    // Scanline toggle button functionality
    const toggleBtn = document.getElementById('scanlineToggle');
    if (toggleBtn) {
        let scanlineEnabled = true;
        toggleBtn.addEventListener('click', function() {
            scanlineEnabled = !scanlineEnabled;
            const scanline = document.querySelector('.scanline');
            const bodyBefore = document.body;
            
            if (scanlineEnabled) {
                if (scanline) scanline.style.display = '';
                bodyBefore.classList.remove('scanline-disabled');
            } else {
                if (scanline) scanline.style.display = 'none';
                bodyBefore.classList.add('scanline-disabled');
            }
        });
    }
});