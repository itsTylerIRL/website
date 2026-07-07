/* Page scripts for cornhub.html (extracted from inline <script> blocks, in original order) */
// Bitcoin Halving Countdown
const halvingDate = new Date('April 14, 2028 14:36:22 UTC').getTime();
const countdownFunction = setInterval(() => {
    const now = new Date().getTime();
    const timeLeft = halvingDate - now;
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    document.getElementById('countdown').innerHTML = days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's ';
    if (timeLeft < 0) {
        clearInterval(countdownFunction);
        document.getElementById('countdown').innerHTML = 'The Bitcoin halving has occurred!';
    }
}, 1000);

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        alert('Contract address copied to clipboard');
    }, function(err) {
        console.error('Could not copy text: ', err);
    });
}

// Wallet connection
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        const polygonChainId = '0x89';
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const button = document.getElementById('connect-button');
        
        if (currentChainId !== polygonChainId) {
            button.textContent = 'Change Network';
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: polygonChainId }],
                });
                window.location.reload();
            } catch (switchError) {
                if (switchError.code === 4902) {
                    alert('Polygon network is not available in your wallet. Please add it manually.');
                }
            }
        } else {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                button.textContent = 'Connected';
                button.classList.add('connected');
                document.getElementById('button-grid').style.display = 'grid';
                document.getElementById('wallet-status').style.display = 'none';
                document.getElementById('balance-info').style.display = 'block';
                updateBalances();
            } catch (error) {
                console.error('User denied account access');
            }
        }
    } else {
        alert('Please install MetaMask or another Web3 wallet!');
    }
}

async function updateBalances() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
    
    // CORN
    const cornContract = new ethers.Contract('0xa0c45509036c422ea7c4d4fcac26a9925531d8c3', tokenAbi, provider);
    const cornBalance = await cornContract.balanceOf(address);
    const cornFormatted = parseFloat(ethers.utils.formatUnits(cornBalance, 18)).toFixed(3);
    document.getElementById('balance-display').innerText = cornFormatted;
    
    // POPCORN
    const popcornContract = new ethers.Contract('0x6531547b44784dDD8A934fB9fEB92ba582dfeD15', tokenAbi, provider);
    const popcornBalance = await popcornContract.balanceOf(address);
    const popcornFormatted = parseFloat(ethers.utils.formatUnits(popcornBalance, 18)).toFixed(3);
    document.getElementById('balance2-display').innerText = popcornFormatted;
    
    // BUTTER
    const butterContract = new ethers.Contract('0x409e02e728418501720d7b1e5d7328ac461ecaae', tokenAbi, provider);
    const butterBalance = await butterContract.balanceOf(address);
    const butterFormatted = parseFloat(ethers.utils.formatUnits(butterBalance, 18)).toFixed(3);
    document.getElementById('balance3-display').innerText = butterFormatted;
    
    // Enable/disable buttons
    const cornNum = parseFloat(cornFormatted);
    document.getElementById('burn-1-corn').classList.toggle('enabled', cornNum >= 1);
    document.getElementById('burn-3-corn').classList.toggle('enabled', cornNum >= 3);
    document.getElementById('burn-5-corn').classList.toggle('enabled', cornNum >= 5);
    
    const popcornNum = parseFloat(popcornFormatted);
    document.getElementById('mint-bronze').classList.toggle('enabled', popcornNum >= 1);
    document.getElementById('mint-silver').classList.toggle('enabled', popcornNum >= 3);
    document.getElementById('mint-gold').classList.toggle('enabled', popcornNum >= 5);
}

// Auto-connect if already connected
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        const polygonChainId = '0x89';
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId === polygonChainId) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                document.getElementById('connect-button').textContent = 'Connected';
                document.getElementById('connect-button').classList.add('connected');
                document.getElementById('button-grid').style.display = 'grid';
                document.getElementById('wallet-status').style.display = 'none';
                document.getElementById('balance-info').style.display = 'block';
                updateBalances();
            }
        }
    }
});
