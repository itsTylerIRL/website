/* Page scripts for likes.html (extracted from inline <script> blocks, in original order) */
document.addEventListener('DOMContentLoaded', function() {
    const bentoGrid = document.getElementById('bentoGrid');
    const bentoItems = Array.from(document.querySelectorAll('.bento-item'));
    const filterPills = document.querySelectorAll('.filter-pill');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const showMoreBtn = document.getElementById('showMoreBtn');
    const visibleCountEl = document.getElementById('visibleCount');
    const totalCountEl = document.getElementById('totalCount');
    
    let currentFilter = 'all';
    let isExpanded = false;
    const INITIAL_SHOW = 12;
    
    // Assign random float animations
    bentoItems.forEach((item, index) => {
        item.style.setProperty('--float-duration', (3 + Math.random() * 2) + 's');
        item.style.setProperty('--float-delay', (Math.random() * 2) + 's');
    });
    
    // ===== SPOTLIGHT CAROUSEL =====
    const spotlightMain = document.getElementById('spotlightMain');
    let spotlightItems = [];
    let currentSpotlight = 0;
    let spotlightInterval;
    
    function initSpotlight() {
        // Get featured items for spotlight (randomly select 5)
        const allItems = bentoItems.filter(item => {
            const cat = item.dataset.category;
            return currentFilter === 'all' || cat === currentFilter;
        });
        
        spotlightItems = [...allItems].sort(() => Math.random() - 0.5).slice(0, 5);
        
        // Build spotlight HTML
        spotlightMain.innerHTML = spotlightItems.map((item, idx) => {
            const img = item.querySelector('.bento-image img');
            const title = item.querySelector('.bento-content h3');
            const desc = item.querySelector('.bento-content p');
            const category = item.dataset.category;
            const href = item.href || '#';
            const imgStyle = img ? img.getAttribute('style') || '' : '';
            
            return `
                <a href="${href}" target="${item.target || '_self'}" class="spotlight-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <div class="spotlight-image">
                        <img src="${img ? img.src : ''}" alt="${title ? title.textContent : ''}" style="${imgStyle}">
                    </div>
                    <div class="spotlight-info">
                        <div class="spotlight-category">${category}</div>
                        <div class="spotlight-title">${title ? title.textContent : ''}</div>
                        <div class="spotlight-desc">${desc ? desc.textContent : ''}</div>
                    </div>
                </a>
            `;
        }).join('');
        
        // Auto-rotate spotlight
        startSpotlightRotation();
    }
    
    function navigateSpotlight(dir) {
        currentSpotlight = (currentSpotlight + dir + spotlightItems.length) % spotlightItems.length;
        updateSpotlight();
        resetSpotlightRotation();
    }
    
    function updateSpotlight() {
        document.querySelectorAll('.spotlight-item').forEach((item, idx) => {
            item.classList.remove('active', 'prev', 'next');
            if (idx === currentSpotlight) item.classList.add('active');
            else if (idx === (currentSpotlight - 1 + spotlightItems.length) % spotlightItems.length) item.classList.add('prev');
            else if (idx === (currentSpotlight + 1) % spotlightItems.length) item.classList.add('next');
        });
        
        document.querySelectorAll('.spotlight-preview').forEach((preview, idx) => {
            preview.classList.toggle('active', idx === currentSpotlight);
        });
    }
    
    let isHoveringCloudIcon = false;
    let savedSpotlightHTML = '';
    
    // Expose to window for cross-script access
    window.isHoveringCloudIcon = false;
    
    function startSpotlightRotation() {
        spotlightInterval = setInterval(() => {
            if (!window.isHoveringCloudIcon) {
                navigateSpotlight(1);
            }
        }, 5000);
    }
    
    function resetSpotlightRotation() {
        clearInterval(spotlightInterval);
        startSpotlightRotation();
    }
    
    window.showIconInSpotlight = function(icon) {
        if (!savedSpotlightHTML) {
            savedSpotlightHTML = spotlightMain.innerHTML;
        }
        window.isHoveringCloudIcon = true;
        
        spotlightMain.innerHTML = `
            <a href="${icon.href}" target="${icon.target}" class="spotlight-item active" data-index="0">
                <div class="spotlight-image">
                    <img src="${icon.src}" alt="${icon.title}" style="${icon.imgStyle || ''}">
                </div>
                <div class="spotlight-info">
                    <div class="spotlight-category">${icon.category}</div>
                    <div class="spotlight-title">${icon.title}</div>
                    <div class="spotlight-desc">${icon.desc}</div>
                </div>
            </a>
        `;
    };
    
    window.restoreSpotlight = function() {
        if (savedSpotlightHTML) {
            spotlightMain.innerHTML = savedSpotlightHTML;
            savedSpotlightHTML = '';
            updateSpotlight();
        }
        window.isHoveringCloudIcon = false;
    };
    
    // ===== FILTERING =====
    function filterItems(filter) {
        currentFilter = filter;
        let visibleItems = [];
        let hiddenItems = [];
        
        bentoItems.forEach(item => {
            const category = item.dataset.category;
            if (filter === 'all' || category === filter) {
                visibleItems.push(item);
            } else {
                hiddenItems.push(item);
            }
        });
        
        // Hide items not matching filter
        hiddenItems.forEach(item => {
            item.classList.remove('visible');
            item.classList.add('hidden');
        });
        
        // Show matching items with staggered animation
        const itemsToShow = isExpanded ? visibleItems : visibleItems.slice(0, INITIAL_SHOW);
        const itemsToHide = isExpanded ? [] : visibleItems.slice(INITIAL_SHOW);
        
        itemsToShow.forEach((item, idx) => {
            item.classList.remove('hidden');
            item.classList.add('visible');
            item.style.animationDelay = (idx * 0.03) + 's';
        });
        
        itemsToHide.forEach(item => {
            item.classList.remove('visible');
            item.classList.add('hidden');
        });
        
        updateCounter(visibleItems.length);
        initSpotlight();
    }
    
    function updateCounter(total) {
        const visible = Math.min(isExpanded ? total : INITIAL_SHOW, total);
        visibleCountEl.textContent = visible;
        totalCountEl.textContent = total;
        
        showMoreBtn.style.display = total <= INITIAL_SHOW ? 'none' : 'inline-block';
        showMoreBtn.classList.toggle('expanded', isExpanded);
        showMoreBtn.innerHTML = isExpanded ? 'show less <span class="arrow">↑</span>' : 'show more <span class="arrow">↓</span>';
    }
    
    // Filter click handlers
    filterPills.forEach(pill => {
        pill.addEventListener('click', function() {
            filterPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            isExpanded = false;
            // Clear search on category change
            const searchEl = document.getElementById('searchInput');
            if (searchEl) {
                searchEl.value = '';
                bentoItems.forEach(item => {
                    item.style.opacity = '';
                    item.style.pointerEvents = '';
                });
            }
            filterItems(this.dataset.filter);
            // Also filter the icon cloud
            if (window.filterIconCloud) {
                window.filterIconCloud(this.dataset.filter);
            }
        });
    });
    
    // ===== SHUFFLE =====
    shuffleBtn.addEventListener('click', function() {
        const visibleItems = bentoItems.filter(item => item.classList.contains('visible'));
        
        // Animate out
        visibleItems.forEach(item => {
            item.classList.add('shuffle-out');
        });
        
        setTimeout(() => {
            // Shuffle DOM order
            const shuffled = [...visibleItems].sort(() => Math.random() - 0.5);
            shuffled.forEach(item => {
                item.classList.remove('shuffle-out');
                item.classList.add('shuffle-in');
                bentoGrid.appendChild(item);
            });
            
            // Reassign float animations
            shuffled.forEach((item, index) => {
                item.style.setProperty('--float-duration', (3 + Math.random() * 2) + 's');
                item.style.setProperty('--float-delay', (Math.random() * 2) + 's');
            });
            
            setTimeout(() => {
                shuffled.forEach(item => item.classList.remove('shuffle-in'));
            }, 400);
            
            initSpotlight();
        }, 300);
    });
    
    // ===== SHOW MORE =====
    showMoreBtn.addEventListener('click', function() {
        isExpanded = !isExpanded;
        filterItems(currentFilter);
    });
    
    // ===== PARALLAX TILT =====
    bentoItems.forEach(item => {
        item.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.05)`;
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // ===== INITIAL SHUFFLE ON LOAD =====
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Shuffle DOM order on load (no animation, instant)
    const shuffledOnLoad = shuffleArray([...bentoItems]);
    shuffledOnLoad.forEach(item => {
        bentoGrid.appendChild(item);
    });
    
    // Initialize
    filterItems('all');
    
    // ===== PREVIEW PANEL =====
    const previewOverlay = document.getElementById('previewOverlay');
    const previewClose = document.getElementById('previewClose');
    
    window.openPreviewPanel = function(icon) {
        document.getElementById('previewCategory').textContent = icon.category;
        document.getElementById('previewCategory').setAttribute('data-cat', icon.category);
        document.getElementById('previewImage').innerHTML = `<img src="${icon.src}" alt="${icon.title}" style="${icon.imgStyle || ''}">`;
        document.getElementById('previewTitle').textContent = icon.title;
        document.getElementById('previewDesc').textContent = icon.desc;
        const visitLink = document.getElementById('previewVisit');
        visitLink.href = icon.href;
        visitLink.target = icon.target || '_blank';
        previewOverlay.classList.add('active');
    };
    
    function closePreview() {
        previewOverlay.classList.remove('active');
    }
    
    previewClose.addEventListener('click', closePreview);
    previewOverlay.addEventListener('click', function(e) {
        if (e.target === previewOverlay) closePreview();
    });
    
    // ===== SEARCH =====
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        
        // Filter bento grid
        bentoItems.forEach(item => {
            const title = item.querySelector('.bento-content h3')?.textContent.toLowerCase() || '';
            const desc = item.querySelector('.bento-content p')?.textContent.toLowerCase() || '';
            const cat = item.dataset.category.toLowerCase();
            const matches = !q || title.includes(q) || desc.includes(q) || cat.includes(q);
            
            if (matches) {
                item.style.opacity = '';
                item.style.pointerEvents = '';
            } else {
                item.style.opacity = '0.1';
                item.style.pointerEvents = 'none';
            }
        });
        
        // Filter icon cloud
        if (window.searchIconCloud) {
            window.searchIconCloud(q);
        }
    });
    
    // ===== VIEW TOGGLE =====
    const viewToggleBtns = document.querySelectorAll('.view-toggle');
    const iconCloudContainer = document.getElementById('iconCloudContainer');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            viewToggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.dataset.view;
            if (view === 'cloud') {
                iconCloudContainer.classList.remove('hidden-view');
                bentoGrid.classList.add('hidden-view');
                document.querySelector('.show-more-container').style.display = 'none';
            } else {
                iconCloudContainer.classList.add('hidden-view');
                bentoGrid.classList.remove('hidden-view');
                document.querySelector('.show-more-container').style.display = 'block';
                // Remove exclusion zone when cloud is hidden
                if (window.removeExclusionZone) {
                    window.removeExclusionZone('iconCloud');
                }
            }
        });
    });
    
    // On mobile, force grid view as default — the 3D cloud doesn't fit
    if (isMobile) {
        const gridBtn = document.querySelector('.view-toggle[data-view="grid"]');
        if (gridBtn) gridBtn.click();
    } else {
        // Hide show more container initially (cloud view is default on desktop)
        document.querySelector('.show-more-container').style.display = 'none';
    }
});

(function() {
    const canvas = document.getElementById('iconCloudCanvas');
    const container = document.getElementById('iconCloudContainer');
    const tooltip = document.getElementById('iconTooltip');
    
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let icons = [];
    let isDragging = false;
    let lastMouseX = 0, lastMouseY = 0;
    let rotationX = 0, rotationY = 0;
    let targetRotationX = 0, targetRotationY = 0;
    let autoRotate = true;
    let hoveredIcon = null;
    let animationId = null;
    let cloudInited = false;
    let cloudVisible = false;
    
    // Color palette
    const categoryColors = {
        personal: '#ff79c6',
        crypto: '#8be9fd',
        tech: '#50fa7b',
        fun: '#ffb86c',
        art: '#bd93f9'
    };
    
    // Collect items from the bento grid
    function collectItems() {
        const bentoItems = document.querySelectorAll('.bento-item');
        const items = [];
        
        bentoItems.forEach((item, i) => {
            const img = item.querySelector('.bento-image img');
            const title = item.querySelector('.bento-content h3');
            const desc = item.querySelector('.bento-content p');
            const category = item.dataset.category;
            
            if (img && title) {
                items.push({
                    src: img.src,
                    title: title.textContent,
                    desc: desc ? desc.textContent : '',
                    category: category,
                    href: item.href || '#',
                    target: item.target || '_self',
                    imgStyle: img.getAttribute('style') || '',
                    image: null,
                    loaded: false
                });
            }
        });
        
        return items;
    }
    
    // Create 3D positions for icons (sphere distribution)
    function initIcons() {
        const itemData = collectItems();
        icons = [];
        
        // Adjust radius and icon size based on screen size
        const isMobile = width < 600;
        const isTablet = width < 900;
        const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.35);
        const iconSize = isMobile ? 28 : (isTablet ? 34 : 40);
        const count = itemData.length;
        
        // Fibonacci sphere distribution for even spacing
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        
        itemData.forEach((data, i) => {
            const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;
            
            const icon = {
                ...data,
                baseX: x * radius,
                baseY: y * radius,
                baseZ: z * radius,
                x: 0,
                y: 0,
                z: 0,
                projX: 0,
                projY: 0,
                scale: 1,
                opacity: 1,
                size: iconSize,
                hovered: false,
                pulsePhase: Math.random() * Math.PI * 2
            };
            
            icons.push(icon);
            
            // Load image - try without CORS first for local images, then with CORS
            const loadImage = (src, useCors) => {
                const img = new Image();
                if (useCors) img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    icon.image = img;
                    icon.loaded = true;
                };
                img.onerror = () => {
                    if (useCors) {
                        // If CORS failed, try without
                        loadImage(src, false);
                    } else if (!useCors && src.startsWith('http')) {
                        // External image without CORS - try with CORS
                        loadImage(src, true);
                    } else {
                        // Final fallback - mark as loaded but no image
                        icon.loaded = true;
                        icon.fallbackLetter = data.title ? data.title.charAt(0).toUpperCase() : '?';
                    }
                };
                img.src = src;
            };
            
            // Start loading - local images without CORS, external with CORS
            const isExternal = data.src.startsWith('http');
            loadImage(data.src, isExternal);
        });
    }
    
    // Resize handler
    function resize() {
        if (!cloudInited) return;
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Update exclusion zone for background particles
        updateExclusionZone();
        
        // Reinitialize icons with new dimensions
        if (icons.length > 0) {
            const isMobile = width < 600;
            const isTablet = width < 900;
            const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.35);
            const iconSize = isMobile ? 28 : (isTablet ? 34 : 40);
            const count = icons.length;
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            
            icons.forEach((icon, i) => {
                const y = 1 - (i / (count - 1)) * 2;
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = goldenAngle * i;
                
                const x = Math.cos(theta) * radiusAtY;
                const z = Math.sin(theta) * radiusAtY;
                
                icon.baseX = x * radius;
                icon.baseY = y * radius;
                icon.baseZ = z * radius;
                icon.size = iconSize;
            });
        }
    }
    
    // Update exclusion zone for the icon cloud
    function updateExclusionZone() {
        if (window.setExclusionZone && container.offsetParent !== null) {
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) * 0.45; // Slightly larger than visual cloud
            window.setExclusionZone('iconCloud', centerX, centerY, radius);
        }
    }
    
    // Rotate point around Y axis then X axis
    function rotatePoint(x, y, z, rx, ry) {
        // Rotate around Y
        let cosY = Math.cos(ry);
        let sinY = Math.sin(ry);
        let tempX = x * cosY - z * sinY;
        let tempZ = x * sinY + z * cosY;
        
        // Rotate around X
        let cosX = Math.cos(rx);
        let sinX = Math.sin(rx);
        let tempY = y * cosX - tempZ * sinX;
        tempZ = y * sinX + tempZ * cosX;
        
        return { x: tempX, y: tempY, z: tempZ };
    }
    
    // Project 3D to 2D
    function project(icon) {
        const perspective = 600;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const rotated = rotatePoint(icon.baseX, icon.baseY, icon.baseZ, rotationX, rotationY);
        icon.x = rotated.x;
        icon.y = rotated.y;
        icon.z = rotated.z;
        
        const scale = perspective / (perspective + rotated.z);
        icon.projX = centerX + rotated.x * scale;
        icon.projY = centerY + rotated.y * scale;
        icon.scale = scale;
        icon.opacity = Math.max(0.3, Math.min(1, (scale - 0.5) * 2));
    }
    
    // Draw connection lines between nearby icons (desktop only)
    function drawConnections(visibleIcons) {
        // Skip connection lines on mobile for cleaner look
        if (width < 600) return;
        
        const iconList = visibleIcons || icons;
        const maxDist = width < 900 ? 100 : 150; // Shorter lines on tablet
        
        ctx.lineCap = 'round';
        
        for (let i = 0; i < iconList.length; i++) {
            for (let j = i + 1; j < iconList.length; j++) {
                const a = iconList[i];
                const b = iconList[j];
                
                const dx = a.projX - b.projX;
                const dy = a.projY - b.projY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.15 * Math.min(a.opacity, b.opacity);
                    // Use category color if both icons share a category, otherwise neutral
                    let lineColor;
                    if (a.category === b.category) {
                        const c = categoryColors[a.category] || '#8be9fd';
                        const lr = parseInt(c.slice(1,3), 16);
                        const lg = parseInt(c.slice(3,5), 16);
                        const lb = parseInt(c.slice(5,7), 16);
                        lineColor = `rgba(${lr}, ${lg}, ${lb}, ${alpha})`;
                    } else {
                        lineColor = `rgba(139, 233, 253, ${alpha * 0.5})`;
                    }
                    ctx.beginPath();
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1;
                    ctx.moveTo(a.projX, a.projY);
                    ctx.lineTo(b.projX, b.projY);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Draw a single icon
    function drawIcon(icon, time) {
        const size = icon.size * icon.scale * (icon.hovered ? 1.5 : 1);
        const x = icon.projX;
        const y = icon.projY;
        
        ctx.save();
        ctx.globalAlpha = icon.searchDimmed ? icon.opacity * 0.12 : icon.opacity;
        
        // Glow effect for hovered
        if (icon.hovered && !icon.searchDimmed) {
            const color = categoryColors[icon.category] || '#8be9fd';
            ctx.shadowColor = color;
            ctx.shadowBlur = 25;
        }
        
        // Draw hexagonal frame
        const pulse = Math.sin(time * 0.003 + icon.pulsePhase) * 0.1 + 1;
        const frameSize = size * 0.6 * pulse;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + Math.cos(angle) * frameSize;
            const py = y + Math.sin(angle) * frameSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        // Fill with semi-transparent dark
        ctx.fillStyle = icon.hovered 
            ? 'rgba(20, 20, 30, 0.9)' 
            : 'rgba(10, 10, 15, 0.6)';
        ctx.fill();
        
        // Stroke - always use category color
        const color = categoryColors[icon.category] || '#8be9fd';
        // Parse hex to RGB for alpha support
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        ctx.strokeStyle = icon.hovered 
            ? color 
            : `rgba(${r}, ${g}, ${b}, ${0.4 * icon.opacity})`;
        ctx.lineWidth = icon.hovered ? 2 : 1;
        ctx.stroke();
        
        // Draw image
        if (icon.image && icon.loaded) {
            const imgSize = size * 0.7;
            ctx.save();
            
            // Clip to circle
            ctx.beginPath();
            ctx.arc(x, y, imgSize * 0.5, 0, Math.PI * 2);
            ctx.clip();
            
            // Check for invert filter
            if (icon.imgStyle && icon.imgStyle.includes('invert(1)')) {
                ctx.filter = 'invert(1)';
            }
            
            ctx.drawImage(
                icon.image,
                x - imgSize / 2,
                y - imgSize / 2,
                imgSize,
                imgSize
            );
            ctx.restore();
        } else {
            // Fallback: draw colored circle with letter
            const fallbackSize = size * 0.35;
            ctx.beginPath();
            ctx.arc(x, y, fallbackSize, 0, Math.PI * 2);
            const fallbackColor = categoryColors[icon.category] || '#8be9fd';
            ctx.fillStyle = fallbackColor;
            ctx.fill();
            
            // Draw letter
            if (icon.fallbackLetter) {
                ctx.fillStyle = '#000';
                ctx.font = `bold ${fallbackSize * 1.2}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon.fallbackLetter, x, y);
            }
        }
        
        ctx.restore();
    }
    
    // Main render loop
    function render(time) {
        // Stop cleanly when the cloud is hidden (grid view / mobile / scrolled away)
        if (!cloudVisible) { animationId = null; return; }
        ctx.clearRect(0, 0, width, height);
        
        // Update exclusion zone position (for scrolling)
        updateExclusionZone();
        
        // Auto rotation
        if (autoRotate && !isDragging) {
            targetRotationY += 0.002;
        }
        
        // Smooth rotation
        rotationX += (targetRotationX - rotationX) * 0.05;
        rotationY += (targetRotationY - rotationY) * 0.05;
        
        // Filter visible icons
        const visibleIcons = icons.filter(icon => icon.visible !== false);
        
        // Update projections
        visibleIcons.forEach(icon => project(icon));
        
        // Sort by Z for proper depth ordering (back to front)
        visibleIcons.sort((a, b) => b.z - a.z);
        
        // Draw connections first (only visible icons)
        drawConnections(visibleIcons);
        
        // Draw icons
        visibleIcons.forEach(icon => drawIcon(icon, time));
        
        animationId = requestAnimationFrame(render);
    }
    
    // Mouse/touch handlers
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    function onPointerDown(e) {
        isDragging = true;
        autoRotate = false;
        const pos = getMousePos(e);
        lastMouseX = pos.x;
        lastMouseY = pos.y;
    }
    
    function onPointerMove(e) {
        const pos = getMousePos(e);
        
        if (isDragging) {
            const dx = pos.x - lastMouseX;
            const dy = pos.y - lastMouseY;
            
            targetRotationY += dx * 0.005;
            targetRotationX += dy * 0.005;
            
            // Clamp X rotation
            targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));
            
            lastMouseX = pos.x;
            lastMouseY = pos.y;
        } else {
            // Check hover
            let found = null;
            const sortedByDistance = [...icons].sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.projX - pos.x, 2) + Math.pow(a.projY - pos.y, 2));
                const distB = Math.sqrt(Math.pow(b.projX - pos.x, 2) + Math.pow(b.projY - pos.y, 2));
                return distA - distB;
            });
            
            for (const icon of sortedByDistance) {
                const size = icon.size * icon.scale;
                const dist = Math.sqrt(Math.pow(icon.projX - pos.x, 2) + Math.pow(icon.projY - pos.y, 2));
                
                if (dist < size * 0.6 && icon.opacity > 0.5) {
                    found = icon;
                    break;
                }
            }
            
            icons.forEach(icon => icon.hovered = false);
            
            if (found) {
                found.hovered = true;
                hoveredIcon = found;
                canvas.style.cursor = 'pointer';
                
                // Show tooltip
                tooltip.querySelector('.tooltip-title').textContent = found.title;
                tooltip.querySelector('.tooltip-desc').textContent = found.desc;
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.classList.add('visible');
                
                // Show in spotlight
                if (window.showIconInSpotlight) {
                    window.showIconInSpotlight(found);
                }
            } else {
                if (hoveredIcon) {
                    // Was hovering, now not - restore spotlight
                    if (window.restoreSpotlight) {
                        window.restoreSpotlight();
                    }
                }
                hoveredIcon = null;
                canvas.style.cursor = 'grab';
                tooltip.classList.remove('visible');
            }
        }
    }
    
    function onPointerUp(e) {
        if (isDragging) {
            isDragging = false;
            // Resume auto rotation after a delay
            setTimeout(() => { autoRotate = true; }, 3000);
        }
    }
    
    function onClick(e) {
        if (hoveredIcon) {
            // Open preview panel instead of navigating
            if (window.openPreviewPanel) {
                window.openPreviewPanel(hoveredIcon);
            }
        }
    }
    
    // Touch tap handler for mobile
    let touchStartPos = null;
    let touchStartTime = 0;
    
    function onTouchStart(e) {
        touchStartPos = getMousePos(e);
        touchStartTime = Date.now();
        onPointerDown(e);
    }
    
    function onTouchEnd(e) {
        const touchDuration = Date.now() - touchStartTime;
        const wasTap = touchDuration < 300;
        
        if (wasTap && touchStartPos) {
            // Check if tap was on an icon
            const visibleIcons = icons.filter(icon => icon.visible !== false);
            for (const icon of visibleIcons) {
                const size = icon.size * icon.scale;
                const dist = Math.sqrt(Math.pow(icon.projX - touchStartPos.x, 2) + Math.pow(icon.projY - touchStartPos.y, 2));
                
                if (dist < size * 0.7 && icon.opacity > 0.5) {
                    // Tapped on icon - open preview panel
                    if (window.openPreviewPanel) {
                        window.openPreviewPanel(icon);
                    }
                    break;
                }
            }
        }
        
        touchStartPos = null;
        onPointerUp(e);
    }
    
    function onPointerLeave() {
        isDragging = false;
        icons.forEach(icon => icon.hovered = false);
        hoveredIcon = null;
        tooltip.classList.remove('visible');
        autoRotate = true;
        
        // Restore spotlight rotation
        if (window.restoreSpotlight) {
            window.restoreSpotlight();
        }
    }
    
    // Filter handler
    window.filterIconCloud = function(category) {
        icons.forEach(icon => {
            icon.visible = category === 'all' || icon.category === category;
        });
    };
    
    // Search handler - filter by title/desc matching query
    window.searchIconCloud = function(query) {
        const q = query.toLowerCase().trim();
        icons.forEach(icon => {
            if (!q) {
                // Reset to current category filter
                const activeFilter = document.querySelector('.filter-pill.active');
                const cat = activeFilter ? activeFilter.dataset.filter : 'all';
                icon.visible = cat === 'all' || icon.category === cat;
                icon.searchDimmed = false;
            } else {
                const matches = icon.title.toLowerCase().includes(q) || icon.desc.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q);
                icon.visible = true; // Keep all visible but dim non-matches
                icon.searchDimmed = !matches;
            }
        });
    };
    
    // Init — lazy: the cloud only initializes (including loading its ~100
    // icon images) and renders while its container is actually visible.
    // On mobile the container is display:none, so none of that work happens.
    function startLoop() {
        if (animationId === null) animationId = requestAnimationFrame(render);
    }

    function bootCloud() {
        if (cloudInited) return;
        cloudInited = true;
        resize();
        initIcons();
    }

    function init() {
        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('mouseleave', onPointerLeave);
        canvas.addEventListener('click', onClick);
        
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onPointerMove, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd);
        
        window.addEventListener('resize', resize);

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                cloudVisible = entries[0].isIntersecting;
                if (cloudVisible) {
                    bootCloud();
                    startLoop();
                } else if (window.removeExclusionZone) {
                    window.removeExclusionZone('iconCloud');
                }
            });
            io.observe(container);
        } else {
            cloudVisible = true;
            bootCloud();
            startLoop();
        }
    }
    
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
