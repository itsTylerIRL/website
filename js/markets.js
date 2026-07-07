/* Page scripts for markets.html (extracted from inline <script> blocks, in original order) */
document.addEventListener('DOMContentLoaded', function() {
    const bentoItems = document.querySelectorAll('.market-bento');
    
    bentoItems.forEach(item => {
        item.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
});
