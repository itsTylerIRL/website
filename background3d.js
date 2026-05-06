// Three.js Particle Field Background
// Cyberpunk aesthetic with cyan accents - scanline reactive

let scene, camera, renderer, particles, mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let scrollY = 0;
let scanlineY = 0;
let particlePositions, particleColors, originalColors;
let particleVelocities = []; // Velocity for each particle

// Exclusion zones - circles defined in screen space {x, y, radius}
let exclusionZones = [];
window.exclusionZones = exclusionZones;

// Post-processing and effects
let composer, bloomPass, glitchPass, chromaticAberrationPass, godRaysPass, vignettePass;
let linesMesh, linesGeometry, linesPositions;
let glitchIntensity = 0;
let nextGlitchTime = 0;

// Nebula backdrop
let nebulaMesh, nebulaScene, nebulaCamera;
let nebulaEnabled = true;
let nebulaIntensity = 0.55;

// Data packets traveling along connection lines
let packetsMesh, packetsGeometry;
let packets = []; // { lineIndex, t, speed, color }
let packetsEnabled = true;
const MAX_PACKETS = 80;

// Track active line endpoints so packets know where to travel
let activeLineEndpoints = []; // [{x1,y1,z1,x2,y2,z2,brightness}]

// Volumetric light (god rays) settings
let godRaysEnabled = true;
let godRaysIntensity = 0.75;
let godRaysDecay = 0.95;
let godRaysDensity = 0.5;
let lightSource, lightSourceMesh, occlusionComposer, occlusionRenderTarget;

// Chromatic aberration settings
let chromaticAberrationEnabled = true;
let chromaticAberrationIntensity = 0.004;

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
let linesOpacity = 0.8; // Increased for visibility
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
    createVolumetricLightSource();
    createNebulaBackdrop();
    createDataPackets();
    
    // Setup post-processing (bloom + glitch + god rays + chromatic aberration)
    setupPostProcessing();
    
    camera.position.z = 50;

    // Event listeners (passive where possible to avoid blocking scroll/input)
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; }, { passive: true });
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onScroll, { passive: true });
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
    attribute float size;
    attribute vec3 velocity;
    varying vec3 vColor;
    varying vec2 vScreenPos;
    varying float vDepth;
    
    void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Velocity gives a subtle size boost (faster = slightly bigger glow)
        vec3 velView = mat3(modelViewMatrix) * velocity;
        float speed = length(velView.xy);
        float velBoost = 1.0 + clamp(speed * 60.0, 0.0, 0.3);
        
        // Size variation
        float baseSize = size * (300.0 / -mvPosition.z);
        gl_PointSize = min(baseSize * velBoost, 80.0);
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
        // Spherical particle shape
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
    const sizes = [];
    const velocityData = [];
    particleVelocities = []; // Reset velocities
    
    // Color palette - cyan primary, rare white accent
    const colorPalette = [
        new THREE.Color(0x8be9fd), // Cyan - primary
        new THREE.Color(0xf8f8f2), // White - rare accent
    ];

    for (let i = 0; i < 1500; i++) {
        // Flat plane distribution covering entire scrollable page
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 800; // Very tall to cover full scroll
        const z = (Math.random() - 0.5) * 100 - 20; // Depth behind camera plane
        
        vertices.push(x, y, z);
        
        // Size variation: most small, few large (power curve distribution)
        sizes.push(0.5 + Math.pow(Math.random(), 2.5) * 4.5);
        
        // Add random velocity for each particle (very slow drift)
        const speed = 0.003 + Math.random() * 0.005;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const vx = Math.sin(phi) * Math.cos(theta) * speed;
        const vy = Math.sin(phi) * Math.sin(theta) * speed;
        const vz = Math.cos(phi) * speed * 0.2;
        particleVelocities.push({ x: vx, y: vy, z: vz });
        velocityData.push(vx, vy, vz);
        
        // Color: 92% cyan, 8% white accent
        const color = Math.random() > 0.92 
            ? colorPalette[1]  // Rare white accent
            : colorPalette[0]; // Cyan primary
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocityData, 3));
    
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

// Exclusion zone API
window.setExclusionZone = function(id, x, y, radius) {
    // Set or update an exclusion zone by id
    const existing = exclusionZones.find(z => z.id === id);
    if (existing) {
        existing.x = x;
        existing.y = y;
        existing.radius = radius;
    } else {
        exclusionZones.push({ id, x, y, radius });
    }
};

window.removeExclusionZone = function(id) {
    const idx = exclusionZones.findIndex(z => z.id === id);
    if (idx !== -1) exclusionZones.splice(idx, 1);
};

window.clearExclusionZones = function() {
    exclusionZones.length = 0;
};

