const INITIAL_BALANCE = 10.00;
const INITIAL_PRICE = 0.10;
const PRICE_VOLATILITY = 0.02;
const BOT_TRADE_INTERVAL = 500;
const CHART_UPDATE_INTERVAL = 1000;
const MAX_MARKET_ACTIVITIES = 20;
const MAX_TRANSACTIONS = 20;
const PASTEBIN_URL = 'https://pastebin.com/raw/GZ2Yuk0f';
const RUG_CHECK_INTERVAL = 1000;

let balance = INITIAL_BALANCE;
let currentPrice = INITIAL_PRICE;
let coinsOwned = 0;
let totalInvested = 0;
let priceHistory = [];
let chart = null;
let currentChartType = 'area';
let rug = false;

const botNames = [
    "TraderBot_42", "CryptoKing_99", "MoonLambo_21", 
    "DiamondHands_88", "WhaleWatcher_33", "HODLer_77",
    "QuickFlip_55", "BullRunner_11", "BearHunter_66",
    "StackSats_44","dezi-owner", "dezi enam", "me_101", 
        "diahands", "whalehatcher", "HodOfCod",
        "dunterhunter", "BullRunner_11", "OFSPEEg",
        "polimarkie"
];

function saveGameState() {
    const gameState = {
        balance: balance,
        coinsOwned: coinsOwned,
        totalInvested: totalInvested,
        currentPrice: currentPrice,
        priceHistory: priceHistory,
        currentChartType: currentChartType
    };
    localStorage.setItem('deziTrapGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('deziTrapGameState');
    if (saved) {
        try {
            const gameState = JSON.parse(saved);
            balance = gameState.balance !== undefined ? gameState.balance : INITIAL_BALANCE;
            coinsOwned = gameState.coinsOwned !== undefined ? gameState.coinsOwned : 0;
            totalInvested = gameState.totalInvested !== undefined ? gameState.totalInvested : 0;
            currentPrice = gameState.currentPrice !== undefined ? gameState.currentPrice : INITIAL_PRICE;
            priceHistory = gameState.priceHistory !== undefined ? gameState.priceHistory : [];
            currentChartType = gameState.currentChartType !== undefined ? gameState.currentChartType : 'area';
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
    }
}

function resetGame() {
    if (confirm('Are you sure you want to reset everything? This will clear all your progress!')) {
        localStorage.removeItem('deziTrapGameState');
        
        balance = INITIAL_BALANCE;
        currentPrice = INITIAL_PRICE;
        coinsOwned = 0;
        totalInvested = 0;
        priceHistory = [];
        currentChartType = 'area';
        rug = false;
        
        document.getElementById('transactionHistory').innerHTML = '<div class="transaction-item">No transactions yet</div>';
        document.getElementById('marketActivity').innerHTML = '<div class="activity-item">Market is waiting for trades...</div>';
        
        chart.destroy();
        initChart();
        
        for (let i = 0; i < 20; i++) {
            priceHistory.push({
                time: '',
                price: currentPrice + (Math.random() - 0.5) * 0.01
            });
        }
        
        chart.data.labels = priceHistory.map(p => p.time);
        chart.data.datasets[0].data = priceHistory.map(p => p.price);
        chart.update();
        
        updateDisplay();
        saveGameState();
        
        alert('Game has been reset!');
    }
}

function updateDisplay() {
    document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    document.getElementById('currentPrice').textContent = `$${currentPrice.toFixed(3)}`;
    document.getElementById('coinsOwned').textContent = coinsOwned.toFixed(2);
    document.getElementById('portfolioCoins').textContent = coinsOwned.toFixed(2);
    
    const portfolioValue = coinsOwned * currentPrice;
    document.getElementById('portfolioValue').textContent = `$${portfolioValue.toFixed(2)}`;
    
    const profitLoss = portfolioValue - totalInvested;
    const profitLossElement = document.getElementById('profitLoss');
    profitLossElement.textContent = `$${profitLoss.toFixed(2)}`;
    profitLossElement.style.color = profitLoss >= 0 ? '#10b981' : '#ef4444';
    
    updateTotalCost();
    updatePriceChange();
}

function updateTotalCost() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const totalCost = amount * currentPrice;
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
}

function updatePriceChange() {
    if (priceHistory.length < 2) return;
    
    const oldPrice = priceHistory[0].price;
    const change = ((currentPrice - oldPrice) / oldPrice) * 100;
    const priceChangeElement = document.getElementById('priceChange');
    
    priceChangeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    priceChangeElement.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
}

function buyCoins() {
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount of coins to buy!');
        return;
    }
    
    const totalCost = amount * currentPrice;
    
    if (totalCost === 0) {
        alert('Cannot buy with $0!');
        return;
    }
    
    if (totalCost > balance + 0.001) {
        alert('Insufficient funds! You need $' + totalCost.toFixed(2) + ' but only have $' + balance.toFixed(2));
        return;
    }
    
    const executionPrice = currentPrice;
    
    balance -= totalCost;
    coinsOwned += amount;
    totalInvested += totalCost;
    
    adjustPrice('buy', amount);
    
    addTransaction('buy', amount, executionPrice);
    addMarketActivity('You', 'buy', amount, executionPrice);
    
    triggerBotReaction('user_buy', amount);
    
    document.getElementById('amount').value = '';
    updateDisplay();
    saveGameState();
}

