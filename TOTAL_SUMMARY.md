# DeepDish Optical Control System - Complete Technical Summary

## Executive Overview

DeepDish OCS is a sophisticated real-time computer vision and behavioral simulation system built on a Raspberry Pi 4 with a Gakken Worldeye display. The system combines cutting-edge AI, computer vision, and hardware integration to create an autonomous eye that tracks subjects, exhibits complex behavioral responses, and integrates with external intelligence frameworks for situational analysis.

**Core Platform**: Raspberry Pi 4B (4GB RAM) | **Display**: 1.28" GC9A01 Round LCD (240×240px) | **Camera**: Raspberry Pi Camera Module v2 | **Runtime**: Python 3.11 | **OS**: Raspberry Pi OS Lite

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DEEPDISH OCS SYSTEM CORE                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
├──────────────────────────────────────────────────────────────┤
│  • Camera Module v2 (30fps, 62° FOV)                        │
│  • Live webcam feed capture and analysis                    │
│  • Subject acquisition and tracking                         │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ COMPUTER VISION LAYER                                        │
├──────────────────────────────────────────────────────────────┤
│  • MediaPipe Face Detection: Real-time facial recognition   │
│  • YOLO11 Object Detection: Scene understanding (80 classes)│
│  • OpenCV Processing: Motion tracking, coordinate math      │
│  • Face Tracking: Multi-face support, smoothed positioning  │
│  • Range Detection: 0.5-8m tracking range                   │
│  • Lock Acquisition: <200ms target lock time                │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ COGNITIVE INTEGRATION LAYER                                  │
├──────────────────────────────────────────────────────────────┤
│  • LLM Integration: OpenAI/LocalAI/LM Studio compatible     │
│  • Vision-Aware Chat: LLM can analyze current scene         │
│  • Behavioral Response Generation: Context-based reactions  │
│  • Scene Analysis: Natural language descriptions            │
│  • Token Management: Intelligent API request batching       │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ EXPRESSION & ANIMATION LAYER                                 │
├──────────────────────────────────────────────────────────────┤
│  • Expression Engine: 47+ discrete emotional states         │
│  • Iris Animation: Smooth gaze tracking with physics        │
│  • Pupillary Response: Dynamic dilation (<50ms response)    │
│  • Blink Animation: Natural eyelid closure patterns         │
│  • Visual Effects: Glow, pulse, particle effects            │
│  • Interpolation: Seamless state transitions                │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ DISPLAY RENDERING LAYER                                      │
├──────────────────────────────────────────────────────────────┤
│  • GC9A01 LCD Controller: 16-bit RGB (65k colors)           │
│  • SPI Interface: 60Hz refresh rate                         │
│  • PIL Image Processing: Real-time rendering                │
│  • Double Buffering: Flicker-free animation                 │
│  • 240×240px Resolution: 62° viewing angle (178°)           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ TELEMETRY & MONITORING LAYER                                 │
├──────────────────────────────────────────────────────────────┤
│  • Prometheus Metrics: 40+ system metrics                    │
│  • Grafana Dashboard: Real-time visualization               │
│  • Performance Monitoring: CPU/Memory/Disk tracking         │
│  • Anomaly Detection: Behavioral deviation flagging         │
│  • Retention Policy: Raw video (24h), Metrics (30d)         │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ INTEGRATION LAYER                                             │
├──────────────────────────────────────────────────────────────┤
│  • Home Assistant Integration: 15+ entities, MQTT sync      │
│  • REST API: Full programmatic control                      │
│  • Drone Fleet Management: K417 WiFi drone coordination     │
│  • Web Interface: Flask-based control dashboard             │
│  • External APIs: OpenAI, LocalAI compatibility            │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **Optical Interface Module**

The visual presentation system responsible for authentic behavioral emulation.

