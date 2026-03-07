# Radgotchi Install Script (Windows)
# Usage: irm https://tylerirl.com/install_rg.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "https://github.com/itsTylerIRL/radgotchi.git"
$INSTALL_DIR = if ($env:RADGOTCHI_INSTALL_DIR) { $env:RADGOTCHI_INSTALL_DIR } else { Join-Path $HOME "radgotchi" }

function Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Check dependencies
if (-not (Get-Command git -ErrorAction SilentlyContinue))  { Error "git is required but not installed. Install from https://git-scm.com" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Error "node is required but not installed. Install from https://nodejs.org" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue))  { Error "npm is required but not installed" }

Write-Host @"

__________             .___________        __         .__    .__
\______   \_____     __| _/  _____/  _____/  |_  ____ |  |__ |__|
 |       _/\__  \   / __ /   \  ___ /  _ \   __\/ ___\|  |  \|  |
 |    |   \ / __ \_/ /_/ \    \_\  (  <_> )  | \  \___|   Y  \  |
 |____|_  /(____  /\____ |\______  /\____/|__|  \___  >___|  /__|
        \/      \/      \/       \/                 \/     \/

"@ -ForegroundColor Green

Info "Installing radgotchi to $INSTALL_DIR..."

# Clone or update
if (Test-Path $INSTALL_DIR) {
    Info "Updating existing installation..."
    Push-Location $INSTALL_DIR
    git pull origin main
} else {
    Info "Cloning repository..."
    git clone $REPO $INSTALL_DIR
    Push-Location $INSTALL_DIR
}

# Install dependencies
Info "Installing dependencies..."
npm install

Info "Installation complete!"
Write-Host ""

# Ask if user wants to run it now
$reply = Read-Host "Would you like to run radgotchi now? (y/n)"
if ($reply -match '^[Yy]') {
    Info "Starting radgotchi..."
    npm start
} else {
    Write-Host "To run radgotchi later:"
    Write-Host "  cd $INSTALL_DIR; npm start"
    Write-Host ""
}

Pop-Location
