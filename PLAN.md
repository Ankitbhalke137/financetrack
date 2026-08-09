# Personal Finance Tracker - MVP Plan

## Overview
A simple web app to track income and expenses using Google Sheets as database.

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | HTML + CSS + JavaScript | Simplest, no frameworks |
| Backend | Google Apps Script | Free, no server needed |
| Database | Google Sheets | Free, user owns data |

---

## Features (MVP)

### ✅ What We're Building
1. **Login** - Sign in with Google
2. **Dashboard** - See total balance, income, expenses
3. **Add Transaction** - Log income or expense
4. **Transaction History** - View all past transactions

### ❌ What We're Skipping (For Now)
- Loans/EMI tracking
- Budget categories with limits
- Charts/graphs
- Mobile app

---

## File Structure

```
personal-finance-tracker/
│
├── index.html          # Main HTML file
├── styles.css          # Styling
├── app.js              # Frontend logic
│
└── apps-script/
    └── Code.gs         # Google Apps Script (deploy separately)
```

---

## Google Sheet Setup

### Step 1: Create New Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create new spreadsheet named `Finance_Tracker`
3. Rename Sheet1 to `Transactions`

### Step 2: Add Headers (Row 1)

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Txn_ID | Date | Type | Category | Amount | Notes |

### Step 3: Example Data

| Txn_ID | Date | Type | Category | Amount | Notes |
|--------|------|------|----------|--------|-------|
| TXN001 | 2026-08-01 | Income | Salary | 50000 | Monthly salary |
| TXN002 | 2026-08-02 | Expense | Food | 500 | Lunch |
| TXN003 | 2026-08-03 | Expense | Transport | 200 | Uber ride |

---

## Google Apps Script Setup

### Step 1: Open Apps Script
1. In your Google Sheet, click **Extensions > Apps Script**
2. Delete any code in `Code.gs`
3. Paste the provided Code.gs code
4. Click **Save**

### Step 2: Deploy as Web App
1. Click **Deploy > New Deployment**
2. Select **Web app**
3. Description: `Finance Tracker API`
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Click **Deploy**
7. Copy the Web App URL (save this!)

### Step 3: Update app.js
Replace `YOUR_APPS_SCRIPT_URL` in app.js with your copied URL.

---

## Code Files

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finance Tracker</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Login Screen -->
    <div id="login-screen" class="screen">
        <div class="login-card">
            <h1>💰 Finance Tracker</h1>
            <p>Track your income & expenses</p>
            <button id="login-btn" onclick="handleLogin()">
                Sign in with Google
            </button>
        </div>
    </div>

    <!-- Dashboard Screen -->
    <div id="dashboard-screen" class="screen hidden">
        <!-- Header -->
        <header>
            <div class="user-info">
                <img id="user-pic" src="" alt="Profile">
                <span id="user-name"></span>
            </div>
            <button onclick="handleLogout()">Logout</button>
        </header>

        <!-- Summary Cards -->
        <div class="summary-cards">
            <div class="card balance">
                <h3>Balance</h3>
                <p id="total-balance">₹0</p>
            </div>
            <div class="card income">
                <h3>Income</h3>
                <p id="total-income">₹0</p>
            </div>
            <div class="card expense">
                <h3>Expenses</h3>
                <p id="total-expense">₹0</p>
            </div>
        </div>

        <!-- Add Transaction Button -->
        <button class="add-btn" onclick="openModal()">+ Add Transaction</button>

        <!-- Transaction List -->
        <div class="transaction-list">
            <h2>Recent Transactions</h2>
            <div id="transactions"></div>
        </div>
    </div>

    <!-- Add Transaction Modal -->
    <div id="modal" class="modal hidden">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2>Add Transaction</h2>
            <form id="txn-form" onsubmit="addTransaction(event)">
                <div class="form-group">
                    <label>Type</label>
                    <select id="txn-type" required>
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" id="txn-amount" required min="1">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="txn-category" required>
                        <option value="Salary">Salary</option>
                        <option value="Food">Food</option>
                        <option value="Transport">Transport</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Bills">Bills</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="txn-date" required>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <input type="text" id="txn-notes" placeholder="Optional">
                </div>
                <button type="submit" class="submit-btn">Save Transaction</button>
            </form>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