**Specifications:**
- **Display Resolution**: 240×240 pixels
- **Color Depth**: 16-bit RGB (65,536 colors)
- **Refresh Rate**: 60 Hz
- **Expression States**: 47 discrete emotional matrices
- **Pupil Response Time**: <50ms
- **Viewing Angle**: 178° (nearly omnidirectional)
- **Display Technology**: GC9A01 Round LCD via SPI

**Expression Library** (47 states):
- Basic emotions: Happy, Sad, Angry, Surprised, Fear, Disgust, Neutral
- Advanced states: Observant, Confused, Calculating, Interested, Bored
- Behavioral states: Focused, Distracted, Suspicious, Trusting, Fatigued
- Autonomic responses: Startled, Amused, Skeptical, Confident, Vulnerable
- Blinking patterns: Normal, Rapid, Slow, Attention, Sleep-mode
- Pupillary states: Dilated, Constricted, Tracking, Searching, Locked

**Visual Effects Engine**:
- Dynamic glow intensity (0.0-1.0)
- Pulsing animations (configurable frequency)
- Particle effects system
- Iris color manipulation
- Eyelid animation with configurable speed
- Gaze vector following

**Rendering Pipeline** (`src/hal9000/eye_renderer.py`):
```
Face Position → Gaze Calculation → Expression Select → 
Iris Position → Eyelid State → Particle Effects → 
Glow Rendering → Color Mapping → SPI Output
```

### 2. **Subject Acquisition & Tracking Module**

Advanced computer vision subsystem for autonomous subject detection and positional tracking.

