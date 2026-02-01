// Three.js Particle Field Background
// Cyberpunk aesthetic with cyan accents - scanline reactive

let scene, camera, renderer, particles, mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let scrollY = 0;
let scanlineY = 0;
let particlePositions, particleColors, originalColors;

function initBackground3D() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    renderer = new THREE.WebGLRenderer({ 
        alpha: false, 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 1); // Solid black background
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.pointerEvents = 'none';
    document.body.prepend(renderer.domElement);

    // Create particle systems
    createParticles();
    createWireframeShapes();
    
    camera.position.z = 50;

    // Event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseout', onMouseOut);
    document.documentElement.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('blur', () => { mouseX = 0; mouseY = 0; }); // Recenter when window loses focus
    
    // Track scanline position
    trackScanline();

    // Start animation
    animate();
}

function trackScanline() {
    // The scanline takes 4s to go from top (0) to bottom (100vh)
    // We'll calculate its position based on the animation cycle
    const scanlineDuration = 4000; // 4 seconds in ms
    
    function updateScanlinePosition() {
        const time = Date.now() % scanlineDuration;
        scanlineY = (time / scanlineDuration) * window.innerHeight;
        requestAnimationFrame(updateScanlinePosition);
    }
    updateScanlinePosition();
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    
    // Color palette - cyan and pink accents
    const colorPalette = [
        new THREE.Color(0x8be9fd), // Cyan
        new THREE.Color(0xff79c6), // Pink
        new THREE.Color(0x50fa7b), // Green
        new THREE.Color(0xf8f8f2), // White
    ];

    for (let i = 0; i < 3000; i++) {
        // Flat plane distribution covering entire scrollable page
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 800; // Very tall to cover full scroll
        const z = (Math.random() - 0.5) * 100 - 20; // Depth behind camera plane
        
        vertices.push(x, y, z);
        
        // Random color from palette, weighted toward cyan
        const color = Math.random() > 0.7 
            ? colorPalette[Math.floor(Math.random() * colorPalette.length)]
            : colorPalette[0];
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Store references for animation
    particlePositions = geometry.attributes.position;
    particleColors = geometry.attributes.color;
    originalColors = new Float32Array(colors); // Keep original colors

    const material = new THREE.PointsMaterial({ 
        size: 1.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function createWireframeShapes() {
    // Floating wireframe geometries - spread across entire scene
    const shapes = [];
    const geometries = [
        new THREE.IcosahedronGeometry(3, 0),
        new THREE.OctahedronGeometry(2.5, 0),
        new THREE.TetrahedronGeometry(2, 0),
        new THREE.BoxGeometry(2, 2, 2),
    ];

    for (let i = 0; i < 12; i++) {
        const geo = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0x8be9fd : 0xff79c6,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 600, // Tall spread to cover scroll
            (Math.random() - 0.5) * 60 - 10
        );
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        // Store rotation speeds
        mesh.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.01
            },
            floatSpeed: Math.random() * 0.5 + 0.5,
            floatOffset: Math.random() * Math.PI * 2
        };
        
        scene.add(mesh);
        shapes.push(mesh);
    }
    
    // Store for animation
    window.wireframeShapes = shapes;
}

function onMouseMove(event) {
    // Check if mouse is actually inside the viewport
    const x = event.clientX;
    const y = event.clientY;
    
    if (x <= 0 || x >= window.innerWidth || y <= 0 || y >= window.innerHeight) {
        // Mouse is at edge or outside - recenter
        mouseX = 0;
        mouseY = 0;
    } else {
        mouseX = (x - windowHalfX) * 0.05;
        mouseY = (y - windowHalfY) * 0.05;
    }
}

function onMouseLeave(event) {
    // Only reset if actually leaving the document (not entering a child element)
    if (!event.relatedTarget || event.relatedTarget.nodeName === 'HTML') {
        mouseX = 0;
        mouseY = 0;
    }
}

function onMouseOut(event) {
    // Fires when leaving document entirely
    if (!event.relatedTarget && !event.toElement) {
        mouseX = 0;
        mouseY = 0;
    }
}

function onScroll() {
    scrollY = window.scrollY || window.pageYOffset;
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Rotate particles slowly
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;
    
    // Camera follows scroll position
    const targetY = -scrollY * 0.05; // Move camera down as user scrolls
    camera.position.y += (targetY - camera.position.y) * 0.1;
    
    // Mouse parallax effect
    camera.position.x += (mouseX - camera.position.x) * 0.02;
    camera.lookAt(new THREE.Vector3(0, camera.position.y, 0));
    
    // Scanline reactive particles
    updateParticlesWithScanline(time);
    
    // Animate wireframe shapes
    if (window.wireframeShapes) {
        window.wireframeShapes.forEach((shape, i) => {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
            
            // Gentle floating motion
            shape.position.y += Math.sin(time * shape.userData.floatSpeed + shape.userData.floatOffset) * 0.02;
            
            // Pulse opacity when scanline passes
            const shapeScreenY = getScreenY(shape.position);
            const distToScanline = Math.abs(shapeScreenY - scanlineY);
            if (distToScanline < 100) {
                const intensity = 1 - (distToScanline / 100);
                shape.material.opacity = 0.15 + intensity * 0.4;
            } else {
                shape.material.opacity = 0.15;
            }
        });
    }
    
    renderer.render(scene, camera);
}

function updateParticlesWithScanline(time) {
    if (!particlePositions || !particleColors) return;
    
    const colors = particleColors.array;
    const positions = particlePositions.array;
    const scanlineWorldY = screenYToWorldY(scanlineY);
    const scanlineWidth = 15; // How wide the scanline effect is in world units
    
    for (let i = 0; i < positions.length; i += 3) {
        const particleY = positions[i + 1];
        const distToScanline = Math.abs(particleY - scanlineWorldY);
        
        // Color index in the colors array
        const colorIdx = i; // r, g, b are at i, i+1, i+2
        
        if (distToScanline < scanlineWidth) {
            // Particle is near scanline - brighten it!
            const intensity = 1 - (distToScanline / scanlineWidth);
            const boost = 1 + intensity * 2; // Up to 3x brightness
            
            colors[colorIdx] = Math.min(1, originalColors[colorIdx] * boost);
            colors[colorIdx + 1] = Math.min(1, originalColors[colorIdx + 1] * boost);
            colors[colorIdx + 2] = Math.min(1, originalColors[colorIdx + 2] * boost);
        } else {
            // Restore original colors with gentle pulsing
            const pulse = 0.8 + Math.sin(time * 2 + i * 0.1) * 0.2;
            colors[colorIdx] = originalColors[colorIdx] * pulse;
            colors[colorIdx + 1] = originalColors[colorIdx + 1] * pulse;
            colors[colorIdx + 2] = originalColors[colorIdx + 2] * pulse;
        }
    }
    
    particleColors.needsUpdate = true;
}

function getScreenY(position) {
    // Project 3D position to screen Y
    const vector = position.clone();
    vector.project(camera);
    return (1 - vector.y) / 2 * window.innerHeight;
}

function screenYToWorldY(screenY) {
    // Convert screen Y to approximate world Y based on camera
    // This is simplified - assumes camera looking roughly forward
    const normalizedY = 1 - (screenY / window.innerHeight) * 2; // -1 to 1
    return camera.position.y + normalizedY * 50; // Scale to world units
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackground3D);
} else {
    initBackground3D();
}

// Optional: Disable on mobile for performance
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Particle count control
let currentParticleCount = 3000;

function setParticleCount(count) {
    currentParticleCount = count;
    
    // Remove old particles
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
    }
    
    // Recreate with new count
    createParticlesWithCount(count);
}

function createParticlesWithCount(count) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    
    const colorPalette = [
        new THREE.Color(0x8be9fd),
        new THREE.Color(0xff79c6),
        new THREE.Color(0x50fa7b),
        new THREE.Color(0xf8f8f2),
    ];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 100 - 20;
        
        vertices.push(x, y, z);
        
        const color = Math.random() > 0.7 
            ? colorPalette[Math.floor(Math.random() * colorPalette.length)]
            : colorPalette[0];
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    particlePositions = geometry.attributes.position;
    particleColors = geometry.attributes.color;
    originalColors = new Float32Array(colors);

    const material = new THREE.PointsMaterial({ 
        size: 1.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// Expose to window for slider control
window.setParticleCount = setParticleCount;
window.getParticleCount = () => currentParticleCount;

// Reduce particles on mobile
if (isMobile()) {
    console.log('Mobile detected - using reduced particle count');
}