// Update particle positions with velocity and exclusion zone bouncing
function updateParticlePositions() {
    if (!particlePositions || particleVelocities.length === 0) return;
    
    const positions = particlePositions.array;
    const tempVec = new THREE.Vector3();
    const t = performance.now() * 0.001;
    
    for (let i = 0; i < positions.length / 3; i++) {
        const idx = i * 3;
        
        // Curl-noise flow field steers the particle's velocity.
        // We treat curl as a target *direction* and gently steer the velocity
        // toward it at a capped speed, so particles never accelerate unbounded.
        if (curlFlowEnabled) {
            curlNoise(positions[idx], positions[idx + 1], positions[idx + 2], t, _curlOut);
            const vel = particleVelocities[i];
            
            // Normalize curl output to a unit-ish direction
            const cMag = Math.sqrt(
                _curlOut.x * _curlOut.x +
                _curlOut.y * _curlOut.y +
                _curlOut.z * _curlOut.z
            ) || 1;
            const cx = _curlOut.x / cMag;
            const cy = _curlOut.y / cMag;
            const cz = _curlOut.z / cMag;
            
            // Per-particle target speed (kept low so motion is slow drift)
            const targetSpeed = 0.012 * curlFlowStrength;
            const tx = cx * targetSpeed;
            const ty = cy * targetSpeed;
            const tz = cz * targetSpeed * 0.3; // less Z motion
            
            // Lerp velocity toward the target (low blend = smooth)
            const blend = 0.04;
            vel.x += (tx - vel.x) * blend;
            vel.y += (ty - vel.y) * blend;
            vel.z += (tz - vel.z) * blend;
            
            // Hard cap on speed magnitude as a safety net
            const sp = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
            const maxSp = 0.025;
            if (sp > maxSp) {
                const k = maxSp / sp;
                vel.x *= k;
                vel.y *= k;
                vel.z *= k;
            }
        }
        
        // Move particle by velocity
        positions[idx] += particleVelocities[i].x;
        positions[idx + 1] += particleVelocities[i].y;
        positions[idx + 2] += particleVelocities[i].z;
        
        // Wrap around boundaries
        if (positions[idx] > 100) positions[idx] = -100;
        if (positions[idx] < -100) positions[idx] = 100;
        if (positions[idx + 1] > 400) positions[idx + 1] = -400;
        if (positions[idx + 1] < -400) positions[idx + 1] = 400;
        if (positions[idx + 2] > 30) positions[idx + 2] = -70;
        if (positions[idx + 2] < -70) positions[idx + 2] = 30;
        
        // Check exclusion zones (in screen space).
        // Only resolve the single deepest overlap per frame so multiple zones
        // can't stack pushes and fling the particle.
        if (exclusionZones.length > 0) {
            // Get particle screen position
            tempVec.set(positions[idx], positions[idx + 1], positions[idx + 2]);
            if (particles.matrixWorld) {
                tempVec.applyMatrix4(particles.matrixWorld);
            }
            tempVec.project(camera);
            
            // Convert to pixel coordinates
            const screenX = (tempVec.x + 1) * 0.5 * window.innerWidth;
            const screenY = (1 - tempVec.y) * 0.5 * window.innerHeight;
            
            // Find deepest-overlap zone
            let bestZone = null;
            let bestPenetration = 0;
            let bestDx = 0, bestDy = 0, bestDist = 1;
            for (const zone of exclusionZones) {
                const dx = screenX - zone.x;
                const dy = screenY - zone.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const penetration = zone.radius - dist;
                if (penetration > bestPenetration) {
                    bestPenetration = penetration;
                    bestZone = zone;
                    bestDx = dx;
                    bestDy = dy;
                    bestDist = dist;
                }
            }
            
            if (bestZone) {
                // Outward direction in *screen* space
                const nxScreen = bestDx / bestDist;
                const nyScreen = bestDy / bestDist;
                // Convert to world space: world Y is inverted vs screen Y
                const nxWorld = nxScreen;
                const nyWorld = -nyScreen;
                
                const vel = particleVelocities[i];
                
                // Reflect inward velocity component, keep tangential motion intact
                // dot of velocity with inward normal = how much it's moving INTO the zone
                const inwardDot = vel.x * (-nxWorld) + vel.y * (-nyWorld);
                if (inwardDot > 0) {
                    vel.x += 2 * inwardDot * nxWorld;
                    vel.y += 2 * inwardDot * nyWorld;
                }
                
                // Cap speed so reflections can't accumulate energy
                const sp = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
                const maxSp = 0.04;
                if (sp > maxSp) {
                    const k = maxSp / sp;
                    vel.x *= k; vel.y *= k; vel.z *= k;
                }
                
                // Gentle position correction proportional to penetration (clamped)
                const correct = Math.min(bestPenetration, 8) * 0.01;
                positions[idx] += nxWorld * correct;
                positions[idx + 1] += nyWorld * correct;
            }
        }
    }
    
    particlePositions.needsUpdate = true;
}

