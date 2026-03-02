# Radgotchi — Technical Summary & Integration Guide

> **Component**: Radgotchi Virtual Pet System (RADTECH)
> **Type**: Client-side reactive virtual pet module with system telemetry awareness
> **Implementation**: Vanilla JavaScript IIFE module (`RG`) + CSS animations + PNG sprite sheet
> **Current Host**: DEEPDISH TOP dashboard (`index.html`, center column RADTECH panel)
> **License**: Proprietary / DEEPDISH project

---

## 1. Architecture Overview

Radgotchi is a self-contained, stateful virtual pet that reacts to user interaction, system telemetry, and time-of-day context. It runs entirely in the browser with no backend state — all logic is in a single IIFE (`const RG = (function() { ... })()`) that exposes a minimal public API.

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  HOST APPLICATION (any web page / Electron / etc.)      │
│                                                         │
│  ┌──────────────┐    ┌─────────────────────────────┐    │
│  │  HTML Shell   │    │  Telemetry Source            │    │
│  │  • <img> face │    │  (REST API, WebSocket, etc.) │    │
│  │  • <span> txt │    └──────────┬──────────────────┘    │
│  │  • <div> ctnr │               │                       │
│  └──────┬───────┘               │                       │
│         │                        │                       │
│  ┌──────▼────────────────────────▼───────────────────┐  │
│  │  RG Module (IIFE)                                  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │  │
│  │  │  State    │ │  Sprites  │ │  Idle Engine     │  │  │
│  │  │  Machine  │ │  (25 PNG) │ │  (10 routines)   │  │  │
│  │  └──────────┘ └───────────┘ └──────────────────┘  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │  │
│  │  │  Event    │ │  Mouse    │ │  Health          │  │  │
│  │  │  Reactor  │ │  Tracker  │ │  Assessor        │  │  │
│  │  └──────────┘ └───────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CSS Animations (13 @keyframes + particle system) │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 File Inventory

| Asset | Path | Purpose |
|-------|------|---------|
| **JavaScript** | Inline in `index.html` (~450 lines) | `RG` IIFE module — all pet logic |
| **CSS** | Inline in `index.html` (~150 lines) | Sprite styling + 15 `@keyframes` animations |
| **Sprites** | `static/radgotchi/*.png` (25 files) | Mood state images |
| **Icon** | `static/radgotchi/icon.jpg` | Radgotchi favicon/icon |
| **Bonus** | `static/radgotchi/radcoin.gif` | Animated radcoin graphic |

---

## 2. Sprite System

### 2.1 Sprite Manifest (25 States)

| Sprite Key | Filename | Category | Description |
|------------|----------|----------|-------------|
| `awake` | `AWAKE.png` | **Neutral** | Default resting state |
| `happy` | `HAPPY.png` | **Positive** | General happiness |
| `excited` | `EXCITED.png` | **Positive** | High-energy reaction |
| `cool` | `COOL.png` | **Positive** | Relaxed confidence |
| `grateful` | `GRATEFUL.png` | **Positive** | Acknowledgment |
| `motivated` | `MOTIVATED.png` | **Positive** | Ready/energized |
| `friend` | `FRIEND.png` | **Social** | Connection/handshake |
| `look_l` | `LOOK_L.png` | **Tracking** | Eyes left (mouse tracking) |
| `look_r` | `LOOK_R.png` | **Tracking** | Eyes right (mouse tracking) |
| `look_l_happy` | `LOOK_L_HAPPY.png` | **Tracking** | Eyes left + happy |
| `look_r_happy` | `LOOK_R_HAPPY.png` | **Tracking** | Eyes right + happy |
| `smart` | `SMART.png` | **Analytical** | Thinking/analyzing |
| `intense` | `INTENSE.png` | **Alert** | High-load/warning |
| `debug` | `DEBUG.png` | **Analytical** | Forensic/diagnostic |
| `bored` | `BORED.png` | **Negative** | No activity |
| `sad` | `SAD.png` | **Negative** | Loss/offline event |
| `angry` | `ANGRY.png` | **Negative** | Critical event / abuse |
| `lonely` | `LONELY.png` | **Negative** | Extended idle |
| `demotivated` | `DEMOTIVATED.png` | **Negative** | Low morale |
| `broken` | `BROKEN.png` | **Error** | System failure |
| `sleep` | `SLEEP.png` | **Idle** | Sleeping frame 1 |
| `sleep2` | `SLEEP2.png` | **Idle** | Sleeping frame 2 |
| `upload` | `UPLOAD.png` | **Action** | Data transfer frame 1 |
| `upload1` | `UPLOAD1.png` | **Action** | Data transfer frame 2 |
| `upload2` | `UPLOAD2.png` | **Action** | Data transfer frame 3 |

