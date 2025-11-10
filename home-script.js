const INITIAL_BALANCE = 10.00;

function loadBalance() {
    const saved = localStorage.getItem('deziTrapGameState');
    if (saved) {
        try {
            const gameState = JSON.parse(saved);
            const balance = gameState.balance !== undefined ? gameState.balance : INITIAL_BALANCE;
            document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
            
            const currentPrice = gameState.currentPrice !== undefined ? gameState.currentPrice : 10;
            const priceHistory = gameState.priceHistory !== undefined ? gameState.priceHistory : [];
            
            document.getElementById('deziPrice').textContent = `$${currentPrice.toFixed(3)}`;
            
            if (priceHistory.length >= 2) {
                const oldPrice = priceHistory[0].price;
                const change = ((currentPrice - oldPrice) / oldPrice) * 100;
                const changeElement = document.getElementById('deziChange');
                changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeElement.className = 'change ' + (change >= 0 ? 'positive' : 'negative');
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
    }
}

loadBalance();

setInterval(loadBalance, 2000);
