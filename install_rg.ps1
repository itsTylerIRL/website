# Radgotchi Install Script (Windows)
# Usage: irm https://tylerirl.com/install_rg.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "https://github.com/itsTylerIRL/radgotchi.git"
$INSTALL_DIR = if ($env:RADGOTCHI_INSTALL_DIR) { $env:RADGOTCHI_INSTALL_DIR } else { Join-Path $HOME "radgotchi" }

function Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# Install a missing dependency via winget or choco
function Install-Dep($name, $wingetId, $chocoName) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Info "Installing $name via winget..."
        winget install --id $wingetId -e --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Info "Installing $name via chocolatey..."
        choco install $chocoName -y
    } else {
        Error "$name is required but not installed and no package manager (winget/choco) was found"
    }
    # Refresh PATH so the new command is found
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# Check dependencies and install if missing
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Warn "git not found, attempting to install..."
    Install-Dep "git" "Git.Git" "git"
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Error "git installation failed. Install manually from https://git-scm.com" }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Warn "node not found, attempting to install..."
    Install-Dep "Node.js" "OpenJS.NodeJS.LTS" "nodejs-lts"
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Error "node installation failed. Install manually from https://nodejs.org" }
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Error "npm is required but not found (should come with node)" }

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