### 2.2 Sprite Requirements

- **Format**: PNG with transparency
- **Style**: Pixel art, works best at small sizes (64–128px display width)
- **Rendering**: CSS `image-rendering: pixelated` / `crisp-edges` to preserve pixel art
- **Colorization**: Original sprites are re-colored via CSS `filter` chain (not shown in their natural colors):
  - **Red theme**: `invert(1) sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.1) contrast(1.1)` + red drop-shadow
  - **Blue theme**: `invert(1) sepia(1) saturate(6) hue-rotate(160deg) brightness(1.2) contrast(1.1)` + cyan drop-shadow
- **Negative moods**: Additional grayscale + dimming: `invert(1) grayscale(0.7) brightness(0.5)`

---

## 3. CSS Animation System

### 3.1 Animation Classes

All animations are applied as CSS classes on the `<img>` element. The JS module adds/removes `rg-*` classes.

| Class | Keyframe | Duration | Timing | Behavior |
|-------|----------|----------|--------|----------|
| `rg-bounce` | `rg-bounce` | 0.35s | ease-in-out | Translate Y -8px → -3px → 0 |
| `rg-wiggle` | `rg-wiggle` | 0.5s | ease-in-out | Rotate ±5° oscillation |
| `rg-shake` | `rg-shake` | 0.4s | ease-in-out | Translate X ±4px rapid |
| `rg-nod` | `rg-nod` | 0.6s | ease-in-out | Translate Y 3px + small rotation |
| `rg-float` | `rg-float` | 2s | ease-in-out infinite | Gentle Y hover ±5px |
| `rg-spin` | `rg-spin` | 0.6s | ease-in-out | Full 360° Y-axis rotation |
| `rg-pulse` | `rg-pulse` | 0.8s | ease-in-out | Scale to 1.08 + brightness 1.3 |
| `rg-peek-l` | `rg-peek-l` | 0.4s | ease-out forwards | Slide left 6px (persists) |
| `rg-peek-r` | `rg-peek-r` | 0.4s | ease-out forwards | Slide right 6px (persists) |
| `rg-sleep` | `rg-sleep-bob` | 3s | ease-in-out infinite | Gentle bob + rotation sway |
| `rg-upload` | `rg-upload-pulse` | 0.8s | ease-in-out infinite | Subtle Y translate + opacity |
| `rg-scared` | `rg-shake` | 0.3s | ease-in-out infinite | Rapid persistent shake |
| `rg-sad` | `rg-droop` | 2s | ease-in-out infinite | Slow droop (special filter applied) |

### 3.2 Ambient Animation

A constant subtle `rg-breathe` animation (4s ease-in-out infinite, scale 1→1.015→1) runs at all times as the base animation on `.radgotchi-face`.

### 3.3 Particle Effects

| Effect | Class | Trigger | Behavior |
|--------|-------|---------|----------|
| **Sleep Z's** | `.rg-zzz` | Sleep/sleep2 mood | Spawns `z`/`Z`/`zZ`/`Zz` text elements that float upward and fade (2.5s, ~1.8s spawn interval) |
| **Click Ripple** | `.rg-click-ripple` | Any click on pet | Expanding circle border from click point (0.6s, 60px diameter) |

---

## 4. JavaScript Module — Full API Reference

### 4.1 Public API

The `RG` module exposes these members:

```javascript
const RG = (function() { ... })();

// Methods
RG.setMood(mood, opts)       // Set a mood directly
RG.react(level, msg)         // React to a system event
RG.assessHealth(data)        // Evaluate telemetry data and adjust mood
RG.panelHover(panelName)     // React to hover on a named UI section

// Read-only properties
RG.mood                      // Current mood string (getter)
RG.petCount                  // Cumulative click count (getter)
```

### 4.2 `setMood(mood, opts)` — Core Mood Setter

Sets the pet's visual and text state.

**Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `mood` | `string` | One of the 25 sprite keys (e.g., `'happy'`, `'angry'`, `'sleep'`) |
| `opts.duration` | `number` | Auto-reset to `'awake'` after N milliseconds. `0` = permanent until changed |
| `opts.anim` | `string` | CSS animation class to apply (e.g., `'rg-bounce'`) |
| `opts.status` | `string` | Explicit status text override. If omitted, a random themed message is chosen |
| `opts.priority` | `boolean` | If `true`, locks the mood — other non-priority `setMood` calls are ignored until lock expires |

**Behavior**:
- Updates the `<img>` `src` to the corresponding sprite
- Updates status text (random pick from themed pool or explicit override)
- Applies CSS animation class
- Applies `.rg-sad` filter for negative moods (`sad`, `angry`, `broken`, `lonely`, `demotivated`)
- Starts/stops sleep Z particles as needed
- Priority moods set a lock timer — the pet can't be interrupted

### 4.3 `react(level, msg)` — System Event Reactor

Called when a system event occurs (container state change, node offline, CPU spike, etc.).

**Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `level` | `string` | `'critical'`, `'warning'`, `'info'`, `'ok'` |
| `msg` | `string` | Event description text — parsed for keywords |

**Keyword Matching Logic** (in priority order):

| Level / Keyword | Mood | Animation | Duration | Priority |
|-----------------|------|-----------|----------|----------|
| `critical` | angry | rg-shake | 6s | **yes** (locks) |
| `warning` | intense | rg-shake | 3.5s | no |
| `offline`, `down` | sad | rg-droop | 4s | no |
| `online`, `started` | excited | rg-bounce | 2.5s | no |
| `container`, `docker` | smart | rg-nod | 2.5s | no |
| `cpu` + `high`/`spike` | intense | rg-shake | 3s | no |
| `memory` + `high`/`pressure` | intense | rg-pulse | 3s | no |
| `connection`, `network` | friend | rg-bounce | 2s | no |
| `sync`, `upload`, `transfer` | upload | rg-upload + frame cycle | 3.5s | no |
| `debug`, `trace` | debug | rg-nod | 2.5s | no |
| `failed`, `error`, `crash` | broken | rg-shake | 3.5s | no |
| `chat:` | smart | rg-nod | 2s | no |
| `info` (25% chance) | random positive | varies | 1.8s | no |
| `ok` (40% chance) | happy | rg-bounce | 1.5s | no |

### 4.4 `assessHealth(data)` — Telemetry Health Monitor

Called on each poll cycle with the full metrics payload. Derives a health state and triggers mood transitions on changes.

**Parameters**:

```javascript
// Expected data shape:
{
  cpu: { usage_total: number },       // 0–100
  memory: { percent: number },        // 0–100
  temperatures: [{ current: number }] // degrees Celsius
}
```

**Thresholds**:

| Condition | Health State |
|-----------|-------------|
| CPU > 90% OR memory > 92% OR any temp > 85°C | `'crit'` |
| CPU > 75% OR memory > 80% | `'warn'` |
| Otherwise | `'good'` |

**Mood transitions on health state change**:

| Transition | Mood Response |
|------------|--------------|
| → `crit` | `intense` (4s, rg-shake, "THREAT LEVEL CRITICAL") |
| → `warn` (from idle) | `intense` (2.5s, rg-pulse, "ESCALATION DETECTED") |
| → `good` (from alert) | `happy` (2s, rg-bounce, "THREAT NEUTRALIZED") |

### 4.5 `panelHover(panelName)` — Dashboard Section Hover Reactions

Called when the user hovers over a named section of the host dashboard.

**Parameters**: `panelName` — string key from the panel reactions map.

**Behavior**: Picks a random reaction from the panel-specific pool, applies mood + animation + status text for 2.5s. Has a 2.5s cooldown between reactions. Does not fire during priority locks, pet hover, or active idle routines.

**Built-in Panel Keys** (22 total):
`cpu`, `gpu`, `network`, `disk`, `temps`, `storage`, `interfaces`, `np`, `users`, `system`, `cluster`, `nodes`, `ha`, `obsidian`, `procs`, `docker`, `systemd`, `netflow`, `connections`, `ocs`, `chat`, `topo`, `events`

Each key maps to 3 possible reactions with themed mood/animation/status text.

### 4.6 Internal State Machine