function sellCoins() {
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount of coins to sell!');
        return;
    }
    
    if (amount > coinsOwned) {
        alert('You only have ' + coinsOwned.toFixed(2) + ' coins!');
        return;
    }
    
    const executionPrice = currentPrice;
    const totalValue = amount * currentPrice;
    
    balance += totalValue;
    coinsOwned -= amount;
    totalInvested -= (totalInvested / (coinsOwned + amount)) * amount;
    
    adjustPrice('sell', amount);
    
    addTransaction('sell', amount, executionPrice);
    addMarketActivity('You', 'sell', amount, executionPrice);
    
    triggerBotReaction('user_sell', amount);
    
    document.getElementById('amount').value = '';
    updateDisplay();
    saveGameState();
}

function buyAllCoins() {
    if (balance <= 0) {
        alert('You have no balance to buy coins!');
        return;
    }
    
    const maxCoins = balance / currentPrice;
    const executionPrice = currentPrice;
    const totalCost = balance;
    
    coinsOwned += maxCoins;
    totalInvested += totalCost;
    balance = 0;
    
    adjustPrice('buy', maxCoins);
    
    addTransaction('buy', maxCoins, executionPrice);
    addMarketActivity('You', 'buy', maxCoins, executionPrice);
    
    triggerBotReaction('user_buy', maxCoins);
    
    document.getElementById('amount').value = '';
    updateDisplay();
    saveGameState();
}

function sellAllCoins() {
    if (coinsOwned <= 0) {
        alert('You have no coins to sell!');
        return;
    }
    
    const amount = coinsOwned;
    const executionPrice = currentPrice;
    const totalValue = amount * currentPrice;
    
    balance += totalValue;
    coinsOwned = 0;
    totalInvested = 0;
    
    adjustPrice('sell', amount);
    
    addTransaction('sell', amount, executionPrice);
    addMarketActivity('You', 'sell', amount, executionPrice);
    
    triggerBotReaction('user_sell', amount);
    
    document.getElementById('amount').value = '';
    updateDisplay();
    saveGameState();
}

function adjustPrice(action, amount) {
    const impact = (amount * PRICE_VOLATILITY) / 100;
    
    if (action === 'buy') {
        currentPrice += impact;
    } else {
        currentPrice -= impact;
        if (currentPrice < 0.001) currentPrice = 0.001;
    }
}

