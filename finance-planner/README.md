[<< Back](../README.md)

# Finance Planner

A **single-page web application** that runs entirely in the browser (no backend required) to visualize and analyze a personal finance / brokerage transaction export (Trade Republic style CSV). It uses Bootstrap for the UI, Chart.js for visualizations, and PapaParse for robust CSV parsing — all loaded from CDN, with plain vanilla JavaScript for the application logic.

## Goals

- Load a CSV export of **all** account activity: cash in/out, stock/fund/crypto/bond/derivative trades, dividends, interest, fees, taxes, card transactions, transfers, and corporate actions.
- Visualize spending/investing behavior with charts (pie charts, bar charts, line charts).
- Provide filters by category, type, asset class, account, date range, and free-text search (name/symbol/description).
- Show clear summary KPIs (total deposits, withdrawals, fees, taxes, dividends, net cash flow).
- Browse the raw (filtered) transactions in a searchable, sortable, paginated table.

## Running the app

Because the app fetches `resources/transactions.csv` via `fetch()`, it must be served over `http://` (not opened directly as a `file://` URL, which some browsers block for fetch requests). Any static file server works, for example:

```bash
# from the finance-planner/src directory
python -m http.server 8080
# then open http://localhost:8080
```

Alternatively, use the file upload control in the app to load a CSV file directly — this works even without a server, since it uses the `File` API instead of `fetch()`.

## CSV Data Format

The CSV header (quoted, comma separated):

```
"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","original_amount","original_currency","fx_rate","description","transaction_id","counterparty_name","counterparty_iban","payment_reference","mcc_code"
```

### Column notes

| Column | Notes |
|---|---|
| `datetime` | ISO-8601 UTC timestamp the record was booked (may differ from the economic `date`) |
| `date` | Economic/value date of the transaction |
| `account_type` | Observed value: `DEFAULT` |
| `category` | High level grouping (see below) |
| `type` | Detailed transaction type within the category (see below) |
| `asset_class` | `STOCK`, `FUND`, `BOND`, `DERIVATIVE`, `CRYPTO`, `SYNTHETIC`, or empty for pure cash movements |
| `name` / `symbol` | Instrument name and ISIN/ticker, empty for cash-only entries |
| `shares` | Number of shares/units moved (signed: negative = sold/removed) |
| `price` | Execution price per unit, in `currency` |
| `amount` | **Signed cash impact** of the row in `currency` (negative = money out, positive = money in) — this is the primary field used for all cash-flow aggregation in this app |
| `fee` / `tax` | Fee/tax portion of the transaction (usually negative) |
| `currency` | Settlement currency, almost always `EUR` |
| `original_amount` / `original_currency` / `fx_rate` | Present when the trade/dividend happened in a foreign currency (e.g. `USD`, `GBP`) |
| `description` | Free text, e.g. merchant name for card payments, or a corporate action reference |
| `transaction_id` | Unique id (also used as row key in the UI) |
| `counterparty_name` / `counterparty_iban` | Present for bank transfers |
| `payment_reference` / `mcc_code` | Payment reference text and Merchant Category Code for card transactions |

### Observed `category` values (broad bucket)

- `TRADING` — buy/sell/cancelled orders for any `asset_class`
- `CORPORATE_ACTION` — splits, reverse splits, redemptions, share exchanges, rights issues, capital increases, etc.
- `DELIVERY` — free security receipts/deliveries (no cash impact)
- `CASH` — **the catch-all bucket for essentially every pure cash movement**: deposits, withdrawals, card purchases, dividends, interest, saveback, tax optimization, transfers, etc.

> **Important data quirk:** for the `CASH` category, the `category` column itself carries almost no information — the real semantic meaning (dividend, card payment, interest, transfer, ...) lives in the **`type`** column instead. Any chart/filter that wants to distinguish "spending on card" from "dividend received" from "bank transfer" must group by `type`, not `category`. This app's category pie chart therefore buckets by `type` for `CASH` rows and by `category` for `TRADING` / `CORPORATE_ACTION` / `DELIVERY` rows.

