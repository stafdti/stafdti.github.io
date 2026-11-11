# Parrondo Paradox

A browser-based historical portfolio lab inspired by the **Parrondo paradox**: two individually unattractive paths can produce a different outcome when combined through a switching rule.

## Overview

The paradox demonstrates how alternating between unfavorable strategies can produce a favorable long-term result. In the classic example:

- **Game A** loses slightly on average.
- **Game B** also loses slightly on average.
- A carefully chosen sequence combining Games A and B produces a positive expected return.

The result is counterintuitive because the combined outcome cannot be inferred by looking at either game in isolation. The switching pattern changes the player’s exposure to each state and creates an emergent advantage.

## Historical simulation

The app accepts a CSV containing dated price series for two assets and backtests several allocation rules against the same historical observations. It does not recreate the textbook coin-toss games or use their Wikipedia parameters.

Features include:

- Local CSV upload with automatic date and numeric-price column detection.
- Asset A and Asset B selectors for choosing which two series to compare.
- Configurable total portfolio starting capital in euros and a fixed €1.00 fee per allocation change by default. The amount is the complete portfolio budget, not a separate amount per stock.
- Cumulative portfolio-value chart with both buy-and-hold controls and the selected strategy.
- Ending value, total return, maximum drawdown, trade count, and observation count.
- Side-by-side strategy comparison using identical data and starting conditions.
- A generated sample history for trying the app without a data file.

### CSV format

The first row must contain column headers. The importer supports regional European CSV files with semicolon separators and comma decimal values. Include one date/time column and at least two numeric price columns:

```csv
Datum ;Stock A;Stock B
2022-01-03;100,00;80,00
2022-01-04;101,25;79,50
2022-01-05;99,80;81,10
```

The delimiter is detected automatically. Comma decimals, euro signs, spaces, and common spreadsheet error values such as `#N/A` are handled. Rows with invalid dates or non-positive prices are ignored. Dates are sorted chronologically in the browser. Prices should represent comparable observations, such as adjusted closing prices, when that is appropriate for the source data.

### Strategies

- **Hold Asset A / Hold Asset B** — fully invested in one series.
- **Equal weight** — starts with the total capital split 50/50, lets the allocation drift with market prices, then sells the overweight asset and buys the underweight asset to restore 50/50 at each configured rebalance period.
- **Momentum** — holds the asset with the stronger trailing return over the selected lookback period.
- **Alternate** — switches between the two assets at the selected period.
- **Best hindsight path** — a non-investable reference line that selects the asset with the stronger cumulative return; it is included only as an upper bound.

## Conceptual connection

The article and references provide the conceptual motivation: outcomes can change when individually defined processes are combined according to a rule. This implementation tests that idea with real historical price paths rather than abstract probabilities.

All chart lines and ending values are cumulative euro values. The Asset A and Asset B component lines each start with 50% of the total starting capital, so a 50/50 portfolio begins at €5,000 + €5,000 when total capital is €10,000. The selected strategy line is the total portfolio value and starts at the complete starting capital. Values are not averages and the starting capital is not duplicated per stock.

Historical backtests are descriptive, not predictive. Results depend on the selected period, prices, fixed euro fees, missing data, and strategy definitions. A favorable result in one history does not establish a future advantage.

## Status

The historical backtester is implemented as a dependency-free static web app in `index.html`. All calculations run locally in the browser; no uploaded data is sent to a server.

## Running

Open `index.html` directly in a browser, or serve the repository with any static web server. For example, from the repository root:

```text
parrondo paradox/index.html
```

Click **Load sample history** to explore the interface immediately, or upload your own CSV and select the two asset columns.

## References

- Harmer, G. P., and Abbott, D. “Losing strategies can win by Parrondo’s paradox.” *Nature*, 1999.
- Parrondo, J. M. R., Harmer, G. P., and Abbott, D. “New paradoxical games based on Brownian ratchets.” *Physical Review Letters*, 2000.
