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

# Check dependencies
command -v git >/dev/null 2>&1 || error "git is required but not installed"
command -v node >/dev/null 2>&1 || error "node is required but not installed. Install from https://nodejs.org"
command -v npm >/dev/null 2>&1 || error "npm is required but not installed"

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
echo "To run radgotchi:"
echo "  cd $INSTALL_DIR && npm start"
echo ""
echo "Or create an alias:"
echo "  alias radgotchi='cd $INSTALL_DIR && npm start'"    