// ============== NEBULA BACKDROP ==============
// Procedural nebula rendered behind everything: deep cyan/purple clouds with subtle motion.
// Implemented as a large plane parented to the camera so it always fills the view.
function createNebulaBackdrop() {
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uScroll: { value: 0 },
            uIntensity: { value: nebulaIntensity },
            uColorA: { value: new THREE.Color(0x05121a) }, // deep teal
            uColorB: { value: new THREE.Color(0x1a0a2e) }, // deep purple
            uColorC: { value: new THREE.Color(0x8be9fd) }  // cyan highlight
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            uniform float uTime;
            uniform vec2 uResolution;
            uniform float uScroll;
            uniform float uIntensity;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform vec3 uColorC;

            vec2 hash2(vec2 p) {
                p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
            }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
                               dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
                           mix(dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
                               dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
            }
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p *= 2.02;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = vUv;
                float aspect = uResolution.x / uResolution.y;
                vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

                vec2 q = p + vec2(uTime * 0.015, uTime * 0.008 + uScroll * 0.0008);

                vec2 warp = vec2(fbm(q + vec2(0.0, 0.0)), fbm(q + vec2(5.2, 1.3)));
                float n = fbm(q + warp * 1.8);
                n = smoothstep(-0.2, 0.8, n);

                float n2 = fbm(q * 2.5 + warp * 0.7 - uTime * 0.02);
                n2 = pow(smoothstep(0.3, 0.95, n2), 2.0);

                float vign = smoothstep(1.6, 0.2, length(p));

                vec3 col = mix(uColorA, uColorB, n);
                col += uColorC * n2 * 0.35;

                vec2 sg = floor(uv * uResolution / 3.0);
                float spark = step(0.9985, fract(sin(dot(sg, vec2(12.9898, 78.233))) * 43758.5453));
                col += vec3(0.6, 0.85, 1.0) * spark * 0.4;

                col *= vign * uIntensity;

                gl_FragColor = vec4(col, 1.0);
            }
        `,
        depthTest: false,
        depthWrite: false
    });

    // Plane sized large enough to fill the camera frustum at its placement distance.
    // We'll attach it to the camera and update its scale on resize.
    const geo = new THREE.PlaneGeometry(2, 2);
    nebulaMesh = new THREE.Mesh(geo, mat);
    nebulaMesh.frustumCulled = false;
    nebulaMesh.renderOrder = -1000; // draw first
    sizeNebulaToCamera();

    // Attach to camera so it always faces and fills the view
    camera.add(nebulaMesh);
    if (!scene.children.includes(camera)) scene.add(camera);
}

function sizeNebulaToCamera() {
    if (!nebulaMesh || !camera) return;
    // Place near the far end of the frustum but inside it
    const dist = 800;
    const vFov = camera.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * dist;
    const width = height * camera.aspect;
    nebulaMesh.position.set(0, 0, -dist);
    nebulaMesh.scale.set(width / 2, height / 2, 1);
}

// ============== DATA PACKETS ==============
// Bright dots that travel along active connection lines like network traffic.
function createDataPackets() {
    packetsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PACKETS * 3);
    const colors = new Float32Array(MAX_PACKETS * 3);
    const sizes = new Float32Array(MAX_PACKETS);

    packetsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    packetsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    packetsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    packetsGeometry.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            attribute vec3 color;
            attribute float size;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 c = gl_PointCoord - vec2(0.5);
                float d = length(c);
                if (d > 0.5) discard;
                float core = smoothstep(0.5, 0.0, d);
                float glow = pow(core, 2.0);
                gl_FragColor = vec4(vColor * (0.7 + glow * 1.3), glow);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    packetsMesh = new THREE.Points(packetsGeometry, mat);
    packetsMesh.frustumCulled = false;
    packetsMesh.renderOrder = 2;
    scene.add(packetsMesh);
}

function updateDataPackets(dt) {
    if (!packetsEnabled || !packetsMesh) {
        if (packetsGeometry) packetsGeometry.setDrawRange(0, 0);
        return;
    }

    // Spawn new packets occasionally on bright lines
    if (activeLineEndpoints.length > 0) {
        const spawnChance = Math.min(0.6, activeLineEndpoints.length * 0.02);
        if (packets.length < MAX_PACKETS && Math.random() < spawnChance) {
            // Prefer brighter (cursor-adjacent) lines: pick from first portion
            const pickRange = Math.min(activeLineEndpoints.length, Math.max(8, activeLineEndpoints.length / 3));
            const lineIdx = Math.floor(Math.random() * pickRange);
            packets.push({
                lineIndex: lineIdx,
                t: 0,
                speed: 0.6 + Math.random() * 1.2, // units of t per second
                color: Math.random() < 0.2
                    ? new THREE.Color(0xff79c6)  // pink accent
                    : new THREE.Color(0x8be9fd), // cyan
                size: 2.0 + Math.random() * 2.5
            });
        }
    }

    const posArr = packetsGeometry.attributes.position.array;
    const colArr = packetsGeometry.attributes.color.array;
    const sizeArr = packetsGeometry.attributes.size.array;

    let live = 0;
    for (let i = 0; i < packets.length; i++) {
        const pk = packets[i];
        pk.t += pk.speed * dt;
        if (pk.t >= 1) continue;

        // Resolve endpoints: inline (burst packets) or via line index
        let x1, y1, z1, x2, y2, z2;
        if (pk.inline) {
            x1 = pk.x1; y1 = pk.y1; z1 = pk.z1;
            x2 = pk.x2; y2 = pk.y2; z2 = pk.z2;
        } else {
            if (pk.lineIndex >= activeLineEndpoints.length) continue;
            const ep = activeLineEndpoints[pk.lineIndex];
            x1 = ep.x1; y1 = ep.y1; z1 = ep.z1;
            x2 = ep.x2; y2 = ep.y2; z2 = ep.z2;
        }
        const t = pk.t;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        const z = z1 + (z2 - z1) * t;

        const idx = live * 3;
        if (idx + 2 >= posArr.length) break; // safety
        posArr[idx] = x;
        posArr[idx + 1] = y;
        posArr[idx + 2] = z;

        // Fade in/out at endpoints
        const fade = Math.sin(t * Math.PI); // 0 -> 1 -> 0
        colArr[idx] = pk.color.r * fade;
        colArr[idx + 1] = pk.color.g * fade;
        colArr[idx + 2] = pk.color.b * fade;
        sizeArr[live] = pk.size * (0.5 + fade * 0.5);

        live++;
    }

    // Cull dead packets
    packets = packets.filter(p => p.t < 1 && (p.inline || p.lineIndex < activeLineEndpoints.length));

    packetsGeometry.setDrawRange(0, live);
    packetsGeometry.attributes.position.needsUpdate = true;
    packetsGeometry.attributes.color.needsUpdate = true;
    packetsGeometry.attributes.size.needsUpdate = true;
}

// ============== CURL NOISE FLOW FIELD ==============
// 3D curl noise produces divergence-free swirling currents - very organic motion.
function _hash3(x, y, z) {
    let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return n - Math.floor(n);
}
function _vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);
    const c000 = _hash3(xi, yi, zi);
    const c100 = _hash3(xi + 1, yi, zi);
    const c010 = _hash3(xi, yi + 1, zi);
    const c110 = _hash3(xi + 1, yi + 1, zi);
    const c001 = _hash3(xi, yi, zi + 1);
    const c101 = _hash3(xi + 1, yi, zi + 1);
    const c011 = _hash3(xi, yi + 1, zi + 1);
    const c111 = _hash3(xi + 1, yi + 1, zi + 1);
    const x00 = c000 * (1 - u) + c100 * u;
    const x10 = c010 * (1 - u) + c110 * u;
    const x01 = c001 * (1 - u) + c101 * u;
    const x11 = c011 * (1 - u) + c111 * u;
    const y0 = x00 * (1 - v) + x10 * v;
    const y1 = x01 * (1 - v) + x11 * v;
    return y0 * (1 - w) + y1 * w;
}
function _potential(x, y, z, t) {
    // Three independent scalar fields, animated over time
    const s = 0.04;
    return [
        _vnoise(x * s, y * s, z * s + t * 0.05),
        _vnoise(x * s + 31.4, y * s + 17.8, z * s + 5.2 + t * 0.05),
        _vnoise(x * s + 7.1, y * s + 91.3, z * s + 22.6 + t * 0.05)
    ];
}
const _curlEps = 1.0;
function curlNoise(x, y, z, t, out) {
    const e = _curlEps;
    const p_x1 = _potential(x + e, y, z, t);
    const p_x0 = _potential(x - e, y, z, t);
    const p_y1 = _potential(x, y + e, z, t);
    const p_y0 = _potential(x, y - e, z, t);
    const p_z1 = _potential(x, y, z + e, t);
    const p_z0 = _potential(x, y, z - e, t);

    // curl = ( dPz/dy - dPy/dz, dPx/dz - dPz/dx, dPy/dx - dPx/dy )
    const dPz_dy = (p_y1[2] - p_y0[2]) / (2 * e);
    const dPy_dz = (p_z1[1] - p_z0[1]) / (2 * e);
    const dPx_dz = (p_z1[0] - p_z0[0]) / (2 * e);
    const dPz_dx = (p_x1[2] - p_x0[2]) / (2 * e);
    const dPy_dx = (p_x1[1] - p_x0[1]) / (2 * e);
    const dPx_dy = (p_y1[0] - p_y0[0]) / (2 * e);

    out.x = dPz_dy - dPy_dz;
    out.y = dPx_dz - dPz_dx;
    out.z = dPy_dx - dPx_dy;
}

let curlFlowEnabled = true;
let curlFlowStrength = 0.03;
const _curlOut = { x: 0, y: 0, z: 0 };

// ============== VOLUMETRIC LIGHT SOURCE ==============
function createVolumetricLightSource() {
    // Create a glowing light source that will emit god rays
    const lightGeo = new THREE.SphereGeometry(3, 32, 32);
    
    // Inner bright core
    const lightMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(0x8be9fd) }, // Cyan
            uColor2: { value: new THREE.Color(0xff79c6) }, // Pink
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec2 vUv;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec3 vNormal;
            varying vec2 vUv;
            
            void main() {
                // Pulsing glow effect
                float pulse = 0.8 + 0.2 * sin(uTime * 2.0);
                
                // Fresnel edge glow
                float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                
                // Color cycling
                vec3 color = mix(uColor1, uColor2, 0.5 + 0.5 * sin(uTime * 0.5));
                
                // Bright center, glowing edges
                float alpha = 0.9 * pulse;
                vec3 finalColor = color * (1.0 + fresnel * 2.0) * pulse;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    lightSourceMesh = new THREE.Mesh(lightGeo, lightMat);
    lightSourceMesh.position.set(-80, 30, -80); // Off to the upper-left, out of center view
    lightSourceMesh.scale.setScalar(0.6); // Smaller, more subtle
    scene.add(lightSourceMesh);
    
    // Outer glow halo
    const haloGeo = new THREE.SphereGeometry(5, 32, 32); // Smaller halo
    const haloMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0x8be9fd) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor;
            varying vec3 vNormal;
            
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                float pulse = 0.6 + 0.4 * sin(uTime * 1.5);
                gl_FragColor = vec4(uColor, intensity * 0.3 * pulse);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
    });
    
    const halo = new THREE.Mesh(haloGeo, haloMat);
    lightSourceMesh.add(halo);
    
    // Store reference
    lightSource = lightSourceMesh;
}

// ============== CHROMATIC ABERRATION SHADER ==============
const chromaticAberrationShader = {
    uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.004 },
        uTime: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
            // Direction from center
            vec2 dir = vUv - vec2(0.5);
            float dist = length(dir);
            
            // Radial chromatic aberration - stronger at edges
            vec2 offset = dir * dist * uIntensity;
            
            // Add subtle animated wobble for more dynamic feel
            float wobble = sin(uTime * 3.0 + dist * 10.0) * 0.0003;
            offset += dir * wobble;
            
            // Sample RGB channels with offset
            float r = texture2D(tDiffuse, vUv + offset * 1.0).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset * 1.0).b;
            
            // Get original alpha
            float a = texture2D(tDiffuse, vUv).a;
            
            gl_FragColor = vec4(r, g, b, a);
        }
    `
};