| State Variable | Type | Description |
|----------------|------|-------------|
| `mood` | string | Current mood key |
| `lastMood` | string | Previous mood key |
| `locked` | boolean | Priority lock active |
| `moodTimer` | timeout | Auto-reset timer |
| `lastInteractTime` | timestamp | Last user interaction (ms) |
| `hoverActive` | boolean | Mouse is over pet container |
| `petCount` | number | Cumulative click count |
| `systemHealth` | string | `'good'` / `'warn'` / `'crit'` |
| `clickCount` | number | Rapid-click counter (resets after 400ms gap) |
| `panelHoverCooldown` | timestamp | Throttle for cross-panel reactions |
| `currentRoutine` | object | Active idle routine (or null) |
| `idleStep` | number | Current step in active routine |

### 4.7 Idle Engine

**Check interval**: 6000ms

**Idle Timing**:

| Idle Duration | Action |
|---------------|--------|
| > 15s | Start a random idle routine (if mood is `awake`/`bored`/`cool`, 65% chance) |
| > 120s | Enter `sleep` (late night) or `lonely` (daytime, 50% chance) |
| < 15s | Quick personality tick (15% start routine, 13% quick mood flash) |

**Time-of-day bias**: Between 23:00–06:00, `nap_prep` routine is double-weighted.

**System health bias**: During `crit` health, only `restless`/`existential`/`hack` routines are available. During `warn`, `hack` is extra-weighted.

**10 Idle Routines**:

| Routine | Steps | Step Time | Character |
|---------|-------|-----------|-----------|
| `patrol` | look_l → awake → look_r → awake → look_l_happy → awake | 1500ms | Scanning perimeter |
| `study` | smart → smart → debug → smart → excited | 2000ms | Research mode |
| `vibe` | cool → cool → happy → cool → motivated | 2200ms | Relaxed flow |
| `restless` | bored → look_l → look_r → bored → demotivated → bored | 1800ms | Antsy |
| `workout` | motivated → intense → motivated → excited → happy → cool | 1400ms | Training |
| `nap_prep` | bored → bored → sleep → sleep2 → sleep → sleep2 → sleep → awake | 2500ms | Quick nap |
| `hack` | debug → smart → debug → intense → debug → excited | 1600ms | Deep work |
| `social` | look_l → friend → happy → look_r → friend → grateful | 1800ms | Socializing |
| `upload_cycle` | upload → upload1 → upload2 (×2) → happy | 800ms | Data transfer |
| `existential` | smart → lonely → sad → smart → bored → cool | 2200ms | Contemplation |

### 4.8 Status Text System

Each mood has 3–5 themed status messages (military/SIGINT/intelligence style). A random one is selected each time the mood is set (unless overridden by `opts.status`).

**Example messages per mood**:

| Mood | Example Messages |
|------|-----------------|
| awake | SIGINT NOMINAL, OVERWATCH ACTIVE, ALL VECTORS CLEAR |
| happy | ASSET VERIFIED, OPS NOMINAL, CLEARANCE GRANTED |
| angry | DEFCON 1, BROKEN ARROW, COMPROMISE DETECTED |
| sleep | DORMANT OPS, LOW POWER STATE, PASSIVE COLLECT |
| debug | FORENSIC MODE, STACK TRACE ACTIVE, ROOT CAUSE HUNT |
| broken | SYSTEM COMPROMISED, INTEGRITY FAILURE, CONTAINMENT BREACH |
| upload | EXFIL IN PROGRESS, BURST TRANSMISSION, DATA EGRESS |
| lonely | NO UPLINK, ZERO CONTACTS, COMMS DARK, BLACKOUT ZONE |

### 4.9 User Interaction Behaviors

| Input | Reaction |
|-------|----------|
| **Mouse near pet** | Eye tracking — looks left/right based on cursor X offset (200ms throttle, 250px range, 40% threshold) |
| **Hover on pet** | Wakes from sleep, cheers from bored/lonely, happy wiggle if awake |
| **Leave hover** | Returns to awake if in positive mood |
| **Single click** | Random positive reaction (8 options) + click ripple particle. Pet count increments with milestone messages at 10/50/100/every 25 |
| **3 rapid clicks** | Excited — "RAPID CONTACT NOTED" |
| **5 rapid clicks** | Angry — "EXCESSIVE INPUT — CEASE" (priority lock 3s) |
| **Double click** | Spin trick — "EVASIVE MANEUVER" |

---

## 5. Integration Guide — Embedding Radgotchi in Other Platforms

### 5.1 Minimal Integration (Static Pet)

The simplest integration: display the pet with basic click interaction, no telemetry.

#### Required Files

