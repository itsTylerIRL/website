// Three.js Particle Field Background
// Cyberpunk aesthetic with cyan accents - scanline reactive

let scene, camera, renderer, particles, mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let scrollY = 0;
let scanlineY = 0;
let particlePositions, particleColors, originalColors;

// Post-processing and effects
let composer, bloomPass, glitchPass;
let linesMesh, linesGeometry, linesPositions;
let glitchIntensity = 0;
let nextGlitchTime = 0;

// Mouse world position for line attraction
let mouseWorldX = 0;
let mouseWorldY = 0;
let mouseWorldZ = 20; // Slightly in front of particles

// Effect settings
let bloomStrength = 0.8;
let bloomRadius = 0.4;
let bloomThreshold = 0.2;
let linesEnabled = true;
let linesMaxDistance = 23;
let linesOpacity = 0.25;
let glitchEnabled = false;
let linesAttraction = 0.7; // How strongly lines are attracted to cursor (0-1)

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
    createConnectionLines();
    createWireframeShapes();
    
    // Setup post-processing (bloom + glitch)
    setupPostProcessing();
    
    camera.position.z = 50;

    // Event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseout', onMouseOut);
    document.documentElement.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('blur', () => { mouseX = 0; mouseY = 0; }); // Recenter when window loses focus
    
    // Track scanline position - now reads from shared state in effects.js
    // trackScanline(); // Removed - using window.scanlineState instead

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

// Dithering shader for particles - subtle and professional
const particleVertexShader = `
    attribute vec3 color;
    varying vec3 vColor;
    varying vec2 vScreenPos;
    varying float vDepth;
    
    void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        
        // Pass screen position for dithering
        vScreenPos = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
        
        // Pass depth for fog (normalized 0-1, 0 = near, 1 = far)
        vDepth = smoothstep(0.0, 150.0, -mvPosition.z);
    }
`;