### Observed `type` values (non-exhaustive, varies by category)

For `TRADING`: `BUY`, `SELL`, `BUY_CANCELLED`, `SELL_CANCELLED`.

For `CORPORATE_ACTION`: `SPLIT`, `REVERSE_SPLIT`, `SHARE_EXCHANGE`, `SHARE_CONSOLIDATION`, `REDEMPTION`, `RIGHTS`, `CAPITAL_INCR_CASH`, `CAPITAL_INCR_CORP_FUNDS`, `DEBIT`, `STOCK_DIVIDEND`, `INTERMEDIATE_SECURITIES_DISTRIBUTION`, `CALL_ON_INTERMEDIATE_SECURITIES`, `EXCHANGE`.

For `DELIVERY`: `FREE_RECEIPT`.

For `CASH` (the important ones for spending/income analysis): `CARD_TRANSACTION`, `CARD_TRANSACTION_INTERNATIONAL`, `DIVIDEND`, `DISTRIBUTION`, `INTEREST_PAYMENT`, `CUSTOMER_INBOUND`, `CUSTOMER_OUTBOUND_REQUEST`, `TRANSFER_INBOUND`, `TRANSFER_IN`, `TRANSFER_OUT`, `TRANSFER_INSTANT_OUTBOUND`, `BENEFITS_SAVEBACK`, `TAX_OPTIMIZATION`, `EARNINGS`, `IPO_SUBSCRIPTION`, `REFERRAL`, `COMPENSATION`, `SEC_ACCOUNT`, `FINAL_MATURITY`, `EARLY_REDEMPTION`, `PRE_DETERMINED_TAX_BASE`.

## Project Structure

```
.
├── README.md
└── src
    ├── index.html              # Main page (loads Bootstrap, Chart.js, PapaParse via CDN)
    ├── css
    │   └── style.css           # Custom styles
    ├── resources               # the csv will be here, or other data
    │   └── transactions.csv    # the transactions CSV
    └── js
        └── app.js              # Parsing, filtering, charting, and table rendering logic
```

## Features

- **CSV loading**: automatically tries to `fetch()` `resources/transactions.csv` on page load, with a manual file-upload fallback (works with `file://`).
- **KPI summary cards**: total inflow, total outflow, net cash flow, **realized gain/loss on stock/fund/etc. sales (FIFO cost basis)**, fees, tax, dividends, interest, and number of transactions — all recalculated live as filters change.
- **Realized gain/loss (FIFO)**: for every `SELL` trade, the app reconstructs a First-In-First-Out cost basis from the complete `BUY` history of that instrument (matched by `symbol`, falling back to `name`) and computes the actual profit or loss realized on that sale — net of fees/tax, since `amount` already reflects them. This is shown both as an aggregate KPI card and as a per-row **P&L** column in the transactions table.
- **Filters**: date range (from/to), and **multi-select dropdowns** for category, type, and asset class (checkbox-based — select as many values as needed; "Select all" / "Clear" shortcuts included; an empty selection means "no filter applied"), plus a free-text search box matching name/symbol/description/counterparty.
- **Charts** (Chart.js):
  - Pie chart — cash flow by category/type bucket (uses `type` for the generic `CASH` category, `category` otherwise — see data quirk above).
  - Doughnut chart — invested amount by `asset_class`.
  - Horizontal bar chart — top 10 instruments by invested amount.
  - Bar chart — monthly cash flow (inflow vs. outflow) over time.
  - Line chart — cumulative running cash balance over time.
  - Bar chart — top spending merchants (card transactions), grouped by merchant `name` (not the generic transaction `description`).
- **Transactions table**: paginated, sortable by date/amount, respects all active filters, color-codes positive/negative amounts and per-row realized P&L.