```
your-project/
├── static/radgotchi/          # Copy all 25 PNGs + icon.jpg
│   ├── AWAKE.png
│   ├── HAPPY.png
│   ├── ... (all 25 sprites)
│   └── icon.jpg
├── radgotchi.css              # Extracted CSS (see below)
└── radgotchi.js               # Extracted JS module (see below)
```

#### HTML Shell (3 elements required)

```html
<div id="radgotchi-container" style="width: 128px; position: relative; cursor: pointer;">
    <img src="/static/radgotchi/AWAKE.png"
         alt="radgotchi"
         class="radgotchi-face"
         id="radgotchi-face">
    <span class="radgotchi-status" id="radgotchi-status">SIGINT NOMINAL</span>
</div>
```

The three required DOM elements with their IDs:
- `#radgotchi-container` — outer wrapper (must have `position: relative` for particles)
- `#radgotchi-face` — the `<img>` element for the sprite
- `#radgotchi-status` — text element for status messages

#### Extracted CSS (`radgotchi.css`)

```css
/* === RADGOTCHI CORE CSS === */
/* Adjust --rg-color and --rg-glow for your theme */
:root {
    --rg-color: #ff3344;
    --rg-glow: #ff334488;
    --rg-status-color: #cc2233;
    --rg-font: 'Berkeley Mono', 'Fira Code', 'Consolas', monospace;
}

.radgotchi-face {
    width: 100%;
    height: auto;
    max-width: 100%;
    object-fit: contain;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    filter: invert(1) sepia(1) saturate(8) hue-rotate(-10deg) brightness(1.1)
            drop-shadow(0 0 4px var(--rg-color)) drop-shadow(0 0 8px var(--rg-glow))
            contrast(1.1);
    transition: transform 0.2s ease-out, filter 0.3s ease;
    animation: rg-breathe 4s ease-in-out infinite;
}

/* Negative mood desaturation */
.radgotchi-face.rg-sad {
    filter: invert(1) grayscale(0.7) brightness(0.5) drop-shadow(0 0 4px #666);
    animation: rg-droop 2s ease-in-out infinite;
}

/* Animation classes */
.radgotchi-face.rg-bounce { animation: rg-bounce 0.35s ease-in-out; }
.radgotchi-face.rg-wiggle { animation: rg-wiggle 0.5s ease-in-out; }
.radgotchi-face.rg-shake  { animation: rg-shake 0.4s ease-in-out; }
.radgotchi-face.rg-nod    { animation: rg-nod 0.6s ease-in-out; }
.radgotchi-face.rg-float  { animation: rg-float 2s ease-in-out infinite; }
.radgotchi-face.rg-spin   { animation: rg-spin 0.6s ease-in-out; }
.radgotchi-face.rg-pulse  { animation: rg-pulse 0.8s ease-in-out; }
.radgotchi-face.rg-peek-l { animation: rg-peek-l 0.4s ease-out forwards; }
.radgotchi-face.rg-peek-r { animation: rg-peek-r 0.4s ease-out forwards; }
.radgotchi-face.rg-sleep  { animation: rg-sleep-bob 3s ease-in-out infinite; }
.radgotchi-face.rg-upload { animation: rg-upload-pulse 0.8s ease-in-out infinite; }
.radgotchi-face.rg-scared { animation: rg-shake 0.3s ease-in-out infinite; }

@keyframes rg-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.015); }
}
@keyframes rg-bounce {
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(-8px); }
    60% { transform: translateY(-3px); }
}
@keyframes rg-wiggle {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(-5deg); }
    40% { transform: rotate(5deg); }
    60% { transform: rotate(-3deg); }
    80% { transform: rotate(3deg); }
}
@keyframes rg-shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-4px); }
    30% { transform: translateX(4px); }
    45% { transform: translateX(-3px); }
    60% { transform: translateX(3px); }
    75% { transform: translateX(-1px); }
}
@keyframes rg-nod {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(3px) rotate(-2deg); }
    50% { transform: translateY(0px) rotate(0deg); }
    75% { transform: translateY(3px) rotate(2deg); }
}
@keyframes rg-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
}
@keyframes rg-spin {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
}
@keyframes rg-pulse {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.08); filter: brightness(1.3); }
}
@keyframes rg-peek-l {
    0% { transform: translateX(0); }
    100% { transform: translateX(-6px); }
}
@keyframes rg-peek-r {
    0% { transform: translateX(0); }
    100% { transform: translateX(6px); }
}
@keyframes rg-sleep-bob {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(3px) rotate(2deg); }
}
@keyframes rg-upload-pulse {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(-3px); opacity: 0.85; }
}
@keyframes rg-droop {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(2px) rotate(-3deg); }
}

/* Click ripple particle */
.rg-click-ripple {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--rg-color);
    pointer-events: none;
    animation: rg-ripple 0.6s ease-out forwards;
}
@keyframes rg-ripple {
    0% { width: 0; height: 0; opacity: 0.8; }
    100% { width: 60px; height: 60px; opacity: 0; margin-top: -30px; margin-left: -30px; }
}

/* Sleep Z particles */
.rg-zzz {
    position: absolute;
    font-family: var(--rg-font);
    font-size: 8px;
    color: var(--rg-status-color);
    pointer-events: none;
    opacity: 0;
    animation: rg-zzz-float 2.5s ease-out forwards;
}
@keyframes rg-zzz-float {
    0% { opacity: 0.8; transform: translate(0, 0) scale(0.8); }
    100% { opacity: 0; transform: translate(12px, -25px) scale(1.3); }
}

/* Status text */
.radgotchi-status {
    font-family: var(--rg-font);
    font-size: 9px;
    color: var(--rg-status-color);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 4px;
    text-align: center;
    transition: color 0.3s ease;
}
```

