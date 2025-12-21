# DeepDish Optical Control System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: VPL](https://img.shields.io/badge/License-VPL-purple.svg)](LICENSE)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-green.svg)](https://opencv.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-red.svg)](https://flask.palletsprojects.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A real-time video tracking system with face detection, designed for the Gakken Worldeye spherical display. Features an authentic cyberpunk-styled eye that tracks faces with natural gaze behavior and includes a web-based control interface.

![HAL 9000 Eye](deepdish_logo.png)

## 🌟 Features

### 🔴 Real-Time Eye Rendering
- **Authentic aesthetic** with red glow and cyberpunk effects
- **Dynamic pupil dilation** and iris movement
- **Pulsing animations** with customizable intensity
- **Expression system** (happy, sad, angry, surprised, etc.)
- **Natural blinking** with smooth eyelid animations

### 👁️ Face Tracking
- **Multi-method tracking**: MediaPipe or OpenCV Haar Cascades
- **Head-based tracking** optimized for various distances
- **Bright red detection boxes** showing tracked subjects
- **Automatic wandering** when no face detected
- **Calibration controls** for sensitivity and axis inversion

### 🌐 Web Interface
- **Real-time camera feed** with face detection visualization
- **Live eye rendering** at 1 FPS
- **Expression controls** with 8+ emotions
- **Gaze manipulation** with manual control
- **Connection tracking** showing active users
- **Responsive design** with cyberpunk styling
- **Drone fleet management** with K417 WiFi drone integration

### 🎮 Control Options
- **GUI Application** - Full tkinter interface with all controls
- **Web UI** - Browser-based control at `http://localhost:5001`
- **REST API** - Full API for programmatic control
- **Pop-out Window** - Dedicated fullscreen eye display
- **Drone Control** - K417 WiFi drone deployment and telemetry monitoring

## 📋 Requirements

- **Python 3.8+** (Python 3.13 supported)
- **OpenCV** for computer vision
- **NumPy** for numeric operations
- **tkinter** for GUI (usually included with Python)
- **Flask** for web interface (optional but recommended)
- **Webcam** for face tracking

## 🚀 Quick Start

### Linux

```bash
# Run the automated setup
bash setup_venv.sh

# Start the DeepDish OCS
bash run_deepdish.sh

# Or with debug camera view
bash run_deepdish_debug.sh
```

### Windows

```bat
# Install dependencies
pip install -r requirements.txt

# Run the system
python deepdish_ocs.py
```

### Manual Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python deepdish_ocs.py
```

## 🖥️ Usage

### Command Line Options

```bash
python deepdish_ocs.py [options]

Options:
  --camera-id ID         Camera device ID (default: 0)
  --display-size WxH     Display size (default: 400x400)
  --no-face-tracking     Disable face tracking
  --debug                Show debug camera view
  --fullscreen           Start in fullscreen mode
  --enable-api           Enable web API (default: enabled)
  --api-port PORT        API port (default: 5001)
```

### Web Interface

1. Start the application: `python deepdish_ocs.py`
2. Open browser to: `http://localhost:5001`
3. Control the eye from any device on your network!

### Testing Face Tracking

```bash
# Test face detection with visualization
bash test_tracking.sh

# Test red detection boxes
bash test_boxes.sh
```

## 🎯 API Endpoints

The REST API provides programmatic control:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status and connection count |
| `/api/camera/image` | GET | Camera feed with detection boxes |
| `/api/eye/render` | GET | Rendered eye image |
| `/api/eye/gaze` | POST | Set gaze direction |
| `/api/eye/expression` | POST | Trigger expression |
| `/api/eye/blink` | POST | Trigger blink |
| `/api/calibration` | GET/POST | Get/set calibration |
| `/api/tracking` | GET/POST | Get/set tracking state |

### Example API Usage

```python
import requests

# Trigger happy expression
requests.post('http://localhost:5001/api/eye/expression', 
              json={'expression': 'happy', 'duration': 3.0})

# Set gaze direction
requests.post('http://localhost:5001/api/eye/gaze',
              json={'x': 0.5, 'y': -0.3})

# Trigger blink
requests.post('http://localhost:5001/api/eye/blink')
```

## 🎨 Expressions

Available expressions:
- **neutral** - Default state
- **happy** - Excited with color cycling
- **sad** - Downward gaze, dimmed glow
- **angry** - Intense stare with shake
- **surprised** - Wide pupil dilation
- **confused** - Spinning iris effect
- **suspicious** - Narrow scanning gaze
- **bored** - Slow drift animation

## ⚙️ Configuration

### Face Tracking Calibration

- **X/Y Sensitivity**: Adjust tracking responsiveness (0.1 - 3.0)
- **Axis Inversion**: Flip horizontal or vertical tracking
- **Wandering**: Enable/disable idle wandering behavior
- **Wander Speed**: Control wandering animation speed
- **Wander Range**: Set wandering movement limits

### Eye Appearance

- **Glow Intensity**: Eye brightness (0.0 - 2.0)
- **Pulse Speed**: Animation speed (0.001 - 0.1)
- **Pupil Scale**: Size adjustment via expressions

## 🐧 Linux-Specific Notes

### Network Mounts (CIFS/SMB)
If running from a network mount, the setup script automatically:
- Detects filesystem limitations
- Creates venv in home directory (`~/.venv-gakken-worldeye`)
- Uses `virtualenv` instead of `venv` for better compatibility

### System Dependencies

**Arch Linux:**
```bash
sudo pacman -S python tk ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install python3 python3-tk ffmpeg
```

**Fedora:**
```bash
sudo dnf install python3 python3-tkinter ffmpeg
```

## 📁 Project Structure

```
GakkenWorldeye/
├── deepdish_ocs.py           # Main application
├── web_ui.html               # Web interface
├── requirements.txt          # Python dependencies
├── setup_venv.sh            # Linux setup script
├── run_deepdish.sh          # Quick launcher
├── run_deepdish_debug.sh    # Debug mode launcher
├── venv_helper.sh           # Venv location helper
├── test/                    # Test scripts
│   ├── test_face_tracking.py
│   ├── test_red_boxes.py
│   └── *.sh                 # Test launchers
├── docs/                    # Documentation
│   ├── LINUX_SETUP.md
│   ├── TRACKING_IMPROVEMENTS.md
│   ├── EXPRESSION_API.md
│   └── *.md
├── src/                     # Video converter (legacy)
│   ├── main.py
│   ├── gui/
│   ├── converter/
│   └── config/
└── favicon/                 # Web UI assets
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional expression animations
- Performance optimizations
- Mobile web interface
- Additional tracking methods
- Documentation improvements

## 📝 License

This project is open source and available under the Viral Public License (VPL).

## 🙏 Acknowledgments

- Original Gakken Worldeye display hardware
- OpenCV and MediaPipe for computer vision
- Classic sci-fi cinema for aesthetic inspiration

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `docs/` folder for detailed guides
- **API Docs**: See `docs/EXPRESSION_API.md` for API details

## 🔗 Links

- [Linux Setup Guide](docs/LINUX_SETUP.md)
- [Tracking Improvements](docs/TRACKING_IMPROVEMENTS.md)
- [Expression API](docs/EXPRESSION_API.md)
- [Web Interface Guide](docs/WEB_INTERFACE_README.md)
- [K417 Drone Integration](docs/K417_INTEGRATION.md) - WiFi drone control and telemetry

---

**Made with ❤️ for the Gakken Worldeye community**
