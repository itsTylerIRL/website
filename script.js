// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// NFT pricing data fetcher
function formatUSD(amount) {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
    } else {
        return amount.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            maximumFractionDigits: 0 
        });
    }
}

async function fetchNFTData() {
    try {
        const apiKey = '5a79fc7192de4ababec6b822f0ca4635';
        const headers = {
            'X-API-KEY': apiKey,
            'Accept': 'application/json'
        };

        // First, get current ETH price in USD
        let ethPriceUSD = 2500; // fallback price
        try {
            const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            if (ethResponse.ok) {
                const ethData = await ethResponse.json();
                ethPriceUSD = ethData.ethereum.usd;
            }
        } catch (e) {
            console.log('Using fallback ETH price');
        }

        // Fetch Milady Maker data
        const miladyResponse = await fetch('https://api.opensea.io/api/v2/collections/milady/stats', {
            headers: headers
        });
        
        if (miladyResponse.ok) {
            const miladyData = await miladyResponse.json();
            console.log('Milady data:', miladyData); // Debug log
            
            const miladyFloor = miladyData.total?.floor_price || 0;
            const miladyVolume = miladyData.total?.volume || miladyData.total?.volume_1d || 0;
            
            const miladyFloorUSD = (miladyFloor * ethPriceUSD).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 0 
            });
            
            const miladyVolumeUSD = formatUSD(miladyVolume * ethPriceUSD);
            
            document.getElementById('milady-floor').textContent = 
                `${miladyFloor.toFixed(2)} ETH (${miladyFloorUSD})`;
            document.getElementById('milady-volume').textContent = 
                `${miladyVolume.toFixed(1)} ETH (${miladyVolumeUSD})`;
        } else {
            throw new Error('Failed to fetch Milady data');
        }

        // Fetch Redacted Remilio Babies data
        const remilioResponse = await fetch('https://api.opensea.io/api/v2/collections/remilio-babies/stats', {
            headers: headers
        });
        
        if (remilioResponse.ok) {
            const remilioData = await remilioResponse.json();
            console.log('Remilio data:', remilioData); // Debug log
            
            const remilioFloor = remilioData.total?.floor_price || 0;
            const remilioVolume = remilioData.total?.volume || remilioData.total?.volume_1d || 0;
            
            const remilioFloorUSD = (remilioFloor * ethPriceUSD).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 0 
            });
            
            const remilioVolumeUSD = formatUSD(remilioVolume * ethPriceUSD);
            
            document.getElementById('remilio-floor').textContent = 
                `${remilioFloor.toFixed(2)} ETH (${remilioFloorUSD})`;
            document.getElementById('remilio-volume').textContent = 
                `${remilioVolume.toFixed(1)} ETH (${remilioVolumeUSD})`;
        } else {
            throw new Error('Failed to fetch Remilio data');
        }

        // Fetch Schizoposters data
        const schizoResponse = await fetch('https://api.opensea.io/api/v2/collections/schizoposters/stats', {
            headers: headers
        });
        
        if (schizoResponse.ok) {
            const schizoData = await schizoResponse.json();
            console.log('Schizo data:', schizoData); // Debug log
            
            const schizoFloor = schizoData.total?.floor_price || 0;
            const schizoVolume = schizoData.total?.volume || schizoData.total?.volume_1d || 0;
            
            const schizoFloorUSD = (schizoFloor * ethPriceUSD).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 0 
            });
            
            const schizoVolumeUSD = formatUSD(schizoVolume * ethPriceUSD);
            
            document.getElementById('schizo-floor').textContent = 
                `${schizoFloor.toFixed(2)} ETH (${schizoFloorUSD})`;
            document.getElementById('schizo-volume').textContent = 
                `${schizoVolume.toFixed(1)} ETH (${schizoVolumeUSD})`;
        } else {
            throw new Error('Failed to fetch Schizoposters data');
        }

        // Fetch Radbro Webring data
        const radbroResponse = await fetch('https://api.opensea.io/api/v2/collections/radbro-webring/stats', {
            headers: headers
        });
        
        if (radbroResponse.ok) {
            const radbroData = await radbroResponse.json();
            console.log('Radbro data:', radbroData); // Debug log
            
            const radbroFloor = radbroData.total?.floor_price || 0;
            const radbroVolume = radbroData.total?.volume || radbroData.total?.volume_1d || 0;
            
            const radbroFloorUSD = (radbroFloor * ethPriceUSD).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 0 
            });
            
            const radbroVolumeUSD = formatUSD(radbroVolume * ethPriceUSD);
            
            document.getElementById('radbro-floor').textContent = 
                `${radbroFloor.toFixed(2)} ETH (${radbroFloorUSD})`;
            document.getElementById('radbro-volume').textContent = 
                `${radbroVolume.toFixed(1)} ETH (${radbroVolumeUSD})`;
        } else {
            throw new Error('Failed to fetch Radbro Webring data');
        }

        // Fetch Fumo Baby 404 data
        const fumoResponse = await fetch('https://api.opensea.io/api/v2/collections/milady-fumo-baby-404/stats', {
            headers: headers
        });
        
        if (fumoResponse.ok) {
            const fumoData = await fumoResponse.json();
            console.log('Fumo data:', fumoData); // Debug log
            
            const fumoFloor = fumoData.total?.floor_price || 0;
            const fumoVolume = fumoData.total?.volume || fumoData.total?.volume_1d || 0;
            
            const fumoFloorUSD = (fumoFloor * ethPriceUSD).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 0 
            });
            
            const fumoVolumeUSD = formatUSD(fumoVolume * ethPriceUSD);
            
            document.getElementById('fumo-floor').textContent = 
                `${fumoFloor.toFixed(2)} ETH (${fumoFloorUSD})`;
            document.getElementById('fumo-volume').textContent = 
                `${fumoVolume.toFixed(1)} ETH (${fumoVolumeUSD})`;
        } else {
            throw new Error('Failed to fetch Fumo Baby 404 data');
        }

    } catch (error) {
        console.error('Error fetching NFT data:', error);
        // Fallback to reasonable static data if API fails
        document.getElementById('milady-floor').textContent = '2.5 ETH ($6,250)';
        document.getElementById('milady-volume').textContent = `45.2 ETH (${formatUSD(113000)})`;
        document.getElementById('remilio-floor').textContent = '1.8 ETH ($4,500)';
        document.getElementById('remilio-volume').textContent = `32.1 ETH (${formatUSD(80250)})`;
        document.getElementById('schizo-floor').textContent = '0.8 ETH ($2,000)';
        document.getElementById('schizo-volume').textContent = `15.3 ETH (${formatUSD(38250)})`;
        document.getElementById('radbro-floor').textContent = '0.5 ETH ($1,250)';
        document.getElementById('radbro-volume').textContent = `8.7 ETH (${formatUSD(21750)})`;
        document.getElementById('fumo-floor').textContent = '0.3 ETH ($750)';
        document.getElementById('fumo-volume').textContent = `5.2 ETH (${formatUSD(13000)})`;
    }
}