### 5.2 Extracting the JavaScript Module

The full `RG` IIFE can be extracted from `index.html` (lines ~5886–6490) into a standalone `radgotchi.js` file. The module is self-contained and only depends on these DOM elements being present:

```javascript
// radgotchi.js — standalone module
// Requires: #radgotchi-container, #radgotchi-face, #radgotchi-status in DOM

const RG = (function() {
    // ... (full IIFE contents from index.html)
    // See source: templates/index.html lines 5886-6490
    
    return {
        react: react,
        assessHealth: assessHealth,
        setMood: setMood,
        panelHover: panelHover,
        get mood() { return mood; },
        get petCount() { return petCount; }
    };
})();
```

**Sprite path configuration**: The `faces` object maps mood keys to image paths. Update these if your static asset directory differs:

```javascript
const faces = {
    awake: '/static/radgotchi/AWAKE.png',  // ← adjust this base path
    happy: '/static/radgotchi/HAPPY.png',
    // ... etc
};
```

### 5.3 Integration Patterns

#### Pattern A: Standalone Widget (No Telemetry)

Ideal for websites, blogs, or apps that just want an interactive pet character.

```html
<link rel="stylesheet" href="radgotchi.css">
<div id="radgotchi-container" style="width: 96px; position: relative; cursor: pointer;">
    <img src="/static/radgotchi/AWAKE.png" class="radgotchi-face" id="radgotchi-face">
    <span class="radgotchi-status" id="radgotchi-status">SIGINT NOMINAL</span>
</div>
<script src="radgotchi.js"></script>
```

**What works out of the box**:
- All 25 mood sprites + animations
- Mouse tracking (eye following)
- Click/double-click interactions + pet counting
- Idle routines (10 autonomous behaviors)
- Sleep mode with Z particles (after 2 min idle, biased at night)
- Status text updates

#### Pattern B: With Custom Telemetry Feed

Connect Radgotchi to any metric source. Call `assessHealth()` on each data update.

```javascript
// Poll your metrics API
setInterval(async () => {
    const resp = await fetch('/api/system-metrics');
    const data = await resp.json();
    
    // Feed telemetry to Radgotchi
    // Expected shape: { cpu: { usage_total }, memory: { percent }, temperatures: [{ current }] }
    RG.assessHealth({
        cpu: { usage_total: data.cpuPercent },
        memory: { percent: data.memPercent },
        temperatures: data.temps.map(t => ({ current: t.value }))
    });
}, 2000);
```

#### Pattern C: With Event System Integration

Wire up system events to the reactor.

```javascript
// Your event bus / notification system
eventBus.on('alert', (event) => {
    // Map your event levels to Radgotchi levels: 'critical', 'warning', 'info', 'ok'
    RG.react(event.severity, event.message);
});

// Direct examples:
RG.react('critical', 'CPU spike detected on node-3');     // → angry, 6s priority lock
RG.react('warning', 'Memory pressure on database server'); // → intense, 3s
RG.react('info', 'Container api-gateway started');         // → smart, 2.5s
RG.react('ok', 'All services restored');                   // → happy, 1.5s
```