const particleFragmentShader = `
    varying vec3 vColor;
    varying vec2 vScreenPos;
    varying float vDepth;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uDitherStrength;
    uniform float uFogDensity;
    uniform vec3 uFogColor;
    
    // 4x4 Bayer dithering matrix
    float bayer4x4(vec2 pos) {
        int x = int(mod(pos.x, 4.0));
        int y = int(mod(pos.y, 4.0));
        int index = x + y * 4;
        
        // Bayer matrix values normalized to 0-1
        float matrix[16];
        matrix[0] = 0.0/16.0;   matrix[1] = 8.0/16.0;   matrix[2] = 2.0/16.0;   matrix[3] = 10.0/16.0;
        matrix[4] = 12.0/16.0;  matrix[5] = 4.0/16.0;   matrix[6] = 14.0/16.0;  matrix[7] = 6.0/16.0;
        matrix[8] = 3.0/16.0;   matrix[9] = 11.0/16.0;  matrix[10] = 1.0/16.0;  matrix[11] = 9.0/16.0;
        matrix[12] = 15.0/16.0; matrix[13] = 7.0/16.0;  matrix[14] = 13.0/16.0; matrix[15] = 5.0/16.0;
        
        // Manual lookup since GLSL ES doesn't support dynamic indexing well
        for (int i = 0; i < 16; i++) {
            if (i == index) return matrix[i];
        }
        return 0.0;
    }
    
    void main() {
        // Circular particle shape
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        
        // Screen-space position for dithering
        vec2 screenPos = vScreenPos * uResolution;
        
        // Get dither threshold
        float dither = bayer4x4(screenPos);
        
        // Add subtle temporal noise for gentle shimmer
        float noise = fract(sin(dot(screenPos + uTime * 10.0, vec2(12.9898, 78.233))) * 43758.5453);
        dither = mix(dither, noise, 0.3);
        
        // Apply dithering to alpha - subtle effect
        float alpha = 0.7 - dist * 0.4;
        float ditherAlpha = alpha + (dither - 0.5) * uDitherStrength;
        
        // Soft threshold for clean dithering effect
        ditherAlpha = step(0.3, ditherAlpha) * alpha;
        
        // Soft edge falloff for professional look
        float edge = 1.0 - smoothstep(0.3, 0.5, dist);
        
        // Apply depth fog - fade distant particles
        float fogFactor = 1.0 - vDepth * uFogDensity;
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        
        // Mix color toward fog color for distant particles
        vec3 finalColor = mix(uFogColor, vColor, fogFactor);
        
        // Also reduce alpha for distant particles
        float finalAlpha = ditherAlpha * edge * (0.3 + fogFactor * 0.7);
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

// Dither strength control - subtle default
let ditherStrength = 0.5;

// Fog settings
let fogDensity = 0.6;
let fogColor = new THREE.Color(0x000000);

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

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uDitherStrength: { value: ditherStrength },
            uFogDensity: { value: fogDensity },
            uFogColor: { value: fogColor }
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    particles.renderOrder = 1; // Render after lines
    scene.add(particles);
}

// Update dither strength
window.setDitherStrength = function(strength) {
    ditherStrength = strength;
    if (particles && particles.material.uniforms) {
        particles.material.uniforms.uDitherStrength.value = strength;
    }
};

window.getDitherStrength = () => ditherStrength;

// Fog controls
window.setFogDensity = function(density) {
    fogDensity = density;
    if (particles && particles.material.uniforms) {
        particles.material.uniforms.uFogDensity.value = density;
    }
};

window.getFogDensity = () => fogDensity;

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

// ============== POST-PROCESSING (BLOOM) ==============
function setupPostProcessing() {
    // Check if post-processing classes are available
    if (typeof THREE.EffectComposer === 'undefined') {
        console.warn('EffectComposer not found - loading post-processing inline');
        // Fallback: create minimal bloom effect using additive blending
        // The particles already use additive blending which gives a glow-like effect
        return;
    }
    
    // Render pass
    const renderPass = new THREE.RenderPass(scene, camera);
    
    // Bloom pass
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomStrength,
        bloomRadius,
        bloomThreshold
    );
    
    // Composer
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
}

// ============== CONNECTION LINES ==============
function createConnectionLines() {
    // Create a buffer geometry for dynamic lines
    const maxLines = 250; // Maximum number of line segments
    linesGeometry = new THREE.BufferGeometry();
    linesPositions = new Float32Array(maxLines * 6); // 2 vertices per line, 3 coords each
    const linesColors = new Float32Array(maxLines * 6); // RGB for each vertex
    
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linesPositions, 3));
    linesGeometry.setAttribute('color', new THREE.BufferAttribute(linesColors, 3));
    linesGeometry.setDrawRange(0, 0); // Start with no lines drawn
    
    const linesMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: linesOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
    linesMesh.renderOrder = -1; // Render before particles
    linesMesh.frustumCulled = false;
    scene.add(linesMesh);
}

function updateConnectionLines() {
    if (!linesEnabled || !particlePositions || !linesMesh) return;
    
    const positions = particlePositions.array;
    const linesPos = linesGeometry.attributes.position.array;
    const linesCol = linesGeometry.attributes.color.array;
    const particleCount = positions.length / 3;
    
    // Get the particle system's world matrix to transform positions
    const matrix = particles.matrixWorld;
    const tempVec = new THREE.Vector3();
    
    // Only check particles near the camera for performance
    const visibleParticles = [];
    const transformedPositions = []; // Store transformed positions
    const cameraY = camera.position.y;
    const viewRange = 80; // Only check particles within this Y range of camera
    
    for (let i = 0; i < particleCount; i++) {
        // Transform particle position by the particles mesh rotation/position
        tempVec.set(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
        );
        tempVec.applyMatrix4(matrix);
        
        if (Math.abs(tempVec.y - cameraY) < viewRange) {
            // Calculate distance to mouse for scoring
            const dx = tempVec.x - mouseWorldX;
            const dy = tempVec.y - mouseWorldY;
            const dz = tempVec.z - mouseWorldZ;
            const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            visibleParticles.push(i);
            transformedPositions.push({ 
                x: tempVec.x, 
                y: tempVec.y, 
                z: tempVec.z,
                distToMouse: distToMouse
            });
        }
    }
    
    // Sort particles by distance to mouse (closest first)
    const sortedIndices = transformedPositions
        .map((p, idx) => ({ idx, dist: p.distToMouse }))
        .sort((a, b) => a.dist - b.dist)
        .map(item => item.idx);
    
    let lineIndex = 0;
    const maxLines = linesPositions.length / 6;
    const maxDist = linesMaxDistance;
    const maxDistSq = maxDist * maxDist;
    const attractionRange = 100; // Range where cursor attraction kicks in
    const cursorConnectRange = 40; // Range where particles connect directly to cursor
    const maxCursorLines = 8; // Max lines connecting to cursor
    
    // Create lines prioritizing paths toward cursor
    const usedParticles = new Set();
    
    // FIRST: Draw lines from closest particles directly to cursor
    for (let si = 0; si < Math.min(sortedIndices.length, maxCursorLines) && lineIndex < maxLines; si++) {
        const i = sortedIndices[si];
        const p1 = transformedPositions[i];
        
        if (p1.distToMouse > cursorConnectRange) continue;
        
        const alpha = 1 - (p1.distToMouse / cursorConnectRange);
        
        const li = lineIndex * 6;
        // Line from particle to cursor
        linesPos[li] = p1.x;
        linesPos[li + 1] = p1.y;
        linesPos[li + 2] = p1.z;
        linesPos[li + 3] = mouseWorldX;
        linesPos[li + 4] = mouseWorldY;
        linesPos[li + 5] = mouseWorldZ;
        
        // Bright white/cyan for cursor lines - make them pop
        const brightness = 0.8 + alpha * 0.2;
        linesCol[li] = brightness;
        linesCol[li + 1] = brightness;
        linesCol[li + 2] = brightness;
        linesCol[li + 3] = 0.4 + alpha * 0.6; // Fade to cyan at cursor
        linesCol[li + 4] = 0.95;
        linesCol[li + 5] = 1.0;
        
        usedParticles.add(i);
        lineIndex++;
    }
    
    // Second pass: Create path lines from particles nearest to mouse
    for (let si = 0; si < Math.min(sortedIndices.length, 50) && lineIndex < maxLines * 0.6; si++) {
        const i = sortedIndices[si];
        const p1 = transformedPositions[i];
        
        if (p1.distToMouse > attractionRange) continue;
        
        // Find the best neighbor that's further from mouse (creating path away)
        let bestJ = -1;
        let bestScore = -Infinity;
        
        for (let j = 0; j < transformedPositions.length; j++) {
            if (i === j) continue;
            
            const p2 = transformedPositions[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            
            if (distSq > maxDistSq || distSq < 1) continue;
            
            // Score based on: being further from mouse (creates outward path) but not too far apart
            const dist = Math.sqrt(distSq);
            const directionScore = (p2.distToMouse - p1.distToMouse) / dist; // Positive = moving away from mouse
            const proximityScore = 1 - (dist / maxDist);
            const noveltyScore = usedParticles.has(j) ? 0.3 : 1; // Prefer unused particles
            
            const score = (directionScore * linesAttraction + proximityScore * (1 - linesAttraction)) * noveltyScore;
            
            if (score > bestScore) {
                bestScore = score;
                bestJ = j;
            }
        }
        
        if (bestJ !== -1) {
            const p2 = transformedPositions[bestJ];
            const dist = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + 
                Math.pow(p2.y - p1.y, 2) + 
                Math.pow(p2.z - p1.z, 2)
            );
            const alpha = 1 - (dist / maxDist);
            
            // Boost brightness for lines near cursor
            const mouseProximity = 1 - Math.min(p1.distToMouse / attractionRange, 1);
            const brightBoost = 1 + mouseProximity * 0.5;
            
            const li = lineIndex * 6;
            linesPos[li] = p1.x;
            linesPos[li + 1] = p1.y;
            linesPos[li + 2] = p1.z;
            linesPos[li + 3] = p2.x;
            linesPos[li + 4] = p2.y;
            linesPos[li + 5] = p2.z;
            
            // Brighter cyan near cursor, with pink tint
            const r = (0.55 + 0.45 * alpha) * brightBoost;
            const g = (0.91 + 0.09 * alpha) * brightBoost;
            const b = (0.99 + 0.01 * alpha) * brightBoost;
            linesCol[li] = Math.min(1, r + mouseProximity * 0.3);
            linesCol[li + 1] = Math.min(1, g);
            linesCol[li + 2] = Math.min(1, b);
            linesCol[li + 3] = Math.min(1, r);
            linesCol[li + 4] = Math.min(1, g);
            linesCol[li + 5] = Math.min(1, b);
            
            usedParticles.add(i);
            usedParticles.add(bestJ);
            lineIndex++;
        }
    }
    
    // Second pass: Regular connections for remaining lines
    for (let i = 0; i < visibleParticles.length && lineIndex < maxLines; i++) {
        const p1 = transformedPositions[i];
        
        for (let j = i + 1; j < transformedPositions.length && lineIndex < maxLines; j++) {
            const p2 = transformedPositions[j];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            
            if (distSq < maxDistSq && distSq > 1) {
                const dist = Math.sqrt(distSq);
                const alpha = 1 - (dist / maxDist);
                
                const li = lineIndex * 6;
                linesPos[li] = p1.x;
                linesPos[li + 1] = p1.y;
                linesPos[li + 2] = p1.z;
                linesPos[li + 3] = p2.x;
                linesPos[li + 4] = p2.y;
                linesPos[li + 5] = p2.z;
                
                linesCol[li] = 0.55 + 0.45 * alpha;
                linesCol[li + 1] = 0.91 + 0.09 * alpha;
                linesCol[li + 2] = 0.99 + 0.01 * alpha;
                linesCol[li + 3] = 0.55 + 0.45 * alpha;
                linesCol[li + 4] = 0.91 + 0.09 * alpha;
                linesCol[li + 5] = 0.99 + 0.01 * alpha;
                
                lineIndex++;
            }
        }
    }
    
    linesGeometry.setDrawRange(0, lineIndex * 2);
    linesGeometry.attributes.position.needsUpdate = true;
    linesGeometry.attributes.color.needsUpdate = true;
}

// ============== GLITCH EFFECT ==============
function updateGlitch(time) {
    if (!glitchEnabled) {
        glitchIntensity = 0;
        return;
    }
    
    // Random glitch triggers
    if (time > nextGlitchTime) {
        // Random chance to trigger a glitch
        if (Math.random() < 0.3) {
            glitchIntensity = 0.3 + Math.random() * 0.7; // Random intensity
        }
        // Schedule next potential glitch (2-8 seconds)
        nextGlitchTime = time + 2 + Math.random() * 6;
    }
    
    // Decay glitch intensity
    glitchIntensity *= 0.95;
    if (glitchIntensity < 0.01) glitchIntensity = 0;
}

function applyGlitchToRenderer() {
    if (glitchIntensity <= 0) {
        renderer.domElement.style.transform = '';
        renderer.domElement.style.filter = '';
        return;
    }
    
    // Random horizontal displacement
    const offsetX = (Math.random() - 0.5) * 10 * glitchIntensity;
    const skewX = (Math.random() - 0.5) * 2 * glitchIntensity;
    
    // RGB split effect via CSS
    const rgbSplit = glitchIntensity * 3;
    
    renderer.domElement.style.transform = `translateX(${offsetX}px) skewX(${skewX}deg)`;
    
    // Occasional color aberration
    if (Math.random() < glitchIntensity * 0.5) {
        renderer.domElement.style.filter = `hue-rotate(${Math.random() * 30 - 15}deg)`;
    } else {
        renderer.domElement.style.filter = '';
    }
}

// Glitch overlay for more intense effects
function createGlitchOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'glitch-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        opacity: 0;
        background: linear-gradient(
            transparent 0%,
            rgba(139, 233, 253, 0.03) 50%,
            transparent 51%,
            transparent 100%
        );
        background-size: 100% 4px;
        mix-blend-mode: overlay;
    `;
    document.body.appendChild(overlay);
    return overlay;
}

