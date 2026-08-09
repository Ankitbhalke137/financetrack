#!/usr/bin/env python3
"""Convert an SBI account statement (password-protected .xlsx) into FinanceTrack CSV.

Usage:
    python3 tools/sbi-to-tracker.py <statement.xlsx> <password> [output.csv]

Output columns: Txn_ID, Date, Type, Category, Amount, Notes
(Matches the FinanceTrack app / Google Sheet "Transactions" tab format.)

Requires: pip install msoffcrypto-tool openpyxl
"""

import csv
import io
import re
import sys

import msoffcrypto
import openpyxl

DATE_PAT = re.compile(r"^\d{2}/\d{2}/\d{4}$")

INCOME_RULES = [
    (re.compile(r"INTERES", re.I), "Other", "Interest credit"),
    (re.compile(r"(CASH DEPOSIT|CSH DEP)", re.I), "Other", "Cash deposit"),
    (re.compile(r"^CREDIT\s", re.I), "Other", "Bank transfer"),
    (re.compile(r"GST|REFUND", re.I), "Other", "Refund"),
]

EXPENSE_RULES = [
    (re.compile(r"GPAIRenewal|INSURANCE", re.I), "Bills", "SBI General Insurance - GPAI renewal"),
    (re.compile(r"DEPARTMENT OF SURVEY", re.I), "Other", "INB payment - Department of Survey"),
    (re.compile(r"ATM", re.I), "Other", "ATM cash withdrawal"),
]


def parse_upi(details: str):
    """Extract payer/payee name + UPI app from a UPI/DR or UPI/CR line."""
    m = re.search(r"UPI/[DC]R/\d+/([^/]+)/([A-Z0-9]{3,4})", details)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None


def clean_notes(details: str, ref_no: str) -> str:
    lines = [l.strip() for l in details.split("\n") if l.strip()]
    first = lines[0] if lines else ""
    extra = lines[1] if len(lines) > 1 else ""

    name, bank = parse_upi(details)
    if name:
        reminder = re.sub(r"\s+\d{13}\s+AT\s+.*", "", extra).strip()
        note = f"{name} via {bank} UPI"
        if reminder and "UPI" not in reminder:
            note += f" ({reminder})"
        return note
    if "INTERES" in first.upper():
        return "Interest credit"
    if "CASH DEPOSIT" in first.upper() or "CSH DEP" in first.upper():
        return "Cash deposit"
    if ref_no:
        body = re.sub(r"\s+\d{13}\s+AT\s+.*", "", first)
        return f"{body} Ref: {ref_no}".strip()
    return re.sub(r"\s+", " ", first)[:120]


def categorize(details: str, kind: str):
    rules = EXPENSE_RULES if kind == "Expense" else INCOME_RULES
    for pat, cat, note in rules:
        if pat.search(details):
            return cat
    if kind == "Income":
        return "Other"
    if "UPI/DR" in details.upper() or "UPI/REF" in details.upper():
        return "Other"
    return "Other"


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src, password = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else (
        "FinanceTrack_SBI_import.csv")

    decrypted = io.BytesIO()
    with open(src, "rb") as f:
        of = msoffcrypto.OfficeFile(f)
        if of.is_encrypted():
            of.load_key(password=password)
        of.decrypt(decrypted)
    decrypted.seek(0)

    wb = openpyxl.load_workbook(decrypted, data_only=True)
    ws = wb[wb.sheetnames[0]]

    rows = []
    for r in ws.iter_rows(values_only=True):
        if r[0] and DATE_PAT.match(str(r[0]).strip()):
            rows.append(r)
    if not rows:
        print("No transaction rows found (check password / file).")
        sys.exit(1)

    total_credit = 0.0
    total_debit = 0.0
    converted = []
    for i, r in enumerate(rows, 1):
        date_ddmmyy = str(r[0]).strip()
        d, mo, y = date_ddmmyy.split("/")
        date = f"{y}-{mo}-{d}"
        details = str(r[1])
        ref_no = str(r[2]).strip() if r[2] else ""
        debit = float(r[3]) if isinstance(r[3], (int, float)) else (
            float(str(r[3]).replace(",", "")) if r[3] else 0.0)
        credit = float(r[4]) if isinstance(r[4], (int, float)) else (
            float(str(r[4]).replace(",", "")) if r[4] else 0.0)

        if credit > 0:
            kind, amount = "Income", credit
            total_credit += credit
        elif debit > 0:
            kind, amount = "Expense", debit
            total_debit += debit
        else:
            continue

        converted.append([
            f"TXN{100000 + i}",
            date,
            kind,
            categorize(details, kind),
            f"{amount:.2f}",
            clean_notes(details, ref_no),
        ])

    converted.sort(key=lambda t: (t[1], t[0]))
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Txn_ID", "Date", "Type", "Category", "Amount", "Notes"])
        w.writerows(converted)

    print(f"Input : {src}")
    print(f"Output: {out}")
    print(f"Rows  : {len(converted)}  (Income {total_credit:,.2f} / Expense {total_debit:,.2f})")
    cats = {}
    for t in converted:
        keys = (t[2], t[3])
        cats[keys] = cats.get(keys, 0) + 1
    for k, v in sorted(cats.items()):
        print(f"  {k[0]:<8} {k[1]:<14} {v}")


if __name__ == "__main__":
    main()