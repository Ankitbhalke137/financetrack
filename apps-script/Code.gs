function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'getTransactions') {
        return getTransactions(spreadsheet.getActiveSheet());
    }
    if (data.action === 'addTransaction') {
        return addTransaction(spreadsheet.getActiveSheet(), data.data);
    }
    if (data.action === 'updateTransaction') {
        return updateTransaction(spreadsheet.getActiveSheet(), data.data);
    }
    if (data.action === 'deleteTransaction') {
        return deleteTransaction(spreadsheet.getActiveSheet(), data.txnId);
    }

    // Friend transactions - use "Friends" sheet
    let friendSheet = spreadsheet.getSheetByName('Friends');
    if (!friendSheet) {
        friendSheet = spreadsheet.insertSheet('Friends');
        friendSheet.appendRow(['ID', 'Name', 'Type', 'Amount', 'Date', 'Notes', 'Settled']);
    }

    if (data.action === 'getFriendTransactions') {
        return getFriendTransactions(friendSheet);
    }
    if (data.action === 'addFriendTransaction') {
        return addFriendTransaction(friendSheet, data.data);
    }

    return ContentService.createTextOutput(
        JSON.stringify({ error: 'Unknown action' })
    ).setMimeType(ContentService.MimeType.JSON);
}

function getTransactions(sheet) {
    const data = sheet.getDataRange().getValues();
    const transactions = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
            transactions.push({
                Txn_ID: row[0], Date: row[1], Type: row[2],
                Category: row[3], Amount: row[4], Notes: row[5]
            });
        }
    }
    return ContentService.createTextOutput(
        JSON.stringify({ transactions: transactions })
    ).setMimeType(ContentService.MimeType.JSON);
}

function addTransaction(sheet, txn) {
    sheet.appendRow([txn.Txn_ID, txn.Date, txn.Type, txn.Category, txn.Amount, txn.Notes]);
    return ContentService.createTextOutput(
        JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
}

function updateTransaction(sheet, txn) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === txn.Txn_ID) {
            sheet.getRange(i + 1, 1, 1, 6).setValues([[txn.Txn_ID, txn.Date, txn.Type, txn.Category, txn.Amount, txn.Notes]]);
            return ContentService.createTextOutput(
                JSON.stringify({ success: true })
            ).setMimeType(ContentService.MimeType.JSON);
        }
    }
    return ContentService.createTextOutput(
        JSON.stringify({ error: 'Transaction not found' })
    ).setMimeType(ContentService.MimeType.JSON);
}

function deleteTransaction(sheet, txnId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === txnId) {
            sheet.deleteRow(i + 1);
            return ContentService.createTextOutput(
                JSON.stringify({ success: true })
            ).setMimeType(ContentService.MimeType.JSON);
        }
    }
    return ContentService.createTextOutput(
        JSON.stringify({ error: 'Transaction not found' })
    ).setMimeType(ContentService.MimeType.JSON);
}

// ===========================
// FRIEND TRANSACTIONS
// ===========================
function getFriendTransactions(sheet) {
    const data = sheet.getDataRange().getValues();
    const friends = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
            friends.push({
                ID: row[0], Name: row[1], Type: row[2],
                Amount: row[3], Date: row[4], Notes: row[5], Settled: row[6]
            });
        }
    }
    return ContentService.createTextOutput(
        JSON.stringify({ friends: friends })
    ).setMimeType(ContentService.MimeType.JSON);
}

function addFriendTransaction(sheet, txn) {
    sheet.appendRow([txn.ID, txn.Name, txn.Type, txn.Amount, txn.Date, txn.Notes, txn.Settled]);
    return ContentService.createTextOutput(
        JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
}