---

### styles.css

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    min-height: 100vh;
}

.hidden {
    display: none !important;
}

/* Login Screen */
.screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
}

.login-card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    max-width: 400px;
    width: 100%;
}

.login-card h1 {
    font-size: 28px;
    margin-bottom: 10px;
}

.login-card p {
    color: #666;
    margin-bottom: 30px;
}

#login-btn {
    background: #4285f4;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
    cursor: pointer;
    width: 100%;
}

#login-btn:hover {
    background: #357ae8;
}

/* Header */
header {
    background: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.user-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

#user-pic {
    width: 36px;
    height: 36px;
    border-radius: 50%;
}

header button {
    background: #ff4444;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
}

/* Summary Cards */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    padding: 20px;
}

.card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.card h3 {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
}

.card p {
    font-size: 24px;
    font-weight: bold;
}

.card.balance p { color: #333; }
.card.income p { color: #4caf50; }
.card.expense p { color: #f44336; }

/* Add Button */
.add-btn {
    margin: 0 20px 20px;
    width: calc(100% - 40px);
    padding: 14px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    cursor: pointer;
}

.add-btn:hover {
    background: #43a047;
}

/* Transaction List */
.transaction-list {
    padding: 0 20px 20px;
}

.transaction-list h2 {
    font-size: 18px;
    margin-bottom: 15px;
}

.txn-item {
    background: white;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.txn-info h4 {
    font-size: 15px;
    margin-bottom: 4px;
}

.txn-info span {
    font-size: 12px;
    color: #888;
}

.txn-amount {
    font-weight: bold;
    font-size: 16px;
}

.txn-amount.income { color: #4caf50; }
.txn-amount.expense { color: #f44336; }

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    position: relative;
}

.close {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 24px;
    cursor: pointer;
    color: #999;
}

.modal-content h2 {
    margin-bottom: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #333;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
}

.submit-btn {
    width: 100%;
    padding: 12px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    margin-top: 10px;
}

.submit-btn:hover {
    background: #43a047;
}

/* Loading */
.loading {
    text-align: center;
    padding: 40px;
    color: #666;
}
```

---

### app.js

```javascript
// ===========================
// CONFIGURATION
// ===========================
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

// ===========================
// STATE
// ===========================
let currentUser = null;
let transactions = [];

// ===========================
// AUTH FUNCTIONS
// ===========================
function handleLogin() {
    // Simple auth - in production, use Google Identity Services
    const email = prompt('Enter your Google email:');
    if (email) {
        currentUser = { email: email, name: email.split('@')[0] };
        localStorage.setItem('user', JSON.stringify(currentUser));
        showDashboard();
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
}

function checkAuth() {
    const saved = localStorage.getItem('user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showDashboard();
    }
}

// ===========================
// DASHBOARD
// ===========================
function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUser.name;
    loadTransactions();
}

function updateSummary() {
    let income = 0;
    let expense = 0;

    transactions.forEach(txn => {
        if (txn.Type === 'Income') {
            income += parseFloat(txn.Amount);
        } else {
            expense += parseFloat(txn.Amount);
        }
    });

    document.getElementById('total-balance').textContent = `₹${income - expense}`;
    document.getElementById('total-income').textContent = `₹${income}`;
    document.getElementById('total-expense').textContent = `₹${expense}`;
}

// ===========================
// TRANSACTIONS
// ===========================
async function loadTransactions() {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTransactions' })
        });
        const data = await response.json();
        transactions = data.transactions || [];
        renderTransactions();
        updateSummary();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function renderTransactions() {
    const container = document.getElementById('transactions');

    if (transactions.length === 0) {
        container.innerHTML = '<p class="loading">No transactions yet. Add one!</p>';
        return;
    }

    // Sort by date, newest first
    const sorted = [...transactions].sort((a, b) =>
        new Date(b.Date) - new Date(a.Date)
    );

    container.innerHTML = sorted.map(txn => `
        <div class="txn-item">
            <div class="txn-info">
                <h4>${txn.Category}</h4>
                <span>${txn.Date} • ${txn.Notes || 'No notes'}</span>
            </div>
            <div class="txn-amount ${txn.Type.toLowerCase()}">
                ${txn.Type === 'Income' ? '+' : '-'}₹${txn.Amount}
            </div>
        </div>
    `).join('');
}

// ===========================
// MODAL
// ===========================
function openModal() {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('txn-form').reset();
}

async function addTransaction(event) {
    event.preventDefault();

    const txn = {
        Txn_ID: 'TXN' + Date.now(),
        Date: document.getElementById('txn-date').value,
        Type: document.getElementById('txn-type').value,
        Category: document.getElementById('txn-category').value,
        Amount: document.getElementById('txn-amount').value,
        Notes: document.getElementById('txn-notes').value
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addTransaction', data: txn })
        });

        closeModal();
        loadTransactions();
        alert('Transaction added!');
    } catch (error) {
        alert('Error adding transaction');
        console.error(error);
    }
}

// ===========================
// INIT
// ===========================
checkAuth();
```

---

### Code.gs (Google Apps Script)

```javascript
// ===========================
// DO NOT MODIFY - Apps Script Code
// ===========================

function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (data.action === 'getTransactions') {
        return getTransactions(sheet);
    }

    if (data.action === 'addTransaction') {
        return addTransaction(sheet, data.data);
    }

    return ContentService.createTextOutput(
        JSON.stringify({ error: 'Unknown action' })
    ).setMimeType(ContentService.MimeType.JSON);
}

function getTransactions(sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const transactions = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {  // If Txn_ID exists
            transactions.push({
                Txn_ID: row[0],
                Date: row[1],
                Type: row[2],
                Category: row[3],
                Amount: row[4],
                Notes: row[5]
            });
        }
    }

    return ContentService.createTextOutput(
        JSON.stringify({ transactions: transactions })
    ).setMimeType(ContentService.MimeType.JSON);
}

