/* The coins the site follows, shared by the coin terminal (js/coin.js on pages/btc.html, eth.html, link.html),
   the paper trading desk (js/paper.js) and the home page's Assets monitor (js/assets-monitor.js).
   To add one: a Coinbase USD product, a CoinGecko id, an icon, a page (a copy of pages/btc.html with its
   data-coin) and an OBJECTS entry in js/objects.js. */
const COINS = [
    { key: 'btc', product: 'BTC-USD', gecko: 'bitcoin', name: 'Bitcoin', icon: '/assets/object-icons/btc.svg', page: '/pages/btc.html', tagline: 'the original. 21 million, no more.', site: ['whitepaper', 'https://bitcoin.org/bitcoin.pdf'] },
    { key: 'eth', product: 'ETH-USD', gecko: 'ethereum', name: 'Ethereum', icon: '/assets/object-icons/eth.svg', page: '/pages/eth.html', tagline: 'the world computer. gas, blobs and milady.', site: ['site', 'https://ethereum.org'] },
    { key: 'link', product: 'LINK-USD', gecko: 'chainlink', name: 'Chainlink', icon: '/assets/object-icons/link.svg', page: '/pages/link.html', tagline: 'oracles: the price feeds behind the price feeds.', site: ['site', 'https://chain.link'] }
];
