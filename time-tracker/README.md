[<< Back](../README.md)

# Time Tracker

A **single-page web application** that runs entirely in the browser (no backend) to track time spent on freely-defined topics ("activities"). Click a topic to start a stopwatch for it; click another topic to stop the first and start the second. All settings (topics) and tracked data (time entries) are persisted in `localStorage`, and the complete state can be exported to / imported from a JSON file. A weekly bar chart at the top of the page visualizes minutes tracked per day (Monday–Friday of the current week) broken down by topic.

## Goals

- Provide a zero-setup, zero-backend time tracker that works from a single static HTML page (can even be opened directly as a `file://` URL).
- Let the user define an arbitrary number of topics (free text, e.g. "Email", "Meetings", "Deep Work", "Project X") and track time against them with a single click.
- Make switching between topics effortless: clicking a different topic box stops the currently running one and immediately starts the new one — no separate "stop" action required.
- Visualize the current working week (Monday–Friday) as a stacked bar chart so the user can see at a glance how their time was distributed per day and per topic.
- Allow full backup/restore of all data (topics + tracked time entries) via JSON file export/import, so data can be moved between browsers/machines or backed up.
- Survive page reloads and browser restarts without losing the currently running timer (the running state itself is persisted, not just completed entries).

## Technical Requirements

