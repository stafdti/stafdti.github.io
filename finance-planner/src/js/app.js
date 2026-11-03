/* Finance Planner - app.js */
(() => {
  'use strict';

  const state = {
    rawRows: [],
    filteredRows: [],
    sortKey: 'date',
    sortDir: 'desc',
    page: 1,
    pageSize: 25,
    charts: {},
  };

  // IMPORTANT: in this CSV export, "category" is almost always "CASH" for plain
  // cash movements - the real semantic label (dividend, card payment, interest,
  // transfer, ...) lives in the "type" column instead. These sets therefore
  // match against r.type, not r.category.
  const CARD_TYPES = new Set(['CARD_TRANSACTION', 'CARD_TRANSACTION_INTERNATIONAL']);
  const DIVIDEND_TYPES = new Set(['DIVIDEND', 'DISTRIBUTION']);
  const INTEREST_TYPES = new Set(['INTEREST_PAYMENT']);
  const INVEST_ASSET_CLASSES = new Set(['STOCK', 'FUND', 'BOND', 'DERIVATIVE', 'CRYPTO']);

  // Categories whose "type" field is just a sub-type of the same broad bucket
  // (e.g. TRADING -> BUY/SELL). For everything else (mainly CASH) the type
  // field carries the real meaning, so we bucket by type instead of category.
  const SELF_DESCRIPTIVE_CATEGORIES = new Set(['TRADING', 'CORPORATE_ACTION', 'DELIVERY']);

  function bucketLabel(r) {
    return SELF_DESCRIPTIVE_CATEGORIES.has(r.category) ? r.category : r.type;
  }

  const PALETTE = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
    '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
    '#86bcb6', '#d37295', '#a0cbe8', '#fabfd2', '#b6992d',
    '#499894', '#79706e', '#d4a6c8', '#8cd17d', '#f1ce63',
  ];

  const currencyFmt0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const currencyFmt2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const numberFmt2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

  const el = (id) => document.getElementById(id);
  const refs = {
    loadingBanner: el('loadingBanner'),
    errorBanner: el('errorBanner'),
    appContent: el('appContent'),
    fileStatus: el('fileStatus'),
    csvFileInput: el('csvFileInput'),
    resetFiltersBtn: el('resetFiltersBtn'),
    filterDateFrom: el('filterDateFrom'),
    filterDateTo: el('filterDateTo'),
    filterSearch: el('filterSearch'),
    kpiInflow: el('kpiInflow'),
    kpiOutflow: el('kpiOutflow'),
    kpiNet: el('kpiNet'),
    kpiRealizedPnl: el('kpiRealizedPnl'),
    kpiFees: el('kpiFees'),
    kpiTax: el('kpiTax'),
    kpiDividends: el('kpiDividends'),
    kpiInterest: el('kpiInterest'),
    kpiCount: el('kpiCount'),
    txTableBody: el('txTableBody'),
    tableCountLabel: el('tableCountLabel'),
    paginationControls: el('paginationControls'),
    paginationLabel: el('paginationLabel'),
  };

  function init() {
    bindStaticEvents();
    fetch('resources/transactions.csv')
      .then((resp) => {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      })
      .then((text) => parseCsvText(text, 'resources/transactions.csv'))
      .catch((err) => {
        showError(
          'Could not automatically load "resources/transactions.csv" (' + err.message +
          '). This can happen when opening the file directly (file://) instead of via a ' +
          'local web server. Use the "Load CSV" button above to select the file manually.'
        );
      });
  }

  function parseCsvText(text, sourceLabel) {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        try {
          const rows = results.data.map(normalizeRow).filter((r) => r.date !== null);
          if (rows.length === 0) {
            showError('The CSV file was parsed but no valid rows were found.');
            return;
          }
          state.rawRows = rows;
          refs.fileStatus.textContent = sourceLabel + ' (' + rows.length.toLocaleString('de-DE') + ' rows)';
          refs.fileStatus.classList.remove('d-none');
          onDataLoaded();
        } catch (e) {
          showError('Failed to process CSV data: ' + e.message);
        }
      },
      error: (err) => showError('Failed to parse CSV: ' + err.message),
    });
  }

  function showError(message) {
    refs.loadingBanner.classList.add('d-none');
    refs.errorBanner.classList.remove('d-none');
    refs.errorBanner.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + escapeHtml(message);
  }

  // Generic multi-select dropdown controller (checkboxes inside a Bootstrap
  // dropdown menu). `selected` is a Set of currently checked values; an empty
  // Set means "no filter applied" (= all values match).
  function createMultiSelect(buttonId, menuId, allLabel) {
    const btn = el(buttonId);
    const menu = el(menuId);
    const optionsContainer = menu.querySelector('.ms-options');
    const selectAllLink = menu.querySelector('.ms-select-all');
    const selectNoneLink = menu.querySelector('.ms-select-none');

    const ms = {
      values: [],
      selected: new Set(),
      onChange: null,
    };

    function updateButtonLabel() {
      if (ms.selected.size === 0 || ms.selected.size === ms.values.length) {
        btn.textContent = allLabel;
      } else if (ms.selected.size === 1) {
        btn.textContent = Array.from(ms.selected)[0];
      } else {
        btn.textContent = ms.selected.size + ' selected';
      }
    }

    ms.setValues = (values) => {
      ms.values = values;
      ms.selected = new Set(); // reset to "all" whenever options are rebuilt
      optionsContainer.innerHTML = '';
      values.forEach((v) => {
        const id = buttonId + '-opt-' + values.indexOf(v);
        const wrap = document.createElement('div');
        wrap.className = 'form-check';
        wrap.innerHTML =
          '<input class="form-check-input" type="checkbox" value="' + escapeHtml(v) + '" id="' + id + '">' +
          '<label class="form-check-label" for="' + id + '">' + escapeHtml(v) + '</label>';
        const checkbox = wrap.querySelector('input');
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) ms.selected.add(v);
          else ms.selected.delete(v);
          updateButtonLabel();
          if (ms.onChange) ms.onChange();
        });
        optionsContainer.appendChild(wrap);
      });
      updateButtonLabel();
    };

    ms.getSelected = () => ms.selected;

    ms.clear = () => {
      ms.selected = new Set();
      optionsContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
      updateButtonLabel();
    };

    selectAllLink.addEventListener('click', (e) => {
      e.preventDefault();
      ms.selected = new Set(ms.values);
      optionsContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
      updateButtonLabel();
      if (ms.onChange) ms.onChange();
    });

    selectNoneLink.addEventListener('click', (e) => {
      e.preventDefault();
      ms.clear();
      if (ms.onChange) ms.onChange();
    });

    return ms;
  }

  function bindStaticEvents() {
    refs.csvFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        refs.errorBanner.classList.add('d-none');
        refs.loadingBanner.classList.remove('d-none');
        parseCsvText(reader.result, file.name);
      };
      reader.readAsText(file);
    });

    refs.resetFiltersBtn.addEventListener('click', resetFilters);

    state.msCategory = createMultiSelect('filterCategoryBtn', 'filterCategoryMenu', 'All categories');
    state.msType = createMultiSelect('filterTypeBtn', 'filterTypeMenu', 'All types');
    state.msAssetClass = createMultiSelect('filterAssetClassBtn', 'filterAssetClassMenu', 'All asset classes');
    [state.msCategory, state.msType, state.msAssetClass].forEach((ms) => {
      ms.onChange = applyFiltersAndRender;
    });

    [refs.filterDateFrom, refs.filterDateTo].forEach((input) => input.addEventListener('change', applyFiltersAndRender));

    refs.filterSearch.addEventListener('input', debounce(applyFiltersAndRender, 200));

    document.querySelectorAll('[data-sort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-sort');
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'desc';
        }
        state.page = 1;
        renderTable();
      });
    });
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function toNumber(v) {
    if (v === undefined || v === null || v === '') return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeRow(r) {
    const dateStr = (r.date || '').trim();
    const date = dateStr ? new Date(dateStr + 'T00:00:00Z') : null;
    if (!date || Number.isNaN(date.getTime())) return { date: null };
    return {
      date, dateStr,
      datetime: r.datetime || '',
      account_type: (r.account_type || '').trim(),
      category: (r.category || '').trim() || '(none)',
      type: (r.type || '').trim() || '(none)',
      asset_class: (r.asset_class || '').trim(),
      name: (r.name || '').trim(),
      symbol: (r.symbol || '').trim(),
      shares: toNumber(r.shares),
      price: toNumber(r.price),
      amount: toNumber(r.amount),
      fee: toNumber(r.fee),
      tax: toNumber(r.tax),
      currency: (r.currency || '').trim(),
      original_amount: toNumber(r.original_amount),
      original_currency: (r.original_currency || '').trim(),
      description: (r.description || '').trim(),
      transaction_id: r.transaction_id || '',
      counterparty_name: (r.counterparty_name || '').trim(),
      mcc_code: (r.mcc_code || '').trim(),
    };
  }

  function onDataLoaded() {
    state.realizedPnlMap = null; // invalidate FIFO P&L cache for the new dataset
    refs.loadingBanner.classList.add('d-none');
    refs.errorBanner.classList.add('d-none');
    refs.appContent.classList.remove('d-none');
    populateSelectOptions();
    applyFiltersAndRender();
  }

  function populateSelectOptions() {
    state.msCategory.setValues(uniqueSorted(state.rawRows.map((r) => r.category)));
    state.msType.setValues(uniqueSorted(state.rawRows.map((r) => r.type)));
    state.msAssetClass.setValues(uniqueSorted(state.rawRows.map((r) => r.asset_class).filter(Boolean)));

    const dates = state.rawRows.map((r) => r.date.getTime());
    refs.filterDateFrom.value = toDateInputValue(new Date(Math.min(...dates)));
    refs.filterDateTo.value = toDateInputValue(new Date(Math.max(...dates)));
  }

  function resetFilters() {
    state.msCategory.clear();
    state.msType.clear();
    state.msAssetClass.clear();
    refs.filterSearch.value = '';
    if (state.rawRows.length) {
      const dates = state.rawRows.map((r) => r.date.getTime());
      refs.filterDateFrom.value = toDateInputValue(new Date(Math.min(...dates)));
      refs.filterDateTo.value = toDateInputValue(new Date(Math.max(...dates)));
    }
    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    const fromVal = refs.filterDateFrom.value;
    const toVal = refs.filterDateTo.value;
    const fromDate = fromVal ? new Date(fromVal + 'T00:00:00Z') : null;
    const toDate = toVal ? new Date(toVal + 'T23:59:59Z') : null;
    const categorySet = state.msCategory.getSelected();
    const typeSet = state.msType.getSelected();
    const assetClassSet = state.msAssetClass.getSelected();
    const search = refs.filterSearch.value.trim().toLowerCase();

    state.filteredRows = state.rawRows.filter((r) => {
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      if (categorySet.size > 0 && !categorySet.has(r.category)) return false;
      if (typeSet.size > 0 && !typeSet.has(r.type)) return false;
      if (assetClassSet.size > 0 && !assetClassSet.has(r.asset_class)) return false;
      if (search) {
        const haystack = (
          r.name + ' ' + r.symbol + ' ' + r.description + ' ' +
          r.counterparty_name + ' ' + r.category + ' ' + r.type
        ).toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    state.page = 1;
    renderAll();
  }

  function renderAll() {
    renderKpis();
    renderCharts();
    renderTable();
  }

  function renderKpis() {
    const rows = state.filteredRows;
    let inflow = 0;
    let outflow = 0;
    let fees = 0;
    let tax = 0;
    let dividends = 0;
    let interest = 0;

    rows.forEach((r) => {
      if (r.amount > 0) inflow += r.amount;
      if (r.amount < 0) outflow += r.amount;
      fees += r.fee;
      tax += r.tax;
      // Include negative amounts too: brokers sometimes book a dividend/
      // interest payment incorrectly and later issue a "Cancellation ..."
      // row with the same amount negated to reverse it. Filtering to only
      // r.amount > 0 would drop the reversal and silently double-count the
      // original (incorrect) payment.
      if (DIVIDEND_TYPES.has(r.type)) dividends += r.amount;
      if (INTEREST_TYPES.has(r.type)) interest += r.amount;
    });

    const net = inflow + outflow;
    const realizedPnl = computeRealizedPnl(rows);

    refs.kpiInflow.textContent = currencyFmt0.format(inflow);
    refs.kpiOutflow.textContent = currencyFmt0.format(outflow);
    refs.kpiNet.textContent = currencyFmt0.format(net);
    refs.kpiNet.className = 'kpi-value ' + (net >= 0 ? 'text-success' : 'text-danger');
    refs.kpiRealizedPnl.textContent = currencyFmt0.format(realizedPnl);
    refs.kpiRealizedPnl.className = 'kpi-value ' + (realizedPnl >= 0 ? 'text-success' : 'text-danger');
    refs.kpiFees.textContent = currencyFmt0.format(fees);
    refs.kpiTax.textContent = currencyFmt0.format(tax);
    refs.kpiDividends.textContent = currencyFmt0.format(dividends);
    refs.kpiInterest.textContent = currencyFmt0.format(interest);
    refs.kpiCount.textContent = rows.length.toLocaleString('de-DE');
  }

  // Builds a Map(transaction_id -> realized P&L) for every SELL trade in the
  // *entire* dataset using a FIFO cost-basis model. Computed once per data
  // load and cached on `state`, since it depends only on the full trade
  // history (not on the active filters).
  function getRealizedPnlMap() {
    if (state.realizedPnlMap) return state.realizedPnlMap;

    const trades = state.rawRows
      .filter((r) => r.category === 'TRADING' && (r.type === 'BUY' || r.type === 'SELL') && r.shares)
      .slice()
      .sort((a, b) => a.date - b.date);

    const lotsByInstrument = new Map(); // key -> [{shares, costPerShare}]
    const pnlByTxId = new Map();

    trades.forEach((r) => {
      const key = r.symbol || r.name;
      if (!key) return;
      if (!lotsByInstrument.has(key)) lotsByInstrument.set(key, []);
      const lots = lotsByInstrument.get(key);

      if (r.type === 'BUY') {
        const shares = Math.abs(r.shares);
        if (shares === 0) return;
        // P&L is based purely on the transaction "amount" (gross trade
        // value = shares * price). Fees and taxes are intentionally
        // excluded from the cost basis here.
        const totalCost = Math.abs(r.amount);
        lots.push({ shares, costPerShare: totalCost / shares });
        return;
      }

      // SELL
      let sharesToSell = Math.abs(r.shares);
      if (sharesToSell === 0) return;
      // P&L is based purely on the transaction "amount" (gross sale
      // value = shares * price). Fees and taxes are intentionally
      // excluded from the proceeds here.
      const totalProceeds = Math.abs(r.amount);
      let costBasisConsumed = 0;

      while (sharesToSell > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(lot.shares, sharesToSell);
        costBasisConsumed += take * lot.costPerShare;
        lot.shares -= take;
        sharesToSell -= take;
        if (lot.shares <= 1e-9) lots.shift();
      }
      // If we run out of lots (missing BUY history), remaining shares are
      // treated as zero-cost, so the full proceeds count as gain.

      pnlByTxId.set(r.transaction_id, totalProceeds - costBasisConsumed);
    });

    state.realizedPnlMap = pnlByTxId;
    return pnlByTxId;
  }

  // Sums the realized P&L (from the FIFO map above) for just the SELL trades
  // present in the given (typically filtered) row set.
  function computeRealizedPnl(rows) {
    const pnlMap = getRealizedPnlMap();
    let total = 0;
    rows.forEach((r) => {
      if (r.category === 'TRADING' && r.type === 'SELL' && pnlMap.has(r.transaction_id)) {
        total += pnlMap.get(r.transaction_id);
      }
    });
    return total;
  }

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  function renderCharts() {
    renderCategoryChart();
    renderAssetClassChart();
    renderTopInstrumentsChart();
    renderMonthlyFlowChart();
    renderCumulativeChart();
    renderMerchantsChart();
  }

  function renderCategoryChart() {
    const rows = state.filteredRows;
    const totals = new Map();
    rows.forEach((r) => {
      const v = Math.abs(r.amount);
      if (v === 0) return;
      const label = bucketLabel(r);
      totals.set(label, (totals.get(label) || 0) + v);
    });
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);

    destroyChart('chartCategory');
    const ctx = el('chartCategory').getContext('2d');
    state.charts.chartCategory = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          data: entries.map((e) => e[1]),
          backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + currencyFmt2.format(ctx.raw) } },
        },
      },
    });
  }

  function renderAssetClassChart() {
    const rows = state.filteredRows.filter(
      (r) => r.category === 'TRADING' && r.type === 'BUY' && INVEST_ASSET_CLASSES.has(r.asset_class)
    );
    const totals = new Map();
    rows.forEach((r) => {
      const v = Math.abs(r.amount);
      totals.set(r.asset_class, (totals.get(r.asset_class) || 0) + v);
    });
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

    destroyChart('chartAssetClass');
    const ctx = el('chartAssetClass').getContext('2d');
    state.charts.chartAssetClass = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          data: entries.map((e) => e[1]),
          backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + currencyFmt2.format(ctx.raw) } },
        },
      },
    });
  }

  function renderTopInstrumentsChart() {
    const rows = state.filteredRows.filter(
      (r) => r.category === 'TRADING' && r.type === 'BUY' && r.name
    );
    const totals = new Map();
    rows.forEach((r) => {
      const v = Math.abs(r.amount);
      totals.set(r.name, (totals.get(r.name) || 0) + v);
    });
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    destroyChart('chartTopInstruments');
    const ctx = el('chartTopInstruments').getContext('2d');
    state.charts.chartTopInstruments = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          label: 'Invested',
          data: entries.map((e) => e[1]),
          backgroundColor: '#4e79a7',
        }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => currencyFmt2.format(ctx.raw) } },
        },
        scales: {
          x: { ticks: { callback: (v) => currencyFmt0.format(v) } },
          y: { ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  function monthKey(date) {
    return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
  }

  function renderMonthlyFlowChart() {
    const rows = state.filteredRows;
    const months = new Map(); // key -> {in, out}
    rows.forEach((r) => {
      const key = monthKey(r.date);
      if (!months.has(key)) months.set(key, { in: 0, out: 0 });
      const bucket = months.get(key);
      if (r.amount > 0) bucket.in += r.amount;
      if (r.amount < 0) bucket.out += r.amount;
    });
    const keys = Array.from(months.keys()).sort();

    destroyChart('chartMonthlyFlow');
    const ctx = el('chartMonthlyFlow').getContext('2d');
    state.charts.chartMonthlyFlow = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: keys,
        datasets: [
          { label: 'Inflow', data: keys.map((k) => months.get(k).in), backgroundColor: '#59a14f' },
          { label: 'Outflow', data: keys.map((k) => months.get(k).out), backgroundColor: '#e15759' },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + currencyFmt2.format(ctx.raw) } },
        },
        scales: {
          x: { stacked: false, ticks: { font: { size: 9 } } },
          y: { ticks: { callback: (v) => currencyFmt0.format(v) } },
        },
      },
    });
  }

  function renderCumulativeChart() {
    const rows = state.filteredRows.slice().sort((a, b) => a.date - b.date);
    // Aggregate to one point per day to keep the chart light-weight.
    const dailyTotals = new Map();
    rows.forEach((r) => {
      dailyTotals.set(r.dateStr, (dailyTotals.get(r.dateStr) || 0) + r.amount);
    });
    const labels = Array.from(dailyTotals.keys()).sort();
    let running = 0;
    const data = labels.map((k) => {
      running += dailyTotals.get(k);
      return running;
    });

    destroyChart('chartCumulative');
    const ctx = el('chartCumulative').getContext('2d');
    state.charts.chartCumulative = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cumulative balance',
          data,
          borderColor: '#4e79a7',
          backgroundColor: 'rgba(78,121,167,0.15)',
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.1,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => currencyFmt2.format(ctx.raw) } },
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxTicksLimit: 12 } },
          y: { ticks: { callback: (v) => currencyFmt0.format(v) } },
        },
      },
    });
  }

  function renderMerchantsChart() {
    const rows = state.filteredRows.filter((r) => CARD_TYPES.has(r.type) && r.amount < 0);
    const totals = new Map();
    rows.forEach((r) => {
      // Prefer the merchant "name" field - "description" is sometimes just a
      // generic literal like "TR Card Transaction" with no merchant detail.
      const key = r.name || r.counterparty_name || r.description || '(unknown)';
      totals.set(key, (totals.get(key) || 0) + Math.abs(r.amount));
    });
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

    destroyChart('chartMerchants');
    const ctx = el('chartMerchants').getContext('2d');
    state.charts.chartMerchants = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          label: 'Spent',
          data: entries.map((e) => e[1]),
          backgroundColor: '#f28e2b',
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => currencyFmt2.format(ctx.raw) } },
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 60, minRotation: 40 } },
          y: { ticks: { callback: (v) => currencyFmt0.format(v) } },
        },
      },
    });
  }

  function getSortedRows() {
    const rows = state.filteredRows.slice();
    const key = state.sortKey;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let va, vb;
      if (key === 'amount') {
        va = a.amount; vb = b.amount;
      } else {
        va = a.date.getTime(); vb = b.date.getTime();
      }
      return (va - vb) * dir;
    });
    return rows;
  }

  function renderTable() {
    const sorted = getSortedRows();
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const startIdx = (state.page - 1) * state.pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + state.pageSize);

    refs.tableCountLabel.textContent = '(' + total.toLocaleString('de-DE') + ' filtered)';

    refs.txTableBody.innerHTML = pageRows.map(rowToHtml).join('');

    const from = total === 0 ? 0 : startIdx + 1;
    const to = Math.min(startIdx + state.pageSize, total);
    refs.paginationLabel.textContent = total === 0
      ? 'No transactions match the current filters'
      : ('Showing ' + from + '\u2013' + to + ' of ' + total.toLocaleString('de-DE'));

    renderPaginationControls(totalPages);
  }

  function rowToHtml(r) {
    const amountClass = r.amount > 0 ? 'amount-positive' : (r.amount < 0 ? 'amount-negative' : '');
    const nameDisplay = [r.name, r.symbol].filter(Boolean).join(' \u00b7 ') || '\u2014';

    let pnlCell = '';
    if (r.category === 'TRADING' && r.type === 'SELL') {
      const pnlMap = getRealizedPnlMap();
      if (pnlMap.has(r.transaction_id)) {
        const pnl = pnlMap.get(r.transaction_id);
        const pnlClass = pnl > 0 ? 'amount-positive' : (pnl < 0 ? 'amount-negative' : '');
        pnlCell = '<span class="' + pnlClass + '">' + currencyFmt2.format(pnl) + '</span>';
      }
    }

    return (
      '<tr>' +
      '<td>' + escapeHtml(r.dateStr) + '</td>' +
      '<td><span class="badge text-bg-light border badge-category">' + escapeHtml(r.category) + '</span></td>' +
      '<td>' + escapeHtml(r.type) + '</td>' +
      '<td>' + escapeHtml(r.asset_class) + '</td>' +
      '<td>' + escapeHtml(nameDisplay) + '</td>' +
      '<td class="text-end">' + (r.shares ? numberFmt2.format(r.shares) : '') + '</td>' +
      '<td class="text-end">' + (r.price ? numberFmt2.format(r.price) : '') + '</td>' +
      '<td class="text-end ' + amountClass + '">' + currencyFmt2.format(r.amount) + '</td>' +
      '<td class="text-end">' + pnlCell + '</td>' +
      '<td class="text-end">' + (r.fee ? currencyFmt2.format(r.fee) : '') + '</td>' +
      '<td class="text-end">' + (r.tax ? currencyFmt2.format(r.tax) : '') + '</td>' +
      '<td class="description-cell small text-muted">' + escapeHtml(r.description || r.counterparty_name) + '</td>' +
      '</tr>'
    );
  }

  function renderPaginationControls(totalPages) {
    const container = refs.paginationControls;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const makeItem = (label, page, disabled, active) => {
      const li = document.createElement('li');
      li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
      const a = document.createElement('a');
      a.className = 'page-link';
      a.textContent = label;
      if (!disabled && !active) {
        a.addEventListener('click', () => {
          state.page = page;
          renderTable();
        });
      }
      li.appendChild(a);
      return li;
    };

    container.appendChild(makeItem('\u00ab', state.page - 1, state.page === 1, false));

    const maxButtons = 7;
    let startPage = Math.max(1, state.page - 3);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    startPage = Math.max(1, endPage - maxButtons + 1);

    for (let p = startPage; p <= endPage; p++) {
      container.appendChild(makeItem(String(p), p, false, p === state.page));
    }

    container.appendChild(makeItem('\u00bb', state.page + 1, state.page === totalPages, false));
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  }

  function fillSelect(selectEl, values) {
    const firstOption = selectEl.querySelector('option');
    selectEl.innerHTML = '';
    selectEl.appendChild(firstOption);
    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  function toDateInputValue(d) {
    return d.toISOString().slice(0, 10);
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    const map = {};
    map[String.fromCharCode(38)] = '&' + 'amp;';
    map[String.fromCharCode(60)] = '&' + 'lt;';
    map[String.fromCharCode(62)] = '&' + 'gt;';
    map[String.fromCharCode(34)] = '&' + 'quot;';
    map[String.fromCharCode(39)] = '&#39;';
    return String(str).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  init();
})();