// Load NFT data when page loads
document.addEventListener('DOMContentLoaded', fetchNFTData);

// Refresh data every 5 minutes
setInterval(fetchNFTData, 5 * 60 * 1000);

// Profile picture click functionality
document.addEventListener('DOMContentLoaded', function() {
    const profilePics = document.querySelectorAll('.profile-pic');
    const enlargedContainer = document.getElementById('enlargedContainer');
    let currentEnlarged = null;
    
    profilePics.forEach(pic => {
        pic.addEventListener('click', function() {
            const imgSrc = this.querySelector('img').src;
            const imgAlt = this.querySelector('img').alt;
            const name = this.dataset.name;
            const artist = this.dataset.artist;
            const twitter = this.dataset.twitter;
            const description = this.dataset.description;
            
            // If clicking the same picture that's already enlarged, remove it
            if (currentEnlarged === this) {
                enlargedContainer.classList.remove('active');
                enlargedContainer.innerHTML = '';
                currentEnlarged = null;
                return;
            }
            
            // Create enlarged picture with info
            enlargedContainer.innerHTML = `
                <div class="profile-pic enlarged">
                    <img src="${imgSrc}" alt="${imgAlt}">
                </div>
                <div class="enlarged-pic-info">
                    <h4>${name}</h4>
                    <p><strong>artist:</strong> <a href="https://x.com/${twitter}" target="_blank">${artist}</a></p>
                    <p><strong>info:</strong> ${description}</p>
                </div>
            `;
            
            // Show the enlarged container
            enlargedContainer.classList.add('active');
            currentEnlarged = this;
        });
    });
});

