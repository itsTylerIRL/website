// Gallery Effects - Cyberpunk Three.js enhancements
// Heavy effects: holographic cards, particle swarms, connection webs, glitch effects

(function() {
    console.log('[Gallery Effects] Initializing cyberpunk mode...');
    
    let galleryCanvas, galleryCtx;
    let galleryParticles = [];
    let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let hoveredCard = null;
    let glitchActive = false;
    let time = 0;
    
    function initEffects() {
        const cards = document.querySelectorAll('.pfp-card');
        console.log('[Gallery Effects] Found', cards.length, 'cards');
        
        if (cards.length === 0) {
            setTimeout(initEffects, 500);
            return;
        }
        
        // Add cyberpunk styles to cards
        cards.forEach((card, index) => {
            // Base transform setup
            card.style.transformStyle = 'preserve-3d';
            card.style.transition = 'none';
            card.style.position = 'relative';
            
            // Create holographic overlay
            const holoOverlay = document.createElement('div');
            holoOverlay.className = 'holo-overlay';
            holoOverlay.style.cssText = `
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                background: linear-gradient(
                    135deg,
                    transparent 0%,
                    rgba(139, 233, 253, 0.1) 25%,
                    rgba(255, 121, 198, 0.1) 50%,
                    rgba(189, 147, 249, 0.1) 75%,
                    transparent 100%
                );
                background-size: 200% 200%;
                animation: holoShift 2s ease infinite;
                mix-blend-mode: overlay;
                z-index: 2;
            `;
            card.appendChild(holoOverlay);
            
            // Create scanlines overlay
            const scanlines = document.createElement('div');
            scanlines.className = 'scanlines-overlay';
            scanlines.style.cssText = `
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0.4 !important;
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 0, 0, 0.12) 2px,
                    rgba(0, 0, 0, 0.12) 4px
                );
                z-index: 3;
                transition: none !important;
            `;
            card.appendChild(scanlines);
            
            // Create glow border
            const glowBorder = document.createElement('div');
            glowBorder.className = 'glow-border';
            glowBorder.style.cssText = `
                position: absolute;
                inset: -3px;
                border: 2px solid transparent;
                border-radius: inherit;
                pointer-events: none;
                opacity: 0;
                z-index: 1;
            `;
            card.appendChild(glowBorder);
            
            // Intense hover effects
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / centerY * -20;
                const rotateY = (x - centerX) / centerX * 20;
                const shine = ((x / rect.width) * 100);
                
                card.style.transform = `
                    perspective(800px) 
                    rotateX(${rotateX}deg) 
                    rotateY(${rotateY}deg) 
                    scale(1.1) 
                    translateZ(30px)
                `;
                
                // Dynamic glow based on position
                glowBorder.style.opacity = '1';
                glowBorder.style.boxShadow = `
                    0 0 20px rgba(139, 233, 253, 0.8),
                    0 0 40px rgba(139, 233, 253, 0.4),
                    0 0 60px rgba(139, 233, 253, 0.2),
                    inset 0 0 20px rgba(139, 233, 253, 0.1)
                `;
                glowBorder.style.borderColor = '#8be9fd';
                
                // Holographic shine position
                holoOverlay.style.opacity = '1';
                holoOverlay.style.backgroundPosition = `${shine}% ${(y / rect.height) * 100}%`;
                
                card.style.zIndex = '100';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1) translateZ(0)';
                card.style.zIndex = '';
                glowBorder.style.opacity = '0';
                holoOverlay.style.opacity = '0';
            });
            
            card.addEventListener('mouseenter', () => {
                hoveredCard = card;
                // Random glitch on enter
                if (Math.random() < 0.3) {
                    triggerGlitch(card);
                }
            });
            
            card.addEventListener('mouseleave', () => {
                hoveredCard = null;
            });
        });
        
        // Add keyframe animation for holographic effect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes holoShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            @keyframes glitchShake {
                0%, 100% { transform: translate(0); filter: none; }
                20% { transform: translate(-3px, 2px); filter: hue-rotate(90deg); }
                40% { transform: translate(3px, -2px); filter: hue-rotate(-90deg); }
                60% { transform: translate(-2px, -3px); filter: saturate(2); }
                80% { transform: translate(2px, 3px); filter: brightness(1.5); }
            }
            .pfp-card.glitching {
                animation: glitchShake 0.15s ease-in-out;
            }
            .pfp-card.glitching img,
            .pfp-card.glitching video {
                filter: saturate(1.5) contrast(1.2);
            }
            .scanlines-overlay {
                opacity: 0.4 !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('[Gallery Effects] Card effects enabled');
        initGalleryParticles(cards);
    }
    
    function triggerGlitch(card) {
        if (glitchActive) return;
        glitchActive = true;
        card.classList.add('glitching');
        setTimeout(() => {
            card.classList.remove('glitching');
            glitchActive = false;
        }, 150);
    }
    
    function initGalleryParticles(cards) {
        console.log('[Gallery Effects] Initializing particle system...');
        
        // Create canvas overlay
        galleryCanvas = document.createElement('canvas');
        galleryCanvas.id = 'gallery-effects-canvas';
        galleryCanvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2;
        `;
        document.body.appendChild(galleryCanvas);
        
        galleryCtx = galleryCanvas.getContext('2d');
        resizeCanvas();
        
        // Particles disabled - just using canvas for corner brackets
        // for (let i = 0; i < 80; i++) {
        //     galleryParticles.push({
        //         x: Math.random() * window.innerWidth,
        //         y: Math.random() * window.innerHeight,
        //         vx: (Math.random() - 0.5) * 0.8,
        //         vy: (Math.random() - 0.5) * 0.8,
        //         size: Math.random() * 3 + 1,
        //         alpha: Math.random() * 0.6 + 0.2,
        //         hue: Math.random() < 0.7 ? 189 : (Math.random() < 0.5 ? 326 : 265),
        //         pulseOffset: Math.random() * Math.PI * 2,
        //         trail: []
        //     });
        // }
        
        window.addEventListener('resize', resizeCanvas);
        document.addEventListener('mousemove', (e) => {
            mousePos.x = e.clientX;
            mousePos.y = e.clientY;
        });
        
        console.log('[Gallery Effects] Particles ready:', galleryParticles.length);
        animateGalleryParticles();
    }
    
    function resizeCanvas() {
        if (!galleryCanvas) return;
        galleryCanvas.width = window.innerWidth;
        galleryCanvas.height = window.innerHeight;
    }
    
    function animateGalleryParticles() {
        if (!galleryCtx) return;
        time += 0.016;
        
        // Clear canvas fully each frame
        galleryCtx.clearRect(0, 0, galleryCanvas.width, galleryCanvas.height);
        
        // Get hovered card center
        let cardCenter = null;
        if (hoveredCard) {
            const rect = hoveredCard.getBoundingClientRect();
            cardCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                radius: Math.max(rect.width, rect.height) / 2
            };
        }
        
        // Update and draw particles
        galleryParticles.forEach((p, i) => {
            // Store trail
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
            
            // Cursor attraction
            const dxMouse = mousePos.x - p.x;
            const dyMouse = mousePos.y - p.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            
            if (distMouse < 150) {
                const force = (150 - distMouse) / 150 * 0.03;
                p.vx += (dxMouse / distMouse) * force;
                p.vy += (dyMouse / distMouse) * force;
            }
            
            // Card attraction/orbit
            if (cardCenter) {
                const dx = cardCenter.x - p.x;
                const dy = cardCenter.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 250) {
                    // Spiral toward card
                    const angle = Math.atan2(dy, dx);
                    const orbitAngle = angle + Math.PI / 2 + (dist < 100 ? 0.1 : 0);
                    const force = (250 - dist) / 250 * 0.05;
                    
                    p.vx += Math.cos(orbitAngle) * force + (dx / dist) * force * 0.3;
                    p.vy += Math.sin(orbitAngle) * force + (dy / dist) * force * 0.3;
                }
            }
            
            // Gentle random drift
            p.vx += (Math.random() - 0.5) * 0.05;
            p.vy += (Math.random() - 0.5) * 0.05;
            
            // Damping
            p.vx *= 0.97;
            p.vy *= 0.97;
            
            // Velocity clamp
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 4) {
                p.vx = (p.vx / speed) * 4;
                p.vy = (p.vy / speed) * 4;
            }
            
            p.x += p.vx;
            p.y += p.vy;
            
            // Wrap
            if (p.x < -20) p.x = galleryCanvas.width + 20;
            if (p.x > galleryCanvas.width + 20) p.x = -20;
            if (p.y < -20) p.y = galleryCanvas.height + 20;
            if (p.y > galleryCanvas.height + 20) p.y = -20;
            
            // Pulsing alpha
            const pulse = Math.sin(time * 2 + p.pulseOffset) * 0.3 + 0.7;
            const currentAlpha = p.alpha * pulse;
            
            // Draw trail
            if (p.trail.length > 1) {
                galleryCtx.beginPath();
                galleryCtx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let j = 1; j < p.trail.length; j++) {
                    galleryCtx.lineTo(p.trail[j].x, p.trail[j].y);
                }
                galleryCtx.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${currentAlpha * 0.3})`;
                galleryCtx.lineWidth = p.size * 0.5;
                galleryCtx.stroke();
            }
            
            // Draw particle with glow
            galleryCtx.beginPath();
            galleryCtx.arc(p.x, p.y, p.size * (1 + pulse * 0.3), 0, Math.PI * 2);
            galleryCtx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${currentAlpha})`;
            galleryCtx.shadowColor = `hsla(${p.hue}, 100%, 60%, 0.8)`;
            galleryCtx.shadowBlur = 15;
            galleryCtx.fill();
            galleryCtx.shadowBlur = 0;
        });
        
        // Draw connection web between nearby particles
        galleryParticles.forEach((p1, i) => {
            for (let j = i + 1; j < galleryParticles.length; j++) {
                const p2 = galleryParticles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 100) {
                    const alpha = (1 - dist / 100) * 0.25;
                    galleryCtx.beginPath();
                    galleryCtx.moveTo(p1.x, p1.y);
                    galleryCtx.lineTo(p2.x, p2.y);
                    galleryCtx.strokeStyle = `rgba(139, 233, 253, ${alpha})`;
                    galleryCtx.lineWidth = 0.5;
                    galleryCtx.stroke();
                }
            }
        });
        
        // Draw connection lines from cursor
        galleryParticles.forEach(p => {
            const dx = mousePos.x - p.x;
            const dy = mousePos.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 180) {
                const alpha = (1 - dist / 180) * 0.4;
                const gradient = galleryCtx.createLinearGradient(mousePos.x, mousePos.y, p.x, p.y);
                gradient.addColorStop(0, `rgba(139, 233, 253, ${alpha})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 70%, ${alpha * 0.5})`);
                
                galleryCtx.beginPath();
                galleryCtx.moveTo(mousePos.x, mousePos.y);
                galleryCtx.lineTo(p.x, p.y);
                galleryCtx.strokeStyle = gradient;
                galleryCtx.lineWidth = 1;
                galleryCtx.stroke();
            }
        });
        
        // Draw cursor glow
        const cursorGlow = galleryCtx.createRadialGradient(
            mousePos.x, mousePos.y, 0,
            mousePos.x, mousePos.y, 60
        );
        cursorGlow.addColorStop(0, 'rgba(139, 233, 253, 0.3)');
        cursorGlow.addColorStop(0.5, 'rgba(139, 233, 253, 0.1)');
        cursorGlow.addColorStop(1, 'rgba(139, 233, 253, 0)');
        
        galleryCtx.beginPath();
        galleryCtx.arc(mousePos.x, mousePos.y, 60, 0, Math.PI * 2);
        galleryCtx.fillStyle = cursorGlow;
        galleryCtx.fill();
        
        // Hovered card corner brackets
        if (hoveredCard) {
            const rect = hoveredCard.getBoundingClientRect();
            
            // Corner brackets effect
            const corners = [
                { x: rect.left - 8, y: rect.top - 8, dx: 1, dy: 1 },
                { x: rect.right + 8, y: rect.top - 8, dx: -1, dy: 1 },
                { x: rect.left - 8, y: rect.bottom + 8, dx: 1, dy: -1 },
                { x: rect.right + 8, y: rect.bottom + 8, dx: -1, dy: -1 }
            ];
            
            const bracketLen = 20 + Math.sin(time * 4) * 3;
            corners.forEach(c => {
                galleryCtx.beginPath();
                galleryCtx.moveTo(c.x, c.y + c.dy * bracketLen);
                galleryCtx.lineTo(c.x, c.y);
                galleryCtx.lineTo(c.x + c.dx * bracketLen, c.y);
                galleryCtx.strokeStyle = 'rgba(139, 233, 253, 0.9)';
                galleryCtx.lineWidth = 2;
                galleryCtx.shadowColor = '#8be9fd';
                galleryCtx.shadowBlur = 10;
                galleryCtx.stroke();
                galleryCtx.shadowBlur = 0;
            });
        }
        
        requestAnimationFrame(animateGalleryParticles);
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEffects);
    } else {
        initEffects();
    }
})();
