/* Radgotchi Virtual Pet Module */
const RG = (function() {
    const basePath = 'assets/radbros/';
    const faces = {
        cool: basePath + 'COOL.png',
        excited: basePath + 'EXCITED.png',
        grateful: basePath + 'GRATEFUL.png',
        happy: basePath + 'HAPPY.png',
        intense: basePath + 'INTENSE.png',
        lonely: basePath + 'LONELY.png',
        look_l: basePath + 'LOOK_L.png',
        look_l_happy: basePath + 'LOOK_L_HAPPY.png',
        look_r: basePath + 'LOOK_R.png',
        look_r_happy: basePath + 'LOOK_R_HAPPY.png',
        sad: basePath + 'SAD.png',
        sleep: basePath + 'SLEEP.png',
        sleep2: basePath + 'SLEEP2.png',
        smart: basePath + 'SMART.png',
        upload: basePath + 'UPLOAD.png'
    };
    Object.values(faces).forEach(src => { const i = new Image(); i.src = src; });

    const negativeMoods = ['sad', 'lonely'];
    const positiveMoods = ['happy', 'excited', 'cool', 'grateful', 'smart'];

    const statusText = {
        happy: ['ASSET VERIFIED', 'OPS NOMINAL', 'CLEARANCE GRANTED', 'ALL SYSTEMS GREEN'],
        cool: ['OVERWATCH ACTIVE', 'CHILL PROTOCOL', 'LOW THREAT POSTURE'],
        excited: ['SIGNAL ACQUIRED', 'CONTACT CONFIRMED', 'BURST DETECTED'],
        grateful: ['LOYALTY LOGGED', 'BOND STRENGTHENED', 'TRUST ELEVATED'],
        intense: ['THREAT DETECTED', 'ESCALATION ACTIVE', 'HIGH ALERT'],
        smart: ['FORENSIC MODE', 'ANALYZING VECTORS', 'STACK TRACE ACTIVE'],
        lonely: ['NO UPLINK', 'COMMS DARK', 'ZERO CONTACTS'],
        sad: ['SIGNAL LOST', 'MORALE CRITICAL', 'FAITH DECLINING'],
        sleep: ['DORMANT OPS', 'LOW POWER STATE', 'PASSIVE COLLECT'],
        upload: ['EXFIL IN PROGRESS', 'BURST TRANSMISSION', 'DATA EGRESS'],
        look_l: ['SCANNING LEFT', 'VISUAL SWEEP'],
        look_r: ['SCANNING RIGHT', 'PERIMETER CHECK'],
        look_l_happy: ['FRIENDLY LEFT', 'ALLY SPOTTED'],
        look_r_happy: ['FRIENDLY RIGHT', 'CONTACT FRIENDLY']
    };

    let container, face, status;
    let mood = 'happy', lastMood = 'happy';
    let locked = false, moodTimer = null;
    let lastInteractTime = Date.now();
    let hoverActive = false;
    let petCount = 0, clickCount = 0, clickTimer = null;
    let currentRoutine = null, idleStep = 0, routineTimer = null;
    let idleInterval = null, zInterval = null;
    let eyeTrackThrottle = 0;
    let isInRoutine = false;

    const idleRoutines = [
        { name: 'patrol', steps: ['look_l','happy','look_r','happy','look_l_happy','happy'], stepTime: 800, anim: ['rg-peek-l','rg-bounce','rg-peek-r','rg-bounce','rg-peek-l','rg-wiggle'] },
        { name: 'study', steps: ['smart','smart','excited'], stepTime: 1000, anim: ['rg-nod','rg-pulse','rg-bounce'] },
        { name: 'vibe', steps: ['cool','happy','cool','happy'], stepTime: 1200, anim: ['rg-float','rg-wiggle','rg-float','rg-bounce'] },
        { name: 'restless', steps: ['look_l','look_r','look_l','look_r','lonely'], stepTime: 900, anim: ['rg-peek-l','rg-peek-r','rg-peek-l','rg-peek-r','rg-nod'] },
        { name: 'nap_prep', steps: ['happy','sleep','sleep2','sleep','sleep2','happy'], stepTime: 1500, anim: ['rg-nod','rg-sleep','rg-sleep','rg-sleep','rg-sleep','rg-bounce'] },
        { name: 'hack', steps: ['smart','intense','smart','excited'], stepTime: 900, anim: ['rg-nod','rg-shake','rg-pulse','rg-bounce'] },
        { name: 'social', steps: ['look_l','happy','look_r','grateful'], stepTime: 1000, anim: ['rg-peek-l','rg-bounce','rg-peek-r','rg-wiggle'] },
        { name: 'upload_cycle', steps: ['upload','upload','upload','happy'], stepTime: 500, anim: ['rg-upload','rg-upload','rg-upload','rg-bounce'] },
        { name: 'existential', steps: ['smart','lonely','sad','cool'], stepTime: 1200, anim: ['rg-nod','rg-nod','rg-nod','rg-float'] }
    ];

    function init() {
        container = document.getElementById('radgotchi-container');
        face = document.getElementById('radgotchi-face');
        status = document.getElementById('radgotchi-status');
        if (!container || !face || !status) { return; }

        container.addEventListener('click', handleClick);
        container.addEventListener('dblclick', handleDblClick);
        container.addEventListener('mouseenter', handleHoverEnter);
        container.addEventListener('mouseleave', handleHoverLeave);
        document.addEventListener('mousemove', handleMouseMove);

        setMood('happy', { anim: 'rg-bounce' });
        idleInterval = setInterval(idleCheck, 3000);
        setTimeout(function() { if (!locked) startRoutine(); }, 2000);
    }

    function setMood(newMood, opts) {
        opts = opts || {};
        if (locked && !opts.priority) return;
        if (!faces[newMood]) return;
        if (moodTimer) clearTimeout(moodTimer);

        lastMood = mood;
        mood = newMood;
        face.src = faces[mood];

        var pool = statusText[mood];
        var text = opts.status || (pool ? pool[Math.floor(Math.random() * pool.length)] : 'STANDBY');
        status.textContent = text;

        clearAnim();
        if (opts.anim) face.classList.add(opts.anim);

        if (negativeMoods.indexOf(mood) !== -1) {
            face.classList.add('rg-sad');
        } else {
            face.classList.remove('rg-sad');
        }

        if (mood === 'sleep' || mood === 'sleep2') { startZzz(); } else { stopZzz(); }

        if (opts.priority) {
            locked = true;
            setTimeout(function() { locked = false; }, opts.duration || 3000);
        }

        if (opts.duration) {
            moodTimer = setTimeout(function() { setMood('happy', { anim: 'rg-bounce' }); }, opts.duration);
        }
    }

    function clearAnim() {
        var classes = [];
        for (var i = 0; i < face.classList.length; i++) {
            if (face.classList[i].indexOf('rg-') === 0 && face.classList[i] !== 'rg-sad') {
                classes.push(face.classList[i]);
            }
        }
        classes.forEach(function(c) { face.classList.remove(c); });
    }

    function startZzz() {
        if (zInterval) return;
        var chars = ['z', 'Z', 'zZ', 'Zz'];
        zInterval = setInterval(function() {
            var z = document.createElement('span');
            z.className = 'rg-zzz';
            z.textContent = chars[Math.floor(Math.random() * chars.length)];
            z.style.left = (60 + Math.random() * 40) + '%';
            z.style.top = '10%';
            container.appendChild(z);
            setTimeout(function() { z.remove(); }, 2500);
        }, 1200);
    }

    function stopZzz() {
        if (zInterval) { clearInterval(zInterval); zInterval = null; }
        var zzz = container.querySelectorAll('.rg-zzz');
        for (var i = 0; i < zzz.length; i++) zzz[i].remove();
    }

    function stopRoutine() {
        isInRoutine = false;
        currentRoutine = null;
        idleStep = 0;
        if (routineTimer) { clearTimeout(routineTimer); routineTimer = null; }
    }

    function startRoutine() {
        if (isInRoutine || locked) return;
        var hour = new Date().getHours();
        var pool = idleRoutines.slice();
        if (hour >= 23 || hour < 6) {
            pool.push(idleRoutines[4]); // nap_prep
        }
        currentRoutine = pool[Math.floor(Math.random() * pool.length)];
        idleStep = 0;
        isInRoutine = true;
        stepRoutine();
    }

    function stepRoutine() {
        if (!currentRoutine || idleStep >= currentRoutine.steps.length) {
            stopRoutine();
            setMood('happy', { anim: 'rg-bounce' });
            return;
        }
        var m = currentRoutine.steps[idleStep];
        var a = currentRoutine.anim[idleStep];
        if (faces[m]) face.src = faces[m];
        var pool = statusText[m];
        if (pool) status.textContent = pool[Math.floor(Math.random() * pool.length)];
        clearAnim();
        if (a) face.classList.add(a);
        if (negativeMoods.indexOf(m) !== -1) { face.classList.add('rg-sad'); } else { face.classList.remove('rg-sad'); }
        if (m === 'sleep' || m === 'sleep2') { startZzz(); } else { stopZzz(); }
        mood = m;

        idleStep++;
        routineTimer = setTimeout(stepRoutine, currentRoutine.stepTime);
    }

    function idleCheck() {
        if (locked || hoverActive || isInRoutine) return;
        var idle = Date.now() - lastInteractTime;

        if (idle > 60000) {
            var hour = new Date().getHours();
            if (hour >= 23 || hour < 6) {
                setMood('sleep', { anim: 'rg-sleep' });
            } else if (Math.random() < 0.5) {
                setMood('lonely', { anim: 'rg-nod', duration: 5000 });
            } else {
                startRoutine();
            }
        } else if (idle > 8000) {
            if (Math.random() < 0.7) startRoutine();
        } else {
            if (Math.random() < 0.3) startRoutine();
            else if (Math.random() < 0.2) {
                var flash = positiveMoods[Math.floor(Math.random() * positiveMoods.length)];
                setMood(flash, { anim: 'rg-wiggle', duration: 1500 });
            }
        }
    }

    function handleClick(e) {
        e.stopPropagation();
        lastInteractTime = Date.now();
        petCount++;
        clickCount++;
        stopRoutine();

        var ripple = document.createElement('div');
        ripple.className = 'rg-click-ripple';
        var rect = container.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        container.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);

        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(function() { clickCount = 0; }, 500);

        if (clickCount >= 5) {
            setMood('intense', { anim: 'rg-shake', status: 'EXCESSIVE INPUT \u2014 CEASE', priority: true, duration: 3000 });
            clickCount = 0;
        } else if (clickCount >= 3) {
            setMood('excited', { anim: 'rg-bounce', status: 'RAPID CONTACT NOTED', duration: 1500 });
        } else {
            var reactions = [
                { m: 'happy', a: 'rg-bounce' },
                { m: 'excited', a: 'rg-wiggle' },
                { m: 'cool', a: 'rg-nod' },
                { m: 'grateful', a: 'rg-pulse' },
                { m: 'smart', a: 'rg-nod' }
            ];
            var r = reactions[Math.floor(Math.random() * reactions.length)];
            var s = undefined;
            if (petCount === 10) s = '10 CONTACTS \u2014 TRUST BUILDING';
            else if (petCount === 50) s = '50 CONTACTS \u2014 BOND CONFIRMED';
            else if (petCount === 100) s = '100 CONTACTS \u2014 LOYALTY MAXED';
            setMood(r.m, { anim: r.a, duration: 1500, status: s });
        }
    }

    function handleDblClick(e) {
        e.preventDefault();
        e.stopPropagation();
        lastInteractTime = Date.now();
        stopRoutine();
        setMood('excited', { anim: 'rg-spin', status: 'EVASIVE MANEUVER', duration: 1500 });
    }

    function handleHoverEnter() {
        hoverActive = true;
        lastInteractTime = Date.now();
        stopRoutine();
        if (mood === 'sleep' || mood === 'sleep2') {
            setMood('happy', { anim: 'rg-bounce', status: 'ALERT \u2014 CONTACT DETECTED' });
        } else if (mood === 'lonely' || mood === 'sad') {
            setMood('grateful', { anim: 'rg-wiggle', status: 'UPLINK RESTORED', duration: 2000 });
        } else {
            setMood('happy', { anim: 'rg-wiggle' });
        }
    }

    function handleHoverLeave() {
        hoverActive = false;
    }

    function handleMouseMove(e) {
        if (locked || isInRoutine) return;
        var now = Date.now();
        if (now - eyeTrackThrottle < 150) return;
        eyeTrackThrottle = now;
        if (!container) return;

        var rect = container.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var dist = e.clientX - centerX;

        if (Math.abs(dist) < 30) return;
        if (Math.abs(dist) > 400) return;

        lastInteractTime = Date.now();
        var isHappy = positiveMoods.indexOf(mood) !== -1;
        if (dist < 0) {
            face.src = faces[isHappy ? 'look_l_happy' : 'look_l'];
        } else {
            face.src = faces[isHappy ? 'look_r_happy' : 'look_r'];
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        setMood: setMood,
        startRoutine: startRoutine,
        get mood() { return mood; },
        get petCount() { return petCount; }
    };
})();