// ============== GOD RAYS SHADER ==============
const godRaysShader = {
    uniforms: {
        tDiffuse: { value: null },
        tOcclusion: { value: null },
        uLightPosition: { value: new THREE.Vector2(0.5, 0.5) },
        uIntensity: { value: 0.75 },
        uDecay: { value: 0.95 },
        uDensity: { value: 0.5 },
        uWeight: { value: 0.4 },
        uExposure: { value: 0.3 },
        uSamples: { value: 60 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tOcclusion;
        uniform vec2 uLightPosition;
        uniform float uIntensity;
        uniform float uDecay;
        uniform float uDensity;
        uniform float uWeight;
        uniform float uExposure;
        uniform float uSamples;
        varying vec2 vUv;
        
        void main() {
            // Original scene color
            vec4 color = texture2D(tDiffuse, vUv);
            
            // Calculate god rays from light position
            vec2 deltaTexCoord = vUv - uLightPosition;
            deltaTexCoord *= 1.0 / uSamples * uDensity;
            
            vec2 texCoord = vUv;
            float illuminationDecay = 1.0;
            vec3 godRayColor = vec3(0.0);
            
            // Ray marching from pixel toward light source
            for (int i = 0; i < 60; i++) {
                texCoord -= deltaTexCoord;
                
                // Clamp to valid UV range
                vec2 sampleCoord = clamp(texCoord, 0.0, 1.0);
                
                // Sample occlusion texture (bright areas emit rays)
                vec3 sampleColor = texture2D(tOcclusion, sampleCoord).rgb;
                sampleColor *= illuminationDecay * uWeight;
                
                godRayColor += sampleColor;
                illuminationDecay *= uDecay;
            }
            
            // Tint god rays with cyan/pink
            vec3 rayTint = mix(vec3(0.55, 0.91, 0.99), vec3(1.0, 0.47, 0.78), 
                              0.5 + 0.5 * sin(uLightPosition.x * 3.14159));
            godRayColor *= rayTint;
            
            // Combine with original scene
            vec3 finalColor = color.rgb + godRayColor * uIntensity * uExposure;
            
            gl_FragColor = vec4(finalColor, color.a);
        }
    `
};

// ============== VIGNETTE SHADER ==============
const vignetteShader = {
    uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.4 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        varying vec2 vUv;
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec2 center = vUv - vec2(0.5);
            float vignette = 1.0 - dot(center, center) * uIntensity * 2.0;
            gl_FragColor = vec4(color.rgb * vignette, color.a);
        }
    `
};

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
    
    // Create occlusion render target for god rays (lower resolution for performance)
    const occlusionSize = new THREE.Vector2(
        window.innerWidth * 0.5,
        window.innerHeight * 0.5
    );
    occlusionRenderTarget = new THREE.WebGLRenderTarget(occlusionSize.x, occlusionSize.y);
    
    // God rays pass
    if (typeof THREE.ShaderPass !== 'undefined') {
        godRaysPass = new THREE.ShaderPass(godRaysShader);
        godRaysPass.uniforms.tOcclusion.value = occlusionRenderTarget.texture;
        godRaysPass.enabled = godRaysEnabled;
        
        // Chromatic aberration pass
        chromaticAberrationPass = new THREE.ShaderPass(chromaticAberrationShader);
        chromaticAberrationPass.uniforms.uIntensity.value = chromaticAberrationIntensity;
        chromaticAberrationPass.enabled = chromaticAberrationEnabled;
    }
    
    // Composer
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    
    // Add god rays after bloom for better integration
    if (godRaysPass) {
        composer.addPass(godRaysPass);
    }
    
    // Chromatic aberration
    if (chromaticAberrationPass) {
        composer.addPass(chromaticAberrationPass);
    }
    
    // Vignette - final pass for cinematic framing
    if (typeof THREE.ShaderPass !== 'undefined') {
        vignettePass = new THREE.ShaderPass(vignetteShader);
        vignettePass.renderToScreen = true;
        composer.addPass(vignettePass);
    }
}

// Update god rays light position in screen space
function updateGodRaysLightPosition() {
    if (!lightSourceMesh || !godRaysPass) return;
    
    // Project light source position to screen space
    const lightPos = lightSourceMesh.position.clone();
    lightPos.project(camera);
    
    // Convert to UV coordinates (0-1 range)
    const screenX = (lightPos.x + 1) / 2;
    const screenY = (lightPos.y + 1) / 2;
    
    godRaysPass.uniforms.uLightPosition.value.set(screenX, screenY);
}

// Render occlusion texture for god rays
function renderOcclusionTexture() {
    if (!occlusionRenderTarget || !lightSourceMesh || !godRaysEnabled) return;
    
    // Store current visibility states
    const particlesVisible = particles ? particles.visible : false;
    const linesVisible = linesMesh ? linesMesh.visible : false;
    const nebulaVisible = nebulaMesh ? nebulaMesh.visible : false;
    const packetsVisible = packetsMesh ? packetsMesh.visible : false;
    
    // Hide everything except light source for occlusion render
    if (particles) particles.visible = false;
    if (linesMesh) linesMesh.visible = false;
    if (nebulaMesh) nebulaMesh.visible = false;
    if (packetsMesh) packetsMesh.visible = false;
    
    // Make light source extra bright for occlusion
    const originalColor = renderer.getClearColor(new THREE.Color());
    renderer.setClearColor(0x000000, 1);
    
    // Render to occlusion target
    renderer.setRenderTarget(occlusionRenderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    
    // Restore visibility
    if (particles) particles.visible = particlesVisible;
    if (linesMesh) linesMesh.visible = linesVisible;
    if (nebulaMesh) nebulaMesh.visible = nebulaVisible;
    if (packetsMesh) packetsMesh.visible = packetsVisible;
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
    
    // Reset packet line list each frame; we rebuild it as we draw lines.
    activeLineEndpoints.length = 0;
    
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
    const attractionRange = 80; // Tighter range
    const cursorConnectRange = 35; // Range where particles connect directly to cursor
    const maxCursorLines = 6; // Lines connecting to cursor
    
    // Track connections per particle to avoid over-connecting
    const connectionCount = new Map();
    const maxConnectionsPerParticle = 4;
    
    // Create lines prioritizing paths toward cursor
    const usedParticles = new Set();
    
    // FIRST: Draw lines from closest particles directly to cursor (subtle)
    for (let si = 0; si < Math.min(sortedIndices.length, maxCursorLines) && lineIndex < maxLines; si++) {
        const i = sortedIndices[si];
        const p1 = transformedPositions[i];
        
        if (p1.distToMouse > cursorConnectRange) continue;
        
        // Smooth cubic falloff for cleaner fade
        const t = p1.distToMouse / cursorConnectRange;
        const alpha = Math.pow(1 - t, 2); // Quadratic falloff
        
        const li = lineIndex * 6;
        
        // Line from particle to cursor
        linesPos[li] = p1.x;
        linesPos[li + 1] = p1.y;
        linesPos[li + 2] = p1.z;
        linesPos[li + 3] = mouseWorldX;
        linesPos[li + 4] = mouseWorldY;
        linesPos[li + 5] = mouseWorldZ;
        
        // Soft white/cyan gradient - brighter at particle, softer at cursor
        linesCol[li] = 0.9 * alpha + 0.1;
        linesCol[li + 1] = 0.95 * alpha + 0.1;
        linesCol[li + 2] = 1.0 * alpha + 0.1;
        linesCol[li + 3] = 0.55 * alpha;
        linesCol[li + 4] = 0.91 * alpha;
        linesCol[li + 5] = 0.99 * alpha;
        
        usedParticles.add(i);
        connectionCount.set(i, (connectionCount.get(i) || 0) + 1);
        activeLineEndpoints.push({
            x1: p1.x, y1: p1.y, z1: p1.z,
            x2: mouseWorldX, y2: mouseWorldY, z2: mouseWorldZ,
            brightness: alpha
        });
        lineIndex++;
    }
    
    // Second pass: Create elegant path lines radiating outward from cursor area
    for (let si = 0; si < Math.min(sortedIndices.length, 60) && lineIndex < maxLines * 0.6; si++) {
        const i = sortedIndices[si];
        const p1 = transformedPositions[i];
        
        if (p1.distToMouse > attractionRange) continue;
        if ((connectionCount.get(i) || 0) >= maxConnectionsPerParticle) continue;
        
        // Find the best neighbor - prefer ones further from mouse (outward flow)
        let bestJ = -1;
        let bestScore = -Infinity;
        
        for (let j = 0; j < transformedPositions.length; j++) {
            if (i === j) continue;
            if ((connectionCount.get(j) || 0) >= maxConnectionsPerParticle) continue;
            
            const p2 = transformedPositions[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            
            // Tighter distance threshold for cleaner connections
            if (distSq > maxDistSq * 0.8 || distSq < 4) continue;
            
            const dist = Math.sqrt(distSq);
            // Score: prefer outward direction, moderate distance, unused particles
            const directionScore = (p2.distToMouse - p1.distToMouse) / dist;
            const proximityScore = 1 - (dist / maxDist);
            const noveltyScore = usedParticles.has(j) ? 0.4 : 1;
            
            const score = (directionScore * linesAttraction * 0.8 + proximityScore * 0.6) * noveltyScore;
            
            if (score > bestScore) {
                bestScore = score;
                bestJ = j;
            }
        }
        
        if (bestJ !== -1 && bestScore > 0.1) { // Only draw high-quality connections
            const p2 = transformedPositions[bestJ];
            const dist = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + 
                Math.pow(p2.y - p1.y, 2) + 
                Math.pow(p2.z - p1.z, 2)
            );
            
            // Smooth falloff based on distance
            const distAlpha = Math.pow(1 - (dist / maxDist), 1.5);
            // Proximity to cursor boosts visibility
            const mouseProximity = Math.pow(1 - Math.min(p1.distToMouse / attractionRange, 1), 2);
            
            const li = lineIndex * 6;
            
            linesPos[li] = p1.x;
            linesPos[li + 1] = p1.y;
            linesPos[li + 2] = p1.z;
            linesPos[li + 3] = p2.x;
            linesPos[li + 4] = p2.y;
            linesPos[li + 5] = p2.z;
            
            // Color with alpha baked in - closer to mouse = brighter
            const brightness = (0.5 + mouseProximity * 0.5) * distAlpha;
            linesCol[li] = 0.55 * (1 + mouseProximity * 0.4) * brightness + 0.1;
            linesCol[li + 1] = 0.91 * brightness + 0.1;
            linesCol[li + 2] = 0.99 * brightness + 0.1;
            linesCol[li + 3] = 0.55 * brightness * 0.8;
            linesCol[li + 4] = 0.91 * brightness * 0.8;
            linesCol[li + 5] = 0.99 * brightness * 0.8;
            
            usedParticles.add(i);
            usedParticles.add(bestJ);
            connectionCount.set(i, (connectionCount.get(i) || 0) + 1);
            connectionCount.set(bestJ, (connectionCount.get(bestJ) || 0) + 1);
            activeLineEndpoints.push({
                x1: p1.x, y1: p1.y, z1: p1.z,
                x2: p2.x, y2: p2.y, z2: p2.z,
                brightness: brightness
            });
            lineIndex++;
        }
    }
    
    // Third pass: Ambient background connections (very subtle)
    for (let i = 0; i < visibleParticles.length && lineIndex < maxLines; i++) {
        const p1 = transformedPositions[i];
        if ((connectionCount.get(i) || 0) >= maxConnectionsPerParticle) continue;
        
        for (let j = i + 1; j < transformedPositions.length && lineIndex < maxLines; j++) {
            if ((connectionCount.get(j) || 0) >= maxConnectionsPerParticle) continue;
            
            const p2 = transformedPositions[j];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            
            // Particles within range get ambient connections
            if (distSq < maxDistSq * 0.7 && distSq > 4) {
                const dist = Math.sqrt(distSq);
                const alpha = Math.pow(1 - (dist / (maxDist * 0.85)), 2);
                
                const li = lineIndex * 6;
                
                linesPos[li] = p1.x;
                linesPos[li + 1] = p1.y;
                linesPos[li + 2] = p1.z;
                linesPos[li + 3] = p2.x;
                linesPos[li + 4] = p2.y;
                linesPos[li + 5] = p2.z;
                
                // Ambient cyan with alpha baked into color
                linesCol[li] = 0.55 * alpha + 0.05;
                linesCol[li + 1] = 0.85 * alpha + 0.05;
                linesCol[li + 2] = 0.95 * alpha + 0.05;
                linesCol[li + 3] = 0.55 * alpha + 0.05;
                linesCol[li + 4] = 0.85 * alpha + 0.05;
                linesCol[li + 5] = 0.95 * alpha + 0.05;
                
                connectionCount.set(i, (connectionCount.get(i) || 0) + 1);
                connectionCount.set(j, (connectionCount.get(j) || 0) + 1);
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
    scrollY = window._contentScrollY !== undefined ? window._contentScrollY : (window.scrollY || window.pageYOffset);
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Resize nebula backdrop to match new aspect
    sizeNebulaToCamera();
    
    // Update composer size
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (bloomPass) {
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
    // Update occlusion render target for god rays
    if (occlusionRenderTarget) {
        occlusionRenderTarget.setSize(
            window.innerWidth * 0.5,
            window.innerHeight * 0.5
        );
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    if (!animate._lastTime) animate._lastTime = time;
    const dt = Math.min(0.05, time - animate._lastTime);
    animate._lastTime = time;
    
    // Update particle positions with velocities and exclusion zones
    updateParticlePositions();
    
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
    
    // 3D rotation based on mouse position
    const targetRotationX = -mouseY * 0.015; // Vertical mouse = tilt up/down
    const targetRotationY = mouseX * 0.02;   // Horizontal mouse = rotate left/right
    
    // Smooth camera orbit around center
    const orbitRadius = 50;
    const targetCameraX = Math.sin(targetRotationY) * orbitRadius * 0.8;
    const targetCameraZ = 50 - (1 - Math.cos(targetRotationY)) * orbitRadius * 0.4;
    const targetCameraYOffset = Math.sin(targetRotationX) * orbitRadius * 0.5;
    
    // Smooth interpolation for camera position
    camera.position.x += (targetCameraX - camera.position.x) * 0.05;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.05;
    camera.position.y += (targetY + targetCameraYOffset - camera.position.y) * 0.05;
    
    // Camera always looks at center (with scroll offset)
    camera.lookAt(new THREE.Vector3(0, targetY, 0));
    
    // Scanline reactive particles
    updateParticlesWithScanline(time);
    
    // Update connection lines
    updateConnectionLines();
    
    // Update data packets traveling on lines
    updateDataPackets(dt);
    
    // Update glitch effect
    updateGlitch(time);
    applyGlitchToRenderer();
    updateGlitchOverlay();
    
    // Update volumetric light source
    if (lightSourceMesh) {
        // Animate the light source - subtle drift in the corner
        lightSourceMesh.position.x = -80 + Math.sin(time * 0.15) * 10;
        lightSourceMesh.position.y = targetY + 40 + Math.cos(time * 0.1) * 8;
        
        // Update shader uniforms
        if (lightSourceMesh.material.uniforms) {
            lightSourceMesh.material.uniforms.uTime.value = time;
        }
        // Update halo uniform
        if (lightSourceMesh.children[0] && lightSourceMesh.children[0].material.uniforms) {
            lightSourceMesh.children[0].material.uniforms.uTime.value = time;
        }
    }
    
    // Update god rays
    if (godRaysEnabled && godRaysPass) {
        renderOcclusionTexture();
        updateGodRaysLightPosition();
        godRaysPass.uniforms.uIntensity.value = godRaysIntensity;
        godRaysPass.uniforms.uDecay.value = godRaysDecay;
        godRaysPass.uniforms.uDensity.value = godRaysDensity;
    }
    
    // Update chromatic aberration
    if (chromaticAberrationPass) {
        chromaticAberrationPass.uniforms.uTime.value = time;
        chromaticAberrationPass.uniforms.uIntensity.value = chromaticAberrationIntensity;
    }
    
    // Update nebula uniforms
    if (nebulaMesh && nebulaMesh.material.uniforms) {
        nebulaMesh.material.uniforms.uTime.value = time;
        nebulaMesh.material.uniforms.uScroll.value = scrollY;
        nebulaMesh.material.uniforms.uIntensity.value = nebulaEnabled ? nebulaIntensity : 0;
        nebulaMesh.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
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
let currentParticleCount = 1500;

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
    const sizes = [];
    const velocityData = [];
    particleVelocities = []; // Reset velocities
    
    const colorPalette = [
        new THREE.Color(0x8be9fd), // Cyan - primary
        new THREE.Color(0xf8f8f2), // White - rare accent
    ];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 100 - 20;
        
        vertices.push(x, y, z);
        
        // Size variation: most small, few large (power curve distribution)
        sizes.push(0.5 + Math.pow(Math.random(), 2.5) * 4.5);
        
        // Add random velocity for each particle (very slow drift)
        const speed = 0.003 + Math.random() * 0.005;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const vx = Math.sin(phi) * Math.cos(theta) * speed;
        const vy = Math.sin(phi) * Math.sin(theta) * speed;
        const vz = Math.cos(phi) * speed * 0.2;
        particleVelocities.push({ x: vx, y: vy, z: vz });
        velocityData.push(vx, vy, vz);
        
        // Color: 92% cyan, 8% white accent
        const color = Math.random() > 0.92 
            ? colorPalette[1]  // Rare white accent
            : colorPalette[0]; // Cyan primary
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocityData, 3));
    
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
    if (linesMesh && linesMesh.material) linesMesh.material.opacity = opacity;
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

// God rays (volumetric light) controls
window.setGodRaysEnabled = function(enabled) {
    godRaysEnabled = enabled;
    if (godRaysPass) godRaysPass.enabled = enabled;
    if (lightSourceMesh) lightSourceMesh.visible = enabled;
};
window.setGodRaysIntensity = function(intensity) {
    godRaysIntensity = intensity;
};
window.setGodRaysDecay = function(decay) {
    godRaysDecay = decay;
};
window.setGodRaysDensity = function(density) {
    godRaysDensity = density;
};
window.getGodRaysSettings = () => ({ 
    enabled: godRaysEnabled, 
    intensity: godRaysIntensity,
    decay: godRaysDecay,
    density: godRaysDensity
});

// Chromatic aberration controls
window.setChromaticAberrationEnabled = function(enabled) {
    chromaticAberrationEnabled = enabled;
    if (chromaticAberrationPass) chromaticAberrationPass.enabled = enabled;
};
window.setChromaticAberrationIntensity = function(intensity) {
    chromaticAberrationIntensity = intensity;
};
window.getChromaticAberrationSettings = () => ({ 
    enabled: chromaticAberrationEnabled, 
    intensity: chromaticAberrationIntensity 
});

// Vignette controls
window.setVignetteIntensity = function(intensity) {
    if (vignettePass) vignettePass.uniforms.uIntensity.value = intensity;
};
window.getVignetteSettings = () => ({ 
    intensity: vignettePass ? vignettePass.uniforms.uIntensity.value : 0.4 
});

// Nebula backdrop controls
window.setNebulaEnabled = function(enabled) {
    nebulaEnabled = enabled;
    if (nebulaMesh) nebulaMesh.visible = enabled;
};
window.setNebulaIntensity = function(intensity) {
    nebulaIntensity = intensity;
    if (nebulaMesh && nebulaMesh.material.uniforms) {
        nebulaMesh.material.uniforms.uIntensity.value = intensity;
    }
};
window.getNebulaSettings = () => ({ enabled: nebulaEnabled, intensity: nebulaIntensity });

// Curl noise flow field controls
window.setCurlFlowEnabled = function(enabled) { curlFlowEnabled = enabled; };
window.setCurlFlowStrength = function(strength) { curlFlowStrength = strength; };
window.getCurlFlowSettings = () => ({ enabled: curlFlowEnabled, strength: curlFlowStrength });

// Data packets controls
window.setPacketsEnabled = function(enabled) {
    packetsEnabled = enabled;
    if (packetsMesh) packetsMesh.visible = enabled;
    if (!enabled) packets.length = 0;
};
window.getPacketsSettings = () => ({ enabled: packetsEnabled, count: packets.length });

// Reduce particles on mobile
if (isMobile()) {
    console.log('Mobile detected - using reduced particle count');
    // Disable some effects on mobile for performance
    linesEnabled = false;
    glitchEnabled = false;
    godRaysEnabled = false;
    chromaticAberrationEnabled = false;
    nebulaEnabled = false;
    packetsEnabled = false;
    curlFlowEnabled = false;
}

// ============== CARD-AWARE EXTRAS ==============
// Helpers that other parts of the page (cards, profile, etc.) can call.

// Convert a screen-space pixel position to world coordinates at the particle plane.
function screenToWorld(px, py) {
    if (!camera) return { x: 0, y: 0, z: 0 };
    const nx = (px / window.innerWidth) * 2 - 1;
    const ny = -(py / window.innerHeight) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0.5);
    v.unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const distance = -camera.position.z / (dir.z || -1);
    return camera.position.clone().add(dir.multiplyScalar(distance));
}

// ----- Auto exclusion zones around DOM elements -----
// Continuously updates exclusion zones to match the bounding rects of registered elements,
// so background particles flow around cards instead of through them.
const _trackedElements = new Map(); // element -> { id, padding }
let _exclusionTickerStarted = false;

function _updateTrackedExclusionZones() {
    _trackedElements.forEach((cfg, el) => {
        if (!el.isConnected) {
            window.removeExclusionZone(cfg.id);
            _trackedElements.delete(el);
            return;
        }
        const rect = el.getBoundingClientRect();
        // Only track if at least partially in the viewport
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
            window.removeExclusionZone(cfg.id);
            return;
        }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const r = Math.max(rect.width, rect.height) / 2 + (cfg.padding || 0);
        window.setExclusionZone(cfg.id, cx, cy, r);
    });
}

function _startExclusionTicker() {
    if (_exclusionTickerStarted) return;
    _exclusionTickerStarted = true;
    function tick() {
        _updateTrackedExclusionZones();
        requestAnimationFrame(tick);
    }
    tick();
}

window.trackExclusionElement = function(el, padding = 8) {
    if (!el || _trackedElements.has(el)) return;
    const id = 'track_' + Math.random().toString(36).slice(2, 9);
    _trackedElements.set(el, { id, padding });
    _startExclusionTicker();
    return id;
};

window.trackExclusionSelector = function(selector, padding = 8) {
    document.querySelectorAll(selector).forEach(el => window.trackExclusionElement(el, padding));
};

// ----- Packet burst from a screen-space origin -----
// Emits a radial spray of data packets from the given screen position.
window.spawnCardPacketBurst = function(screenX, screenY, accentRgb = '139,233,253', count = 14) {
    if (!packetsMesh || !packetsEnabled) return;
    const origin = screenToWorld(screenX, screenY);
    const parts = accentRgb.split(',').map(s => parseInt(s.trim(), 10) / 255);
    const color = new THREE.Color(
        isFinite(parts[0]) ? parts[0] : 0.55,
        isFinite(parts[1]) ? parts[1] : 0.91,
        isFinite(parts[2]) ? parts[2] : 0.99
    );

    const slots = Math.max(0, MAX_PACKETS - packets.length);
    const n = Math.min(count, slots);
    for (let i = 0; i < n; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * 0.6; // mostly in-plane
        const dist = 25 + Math.random() * 25;
        const dx = Math.cos(theta) * Math.cos(phi) * dist;
        const dy = Math.sin(theta) * Math.cos(phi) * dist;
        const dz = Math.sin(phi) * dist * 0.4;
        packets.push({
            inline: true,
            x1: origin.x, y1: origin.y, z1: origin.z,
            x2: origin.x + dx, y2: origin.y + dy, z2: origin.z + dz,
            t: 0,
            speed: 0.9 + Math.random() * 0.9,
            color: color.clone(),
            size: 2.5 + Math.random() * 2.5
        });
    }
};

// ----- Cursor trail removed (was causing performance issues) -----
window.setCursorTrailEnabled = function() {};
window.getCursorTrailSettings = () => ({ enabled: false });