// PFP Card Popup Functionality
document.addEventListener('DOMContentLoaded', function() {
    const pfpCards = document.querySelectorAll('.pfp-card');
    const popup = document.getElementById('pfpPopup');
    
    pfpCards.forEach(card => {
        card.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            const artist = this.getAttribute('data-artist');
            const description = this.getAttribute('data-description');
            const opensea = this.getAttribute('data-opensea');
            const etherscan = this.getAttribute('data-etherscan');
            
            // Check if it's a video or image
            const mediaElement = this.querySelector('img, video');
            const isVideo = mediaElement.tagName.toLowerCase() === 'video';
            const mediaSrc = isVideo ? mediaElement.src : mediaElement.src;
            
            // Update popup content - show appropriate element
            const popupImage = document.getElementById('popupImage');
            const popupVideo = document.getElementById('popupVideo');
            
            if (isVideo) {
                popupVideo.src = mediaSrc;
                popupVideo.style.display = 'block';
                popupImage.style.display = 'none';
            } else {
                popupImage.src = mediaSrc;
                popupImage.style.display = 'block';
                popupVideo.style.display = 'none';
            }
            document.getElementById('popupName').textContent = name;
            document.getElementById('popupArtist').textContent = `by ${artist}`;
            document.getElementById('popupDescription').textContent = description;
            
            // Update icon links
            const openseaLink = document.getElementById('openseaLink');
            const etherscanLink = document.getElementById('etherscanLink');
            
            if (opensea) {
                openseaLink.href = opensea;
                openseaLink.style.display = 'inline-flex';
            } else {
                openseaLink.style.display = 'none';
            }
            
            if (etherscan) {
                etherscanLink.href = etherscan;
                etherscanLink.style.display = 'inline-flex';
            } else {
                etherscanLink.style.display = 'none';
            }
            
            // Show popup
            popup.classList.add('active');
            
            // Show popup scanline and hide main scanline
            const popupScanline = popup.querySelector('.scanline-popup');
            const mainScanline = document.querySelector('.scanline');
            if (popupScanline) {
                popupScanline.style.display = 'block';
            }
            if (mainScanline) {
                mainScanline.style.display = 'none';
            }
        });
    });
    
    // Close popup when clicking outside content
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closePfpPopup();
        }
    });
    
    // Close with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePfpPopup();
        }
    });
});

function closePfpPopup() {
    const popup = document.getElementById('pfpPopup');
    popup.classList.remove('active');
    
    // Hide popup scanline and show main scanline
    const popupScanline = popup.querySelector('.scanline-popup');
    const mainScanline = document.querySelector('.scanline');
    if (popupScanline) {
        popupScanline.style.display = 'none';
    }
    if (mainScanline) {
        mainScanline.style.display = 'block';
    }
}

// PFP Filter Functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const pfpCards = document.querySelectorAll('.pfp-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterCategory = this.getAttribute('data-filter');
            
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter PFP cards
            pfpCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (filterCategory === 'tyler' && cardCategory === 'tyler') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else if (filterCategory === 'schizo' && cardCategory === 'schizo') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else if (filterCategory === 'remilia' && cardCategory === 'remilia') {
                    card.style.display = 'block';
                    // Apply loading animation if image hasn't been processed
                    const img = card.querySelector('img, video');
                    if (img && !img.classList.contains('loaded') && !img.classList.contains('lazy')) {
                        img.classList.add('lazy');
                        // Simulate loading delay for animation effect
                        setTimeout(() => {
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                        }, 300 + Math.random() * 400); // Random delay between 300-700ms
                    }
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Handle remilia filter - show message if no images available
            if (filterCategory === 'remilia') {
                const pfpGrid = document.querySelector('.pfp-grid');
                const remiliaCards = document.querySelectorAll('.pfp-card[data-category="remilia"]');
                
                if (remiliaCards.length === 0) {
                    // Create temporary message if not exists
                    let messageCard = document.querySelector('.remilia-message');
                    if (!messageCard) {
                        messageCard = document.createElement('div');
                        messageCard.className = 'remilia-message';
                        messageCard.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 2rem; color: #00ff41; font-family: "Courier New", monospace;';
                        messageCard.innerHTML = '<p>Remilia PFPs coming soon...</p>';
                        pfpGrid.appendChild(messageCard);
                    }
                    messageCard.style.display = 'block';
                } else {
                    // Hide message if remilia cards exist
                    const messageCard = document.querySelector('.remilia-message');
                    if (messageCard) {
                        messageCard.style.display = 'none';
                    }
                }
            } else {
                // Hide message for other filters
                const messageCard = document.querySelector('.remilia-message');
                if (messageCard) {
                    messageCard.style.display = 'none';
                }
            }
        });
    });
});