#### Pattern D: With Panel Hover Reactions

Wire up hover events on different sections of your UI. Register your own panel names or use the built-in 22 keys.

```javascript
// Using built-in panel key
document.getElementById('my-cpu-panel').addEventListener('mouseenter', () => {
    RG.panelHover('cpu');
});

// Or add custom panel reactions by extending the module (requires source edit):
// In the panelReactions object, add:
// myPanel: [{ m: 'smart', a: 'rg-nod', s: 'MY CUSTOM STATUS' }]
```

#### Pattern E: Electron / Desktop App

```javascript
// In your renderer process
const { ipcRenderer } = require('electron');

// Forward system metrics from main process
ipcRenderer.on('system-metrics', (event, data) => {
    RG.assessHealth(data);
});

// Forward app events
ipcRenderer.on('app-event', (event, { level, message }) => {
    RG.react(level, message);
});
```

#### Pattern F: React / Vue / Framework Wrapper

```jsx
// React example — RadgotchiWidget.jsx
import { useEffect, useRef } from 'react';
import './radgotchi.css';

export function RadgotchiWidget({ metrics, events }) {
    const containerRef = useRef(null);
    const rgRef = useRef(null);

    useEffect(() => {
        // Module self-initializes on load — just import the script
        const script = document.createElement('script');
        script.src = '/radgotchi.js';
        script.onload = () => { rgRef.current = window.RG; };
        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);

    // Feed metrics
    useEffect(() => {
        if (rgRef.current && metrics) {
            rgRef.current.assessHealth(metrics);
        }
    }, [metrics]);

    // Feed events
    useEffect(() => {
        if (rgRef.current && events?.length) {
            const latest = events[events.length - 1];
            rgRef.current.react(latest.level, latest.message);
        }
    }, [events]);

    return (
        <div id="radgotchi-container" ref={containerRef}
             style={{ width: 96, position: 'relative', cursor: 'pointer' }}>
            <img src="/static/radgotchi/AWAKE.png"
                 className="radgotchi-face" id="radgotchi-face" />
            <span className="radgotchi-status" id="radgotchi-status">
                SIGINT NOMINAL
            </span>
        </div>
    );
}
```

> **Note for framework integration**: The current module uses direct `document.getElementById` for DOM access. For full framework compatibility, the module should be refactored to accept DOM element references as constructor parameters instead of hard-coded IDs.

### 5.4 Theming / Color Customization

The CSS filter chain on `.radgotchi-face` controls the sprite colorization. The sprites themselves are grayscale-friendly pixel art — the filter re-colors them.

**To change the color theme**, adjust the CSS `filter` on `.radgotchi-face`:

| Desired Color | `hue-rotate` Value | Example |
|---------------|-------------------|---------|
| Red (default) | `-10deg` | `hue-rotate(-10deg)` |
| Blue/Cyan | `160deg` | `hue-rotate(160deg)` |
| Green | `90deg` | `hue-rotate(90deg)` |
| Purple | `240deg` | `hue-rotate(240deg)` |
| Orange | `-30deg` | `hue-rotate(-30deg)` |

Also update `--rg-color`, `--rg-glow`, and `--rg-status-color` CSS variables to match.

**To disable the filter** (show original sprite colors as-is):

```css
.radgotchi-face {
    filter: drop-shadow(0 0 4px var(--rg-glow));
    /* Remove invert/sepia/saturate/hue-rotate */
}
```

### 5.5 Customizing Status Messages

The `statusText` object maps each mood key to an array of strings. Replace or extend these for your domain:

```javascript
// Example: DevOps-themed messages
const statusText = {
    awake: ['PIPELINE IDLE', 'CI/CD READY', 'ALL CHECKS PASSING'],
    angry: ['BUILD FAILED', 'DEPLOYMENT BLOCKED', 'MERGE CONFLICT'],
    excited: ['DEPLOY SUCCESSFUL', 'ALL TESTS GREEN', 'PR MERGED'],
    // ... etc
};
```

### 5.6 Customizing Panel Hover Reactions

The `panelReactions` object maps panel name keys to arrays of reaction objects `{ m: mood, a: animation, s: statusText }`. Add your own panels:

```javascript
const panelReactions = {
    // Your custom panels
    database:  [{ m: 'smart', a: 'rg-nod', s: 'QUERY ANALYSIS' }],
    api:       [{ m: 'friend', a: 'rg-bounce', s: 'ENDPOINT CHECK' }],
    logs:      [{ m: 'debug', a: 'rg-nod', s: 'LOG INSPECTION' }],
    // ... etc
};
```

### 5.7 Adding Custom Idle Routines

Each routine is an object with `name`, `steps` (mood sequence), `stepTime` (ms per step), and `anim` (animation per step):

```javascript
const customRoutine = {
    name: 'deploy',
    steps: ['motivated', 'upload', 'upload1', 'upload2', 'excited', 'happy'],
    stepTime: 1200,
    anim: ['rg-pulse', 'rg-upload', 'rg-upload', 'rg-upload', 'rg-bounce', 'rg-wiggle']
};
// Push into idleRoutines array
idleRoutines.push(customRoutine);
```

---

## 6. Platform-Specific Integration Notes

### 6.1 Home Assistant (Custom Dashboard Card)

Radgotchi can be embedded as an HA dashboard card using the `custom:html-card` or `custom:button-card` with embedded HTML.

**Approach**: Use HA's REST sensor integration to feed system metrics, then render the pet in an iframe or custom card.

```yaml
# configuration.yaml — expose metrics for Radgotchi
rest:
  - resource: "http://your-server:5000/api/ha/sensor"
    scan_interval: 30
    sensor:
      - name: "Server CPU"
        value_template: "{{ value_json.cpu_percent }}"
      - name: "Server Memory"
        value_template: "{{ value_json.memory_percent }}"
```

### 6.2 Grafana Panel

Embed as an HTML/iframe panel pointing to a standalone Radgotchi page that reads from Grafana's data source via query parameters or postMessage.

### 6.3 VS Code Extension

Bundle the sprites and JS module into a VS Code webview panel. Feed workspace events (build failures, test results, Git operations) to `RG.react()`.

### 6.4 Discord Bot / Web Embed

Render pet state server-side: map system events to mood states, serve the corresponding sprite PNG as the bot's avatar or embed image. Status text becomes the bot's status message.

### 6.5 OBS / Stream Overlay

Host the standalone pet on a local web server, add as a Browser Source in OBS with transparent background. Feed stream events (new followers, chat activity) to `RG.react()`.

### 6.6 Mobile (PWA / React Native)

The pet module works in mobile browsers as-is. Touch events map to click events. For React Native, render in a WebView or rewrite the state machine in native code with the same sprite sheet.

---

## 7. API Quick Reference

```javascript
// === MOOD CONTROL ===
RG.setMood('happy');                                    // Basic mood set
RG.setMood('excited', { duration: 3000 });              // Auto-reset after 3s
RG.setMood('angry', { anim: 'rg-shake' });              // With animation
RG.setMood('smart', { status: 'ANALYZING DATA...' });   // Custom status text
RG.setMood('broken', { priority: true, duration: 5000 }); // Priority lock (can't be interrupted)

// === EVENT REACTIONS ===
RG.react('critical', 'Database connection lost');       // Angry, 6s lock
RG.react('warning', 'Disk usage at 85%');               // Intense, 3.5s
RG.react('info', 'New container deployed');              // Smart, 2.5s
RG.react('ok', 'Backup completed successfully');         // Happy, 1.5s

// === TELEMETRY ===
RG.assessHealth({
    cpu: { usage_total: 45.2 },
    memory: { percent: 67.8 },
    temperatures: [{ current: 62 }]
});

// === PANEL HOVER ===
RG.panelHover('cpu');    // Triggers CPU-themed reaction
RG.panelHover('docker'); // Triggers Docker-themed reaction

// === READ STATE ===
console.log(RG.mood);      // 'happy'
console.log(RG.petCount);  // 42
```

---

## 8. Dependencies & Compatibility

| Requirement | Detail |
|-------------|--------|
| **Browser** | Any modern browser (ES6+). Chrome, Firefox, Safari, Edge. No IE support. |
| **DOM** | 3 elements: container div, img, span (see §5.1) |
| **External libs** | **None** — zero dependencies, vanilla JS + CSS |
| **Sprites** | 25 PNG files (~1–5KB each) |
| **Fonts** | Optional: Berkeley Mono (fallback: any monospace) |
| **Server** | None required — fully client-side. Any static file server works for sprites |
| **Framework** | Framework-agnostic. Works with React, Vue, Svelte, Angular, plain HTML, Electron |