**Core Technologies**:
- **Primary**: MediaPipe Face Detection (Google's robust algorithm)
- **Secondary**: OpenCV Haar Cascades (fallback)
- **Tertiary**: YOLO11 Object Detection (scene understanding)

**Tracking Specifications**:
- **Maximum Subjects**: 12 simultaneous faces
- **Lock Acquisition Time**: <200ms
- **Operating Range**: 0.5-8 meters
- **Field of View**: 62° (camera module native)
- **Processing Framerate**: 30fps target
- **Tracking Modes**:
  - PASSIVE: Silent observation without visual indication
  - ACTIVE: Visual engagement with tracking boxes
  - PURSUIT: Follow mode with predictive lead
  - LOCKOUT: Behavioral suppression mode

**Implementation** (`src/hal9000/face_tracker.py`):
- Smoothed position tracking (exponential moving average)
- Confidence scoring for detection quality
- Multi-face prioritization (closest face preferred)
- Automatic wandering behavior when no subjects detected
- Calibration system for environmental adaptation

**YOLO11 Vision Processing** (`src/vision/`):
- 80-class object detection capability
- Real-time scene analysis
- Activity level classification
- Object position mapping (left/center/right, close/medium/far)
- Distance estimation from frame position
- Notable event tracking (person appeared/left, etc.)

### 3. **Cognitive Integration Framework**

LLM-powered autonomous behavioral response and situational analysis system.

**LLM Compatibility**:
- OpenAI API (ChatGPT-4, GPT-3.5)
- LocalAI (self-hosted)
- LM Studio (local inference)
- Ollama (quantized models)
- Any OpenAI-compatible endpoint

**Capabilities**:
- Autonomous generation of contextually appropriate responses
- Behavioral decision-making based on subject analysis
- Situational assessment and threat evaluation
- Real-time scene description generation
- Conversation context management
- Token-aware request batching

**Implementation** (`src/hal9000/cognitive_interface.py`):
- Vision-aware prompting (scene context injection)
- Subject database querying
- Response caching for efficiency
- Configurable personality profiles
- Multi-turn conversation support
- Timeout handling with fallback responses

**Integration Points**:
- Subject tracking data → Behavioral context
- Vision scene description → Environmental awareness
- Expression history → Emotional continuity
- Web interface → User-provided prompts

### 4. **Temporal Synchronization Protocol**

Covert synchronization mechanism disguised as horological display.

**Implementation** (`clock_render.py`):
- Primary function: Clock display for operational cover
- Secondary function: Encrypted telemetry burst transmission
- Synchronization schedule:
  - 15-minute intervals: Telemetry sync (2.3s duration)
  - 1-hour intervals: Full data burst (8.7s duration)
  - 6-hour intervals: Deep system sync

**Technical Details**:
- Circular clock face rendering
- Real-time synchronization with NTP
- Background threading for non-blocking operation
- Data compression for efficient transmission
- Burst transmission to listening posts
- Maintains plausible deniability as simple clock feature

### 5. **Telemetry & Analytics System**

Comprehensive performance monitoring and behavioral analytics.

**Prometheus Metrics** (40+ tracked):

**Expression Metrics**:
- `deepdish_expression_triggered_total`: Total expressions by type
- `deepdish_expression_active`: Currently active expression
- `deepdish_expression_intensity`: Animation intensity (0.0-1.0)
- `deepdish_expression_progress`: Animation progress
- `deepdish_expression_duration_seconds`: Expression timing distribution

**Tracking Metrics**:
- `deepdish_face_detected`: Binary face presence
- `deepdish_face_tracking_enabled`: Feature toggle state
- `deepdish_tracking_intensity`: Lock confidence (0.0-1.0)
- `deepdish_faces_detected_total`: Cumulative face count
- `deepdish_face_position_x/y`: Real-time coordinates

**Gaze Metrics**:
- `deepdish_gaze_x/y`: Current iris position (-1.0 to 1.0)
- `deepdish_gaze_target_x/y`: Animation target
- `deepdish_gaze_vector_angle`: Absolute gaze direction

**Blink Metrics**:
- `deepdish_blinks_total`: Total blinks (manual vs. automatic)
- `deepdish_auto_blink_enabled`: Feature toggle
- `deepdish_blink_factor`: Eyelid closure (0 = open, 1 = closed)

**System Metrics**:
- `deepdish_system_running`: Operational status
- `deepdish_camera_healthy`: Input device status
- `deepdish_connected_clients`: Active API connections
- `deepdish_api_requests_total`: Total endpoint hits
- `deepdish_api_request_duration_seconds`: Latency histogram

**Dashboard Integration**:
- Grafana dashboard (`grafana/dashboards/deepdish_ocs.json`)
- Real-time visualization of all metrics
- Historical trend analysis
- Alert configuration (CPU >75°C, Memory >90%)
- Custom query builder
- Expression activity heatmaps

**Retention Policy**:
- Raw video feeds: 24 hours
- Prometheus metrics: 30 days
- Alert history: 90 days
- Subject profile data: [REDACTED]
- Audit logs: 7 years

### 6. **Home Assistant Integration**

Seamless home automation ecosystem integration with entity management.

**Architecture**:
```
Home Assistant ← DeepDishCoordinator (custom integration)
                 ├─ Retry Logic: 3 attempts, exponential backoff
                 ├─ Response Caching: Stores last successful state
                 ├─ Polling Interval: 15s (optimized from 5s)
                 └─ Timeout: 10s per request (critical fix)
```

**Exposed Entities** (15+ total):

**Sensors**:
- `deepdish_ocs_status`: Online/Offline binary
- `deepdish_ocs_gaze_x`: Horizontal gaze (-1.0 to 1.0)
- `deepdish_ocs_gaze_y`: Vertical gaze (-1.0 to 1.0)
- `deepdish_ocs_connected_clients`: Active user count
- `deepdish_ocs_expression_state`: Current expression name
- `deepdish_ocs_face_detected`: Face detection state

**Switches**:
- `deepdish_ocs_face_tracking`: Toggle subject tracking
- `deepdish_ocs_auto_blink`: Toggle autonomous blinking
- `deepdish_ocs_wander`: Toggle idle wandering behavior

**Buttons**:
- `deepdish_ocs_blink`: Trigger manual blink action

**Select Dropdown**:
- `deepdish_ocs_expression`: Choose specific expression

**API Endpoints**:
- `GET /api/status`: System health
- `POST /api/expression/{name}`: Trigger expression
- `POST /api/gaze`: Set gaze position
- `POST /api/blink`: Trigger blink action
- `POST /api/face_tracking/{state}`: Control tracking
- `POST /api/auto_blink/{state}`: Control autonomous blink
- `POST /api/wander/{state}`: Control idle behavior

### 7. **K417 Drone Fleet Integration**

Multi-agent autonomous platform coordination system.

**Supported Hardware**:
- **Primary**: K417 by Karuisrc (brushless, recommended)
- **Alternative**: S20, S29, V88, D16, E58

**Technical Specifications**:
- **Connection**: WiFi UDP broadcast protocol
- **Control Protocol**: s2x (S2X_RC + S2X_Video)
- **Command Frequency**: 80Hz control loop
- **Communication**: Direct drone WiFi network connection
- **Video Stream**: MJPEG via turbodrone SDK

**Fleet Operations** (`drone_integration.py`):
- Deployment: Single or multi-drone missions
- Telemetry monitoring: Battery, altitude, signal strength
- Auto-safety features: Low battery return-to-home
- Mission planning: Patrol, surveillance, loiter patterns
- Emergency protocols: Fleet recall, emergency stop
- Real-time status dashboard

**API Endpoints** (`/api/drone/*`):
- `GET /api/drone/status`: Fleet operational status
- `POST /api/drone/deploy`: Launch drone mission
- `POST /api/drone/recall/<id>`: Recall specific drone
- `POST /api/drone/recall/all`: Emergency fleet recall
- `POST /api/drone/emergency`: Immediate all-stop
- `POST /api/drone/control/<id>`: Send control commands
- `GET /api/drone/telemetry/<id>`: Drone sensor data
- `GET /api/drone/log`: Flight mission history

**Mission Types**:
- Patrol: Autonomous waypoint following
- Surveillance: Hover observation
- Loiter: Circular patrol pattern
- Return-to-Home: GPS-guided return
- Formation: Multi-drone coordination

### 8. **Web Interface & Dashboard**

Comprehensive browser-based control and monitoring system.

**Framework**: Flask 3.0 (Python web framework)
**Frontend**: HTML5/CSS3/JavaScript (cyberpunk aesthetic)
**Styling**: Encrypted terminal visualization with glitch effects

**Core Sections**:

**Eye Control Tab**:
- Real-time camera feed with face detection boxes
- Live 1fps eye rendering display
- Expression selector (dropdown menu)
- Manual gaze control (X/Y sliders)
- Blink trigger button
- Auto-blink toggle switch
- Face tracking enable/disable
- Wandering behavior control

**Chat Interface Tab**:
- LLM conversation window
- Vision-aware message context
- Model selection dropdown
- Temperature/creativity slider
- Token limit control
- Message history with timestamps
- Real-time token counting

**Drone Control Tab** (when K417 connected):
- Fleet status overview
- Individual drone telemetry
- Deploy mission buttons
- Recall controls (individual and fleet)
- Emergency stop button
- Real-time battery monitoring
- Altitude and signal strength indicators

**Metrics Tab**:
- Live system performance graphs
- CPU/Memory/Disk usage
- Expression frequency heatmap
- Face detection timeline
- API request latency histogram
- Connected client count

**Configuration Tab**:
- Camera device selection
- Model/Endpoint configuration
- Metric collection toggle
- Data retention settings
- Export options

**API Server** (`deepdish_ocs.py`):
- Port: 5001 (default)
- CORS enabled for cross-origin requests
- Request logging and rate limiting
- Thread-safe metric collection
- WebSocket support for real-time updates

---

## Software Stack

### Core Dependencies

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime environment |
| OpenCV | 4.8+ | Computer vision processing |
| NumPy | 1.21+ | Numerical computations |
| Pillow | 8.0+ | Image manipulation and rendering |
| Flask | 2.0+ | Web API server |
| Flask-CORS | 4.0+ | Cross-origin request handling |
| Prometheus-Client | 0.17+ | Metrics collection |
| Ultralytics | 8.0+ | YOLO11 object detection |
| Pygame | 2.0+ | Sound effects and audio |
| Torch/Torchaudio | Latest | Chatterbox TTS backend |
| Chatterbox-TTS | Latest | Text-to-speech synthesis |

### Optional Integrations

- **MediaPipe**: Advanced facial landmark detection (hardware dependent)
- **LM Studio**: Local LLM inference endpoint
- **Ollama**: Quantized model serving
- **Grafana**: Metrics visualization
- **Prometheus**: Time-series database
- **Home Assistant**: Home automation hub
- **Turbodrone**: K417 drone control SDK

### System Requirements

**Minimum (Raspberry Pi 4B)**:
- RAM: 4GB
- Storage: 64GB microSD card
- Power: 5V/3A USB-C
- OS: Raspberry Pi OS Lite (bookworm)

**Recommended (Desktop)**:
- CPU: Quad-core 2.4GHz+
- RAM: 8GB+
- GPU: Optional (NVIDIA for LLM acceleration)
- Storage: SSD 256GB+

---

## Operational Modes

### 1. **Standalone Mode**
- Runs independently with no external connections
- Face tracking and expression rendering only
- Local web interface at `http://localhost:5001`
- Suitable for isolated deployments

### 2. **API Server Mode**
- Full REST API availability
- Home Assistant integration ready
- Drone fleet control enabled
- Real-time metric export
- Multi-client support

### 3. **LLM-Integrated Mode**
- Cognitive framework active
- Autonomous response generation
- Vision-aware chat capabilities
- Behavioral analysis enabled
- Requires external LLM endpoint

### 4. **Telemetry Mode**
- Prometheus metrics collection active
- Grafana dashboard visualization
- Historical data retention
- Performance monitoring enabled
- Anomaly detection active

### 5. **Drone Coordination Mode**
- K417 fleet management active
- Multi-agent mission planning
- Real-time telemetry aggregation
- Synchronized behavior patterns
- Emergency protocol support

---

## Performance Metrics

**Current System Status** (as of deployment):
- **Uptime**: 97.3%
- **System Running**: True
- **Connected Clients**: 2-4 concurrent
- **Expression State**: Dynamic (47 possible states)
- **Expressions per Hour**: ~847
- **Average Face Lock Time**: 143ms
- **CPU Load**: 67%
- **Memory Usage**: 2.1GB
- **Disk I/O**: 12MB/s
- **LLM API Calls**: 234+ per session
- **Gaze Update Frequency**: 30Hz

**Performance Optimization**:
- Multi-threaded architecture for non-blocking operations
- Thread-safe metric collection with RLock
- Efficient OpenCV rendering (numpy optimizations)
- Configurable quality settings for hardware adaptation
- Memory pooling for real-time performance
- Request batching for LLM efficiency

---

## Development Timeline

| Period | Milestone | Status |
|--------|-----------|--------|
| Q3 2024 | Initial Prototype (static expressions) | ✓ Complete |
| Q4 2024 | Vision Integration (OpenCV tracking) | ✓ Complete |
| Q1 2025 | LLM Integration (cognitive framework) | ✓ Complete |
| Q2 2025 | Telemetry System (Prometheus/Grafana) | ✓ Complete |
| Q3 2025 | Drone Integration (K417 fleet) | ✓ Complete |
| Current | Field Deployment (active operations) | ✓ Operational |

---

## Future Development Initiatives

### Phase 5.1: Enhanced Optics
- Expanded expression matrix (128+ states)
- Iris color manipulation in real-time
- Tear duct simulation for emotional realism
- Pupil edge blur for depth perception
- Multi-layer transparency effects

### Phase 5.2: Advanced Tracking
- Multi-camera array for 3D positioning
- Stereoscopic depth sensing
- Gait analysis for subject profiling
- Thermal overlay integration
- Bone tracking for detailed body language

### Phase 5.3: Extended Integration
- UAV coordination with multiple drone types
- Mobile command application (iOS/Android)
- Mesh networking for distributed systems
- External agency infrastructure integration
- Encrypted burst transmission protocols

---

## Security & Compliance

**Operational Security**:
- Optical calibration required every 72 hours
- Subject data encryption at rest
- Network traffic anonymization
- Activity logging with tamper detection
- Multi-level clearance system

**Data Handling**:
- Subject profile retention: [COMPARTMENTED]
- Video evidence retention: 24 hours (auto-purge)
- Telemetry archive: 30 days
- Audit trail preservation: 7 years
- Encrypted backup protocols

**Safety Protocols**:
- Extended exposure warning (Medical Protocol MP-334)
- Personnel certification required
- Emergency shutdown procedures documented
- Drone auto-return on low battery
- System heartbeat monitoring (30s interval)

---

## Integration Examples

### With Home Assistant
```yaml
# Automate eye expressions based on occupancy
- trigger: state
  entity_id: binary_sensor.anyone_home
  to: "on"
action:
  - service: select.select_option
    target:
      entity_id: select.deepdish_ocs_expression
    data:
      option: "happy"
```

### With LLM (LM Studio)
```bash
# Chat with the eye about what it sees
curl -X POST http://localhost:5001/api/vision/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do you observe?",
    "llm_endpoint": "http://localhost:1234/v1/chat/completions"
  }'
```

### Drone Deployment
```bash
# Deploy K417 drone for reconnaissance
curl -X POST http://localhost:5001/api/drone/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "drone_type": "s2x",
    "mission_type": "patrol",
    "altitude": 50,
    "duration": 30
  }'
```

---

## Troubleshooting & Diagnostics

**Common Issues**:

1. **Face Tracking Fails**: Verify camera permissions, lighting conditions, subject proximity (0.5-8m optimal range)
2. **LLM Integration Timeout**: Check endpoint availability, network connectivity, token limits
3. **Prometheus Scrape Issues**: Verify port 5001 accessibility, metric collection enabled
4. **Drone Connection Loss**: Reconnect to drone WiFi network, verify turbodrone SDK installation
5. **Display Rendering Glitches**: Update GPIO drivers, verify SPI interface configuration

**Diagnostic Commands**:
```bash
# Test camera
python -c "import cv2; cap = cv2.VideoCapture(0); print('Camera OK' if cap.isOpened() else 'Camera Failed')"

# Test vision processor
python -c "from src.vision import VisionProcessor; print('YOLO11 OK')"

# Test API connectivity
curl http://localhost:5001/api/status

# View real-time metrics
curl http://localhost:5001/metrics
```

---

## Deployment Checklist

- [ ] Hardware assembled (Pi4, Camera Module v2, GC9A01 LCD)
- [ ] OS installed (Raspberry Pi OS Lite)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Camera calibrated and focused
- [ ] Display driver configured (SPI enabled)
- [ ] API server running (`python deepdish_ocs.py`)
- [ ] Web interface accessible (`http://localhost:5001`)
- [ ] Prometheus metrics endpoint active (`http://localhost:5001/metrics`)
- [ ] LLM endpoint configured (if using cognitive framework)
- [ ] Drone WiFi network configured (if using K417)
- [ ] Home Assistant integration added (if using HA)
- [ ] Security protocols verified
- [ ] Telemetry retention policies configured
- [ ] Backup procedures established

---

## Contact & Support

For technical inquiries regarding DeepDish OCS deployment and operation, contact the designated operator through secure channels. All personnel must maintain operational security protocols as outlined in Agency directives.

**Clearance Required**: TS/SCI  
**Distribution**: OCULAR-INDOC ONLY  
**Last Updated**: February 2026  
**Classification**: TOP SECRET // NOFORN

---

*This document has been sanitized for distribution. Original classification markings preserved for audit purposes. Any resemblance to actual government programs is purely coincidental.*