// Radbro - Dynamic Mouse Reactive Display
(function() {
    const radbroImg = document.getElementById('radbroImage');
    
    if (!radbroImg) return;
    
    // Radbro image states
    const radbros = {
        lookLeft: 'assets/radbros/LOOK_L.png',
        lookLeftHappy: 'assets/radbros/LOOK_L_HAPPY.png',
        lookRight: 'assets/radbros/LOOK_R.png',
        lookRightHappy: 'assets/radbros/LOOK_R_HAPPY.png',
        happy: 'assets/radbros/HAPPY.png',
        grateful: 'assets/radbros/GRATEFUL.png',
        intense: 'assets/radbros/INTENSE.png',
        lonely: 'assets/radbros/LONELY.png',
        sad: 'assets/radbros/SAD.png',
        sleep: 'assets/radbros/SLEEP.png',
        sleep2: 'assets/radbros/SLEEP2.png'
    };
    
    // Preload all images
    Object.values(radbros).forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    let lastMouseMove = Date.now();
    let currentState = 'happy';
    let isIdle = false;
    let sleepToggle = false;
    let idleTimeout = null;
    let sleepInterval = null;
    
    // Random mood states for variety
    const happyMoods = ['happy', 'grateful', 'intense'];
    
    function setRadbro(state) {
        if (currentState === state) return;
        currentState = state;
        radbroImg.src = radbros[state];
    }
    
    function getRandomHappyMood() {
        return happyMoods[Math.floor(Math.random() * happyMoods.length)];
    }
    
    function startSleeping() {
        isIdle = true;
        setRadbro('sleep');
        // Alternate between sleep frames
        sleepInterval = setInterval(() => {
            sleepToggle = !sleepToggle;
            setRadbro(sleepToggle ? 'sleep2' : 'sleep');
        }, 1500);
    }
    
    function wakeUp() {
        isIdle = false;
        if (sleepInterval) {
            clearInterval(sleepInterval);
            sleepInterval = null;
        }
    }
    
    function resetIdleTimer() {
        if (idleTimeout) clearTimeout(idleTimeout);
        if (isIdle) wakeUp();
        
        // Go to sleep after 5 seconds of no mouse movement
        idleTimeout = setTimeout(() => {
            startSleeping();
        }, 5000);
    }
    
    // Mouse position tracking
    document.addEventListener('mousemove', (e) => {
        lastMouseMove = Date.now();
        resetIdleTimer();
        
        if (isIdle) return;
        
        const windowWidth = window.innerWidth;
        const mouseX = e.clientX;
        const relativeX = mouseX / windowWidth; // 0 to 1
        
        // Determine if mouse is on left, center, or right third
        const isHovering = e.target.closest('a, button, .bento-item, .contact-icon-link');
        
        if (relativeX < 0.33) {
            // Mouse on left side - look left
            setRadbro(isHovering ? 'lookLeftHappy' : 'lookLeft');
        } else if (relativeX > 0.66) {
            // Mouse on right side - look right
            setRadbro(isHovering ? 'lookRightHappy' : 'lookRight');
        } else {
            // Mouse in center - look forward with mood
            if (isHovering) {
                setRadbro('happy');
            } else {
                // Occasionally show different moods
                if (Math.random() < 0.02) {
                    setRadbro(getRandomHappyMood());
                }
            }
        }
    });
    
    // React to clicks
    document.addEventListener('click', () => {
        if (isIdle) {
            wakeUp();
            setRadbro('intense');
            setTimeout(() => {
                if (!isIdle) setRadbro('happy');
            }, 500);
        } else {
            // Brief intense reaction
            const prevState = currentState;
            setRadbro('intense');
            setTimeout(() => {
                if (!isIdle && currentState === 'intense') {
                    setRadbro(prevState.includes('look') ? prevState : 'happy');
                }
            }, 300);
        }
        resetIdleTimer();
    });
    
    // Start idle timer
    resetIdleTimer();
})();
