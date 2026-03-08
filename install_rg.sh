#!/bin/bash
# Radgotchi Install Script
# Usage: curl -fsSL https://tylerirl.com/install_rg.sh | bash

set -e

REPO="https://github.com/itsTylerIRL/radgotchi.git"
INSTALL_DIR="${RADGOTCHI_INSTALL_DIR:-$HOME/radgotchi}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect package manager
detect_pkg_manager() {
    if command -v apt-get >/dev/null 2>&1; then
        echo "apt"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    elif command -v yum >/dev/null 2>&1; then
        echo "yum"
    elif command -v pacman >/dev/null 2>&1; then
        echo "pacman"
    elif command -v brew >/dev/null 2>&1; then
        echo "brew"
    else
        echo ""
    fi
}

install_pkg() {
    local pkg="$1"
    local mgr
    mgr=$(detect_pkg_manager)
    case "$mgr" in
        apt)    sudo apt-get update -qq && sudo apt-get install -y "$pkg" ;;
        dnf)    sudo dnf install -y "$pkg" ;;
        yum)    sudo yum install -y "$pkg" ;;
        pacman) sudo pacman -S --noconfirm "$pkg" ;;
        brew)   brew install "$pkg" ;;
        *)      return 1 ;;
    esac
}

install_node() {
    local mgr
    mgr=$(detect_pkg_manager)
    if [ "$mgr" = "brew" ]; then
        brew install node
    elif [ -n "$mgr" ]; then
        info "Installing Node.js via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        install_pkg nodejs
    else
        return 1
    fi
}

prompt_install() {
    local name="$1"
    if [ -t 0 ]; then
        read -p "$(echo -e "${YELLOW}$name is required but not installed. Install it now? (y/n) ${NC}")" -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] && return 0 || return 1
    else
        return 1
    fi
}

# Check dependencies
if ! command -v git >/dev/null 2>&1; then
    if prompt_install "git"; then
        info "Installing git..."
        install_pkg git || error "Failed to install git. Please install it manually."
    else
        error "git is required but not installed"
    fi
fi

if ! command -v node >/dev/null 2>&1; then
    if prompt_install "node"; then
        info "Installing Node.js..."
        install_node || error "Failed to install Node.js. Please install from https://nodejs.org"
    else
        error "node is required but not installed. Install from https://nodejs.org"
    fi
fi

if ! command -v npm >/dev/null 2>&1; then
    if prompt_install "npm"; then
        info "Installing npm..."
        install_pkg npm || error "Failed to install npm. Please install it manually."
    else
        error "npm is required but not installed"
    fi
fi

echo -e "${GREEN}"
cat << 'EOF'
__________             .___________        __         .__    .__ 
\______   \_____     __| _/  _____/  _____/  |_  ____ |  |__ |__|
 |       _/\__  \   / __ /   \  ___ /  _ \   __\/ ___\|  |  \|  |
 |    |   \ / __ \_/ /_/ \    \_\  (  <_> )  | \  \___|   Y  \  |
 |____|_  /(____  /\____ |\______  /\____/|__|  \___  >___|  /__|
        \/      \/      \/       \/                 \/     \/    
EOF
echo -e "${NC}"

info "Installing radgotchi to $INSTALL_DIR..."

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
    info "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    info "Cloning repository..."
    git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Install dependencies
info "Installing dependencies..."
npm install

info "Installation complete!"
echo ""

# --- Desktop shortcut creation ---
create_shortcut() {
    local os
    os="$(uname -s)"
    case "$os" in
        Linux*)
            local desktop_file="$HOME/.local/share/applications/radgotchi.desktop"
            mkdir -p "$HOME/.local/share/applications"
            cat > "$desktop_file" <<DESK
[Desktop Entry]
Name=Radgotchi
Comment=Launch Radgotchi
Exec=bash -c 'cd $INSTALL_DIR && npm start'
Terminal=true
Type=Application
Categories=Game;
DESK
            chmod +x "$desktop_file"
            # Also copy to ~/Desktop if it exists
            if [ -d "$HOME/Desktop" ]; then
                cp "$desktop_file" "$HOME/Desktop/radgotchi.desktop"
                chmod +x "$HOME/Desktop/radgotchi.desktop"
                info "Desktop shortcut created on ~/Desktop"
            fi
            info "App menu entry created at $desktop_file"
            ;;
        Darwin*)
            local app_dir="$HOME/Desktop/Radgotchi.app/Contents/MacOS"
            mkdir -p "$app_dir"
            cat > "$app_dir/radgotchi" <<SCRIPT
#!/bin/bash
cd "$INSTALL_DIR" && npm start
SCRIPT
            chmod +x "$app_dir/radgotchi"
            cat > "$HOME/Desktop/Radgotchi.app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>radgotchi</string>
    <key>CFBundleName</key>
    <string>Radgotchi</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
PLIST
            info "App shortcut created at ~/Desktop/Radgotchi.app"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            local shortcut_vbs
            shortcut_vbs=$(mktemp /tmp/radgotchi_shortcut.XXXXXX.vbs)
            cat > "$shortcut_vbs" <<VBS
Set WshShell = CreateObject("WScript.Shell")
Set lnk = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Radgotchi.lnk")
lnk.TargetPath = "cmd.exe"
lnk.Arguments = "/c cd /d $INSTALL_DIR && npm start"
lnk.WorkingDirectory = "$INSTALL_DIR"
lnk.Description = "Launch Radgotchi"
lnk.Save
VBS
            if command -v cscript.exe >/dev/null 2>&1; then
                cscript.exe //Nologo "$shortcut_vbs"
                rm -f "$shortcut_vbs"
                info "Desktop shortcut created"
            else
                rm -f "$shortcut_vbs"
                warn "Could not create Windows shortcut automatically."
            fi
            ;;
        *)
            warn "Unsupported OS for desktop shortcut. You can run manually:"
            echo "  cd $INSTALL_DIR && npm start"
            ;;
    esac
}

# Always present the menu (interactive or piped)
if [ -t 0 ]; then
    echo "What would you like to do?"
    echo "  1) Create desktop shortcut & run now"
    echo "  2) Create desktop shortcut only"
    echo "  3) Run now only"
    echo "  4) Exit"
    read -p "Choose [1-4]: " -n 1 -r
    echo
    case "$REPLY" in
        1)
            create_shortcut
            echo ""
            info "Starting radgotchi..."
            npm start
            ;;
        2)
            create_shortcut
            echo ""
            echo "To run radgotchi later:"
            echo "  cd $INSTALL_DIR && npm start"
            ;;
        3)
            info "Starting radgotchi..."
            npm start
            ;;
        *)
            echo "To run radgotchi later:"
            echo "  cd $INSTALL_DIR && npm start"
            echo ""
            echo "Or create an alias:"
            echo "  alias radgotchi='cd $INSTALL_DIR && npm start'"
            ;;
    esac
else
    echo "To run radgotchi:"
    echo "  cd $INSTALL_DIR && npm start"
    echo ""
    echo "Or create an alias:"
    echo "  alias radgotchi='cd $INSTALL_DIR && npm start'"
fi    