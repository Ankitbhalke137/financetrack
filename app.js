// ===========================
// CONFIGURATION
// ===========================
// Load from config.local.js if available, otherwise use defaults
const APPS_SCRIPT_URL = typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '';
const GOOGLE_CLIENT_ID = typeof CONFIG !== 'undefined' ? CONFIG.GOOGLE_CLIENT_ID : '';
const ALLOWED_EMAILS = typeof CONFIG !== 'undefined' ? CONFIG.ALLOWED_EMAILS : [];

// ===========================
// STATE
// ===========================
let currentUser = null;
let transactions = [];
let selectedCategory = 'Food';
let filteredTransactions = [];
let currentFilter = 'all';
let searchQuery = '';
let filterCategory = '';
let filterPayer = '';
let filterMonth = '';
let filterFrom = '';
let filterTo = '';
let filterMin = '';
let filterMax = '';
let sortBy = 'date-desc';
let editingTxnId = null;
let statsCategory = '';
let statsType = '';
let statsMonth = '';
let statsFrom = '';
let statsTo = '';
let friendTransactions = [];
let friendTxnType = 'lent';

// ===========================
// GOOGLE AUTH
// ===========================
function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    if (!ALLOWED_EMAILS.includes(payload.email)) {
        alert('Access denied.\n\n' + payload.email + ' is not authorized.');
        google.accounts.id.disableAutoSelect();
        return;
    }
    
    currentUser = {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || null
    };
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    localStorage.removeItem('darkMode');
    google.accounts.id.disableAutoSelect();
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

function checkAuth() {
    const saved = localStorage.getItem('user');
    if (saved) {
        currentUser = JSON.parse(saved);
        if (!ALLOWED_EMAILS.includes(currentUser.email)) {
            localStorage.removeItem('user');
            return;
        }
        showApp();
    }
    loadTheme();
}