function addTransaction(type, amount, price) {
    const transactionList = document.getElementById('transactionHistory');
    
    if (transactionList.children[0]?.textContent === 'No transactions yet') {
        transactionList.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = `transaction-item ${type}`;
    item.innerHTML = `
        <strong>${type.toUpperCase()}</strong> ${amount.toFixed(2)} coins @ $${price.toFixed(3)}
        <br><small>${new Date().toLocaleTimeString()}</small>
    `;
    
    transactionList.insertBefore(item, transactionList.firstChild);
    
    if (transactionList.children.length > MAX_TRANSACTIONS) {
        transactionList.removeChild(transactionList.lastChild);
    }
}

function addMarketActivity(trader, type, amount, price) {
    const activityList = document.getElementById('marketActivity');
    
    if (activityList.children[0]?.textContent === 'Market is waiting for trades...') {
        activityList.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    item.innerHTML = `
        <strong>${trader}</strong> ${type === 'buy' ? 'bought' : 'sold'} ${amount.toFixed(2)} coins @ $${price.toFixed(3)}
    `;
    
    activityList.insertBefore(item, activityList.firstChild);
    
    if (activityList.children.length > MAX_MARKET_ACTIVITIES) {
        activityList.removeChild(activityList.lastChild);
    }
}

let lastPriceSnapshot = INITIAL_PRICE;
let priceIncreasing = false;

function botTrade() {
    if (rug) {
        const action = 'sell';
        const amount = Math.random() * 40 + 20;
        const botName = botNames[Math.floor(Math.random() * botNames.length)];
        const executionPrice = currentPrice;
        
        adjustPrice(action, amount);
        addMarketActivity(botName, action, amount, executionPrice);
        updateDisplay();
        return;
    }
    
    if (priceHistory.length > 5) {
        const recentPrice = priceHistory[priceHistory.length - 5].price;
        priceIncreasing = currentPrice > recentPrice * 1.02;
    }
    
    let action;
    let amount;
    
    if (priceIncreasing) {
        const sellChance = Math.random();
        if (sellChance < 0.7) {
            action = 'sell';
            amount = Math.random() * 25 + 10;
        } else {
            action = 'buy';
            amount = Math.random() * 5 + 1;
        }
    } else {
        const buyChance = Math.random();
        if (buyChance < 0.5) {
            action = 'buy';
            amount = Math.random() * 10 + 2;
        } else if (buyChance < 0.8) {
            action = 'sell';
            amount = Math.random() * 8 + 1;
        } else {
            action = 'buy';
            amount = Math.random() * 20 + 5;
        }
    }
    
    const botName = botNames[Math.floor(Math.random() * botNames.length)];
    const executionPrice = currentPrice;
    
    adjustPrice(action, amount);
    addMarketActivity(botName, action, amount, executionPrice);
    updateDisplay();
}

function triggerBotReaction(userAction, userAmount) {
    if (userAction === 'user_buy') {
        setTimeout(() => {
            const numBots = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < numBots; i++) {
                setTimeout(() => {
                    const botName = botNames[Math.floor(Math.random() * botNames.length)];
                    const sellAmount = (userAmount * (Math.random() * 0.5 + 0.3));
                    const executionPrice = currentPrice;
                    
                    adjustPrice('sell', sellAmount);
                    addMarketActivity(botName, 'sell', sellAmount, executionPrice);
                    updateDisplay();
                    saveGameState();
                }, i * 200);
            }
        }, 300);
    } else if (userAction === 'user_sell' && !rug) {
        setTimeout(() => {
            const numBots = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < numBots; i++) {
                setTimeout(() => {
                    const botName = botNames[Math.floor(Math.random() * botNames.length)];
                    const buyAmount = (userAmount * (Math.random() * 0.3 + 0.1));
                    const executionPrice = currentPrice;
                    
                    adjustPrice('buy', buyAmount);
                    addMarketActivity(botName, 'buy', buyAmount, executionPrice);
                    updateDisplay();
                    saveGameState();
                }, i * 200);
            }
        }, 300);
    }
}

function getBarColors() {
    const colors = [];
    for (let i = 0; i < priceHistory.length; i++) {
        if (i === 0) {
            colors.push('#10b981');
        } else {
            const current = priceHistory[i].price;
            const previous = priceHistory[i - 1].price;
            colors.push(current >= previous ? '#10b981' : '#ef4444');
        }
    }
    return colors;
}

