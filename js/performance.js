// Performance optimization module - lazy loading for gallery images
// Author: Tyler (in real life)

document.addEventListener('DOMContentLoaded', function() {
    // Lazy loading for PFP images using Intersection Observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // Load the image
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    
                    // Add fade-in animation
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.3s ease';
                    
                    img.onload = function() {
                        this.style.opacity = '1';
                    };
                    
                    // Stop observing this image
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px 0px', // Start loading 50px before the image is visible
        threshold: 0.1
    });

    // Convert all PFP images to lazy loading (except visible ones)
    const pfpImages = document.querySelectorAll('.pfp-card img');
    pfpImages.forEach((img, index) => {
        // Keep first 6 images (2 rows) loaded immediately for better UX
        if (index >= 6) {
            img.dataset.src = img.src; // Store original src
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExMTExIi8+PC9zdmc+'; // Placeholder
            img.classList.add('lazy');
            imageObserver.observe(img);
        } else {
            img.classList.add('loaded'); // Mark as loaded
        }
    });
});