/* Page scripts for deepdish.html (extracted from inline <script> blocks, in original order) */
(function() {
    const cards = document.querySelectorAll('.deepdish-card:not(.coming-soon)');
    
    cards.forEach(card => {
        const glow = document.createElement('div');
        glow.className = 'tilt-glow';
        card.appendChild(glow);
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;
            
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.03)`;
            
            const glowX = (x / rect.width) * 100;
            const glowY = (y / rect.height) * 100;
            glow.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(139, 233, 253, 0.12) 0%, transparent 60%)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            glow.style.background = 'transparent';
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'all 0.1s ease-out';
        });
    });
})();