function addTransaction(sheet, txn) {
    sheet.appendRow([
        txn.Txn_ID,
        txn.Date,
        txn.Type,
        txn.Category,
        txn.Amount,
        txn.Notes
    ]);

    return ContentService.createTextOutput(
        JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
}
```

---

## Setup Instructions

### Quick Start (5 minutes)

1. **Create Google Sheet**
   - Go to sheets.google.com
   - New spreadsheet → Name: `Finance_Tracker`
   - Add headers in Row 1: `Txn_ID | Date | Type | Category | Amount | Notes`

2. **Setup Apps Script**
   - In sheet: Extensions → Apps Script
   - Paste `Code.gs` code → Save
   - Deploy → New Deployment → Web app → Anyone can access → Deploy
   - Copy the URL

3. **Update app.js**
   - Replace `YOUR_APPS_SCRIPT_URL_HERE` with your URL

4. **Open index.html**
   - Double-click `index.html` to open in browser
   - Start adding transactions!

---

## Testing Checklist

- [ ] Login screen appears
- [ ] Can "login" with email
- [ ] Dashboard shows 0 balance initially
- [ ] Can add income transaction
- [ ] Can add expense transaction
- [ ] Balance updates correctly
- [ ] Transactions appear in list
- [ ] Data saves to Google Sheet

---

## Future Enhancements (Phase 2)

- [ ] Real Google OAuth integration
- [ ] Loan/EMI tracking
- [ ] Budget categories with limits
- [ ] Charts and graphs
- [ ] Export to PDF
- [ ] Mobile responsive improvements