function getChartConfig(type) {
    if (type === 'bar') {
        return {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price (USD)',
                    data: [],
                    backgroundColor: getBarColors(),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(3);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    } else {
        return {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price (USD)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: type === 'area' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: type === 'area',
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(3);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }
}

function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    chart = new Chart(ctx, getChartConfig(currentChartType));
}

function toggleChartType() {
    if (currentChartType === 'area') {
        currentChartType = 'line';
    } else if (currentChartType === 'line') {
        currentChartType = 'bar';
    } else {
        currentChartType = 'area';
    }
    
    const priceData = priceHistory.map(p => p.price);
    const timeLabels = priceHistory.map(p => p.time);
    
    chart.destroy();
    
    const ctx = document.getElementById('priceChart').getContext('2d');
    chart = new Chart(ctx, getChartConfig(currentChartType));
    
    chart.data.labels = timeLabels;
    chart.data.datasets[0].data = priceData;
    
    if (currentChartType === 'bar') {
        chart.data.datasets[0].backgroundColor = getBarColors();
    }
    
    chart.update();
    
    const buttonText = currentChartType === 'area' ? 'Area Chart' : 
                       currentChartType === 'line' ? 'Line Chart' : 'Bar Chart';
    document.getElementById('chartToggle').textContent = buttonText;
}

function updateChart() {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    if (rug && currentPrice > 0.001) {
        currentPrice = currentPrice * 0.65;
        if (currentPrice < 0.001) currentPrice = 0.001;
        
        const rugBotCount = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < rugBotCount; i++) {
            const botName = botNames[Math.floor(Math.random() * botNames.length)];
            const sellAmount = Math.random() * 50 + 20;
            addMarketActivity(botName, 'sell', sellAmount, currentPrice);
        }
        
        updateDisplay();
        saveGameState();
    }
    
    priceHistory.push({
        time: timeLabel,
        price: currentPrice
    });
    
    if (priceHistory.length > 50) {
        priceHistory.shift();
    }
    
    chart.data.labels = priceHistory.map(p => p.time);
    chart.data.datasets[0].data = priceHistory.map(p => p.price);
    
    if (currentChartType === 'bar') {
        chart.data.datasets[0].backgroundColor = getBarColors();
    }
    
    chart.update('none');
    saveGameState();
}

async function checkRugStatus() {
    try {
        const corsProxy = 'https://corsproxy.io/?';
        const response = await fetch(corsProxy + encodeURIComponent(PASTEBIN_URL));
        const text = await response.text();
        
        const rugMatch = text.match(/let\s+rug\s*=\s*(true|false)/);
        if (rugMatch) {
            const newRugStatus = rugMatch[1] === 'true';
            if (newRugStatus !== rug) {
                rug = newRugStatus;
                console.log('✅ Rug status changed to:', rug);
                if (rug) {
                    console.log('🚨 RUG PULL ACTIVATED! Price will crash!');
                }
            }
        }
    } catch (error) {
    }
}

let buyBtnHoverTimeout = null;

document.getElementById('buyBtn').addEventListener('click', buyCoins);
document.getElementById('sellBtn').addEventListener('click', sellCoins);
document.getElementById('buyAllBtn').addEventListener('click', buyAllCoins);
document.getElementById('sellAllBtn').addEventListener('click', sellAllCoins);
document.getElementById('amount').addEventListener('input', updateTotalCost);
document.getElementById('chartToggle').addEventListener('click', toggleChartType);
document.getElementById('resetBtn').addEventListener('click', resetGame);

document.getElementById('buyBtn').addEventListener('mouseenter', function() {
    buyBtnHoverTimeout = setTimeout(() => {
        if (!rug && Math.random() > 0.9) {
            const numBots = Math.floor(Math.random() * 4) + 1;
            for (let i = 0; i < numBots; i++) {
                setTimeout(() => {
                    const botName = botNames[Math.floor(Math.random() * botNames.length)];
                    const buyAmount = Math.random() * 8 + 2;
                    const executionPrice = currentPrice;
                    
                    adjustPrice('buy', buyAmount);
                    addMarketActivity(botName, 'buy', buyAmount, executionPrice);
                    updateDisplay();
                }, i * 150);
            }
        }
    }, 500);
});

document.getElementById('buyBtn').addEventListener('mouseleave', function() {
    if (buyBtnHoverTimeout) {
        clearTimeout(buyBtnHoverTimeout);
        buyBtnHoverTimeout = null;
    }
});

loadGameState();
initChart();

if (priceHistory.length === 0) {
    for (let i = 0; i < 20; i++) {
        priceHistory.push({
            time: '',
            price: currentPrice + (Math.random() - 0.5) * 0.01
        });
    }
} else {
    chart.data.labels = priceHistory.map(p => p.time);
    chart.data.datasets[0].data = priceHistory.map(p => p.price);
    
    if (currentChartType === 'bar') {
        chart.data.datasets[0].backgroundColor = getBarColors();
    }
    
    chart.update();
}

const buttonText = currentChartType === 'area' ? 'Area Chart' : 
                   currentChartType === 'line' ? 'Line Chart' : 'Bar Chart';
document.getElementById('chartToggle').textContent = buttonText;

updateDisplay();

setInterval(botTrade, BOT_TRADE_INTERVAL);
setInterval(updateChart, CHART_UPDATE_INTERVAL);
setInterval(checkRugStatus, RUG_CHECK_INTERVAL);

checkRugStatus();
updateChart();