- **UI framework**: [Bootstrap 5](https://getbootstrap.com/) loaded via CDN (CSS + bundled JS) — used for layout, buttons, forms, modals, and utility classes.
- **No other external libraries or frameworks.** No Chart.js, no jQuery, no build tooling. The weekly bar chart is implemented with plain HTML/CSS/JS (styled `<div>` bars), not a charting library.
- **Persistence**: `window.localStorage` only. No cookies, no IndexedDB, no backend/server/API calls.
- **No backend**: the app is 100% static (HTML/CSS/JS) and fully functional offline, directly from the filesystem (`file://`) or any static web server.
- **Browser support**: modern evergreen browsers (Chrome, Edge, Firefox, Safari) with ES2017+ JavaScript support.

## Data Model

### Topic

```ts
type Topic = {
  id: string;        // stable unique id, e.g. generated via crypto.randomUUID() or timestamp-based
  name: string;       // free-text label as entered by the user, trimmed, unique (case-insensitive)
  createdAt: string;  // ISO-8601 timestamp of creation
};
```

### Time Entry (a single completed tracking session)

```ts
type TimeEntry = {
  id: string;         // unique id
  topicId: string;    // references Topic.id
  topicName: string;  // denormalized copy of the topic name at time of tracking (survives topic rename/deletion)
  startIso: string;   // ISO-8601 timestamp when tracking started
  endIso: string;     // ISO-8601 timestamp when tracking stopped
  minutes: number;    // duration in minutes (float, rounded to 2 decimals), derived from start/end but stored for fast aggregation
  date: string;        // local date the session *started* on, formatted "YYYY-MM-DD" — used to bucket entries per day for the weekly chart
};
```

### Active Tracking State (the currently running stopwatch, if any)

```ts
type ActiveState = {
  topicId: string;
  topicName: string;
  startIso: string;  // when the current session started
} | null;
```

This state is itself persisted to `localStorage` (not just kept in memory), so that reloading the page or restarting the browser does **not** lose/reset a running timer — on load, the app detects the active state and resumes displaying the live elapsed time.

### localStorage Schema

All application data lives under a small number of namespaced keys:

| Key | Contents |
|---|---|
| `timeTracker.topics` | JSON array of `Topic` objects |
| `timeTracker.entries` | JSON array of `TimeEntry` objects |
| `timeTracker.active` | JSON `ActiveState` object, or absent/`null` if nothing is currently running |

### Export / Import File Format

Export produces a single downloadable `.json` file (e.g. `time-tracker-export-2025-01-15.json`) with the following shape, bundling settings and tracked data together as required:

```json
{
  "exportedAt": "2025-01-15T10:30:00.000Z",
  "version": 1,
  "topics": [ { "id": "...", "name": "Email", "createdAt": "..." } ],
  "entries": [ { "id": "...", "topicId": "...", "topicName": "Email", "startIso": "...", "endIso": "...", "minutes": 25.5, "date": "2025-01-15" } ],
  "active": null
}
```

Import reads a user-selected `.json` file (via a plain `<input type="file">`, no server upload), validates the top-level shape (`topics` and `entries` must be arrays, `version` must be a known/supported number), and **replaces** all current `localStorage` data (topics, entries, active state) with the imported content after user confirmation (a confirm dialog or Bootstrap modal warns that this overwrites existing data). The page is then re-rendered from the newly loaded state.

## Functional Requirements

### Topic management

- A text input + "Add" button (or Enter key) lets the user create a new topic by typing free text and submitting.
- Topic names are trimmed of leading/trailing whitespace; empty names are rejected.
- Duplicate names (case-insensitive) are rejected with a visible validation message — topic names must be unique.
- Each topic can be deleted via a small delete affordance on its box (e.g. an "×" that appears on hover, or a dedicated "Manage topics" list/modal). Deleting the topic that is **currently running** first stops the running timer and writes the partial entry, then removes the topic. Existing historical `TimeEntry` rows are **not** deleted (they keep their denormalized `topicName`), so historical chart data for that topic remains intact.
- Topics are rendered as a responsive grid of **square button boxes, 128px × 128px**, sorted **alphabetically** (case-insensitive) by name.

### Time tracking interaction

- Clicking a topic box:
  - If no topic is currently running: starts tracking on that topic (persists an `ActiveState`, highlights the box as "active/running", starts a live elapsed-time display on the box).
  - If a **different** topic is currently running: stops the currently running topic (computes `minutes` from `startIso` to now, appends a new `TimeEntry`, clears `ActiveState`), then immediately starts tracking the newly clicked topic.
  - If the **same** topic that is currently running is clicked again: stops tracking (toggle-off) — the running session is saved as a completed entry and nothing new starts.
- The currently running topic box visually indicates its state (e.g. colored border/background, a pulsing indicator, and a live-updating elapsed timer label such as `00:12:34`) updated at least once per second via `setInterval`.
- All entry writes happen immediately to `localStorage` so no tracked time is lost on accidental tab close/reload.

### Weekly timeline chart

- Rendered at the top of the page, above the topic grid.
- Shows the **current working week, Monday to Friday** (5 day-columns), computed from the real current date (ISO weekday), always anchored to "today's" week regardless of when the user opens the app.
- For each day, render a **stacked bar** where each topic contributes a segment proportional to the minutes tracked for that topic on that day; segment colors are assigned consistently per topic (e.g. a deterministic color derived from a hash of the topic id/name, or a defined palette cycled over sorted topics).
- Bar height scale is relative to the maximum total minutes among the 5 days (auto-scaling y-axis), with gridlines/labels in hours or minutes.
- Below/above each day's bar: the day label (Mon/Tue/Wed/Thu/Fri + date) and the total tracked minutes for that day.
- A simple legend maps topic → color beneath the chart.
- The chart re-renders live while a timer is running, so the in-progress session's elapsed time is reflected (optionally as a lighter/striped partial segment) without requiring a page reload.
- Built with plain HTML/CSS/JS only (flex/grid `<div>` bars with inline height/color styles) — no charting library.

### Data import/export controls

- Two buttons (e.g. in a toolbar/header area): **Export** and **Import**.
- Export triggers an in-browser download of the JSON file described above (using a `Blob` + temporary `<a download>` link — no server round-trip).
- Import opens a native file picker (`<input type="file" accept="application/json">`), reads the file with `FileReader`, parses and validates it, asks for confirmation, then overwrites `localStorage` and re-renders the app.
- Malformed/invalid files show a clear error (e.g. Bootstrap alert) and do not modify existing data.

### General UX

- Fully responsive layout using Bootstrap's grid; topic boxes wrap naturally across rows on narrower screens.
- Clear empty states: a friendly message/prompt when there are no topics yet, and when a day in the weekly chart has no tracked time.
- No page requires a full reload to reflect state changes — all updates are done via DOM re-rendering driven by the in-memory state (which mirrors `localStorage`).

## Project Structure

```
.
├── README.md
└── src
    ├── index.html          # Main page (loads Bootstrap via CDN)
    ├── css
    │   └── style.css       # Custom styles (topic boxes, running indicator, weekly chart bars/legend)
    └── js
        └── app.js          # All application logic (state, storage, timer, chart rendering, import/export)
```

## Running the app

Since the app is fully static and uses only `localStorage` (no `fetch()` of local files), it can be opened directly from disk:

```
time-tracker/src/index.html
```

or served via any static file server, e.g.:

```bash
# from the time-tracker/src directory
python -m http.server 8080
# then open http://localhost:8080
```

## Installing as a local app (PWA)

Time Tracker is also an installable **Progressive Web App (PWA)**:

- `manifest.webmanifest` declares the app name, icons, and `display: "standalone"` so it opens in its own window without browser chrome.
- `sw.js` is a service worker that caches the app shell (HTML/CSS/JS/icons) so the app keeps working offline and loads instantly on repeat visits.
- `index.html` links the manifest and registers the service worker on load.

**Note:** Service workers (and therefore the "Install app" prompt) require the page to be served over `http://`/`https://` — they do **not** work when the page is opened directly as a `file://` URL. Serve the app via a local static server (see above) or any static web host, then:

- **Chrome / Edge (desktop):** click the install icon in the address bar, or open the browser menu → *Install Time Tracker…*.
- **Android (Chrome):** browser menu → *Add to Home screen* / *Install app*.
- **iOS (Safari):** tap the Share icon → *Add to Home Screen*.

Once installed, the app launches like a native app (its own window/icon) and continues to use `localStorage` on that device — data is not synced between installs/devices, so use **Export data** / **Import data** to move data around.
