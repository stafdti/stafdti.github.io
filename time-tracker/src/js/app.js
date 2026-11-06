/* Time Tracker - application logic
 * No external libraries except Bootstrap (CSS + bundled JS, loaded in index.html).
 * All persistence via window.localStorage. No backend.
 */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    topics: "timeTracker.topics",
    entries: "timeTracker.entries",
    active: "timeTracker.active",
    theme: "timeTracker.theme",
  };

  const EXPORT_VERSION = 1;

  const COLOR_PALETTE = [
    "#4C6EF5", "#12B886", "#F59F00", "#E64980",
    "#7048E8", "#1C7ED6", "#F76707", "#2F9E44",
    "#E03131", "#0CA678", "#AE3EC9", "#495057",
  ];

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  let topics = [];
  let entries = [];
  let active = null;
  let tickIntervalId = null;
  let weekOffset = 0; // 0 = current week, -1 = previous week, +1 = next week (capped at 0)

  const el = {
    alertContainer: document.getElementById("alertContainer"),
    addTopicForm: document.getElementById("addTopicForm"),
    newTopicInput: document.getElementById("newTopicInput"),
    topicGrid: document.getElementById("topicGrid"),
    emptyTopicsHint: document.getElementById("emptyTopicsHint"),
    weekChart: document.getElementById("weekChart"),
    weekLegend: document.getElementById("weekLegend"),
    weekRangeLabel: document.getElementById("weekRangeLabel"),
    weekPrevBtn: document.getElementById("weekPrevBtn"),
    weekTodayBtn: document.getElementById("weekTodayBtn"),
    weekNextBtn: document.getElementById("weekNextBtn"),
    weekTableHeadRow: document.getElementById("weekTableHeadRow"),
    weekTableBody: document.getElementById("weekTableBody"),
    weekTableFootRow: document.getElementById("weekTableFootRow"),
    weekTable: document.getElementById("weekTable"),
    weekTableEmptyHint: document.getElementById("weekTableEmptyHint"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    confirmImportBtn: document.getElementById("confirmImportBtn"),
    helpBtn: document.getElementById("helpBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeToggleIcon: document.getElementById("themeToggleIcon"),
  };

  let importConfirmModal = null;
  let helpModal = null;
  let pendingImportPayload = null;

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function toLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatShortDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    function pad(n) { return String(n).padStart(2, "0"); }
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function formatMinutes(mins) {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function colorForTopicId(topicId, sortedTopicIds) {
    const idx = sortedTopicIds.indexOf(topicId);
    if (idx === -1) {
      let hash = 0;
      for (let i = 0; i < topicId.length; i++) {
        hash = (hash * 31 + topicId.charCodeAt(i)) % COLOR_PALETTE.length;
      }
      return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
    }
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEYS.theme);
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    if (el.themeToggleIcon) {
      el.themeToggleIcon.textContent = theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
    }
    if (el.themeToggleBtn) {
      el.themeToggleBtn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    let theme = stored;
    if (theme !== "light" && theme !== "dark") {
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch (e) {
      // ignore storage errors
    }
  }

  function showAlert(message, type) {
    type = type || "danger";
    const wrapper = document.createElement("div");
    wrapper.className = "alert alert-" + type + " alert-dismissible fade show";
    wrapper.setAttribute("role", "alert");
    wrapper.innerHTML = escapeHtml(message) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    el.alertContainer.appendChild(wrapper);
    setTimeout(function () {
      wrapper.classList.remove("show");
      setTimeout(function () { wrapper.remove(); }, 400);
    }, 5000);
  }

  function loadState() {
    try {
      const rawTopics = localStorage.getItem(STORAGE_KEYS.topics);
      topics = rawTopics ? JSON.parse(rawTopics) : [];
    } catch (e) {
      topics = [];
    }
    try {
      const rawEntries = localStorage.getItem(STORAGE_KEYS.entries);
      entries = rawEntries ? JSON.parse(rawEntries) : [];
    } catch (e) {
      entries = [];
    }
    try {
      const rawActive = localStorage.getItem(STORAGE_KEYS.active);
      active = rawActive ? JSON.parse(rawActive) : null;
    } catch (e) {
      active = null;
    }
    if (!Array.isArray(topics)) topics = [];
    if (!Array.isArray(entries)) entries = [];
  }

  function saveTopics() {
    localStorage.setItem(STORAGE_KEYS.topics, JSON.stringify(topics));
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  }

  function saveActive() {
    if (active) {
      localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(active));
    } else {
      localStorage.removeItem(STORAGE_KEYS.active);
    }
  }

  function getSortedTopics() {
    return [...topics].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }

  function addTopic(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      showAlert("Please enter a topic name.", "warning");
      return;
    }
    const exists = topics.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showAlert('A topic named "' + trimmed + '" already exists.', "warning");
      return;
    }
    const topic = {
      id: generateId(),
      name: trimmed,
      createdAt: nowIso(),
    };
    topics.push(topic);
    saveTopics();
    render();
  }

  function deleteTopic(topicId) {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    if (active && active.topicId === topicId) {
      stopActiveTracking();
    }

    topics = topics.filter((t) => t.id !== topicId);
    saveTopics();
    render();
  }

  function renameTopic(topicId, newName) {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) {
      render();
      return;
    }
    const trimmed = (newName || "").trim();
    if (!trimmed || trimmed === topic.name) {
      render();
      return;
    }
    const exists = topics.some(
      (t) => t.id !== topicId && t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showAlert('A topic named "' + trimmed + '" already exists.', "warning");
      render();
      return;
    }

    topic.name = trimmed;
    saveTopics();

    let entriesChanged = false;
    entries.forEach(function (entry) {
      if (entry.topicId === topicId) {
        entry.topicName = trimmed;
        entriesChanged = true;
      }
    });
    if (entriesChanged) {
      saveEntries();
    }

    if (active && active.topicId === topicId) {
      active.topicName = trimmed;
      saveActive();
    }

    render();
  }

  function startTracking(topic) {
    active = {
      topicId: topic.id,
      topicName: topic.name,
      startIso: nowIso(),
    };
    saveActive();
    ensureTicking();
    render();
  }

  function stopActiveTracking() {
    if (!active) return;
    const startDate = new Date(active.startIso);
    const endDate = new Date();
    const minutes = Math.round(((endDate - startDate) / 60000) * 100) / 100;

    if (minutes > 0) {
      entries.push({
        id: generateId(),
        topicId: active.topicId,
        topicName: active.topicName,
        startIso: active.startIso,
        endIso: endDate.toISOString(),
        minutes: minutes,
        date: toLocalDateKey(startDate),
      });
      saveEntries();
    }

    active = null;
    saveActive();
  }

  function handleTopicClick(topic) {
    if (active && active.topicId === topic.id) {
      stopActiveTracking();
      render();
      return;
    }
    if (active) {
      stopActiveTracking();
    }
    startTracking(topic);
  }

  function ensureTicking() {
    if (tickIntervalId) return;
    tickIntervalId = setInterval(function () {
      updateLiveTimers();
    }, 1000);
  }

  function stopTickingIfIdle() {
    if (!active && tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  }

  function updateLiveTimers() {
    if (!active) {
      stopTickingIfIdle();
      return;
    }
    const box = el.topicGrid.querySelector('[data-topic-id="' + active.topicId + '"] .topic-timer');
    if (box) {
      const elapsedMs = Date.now() - new Date(active.startIso).getTime();
      box.textContent = formatElapsed(elapsedMs);
    }
    renderWeekChart();
    renderWeekTable();
  }

  // Returns the Monday-Friday days for the week currently selected via
  // `weekOffset` (0 = this week, -1 = previous week, etc.). Forward
  // navigation beyond the current week is prevented elsewhere.
  function getCurrentWeekMonFri() {
    const today = startOfDay(new Date());
    const isoWeekday = today.getDay() === 0 ? 7 : today.getDay();
    const thisMonday = addDays(today, 1 - isoWeekday);
    const monday = addDays(thisMonday, weekOffset * 7);
    const days = [];
    for (let i = 0; i < 5; i++) {
      days.push(addDays(monday, i));
    }
    return days;
  }

  function goToPreviousWeek() {
    weekOffset -= 1;
    renderWeekChart();
    renderWeekTable();
    updateWeekNavButtons();
  }

  function goToNextWeek() {
    if (weekOffset >= 0) return; // never navigate into the future
    weekOffset += 1;
    renderWeekChart();
    renderWeekTable();
    updateWeekNavButtons();
  }

  function goToCurrentWeek() {
    if (weekOffset === 0) return;
    weekOffset = 0;
    renderWeekChart();
    renderWeekTable();
    updateWeekNavButtons();
  }

  function updateWeekNavButtons() {
    if (el.weekNextBtn) {
      el.weekNextBtn.disabled = weekOffset >= 0;
    }
    if (el.weekTodayBtn) {
      el.weekTodayBtn.disabled = weekOffset === 0;
    }
  }

  // Returns { [dateKey]: { [topicId]: minutes } }, including the live partial
  // session of the active timer (if its start date falls within the week).
  function aggregateWeekMinutes(weekDays) {
    const dateKeys = weekDays.map(toLocalDateKey);
    const result = {};
    dateKeys.forEach(function (k) { result[k] = {}; });

    entries.forEach(function (entry) {
      if (dateKeys.indexOf(entry.date) === -1) return;
      const bucket = result[entry.date];
      bucket[entry.topicId] = (bucket[entry.topicId] || 0) + entry.minutes;
    });

    if (active) {
      const activeDateKey = toLocalDateKey(new Date(active.startIso));
      if (dateKeys.indexOf(activeDateKey) !== -1) {
        const elapsedMinutes = (Date.now() - new Date(active.startIso).getTime()) / 60000;
        const bucket = result[activeDateKey];
        bucket[active.topicId] = (bucket[active.topicId] || 0) + elapsedMinutes;
      }
    }

    return result;
  }

  function render() {
    renderTopicGrid();
    renderWeekChart();
    renderWeekTable();
  }

  function renderTopicGrid() {
    const sorted = getSortedTopics();
    el.topicGrid.innerHTML = "";

    if (sorted.length === 0) {
      el.emptyTopicsHint.classList.remove("d-none");
      return;
    }
    el.emptyTopicsHint.classList.add("d-none");

    sorted.forEach(function (topic) {
      const isRunning = !!active && active.topicId === topic.id;
      const box = document.createElement("div");
      box.className = "topic-box" + (isRunning ? " running" : "");
      box.setAttribute("data-topic-id", topic.id);
      box.setAttribute("role", "button");
      box.setAttribute("tabindex", "0");

      const nameEl = document.createElement("div");
      nameEl.className = "topic-name";
      nameEl.textContent = topic.name;

      const timerEl = document.createElement("div");
      timerEl.className = "topic-timer";
      if (isRunning) {
        const elapsedMs = Date.now() - new Date(active.startIso).getTime();
        timerEl.textContent = formatElapsed(elapsedMs);
      } else {
        timerEl.textContent = "Click to start";
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "topic-delete";
      deleteBtn.title = "Delete topic";
      deleteBtn.textContent = "\uD83D\uDDD9";
      deleteBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (window.confirm('Delete topic "' + topic.name + '"? Historical tracked time is kept.')) {
          deleteTopic(topic.id);
        }
      });

      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "topic-rename";
      renameBtn.title = "Rename topic";
      renameBtn.textContent = "\u270E";
      renameBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        startTopicRename(box, nameEl, topic);
      });

      box.appendChild(deleteBtn);
      box.appendChild(renameBtn);
      box.appendChild(nameEl);
      box.appendChild(timerEl);

      box.addEventListener("click", function () {
        handleTopicClick(topic);
      });
      box.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          handleTopicClick(topic);
        }
      });

      el.topicGrid.appendChild(box);
    });
  }

  function startTopicRename(box, nameEl, topic) {
    // Avoid creating multiple inputs if already editing.
    if (box.querySelector(".topic-name-input")) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "topic-name-input form-control form-control-sm";
    input.value = topic.name;
    input.maxLength = 60;

    // Prevent clicks/keydowns on the input from toggling tracking or
    // bubbling up to the box's click handler.
    input.addEventListener("click", function (ev) {
      ev.stopPropagation();
    });

    let finished = false;
    function finishEdit(commit) {
      if (finished) return;
      finished = true;
      if (commit) {
        renameTopic(topic.id, input.value);
      } else {
        render();
      }
    }

    input.addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        finishEdit(false);
      }
    });

    input.addEventListener("blur", function () {
      finishEdit(true);
    });

    nameEl.replaceWith(input);
    input.focus();
    input.select();
  }

  function renderWeekChart() {
    const weekDays = getCurrentWeekMonFri();
    const sortedTopics = getSortedTopics();
    const sortedTopicIds = sortedTopics.map(function (t) { return t.id; });
    const aggregated = aggregateWeekMinutes(weekDays);

    const firstLabel = formatShortDate(weekDays[0]);
    const lastLabel = formatShortDate(weekDays[weekDays.length - 1]);
    el.weekRangeLabel.textContent = firstLabel + " \u2013 " + lastLabel;

    let maxDayMinutes = 0;
    weekDays.forEach(function (d) {
      const key = toLocalDateKey(d);
      const bucket = aggregated[key];
      let total = 0;
      Object.keys(bucket).forEach(function (tid) { total += bucket[tid]; });
      if (total > maxDayMinutes) maxDayMinutes = total;
    });

    el.weekChart.innerHTML = "";

    if (sortedTopics.length === 0) {
      const hint = document.createElement("div");
      hint.className = "week-empty-hint";
      hint.textContent = "Add topics below to start tracking — your weekly chart will appear here.";
      el.weekChart.appendChild(hint);
      el.weekLegend.innerHTML = "";
      return;
    }

    weekDays.forEach(function (d, idx) {
      const key = toLocalDateKey(d);
      const bucket = aggregated[key];
      const topicIdsWithTime = Object.keys(bucket).filter(function (tid) { return bucket[tid] > 0; });
      const dayTotal = topicIdsWithTime.reduce(function (sum, tid) { return sum + bucket[tid]; }, 0);

      const col = document.createElement("div");
      col.className = "week-day-col" + (dayTotal <= 0 ? " is-empty" : "");

      const totalLabel = document.createElement("div");
      totalLabel.className = "week-day-total";
      totalLabel.textContent = dayTotal > 0 ? formatMinutes(dayTotal) : "\u2014";

      const track = document.createElement("div");
      track.className = "week-bar-track";

      // sort segments by sortedTopicIds order so stacking is consistent
      const orderedTopicIds = sortedTopicIds.filter(function (tid) {
        return topicIdsWithTime.indexOf(tid) !== -1;
      });

      orderedTopicIds.forEach(function (tid) {
        const minutes = bucket[tid];
        const heightPct = maxDayMinutes > 0 ? (minutes / maxDayMinutes) * 100 : 0;
        const segment = document.createElement("div");
        const isPartial = !!active && active.topicId === tid && toLocalDateKey(new Date(active.startIso)) === key;
        segment.className = "week-bar-segment" + (isPartial ? " partial" : "");
        segment.style.height = heightPct + "%";
        segment.style.backgroundColor = colorForTopicId(tid, sortedTopicIds);
        segment.title = (topics.find(function (t) { return t.id === tid; }) || { name: "Unknown" }).name +
          ": " + formatMinutes(minutes);
        track.appendChild(segment);
      });

      const dayLabel = document.createElement("div");
      dayLabel.className = "week-day-label";
      dayLabel.textContent = DAY_LABELS[idx] + " " + formatShortDate(d);

      col.appendChild(totalLabel);
      col.appendChild(track);
      col.appendChild(dayLabel);
      el.weekChart.appendChild(col);
    });

    renderWeekLegend(sortedTopics, sortedTopicIds);
  }

  function renderWeekLegend(sortedTopics, sortedTopicIds) {
    el.weekLegend.innerHTML = "";
    sortedTopics.forEach(function (topic) {
      const item = document.createElement("div");
      item.className = "week-legend-item";

      const swatch = document.createElement("span");
      swatch.className = "week-legend-swatch";
      swatch.style.backgroundColor = colorForTopicId(topic.id, sortedTopicIds);

      const label = document.createElement("span");
      label.textContent = topic.name;

      item.appendChild(swatch);
      item.appendChild(label);
      el.weekLegend.appendChild(item);
    });
  }

  function renderWeekTable() {
    const weekDays = getCurrentWeekMonFri();
    const sortedTopics = getSortedTopics();
    const sortedTopicIds = sortedTopics.map(function (t) { return t.id; });
    const aggregated = aggregateWeekMinutes(weekDays);

    el.weekTableHeadRow.innerHTML = "";
    el.weekTableBody.innerHTML = "";
    el.weekTableFootRow.innerHTML = "";

    if (sortedTopics.length === 0) {
      el.weekTable.classList.add("d-none");
      el.weekTableEmptyHint.classList.remove("d-none");
      return;
    }
    el.weekTable.classList.remove("d-none");
    el.weekTableEmptyHint.classList.add("d-none");

    // Header row: Topic | Mon | Tue | Wed | Thu | Fri | Total
    const thTopic = document.createElement("th");
    thTopic.scope = "col";
    thTopic.textContent = "Topic";
    el.weekTableHeadRow.appendChild(thTopic);

    weekDays.forEach(function (d, idx) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = "text-end";
      th.textContent = DAY_LABELS[idx] + " " + formatShortDate(d);
      el.weekTableHeadRow.appendChild(th);
    });

    const thTotal = document.createElement("th");
    thTotal.scope = "col";
    thTotal.className = "text-end";
    thTotal.textContent = "Total";
    el.weekTableHeadRow.appendChild(thTotal);

    // Body rows: one per topic
    const dayKeys = weekDays.map(toLocalDateKey);
    const columnTotals = dayKeys.map(function () { return 0; });
    let grandTotal = 0;

    sortedTopics.forEach(function (topic) {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      const swatch = document.createElement("span");
      swatch.className = "week-legend-swatch me-2";
      swatch.style.backgroundColor = colorForTopicId(topic.id, sortedTopicIds);
      nameTd.appendChild(swatch);
      nameTd.appendChild(document.createTextNode(topic.name));
      tr.appendChild(nameTd);

      let rowTotal = 0;
      dayKeys.forEach(function (key, colIdx) {
        const minutes = aggregated[key][topic.id] || 0;
        rowTotal += minutes;
        columnTotals[colIdx] += minutes;

        const td = document.createElement("td");
        td.className = "text-end";
        td.textContent = minutes > 0 ? formatMinutes(minutes) : "\u2014";
        tr.appendChild(td);
      });

      grandTotal += rowTotal;

      const totalTd = document.createElement("td");
      totalTd.className = "text-end fw-semibold";
      totalTd.textContent = rowTotal > 0 ? formatMinutes(rowTotal) : "\u2014";
      tr.appendChild(totalTd);

      el.weekTableBody.appendChild(tr);
    });

    // Footer row: column totals
    const footLabelTd = document.createElement("td");
    footLabelTd.className = "fw-semibold";
    footLabelTd.textContent = "Total";
    el.weekTableFootRow.appendChild(footLabelTd);

    columnTotals.forEach(function (minutes) {
      const td = document.createElement("td");
      td.className = "text-end fw-semibold";
      td.textContent = minutes > 0 ? formatMinutes(minutes) : "\u2014";
      el.weekTableFootRow.appendChild(td);
    });

    const grandTotalTd = document.createElement("td");
    grandTotalTd.className = "text-end fw-bold";
    grandTotalTd.textContent = grandTotal > 0 ? formatMinutes(grandTotal) : "\u2014";
    el.weekTableFootRow.appendChild(grandTotalTd);
  }

  function handleExport() {
    const payload = {
      exportedAt: nowIso(),
      version: EXPORT_VERSION,
      topics: topics,
      entries: entries,
      active: active,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = toLocalDateKey(new Date());
    const a = document.createElement("a");
    a.href = url;
    a.download = "time-tracker-export-" + dateStr + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFileSelected(file) {
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        showAlert("Could not parse the selected file as JSON.", "danger");
        return;
      }
      if (!parsed || !Array.isArray(parsed.topics) || !Array.isArray(parsed.entries)) {
        showAlert("The selected file does not have a valid Time Tracker export structure.", "danger");
        return;
      }
      pendingImportPayload = parsed;
      if (importConfirmModal) {
        importConfirmModal.show();
      }
    };
    reader.onerror = function () {
      showAlert("Failed to read the selected file.", "danger");
    };
    reader.readAsText(file);
  }

  function applyPendingImport() {
    if (!pendingImportPayload) return;
    topics = Array.isArray(pendingImportPayload.topics) ? pendingImportPayload.topics : [];
    entries = Array.isArray(pendingImportPayload.entries) ? pendingImportPayload.entries : [];
    active = pendingImportPayload.active || null;

    saveTopics();
    saveEntries();
    saveActive();

    pendingImportPayload = null;

    if (active) {
      ensureTicking();
    } else {
      stopTickingIfIdle();
    }

    render();
    showAlert("Data imported successfully.", "success");
  }

  function bindEvents() {
    el.addTopicForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      addTopic(el.newTopicInput.value);
      el.newTopicInput.value = "";
      el.newTopicInput.focus();
    });

    el.exportBtn.addEventListener("click", handleExport);

    el.importBtn.addEventListener("click", function () {
      el.importFileInput.value = "";
      el.importFileInput.click();
    });

    el.importFileInput.addEventListener("change", function (ev) {
      const file = ev.target.files && ev.target.files[0];
      if (file) {
        handleImportFileSelected(file);
      }
    });

    el.confirmImportBtn.addEventListener("click", function () {
      applyPendingImport();
      if (importConfirmModal) {
        importConfirmModal.hide();
      }
    });

    // Keep the live elapsed timer accurate even if the tab was backgrounded.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        updateLiveTimers();
        renderWeekChart();
        renderWeekTable();
      }
    });

    el.helpBtn.addEventListener("click", function () {
      if (helpModal) {
        helpModal.show();
      }
    });

    el.themeToggleBtn.addEventListener("click", toggleTheme);

    el.weekPrevBtn.addEventListener("click", goToPreviousWeek);
    el.weekNextBtn.addEventListener("click", goToNextWeek);
    el.weekTodayBtn.addEventListener("click", goToCurrentWeek);
  }

  function init() {
    initTheme();
    loadState();

    const modalEl = document.getElementById("importConfirmModal");
    if (modalEl && window.bootstrap) {
      importConfirmModal = new window.bootstrap.Modal(modalEl);
    }

    const helpModalEl = document.getElementById("helpModal");
    if (helpModalEl && window.bootstrap) {
      helpModal = new window.bootstrap.Modal(helpModalEl);
    }

    bindEvents();
    render();
    updateWeekNavButtons();

    if (active) {
      ensureTicking();
    }
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {
          // Silently ignore registration failures (e.g. running from file://,
          // where service workers are not supported).
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  registerServiceWorker();
})();