// ===========================
// APP INIT
// ===========================
function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    // Set profile images with fallback
    const avatarUrl = currentUser.picture && currentUser.picture.startsWith('http') 
        ? currentUser.picture 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=c0c1ff&color=1000a9&bold=true`;
    
    const userPic = document.getElementById('user-pic');
    const settingsPic = document.getElementById('settings-pic');
    
    // Set with onerror fallback
    userPic.onerror = function() { this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=c0c1ff&color=1000a9&bold=true`; };
    settingsPic.onerror = function() { this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=c0c1ff&color=1000a9&bold=true`; };
    
    userPic.src = avatarUrl;
    settingsPic.src = avatarUrl;
    document.getElementById('settings-name').textContent = currentUser.name;
    document.getElementById('settings-email').textContent = currentUser.email;
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
    
    showPage('home');
    loadTransactions();
    loadFriendTransactions();
    updateStreak();
}

// ===========================
// STREAK TRACKING
// ===========================
function updateStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('lastVisit');
    let streak = parseInt(localStorage.getItem('streak') || '0');
    
    if (lastVisit === today) {
        // Already visited today
    } else if (lastVisit === new Date(Date.now() - 86400000).toDateString()) {
        // Consecutive day
        streak++;
    } else if (lastVisit !== today) {
        // Streak broken
        streak = 1;
    }
    
    localStorage.setItem('streak', streak);
    localStorage.setItem('lastVisit', today);
    
    // Update streak display if on stats page
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = streak;
}

// ===========================
// DAILY BUDGET
// ===========================
function getDailyBudget() {
    return parseInt(localStorage.getItem('dailyBudget') || '500');
}

function setDailyBudget(amount) {
    localStorage.setItem('dailyBudget', amount);
}

function getTodaySpending() {
    const today = new Date().toISOString().split('T')[0];
    return transactions
        .filter(t => t.Date === today && t.Type === 'Expense')
        .reduce((sum, t) => sum + parseFloat(t.Amount), 0);
}

// ===========================
// DARK MODE / LIGHT MODE
// ===========================
function toggleTheme() {
    const isDark = document.getElementById('dark-mode-toggle').checked;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
    document.getElementById('theme-label').textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

function loadTheme() {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved !== null ? saved === 'true' : true; // Default to dark
    document.documentElement.classList.toggle('dark', isDark);
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        toggle.checked = isDark;
        document.getElementById('theme-label').textContent = isDark ? 'Dark Mode' : 'Light Mode';
    }
}

// ===========================
// PAGE NAVIGATION
// ===========================
function showPage(page) {
    document.getElementById('home-content').classList.add('hidden');
    document.getElementById('friends-content').classList.add('hidden');
    document.getElementById('stats-content').classList.add('hidden');
    document.getElementById('settings-content').classList.add('hidden');
    
    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = 'flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all px-2 py-1';
    });
    
    if (page === 'home') {
        document.getElementById('home-content').classList.remove('hidden');
        document.getElementById('nav-home').className = 'flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-2 py-1';
    } else if (page === 'friends') {
        document.getElementById('friends-content').classList.remove('hidden');
        document.getElementById('nav-friends').className = 'flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-2 py-1';
        updateFriendsSummary();
    } else if (page === 'stats') {
        document.getElementById('stats-content').classList.remove('hidden');
        document.getElementById('nav-stats').className = 'flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-2 py-1';
        updateStats();
    } else if (page === 'settings') {
        document.getElementById('settings-content').classList.remove('hidden');
        document.getElementById('nav-settings').className = 'flex flex-col items-center justify-center text-primary bg-primary-container/20 rounded-xl px-2 py-1';
    }
}

// ===========================
// FILTER & SEARCH
// ===========================
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = btn.dataset.filter === filter
            ? 'filter-btn px-3 py-1 rounded-full font-label text-label-caps bg-primary text-on-primary'
            : 'filter-btn px-3 py-1 rounded-full font-label text-label-caps bg-surface-container-highest text-on-surface-variant hover:bg-surface-container';
    });
    applyFilters();
}

function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
}

function applyFilters() {
    filteredTransactions = transactions.filter(txn => {
        // Search filter
        const matchesSearch = !searchQuery || 
            txn.Category.toLowerCase().includes(searchQuery) ||
            (txn.Notes && txn.Notes.toLowerCase().includes(searchQuery)) ||
            txn.Amount.toString().includes(searchQuery);
        
        // Date filter
        const txnDate = new Date(txn.Date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let matchesFilter = true;
        if (currentFilter === 'today') {
            matchesFilter = txnDate.toDateString() === today.toDateString();
        } else if (currentFilter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesFilter = txnDate >= weekAgo;
        } else if (currentFilter === 'month') {
            matchesFilter = txnDate.getMonth() === today.getMonth() && txnDate.getFullYear() === today.getFullYear();
        } else if (currentFilter === 'income') {
            matchesFilter = txn.Type === 'Income';
        } else if (currentFilter === 'expense') {
            matchesFilter = txn.Type === 'Expense';
        }
        if (!matchesFilter) return false;
        
        // Advanced filters
        if (filterCategory && txn.Category !== filterCategory) return false;
        if (filterPayer && getPayer(txn) !== filterPayer) return false;
        if (filterMonth && !txn.Date.startsWith(filterMonth)) return false;
        if (filterFrom && txn.Date < filterFrom) return false;
        if (filterTo && txn.Date > filterTo) return false;
        const amount = parseFloat(txn.Amount);
        if (filterMin !== '' && amount < parseFloat(filterMin)) return false;
        if (filterMax !== '' && amount > parseFloat(filterMax)) return false;
        
        return true;
    });
    
    renderTransactions();
    updateSummary();
}

function getPayer(txn) {
    if (!txn.Notes) return '(no notes)';
    const name = txn.Notes.split(' via ')[0].trim();
    return name ? name.substring(0, 40) : '(no notes)';
}

function populateFilterOptions() {
    const categories = [...new Set(transactions.map(t => t.Category))];
    const payers = [...new Set(transactions.map(t => getPayer(t)))].sort((a, b) => a.localeCompare(b));
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    
    const catSel = document.getElementById('filter-category');
    const currentCat = catSel.value;
    catSel.innerHTML = '<option value="">Category: All</option>' + categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    catSel.value = categories.includes(currentCat) ? currentCat : '';
    
    const statsCatSel = document.getElementById('stats-category');
    const currentStatsCat = statsCatSel.value;
    statsCatSel.innerHTML = '<option value="">Category: All</option>' + categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    statsCatSel.value = categories.includes(currentStatsCat) ? currentStatsCat : '';
    
    const paySel = document.getElementById('filter-payer');
    const currentPayer = paySel.value;
    paySel.innerHTML = '<option value="">Payer/Payee: All</option>' + payers.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    paySel.value = payers.includes(currentPayer) ? currentPayer : '';
}

function handleAdvancedFilter() {
    filterCategory = document.getElementById('filter-category').value;
    filterPayer = document.getElementById('filter-payer').value;
    filterMonth = document.getElementById('filter-month').value;
    filterFrom = document.getElementById('filter-from').value;
    filterTo = document.getElementById('filter-to').value;
    filterMin = document.getElementById('filter-min').value;
    filterMax = document.getElementById('filter-max').value;
    sortBy = document.getElementById('filter-sort').value;
    applyFilters();
}

function clearAdvancedFilters() {
    ['filter-category', 'filter-payer', 'filter-month', 'filter-from', 'filter-to', 'filter-min', 'filter-max', 'filter-sort'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('filter-sort').value = 'date-desc';
    filterCategory = filterPayer = filterMonth = filterFrom = filterTo = filterMin = filterMax = '';
    sortBy = 'date-desc';
    setFilter('all');
}

// ===========================
// SUMMARY
// ===========================
function updateSummary() {
    let income = 0, expense = 0;
    filteredTransactions.forEach(txn => {
        if (txn.Type === 'Income') income += parseFloat(txn.Amount);
        else expense += parseFloat(txn.Amount);
    });
    document.getElementById('total-balance').textContent = `₹${(income - expense).toLocaleString()}`;
    document.getElementById('total-income').textContent = `₹${income.toLocaleString()}`;
    document.getElementById('total-expense').textContent = `₹${expense.toLocaleString()}`;
    document.getElementById('txn-count').textContent = `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`;
}

// ===========================
// STATS
// ===========================
function handleStatsFilter() {
    statsCategory = document.getElementById('stats-category').value;
    statsType = document.getElementById('stats-type').value;
    statsMonth = document.getElementById('stats-month').value;
    statsFrom = document.getElementById('stats-from').value;
    statsTo = document.getElementById('stats-to').value;
    updateStats();
}

function clearStatsFilter() {
    statsCategory = statsType = statsMonth = statsFrom = statsTo = '';
    document.getElementById('stats-category').value = '';
    document.getElementById('stats-type').value = '';
    document.getElementById('stats-month').value = '';
    document.getElementById('stats-from').value = '';
    document.getElementById('stats-to').value = '';
    updateStats();
}

function updateStats() {
    let income = 0, expense = 0;
    const categoryTotals = {};

    const filtered = transactions.filter(txn => {
        if (statsCategory && txn.Category !== statsCategory) return false;
        if (statsType && txn.Type !== statsType) return false;
        if (statsMonth && !txn.Date.startsWith(statsMonth)) return false;
        if (statsFrom && txn.Date < statsFrom) return false;
        if (statsTo && txn.Date > statsTo) return false;
        return true;
    });

    filtered.forEach(txn => {
        const amount = parseFloat(txn.Amount);
        if (txn.Type === 'Income') income += amount;
        else {
            expense += amount;
            categoryTotals[txn.Category] = (categoryTotals[txn.Category] || 0) + amount;
        }
    });

    document.getElementById('stats-income').textContent = `₹${income.toLocaleString()}`;
    document.getElementById('stats-expense').textContent = `₹${expense.toLocaleString()}`;
    document.getElementById('stats-total').textContent = filtered.length;
    document.getElementById('stats-days').textContent = new Set(filtered.map(t => t.Date)).size;

    const total = income + expense;
    document.getElementById('stats-bar').style.width = `${total > 0 ? Math.min((income / total) * 100, 100) : 0}%`;

    const container = document.getElementById('category-stats');
    const cats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    if (!cats.length) {
        container.innerHTML = '<p class="text-on-surface-variant text-center py-4">No expense data yet</p>';
        return;
    }

    const max = Math.max(...cats.map(c => c[1]));
    container.innerHTML = cats.map(([cat, amt]) => `
        <div class="flex flex-col gap-1">
            <div class="flex justify-between">
                <span class="font-body text-body-md text-on-surface">${cat}</span>
                <span class="font-label text-label-md text-on-surface">₹${amt.toLocaleString()}</span>
            </div>
            <div class="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full" style="width: ${(amt / max) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

// ===========================
// TRANSACTIONS
// ===========================
const categoryIcons = {
    'Food': 'restaurant', 'Transport': 'directions_car', 'Shopping': 'shopping_bag',
    'Bills': 'receipt_long', 'Salary': 'work', 'Health': 'health_and_safety',
    'Entertainment': 'movie', 'Other': 'more_horiz', 'Father Medicine': 'medication',
    'Vending Machine': 'vending_machine'
};

async function loadTransactions() {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTransactions' })
        });
        const data = await response.json();
        transactions = data.transactions || [];
        filteredTransactions = [...transactions];
        applyFilters();
        populateFilterOptions();
        updateSummary();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function renderTransactions() {
    const container = document.getElementById('transactions');
    if (!filteredTransactions.length) {
        container.innerHTML = '<p class="text-center text-on-surface-variant py-8">No transactions found.</p>';
        return;
    }
    const sorted = [...filteredTransactions].sort((a, b) => {
        if (sortBy === 'date-asc') return new Date(a.Date) - new Date(b.Date);
        if (sortBy === 'amount-desc') return parseFloat(b.Amount) - parseFloat(a.Amount);
        if (sortBy === 'amount-asc') return parseFloat(a.Amount) - parseFloat(b.Amount);
        if (sortBy === 'category-asc') return String(a.Category).localeCompare(String(b.Category));
        return new Date(b.Date) - new Date(a.Date);
    });
    container.innerHTML = sorted.map(txn => {
        const icon = categoryIcons[txn.Category] || 'receipt_long';
        const isIncome = txn.Type === 'Income';
        return `
            <div class="h-14 flex items-center justify-between border-b border-outline-variant/30 group">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-full ${isIncome ? 'bg-primary-container/30 text-primary' : 'bg-error-container/50 text-on-error-container'} flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-lg">${icon}</span>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="font-body text-body-md text-on-surface font-medium truncate">${txn.Category}</span>
                        <span class="font-label text-label-caps text-on-surface-variant lowercase truncate">${txn.Date}${txn.Notes ? ' • ' + txn.Notes : ''}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-label text-label-md ${isIncome ? 'text-primary' : 'text-on-surface'}">${isIncome ? '+' : '-'}₹${parseFloat(txn.Amount).toLocaleString()}</span>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editTransaction('${txn.Txn_ID}')" class="p-1 rounded-full hover:bg-surface-container-high">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onclick="deleteTransaction('${txn.Txn_ID}')" class="p-1 rounded-full hover:bg-error-container">
                            <span class="material-symbols-outlined text-sm text-error">delete</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ===========================
// DELETE TRANSACTION
// ===========================
async function deleteTransaction(txnId) {
    if (!confirm('Delete this transaction?')) return;
    
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteTransaction', txnId: txnId })
        });
        loadTransactions();
    } catch (error) {
        alert('Error deleting transaction');
    }
}

// ===========================
// EDIT TRANSACTION
// ===========================
function editTransaction(txnId) {
    const txn = transactions.find(t => t.Txn_ID === txnId);
    if (!txn) return;
    
    editingTxnId = txnId;
    document.getElementById('txn-type').value = txn.Type;
    document.getElementById('txn-amount').value = txn.Amount;
    document.getElementById('txn-date').value = txn.Date;
    document.getElementById('txn-notes').value = txn.Notes || '';
    setCategory(txn.Category);
    setType(txn.Type);
    
    document.querySelector('#modal form button[type="submit"]').innerHTML = '<span class="material-symbols-outlined">sync</span> Update Transaction';
    openModal();
}

// ===========================
// MODAL
// ===========================
function openModal() {
    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('txn-form').reset();
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
    setType('Expense');
    setCategory('Food');
    editingTxnId = null;
    document.querySelector('#modal form button[type="submit"]').innerHTML = '<span class="material-symbols-outlined">sync</span> Save Transaction';
}

function setType(type) {
    document.getElementById('txn-type').value = type;
    document.getElementById('type-income').className = type === 'Income' 
        ? 'flex-1 py-2 font-label text-label-caps bg-surface-container-highest text-primary rounded shadow-sm border border-outline-variant/40 text-center'
        : 'flex-1 py-2 font-label text-label-caps text-on-surface-variant hover:text-primary transition-colors text-center rounded';
    document.getElementById('type-expense').className = type === 'Expense'
        ? 'flex-1 py-2 font-label text-label-caps bg-surface-container-highest text-primary rounded shadow-sm border border-outline-variant/40 text-center'
        : 'flex-1 py-2 font-label text-label-caps text-on-surface-variant hover:text-primary transition-colors text-center rounded';
}

function setCategory(category) {
    selectedCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.className = btn.dataset.cat === category
            ? 'category-btn flex flex-col items-center gap-2 p-3 rounded-xl bg-primary-container/20 border border-primary/50 text-primary transition-all'
            : 'category-btn flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all shadow-sm';
    });
}

async function addTransaction(event) {
    event.preventDefault();
    const txn = {
        Txn_ID: editingTxnId || 'TXN' + Date.now(),
        Date: document.getElementById('txn-date').value,
        Type: document.getElementById('txn-type').value,
        Category: selectedCategory,
        Amount: document.getElementById('txn-amount').value,
        Notes: document.getElementById('txn-notes').value
    };
    
    const action = editingTxnId ? 'updateTransaction' : 'addTransaction';
    
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data: txn })
        });
        closeModal();
        loadTransactions();
    } catch (error) {
        alert('Error saving transaction');
    }
}

// ===========================
// EXPORT CSV
// ===========================
function exportCSV() {
    if (!transactions.length) {
        alert('No transactions to export');
        return;
    }
    
    const headers = ['Txn_ID', 'Date', 'Type', 'Category', 'Amount', 'Notes'];
    const rows = transactions.map(t => [t.Txn_ID, t.Date, t.Type, t.Category, t.Amount, t.Notes || '']);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinanceTrack_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===========================
// PULL TO REFRESH
// ===========================
let touchStartY = 0;
let isPulling = false;

document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        isPulling = true;
    }
});

document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (diff > 80 && window.scrollY === 0) {
        document.getElementById('pull-refresh').classList.remove('hidden');
    }
});

document.addEventListener('touchend', () => {
    if (document.getElementById('pull-refresh').offsetParent !== null) {
        loadTransactions();
        setTimeout(() => {
            document.getElementById('pull-refresh').classList.add('hidden');
        }, 1000);
    }
    isPulling = false;
});

// ===========================
// FRIENDS
// ===========================
async function loadFriendTransactions() {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getFriendTransactions' })
        });
        const data = await response.json();
        friendTransactions = data.friends || [];
        renderFriendsList();
    } catch (error) {
        console.error('Error loading friend transactions:', error);
    }
}

function renderFriendsList() {
    const container = document.getElementById('friends-list');
    if (!friendTransactions.length) {
        container.innerHTML = '<p class="text-center text-on-surface-variant py-8">No friend transactions yet.</p>';
        return;
    }

    // Group by friend name
    const friends = {};
    friendTransactions.forEach(txn => {
        const name = txn.Name;
        if (!friends[name]) friends[name] = { lent: 0, borrowed: 0, txns: [] };
        if (txn.Type === 'lent') friends[name].lent += parseFloat(txn.Amount);
        else friends[name].borrowed += parseFloat(txn.Amount);
        friends[name].txns.push(txn);
    });

    container.innerHTML = Object.entries(friends).map(([name, data]) => {
        const net = data.lent - data.borrowed;
        const isPositive = net > 0;
        return `
            <div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${isPositive ? 'bg-primary-container/30 text-primary' : 'bg-error-container/50 text-error'} flex items-center justify-center">
                            <span class="material-symbols-outlined">person</span>
                        </div>
                        <div>
                            <span class="font-body text-body-md text-on-surface font-medium">${name}</span>
                            <div class="font-label text-label-sm text-on-surface-variant">${data.txns.length} transaction${data.txns.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-headline text-headline-sm ${isPositive ? 'text-primary' : 'text-error'}">
                            ${isPositive ? '+' : '-'}₹${Math.abs(net).toLocaleString()}
                        </div>
                        <span class="font-label text-label-caps ${isPositive ? 'text-primary' : 'text-error'}">
                            ${isPositive ? 'Will get back' : 'You owe'}
                        </span>
                    </div>
                </div>
                <div class="flex gap-2 text-xs">
                    <span class="px-2 py-1 rounded-full bg-primary/10 text-primary">Gave: ₹${data.lent.toLocaleString()}</span>
                    <span class="px-2 py-1 rounded-full bg-error/10 text-error">Got: ₹${data.borrowed.toLocaleString()}</span>
                </div>
            </div>`;
    }).join('');
}

function updateFriendsSummary() {
    let getBack = 0, youOwe = 0;
    
    friendTransactions.forEach(txn => {
        if (txn.Type === 'lent') getBack += parseFloat(txn.Amount);
        else youOwe += parseFloat(txn.Amount);
    });
    
    document.getElementById('friends-get-back').textContent = `₹${getBack.toLocaleString()}`;
    document.getElementById('friends-you-owe').textContent = `₹${youOwe.toLocaleString()}`;
}

function openFriendModal() {
    document.getElementById('friend-modal').classList.remove('hidden');
    document.getElementById('friend-date').value = new Date().toISOString().split('T')[0];
    document.body.style.overflow = 'hidden';
}

function closeFriendModal() {
    document.getElementById('friend-modal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('friend-form').reset();
    document.getElementById('friend-date').value = new Date().toISOString().split('T')[0];
    setFriendType('lent');
}

function setFriendType(type) {
    friendTxnType = type;
    document.getElementById('friend-txn-type').value = type;
    document.getElementById('friend-type-lent').className = type === 'lent'
        ? 'flex-1 py-2 font-label text-label-caps bg-surface-container-highest text-primary rounded shadow-sm border border-outline-variant/40 text-center'
        : 'flex-1 py-2 font-label text-label-caps text-on-surface-variant hover:text-primary transition-colors text-center rounded';
    document.getElementById('friend-type-borrowed').className = type === 'borrowed'
        ? 'flex-1 py-2 font-label text-label-caps bg-surface-container-highest text-primary rounded shadow-sm border border-outline-variant/40 text-center'
        : 'flex-1 py-2 font-label text-label-caps text-on-surface-variant hover:text-primary transition-colors text-center rounded';
}

async function addFriendTransaction(event) {
    event.preventDefault();
    const txn = {
        ID: 'FRIEND' + Date.now(),
        Name: document.getElementById('friend-name').value,
        Type: document.getElementById('friend-txn-type').value,
        Amount: document.getElementById('friend-amount').value,
        Date: document.getElementById('friend-date').value,
        Notes: document.getElementById('friend-notes').value,
        Settled: document.getElementById('friend-settled').checked ? 'Yes' : 'No'
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addFriendTransaction', data: txn })
        });
        closeFriendModal();
        loadFriendTransactions();
        updateFriendsSummary();
    } catch (error) {
        alert('Error saving transaction');
    }
}

// ===========================
// INIT
// ===========================
checkAuth();
loadFriendTransactions();