let glitchOverlay = null;

function updateGlitchOverlay() {
    if (!glitchOverlay) {
        glitchOverlay = createGlitchOverlay();
    }
    
    if (glitchIntensity > 0.3) {
        glitchOverlay.style.opacity = (glitchIntensity - 0.3) * 0.5;
        // Random scanline offset
        glitchOverlay.style.backgroundPosition = `0 ${Math.random() * 100}%`;
    } else {
        glitchOverlay.style.opacity = '0';
    }
}

function onMouseMove(event) {
    // Check if mouse is actually inside the viewport
    const x = event.clientX;
    const y = event.clientY;
    
    if (x <= 0 || x >= window.innerWidth || y <= 0 || y >= window.innerHeight) {
        // Mouse is at edge or outside - recenter
        mouseX = 0;
        mouseY = 0;
        mouseWorldX = 0;
        mouseWorldY = camera.position.y;
    } else {
        mouseX = (x - windowHalfX) * 0.05;
        mouseY = (y - windowHalfY) * 0.05;
        
        // Convert screen position to world coordinates for line attraction
        const normalizedX = (x / window.innerWidth) * 2 - 1;
        const normalizedY = -(y / window.innerHeight) * 2 + 1;
        
        // Unproject to world space
        const mouseVec = new THREE.Vector3(normalizedX, normalizedY, 0.5);
        mouseVec.unproject(camera);
        const dir = mouseVec.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const worldPos = camera.position.clone().add(dir.multiplyScalar(distance));
        
        mouseWorldX = worldPos.x;
        mouseWorldY = worldPos.y;
        mouseWorldZ = worldPos.z;
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
    
    // Update composer size
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (bloomPass) {
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Update shader uniforms
    if (particles && particles.material.uniforms) {
        particles.material.uniforms.uTime.value = time;
        particles.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
    
    // Rotate particles slowly
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;
    
    // Update matrix for line calculations
    particles.updateMatrixWorld();
    
    // Camera follows scroll position
    const targetY = -scrollY * 0.05; // Move camera down as user scrolls
    camera.position.y += (targetY - camera.position.y) * 0.1;
    
    // Mouse parallax effect
    camera.position.x += (mouseX - camera.position.x) * 0.02;
    camera.lookAt(new THREE.Vector3(0, camera.position.y, 0));
    
    // Scanline reactive particles
    updateParticlesWithScanline(time);
    
    // Update connection lines
    updateConnectionLines();
    
    // Update glitch effect
    updateGlitch(time);
    applyGlitchToRenderer();
    updateGlitchOverlay();
    
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
    
    // Render with bloom if available, otherwise standard render
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

function updateParticlesWithScanline(time) {
    if (!particlePositions || !particleColors) return;
    
    // Read scanline position from shared state (set by effects.js)
    const currentScanlineY = window.scanlineState ? window.scanlineState.y : scanlineY;
    
    const colors = particleColors.array;
    const positions = particlePositions.array;
    
    // Scanline effect parameters - pixel-perfect CRT behavior
    const leadingEdge = 0;      // Pixels ahead where particles start to glow
    const peakWidth = 8;         // Pixels of maximum brightness
    const trailingDecay = 60;   // Pixels behind for afterglow
    const maxBrightness = 2.5;   // Peak brightness multiplier
    const afterglowColor = 0.15; // Slight warm tint in afterglow
    
    // Temp vector for projection
    const tempVec = new THREE.Vector3();
    
    for (let i = 0; i < positions.length; i += 3) {
        // Get particle position
        tempVec.set(positions[i], positions[i + 1], positions[i + 2]);
        
        // Apply the particles group transform if it exists
        if (particles.matrixWorld) {
            tempVec.applyMatrix4(particles.matrixWorld);
        }
        
        // Project to screen space
        tempVec.project(camera);
        
        // Convert to pixel coordinates (0 = top, windowHeight = bottom)
        const screenY = (1 - tempVec.y) * 0.5 * window.innerHeight;
        
        // Distance to scanline in pixels (positive = scanline hasn't reached yet)
        const distToScanline = screenY - currentScanlineY;
        
        // Color index
        const colorIdx = i;
        
        // Base pulse for ambient life
        const ambientPulse = 0.85 + Math.sin(time * 1.5 + i * 0.05) * 0.15;
        
        let brightness = ambientPulse;
        let colorShiftR = 0;
        let colorShiftG = 0;
        let colorShiftB = 0;
        
        if (distToScanline > 0 && distToScanline < leadingEdge) {
            // LEADING EDGE: Scanline approaching
            const t = 1 - (distToScanline / leadingEdge);
            const easedT = t * t;
            brightness = ambientPulse + easedT * (maxBrightness - 1) * 0.5;
            colorShiftB = easedT * 0.1;
            
        } else if (Math.abs(distToScanline) <= peakWidth) {
            // PEAK: Scanline is here
            const t = 1 - Math.abs(distToScanline) / peakWidth;
            brightness = maxBrightness * (0.8 + t * 0.2);
            colorShiftR = t * 0.15;
            colorShiftG = t * 0.15;
            colorShiftB = t * 0.15;
            
        } else if (distToScanline < 0 && distToScanline > -trailingDecay) {
            // TRAILING EDGE: Phosphor afterglow decay
            const t = -distToScanline / trailingDecay;
            const decay = Math.exp(-t * 3);
            brightness = ambientPulse + decay * (maxBrightness - 1) * 0.7;
            colorShiftR = decay * afterglowColor * 0.5;
            colorShiftG = decay * afterglowColor * -0.2;
            colorShiftB = decay * afterglowColor * 0.3;
        }
        
        // Apply final colors
        colors[colorIdx] = Math.min(1, originalColors[colorIdx] * brightness + colorShiftR);
        colors[colorIdx + 1] = Math.min(1, originalColors[colorIdx + 1] * brightness + colorShiftG);
        colors[colorIdx + 2] = Math.min(1, originalColors[colorIdx + 2] * brightness + colorShiftB);
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

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uDitherStrength: { value: ditherStrength },
            uFogDensity: { value: fogDensity },
            uFogColor: { value: fogColor }
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    particles.renderOrder = 1;
    scene.add(particles);
}

// Expose to window for slider control
window.setParticleCount = setParticleCount;
window.getParticleCount = () => currentParticleCount;

// ============== EFFECT CONTROLS ==============

// Bloom controls
window.setBloomStrength = function(strength) {
    bloomStrength = strength;
    if (bloomPass) bloomPass.strength = strength;
};
window.setBloomRadius = function(radius) {
    bloomRadius = radius;
    if (bloomPass) bloomPass.radius = radius;
};
window.setBloomThreshold = function(threshold) {
    bloomThreshold = threshold;
    if (bloomPass) bloomPass.threshold = threshold;
};
window.getBloomSettings = () => ({ strength: bloomStrength, radius: bloomRadius, threshold: bloomThreshold });

// Lines controls
window.setLinesEnabled = function(enabled) {
    linesEnabled = enabled;
    if (linesMesh) linesMesh.visible = enabled;
};
window.setLinesMaxDistance = function(dist) {
    linesMaxDistance = dist;
};
window.setLinesOpacity = function(opacity) {
    linesOpacity = opacity;
    if (linesMesh) linesMesh.material.opacity = opacity;
};
window.setLinesAttraction = function(attraction) {
    linesAttraction = Math.max(0, Math.min(1, attraction));
};
window.getLinesSettings = () => ({ 
    enabled: linesEnabled, 
    maxDistance: linesMaxDistance, 
    opacity: linesOpacity,
    attraction: linesAttraction 
});

// Glitch controls
window.setGlitchEnabled = function(enabled) {
    glitchEnabled = enabled;
    if (!enabled) {
        glitchIntensity = 0;
        applyGlitchToRenderer();
        updateGlitchOverlay();
    }
};
window.triggerGlitch = function(intensity = 1) {
    glitchIntensity = intensity;
};
window.getGlitchSettings = () => ({ enabled: glitchEnabled, intensity: glitchIntensity });

// Reduce particles on mobile
if (isMobile()) {
    console.log('Mobile detected - using reduced particle count');
    // Disable some effects on mobile for performance
    linesEnabled = false;
    glitchEnabled = false;
}
