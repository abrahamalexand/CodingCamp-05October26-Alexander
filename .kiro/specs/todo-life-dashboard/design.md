# Design Document — To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a fully client-side, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It bundles four independent productivity widgets — a live greeting clock, a Pomodoro focus timer, a persistent to-do list, and a quick-links panel — into one zero-dependency page that opens directly from the file system (`file://` protocol).

All state is persisted via the browser's `localStorage` API. There is no build step, no bundler, no framework, and no network dependency.

**Design goals:**
- Zero external dependencies — the page must work with no internet connection after the initial file is saved.
- Clear module boundaries — each widget owns its own state, DOM subtree, and storage key.
- Resilient persistence — storage failures must degrade gracefully without crashing any widget.
- Fast interactivity — all DOM mutations happen within 100 ms of any user event; page load completes within 2 seconds.

---

## Architecture

### File Structure

```
index.html          — single HTML entry point; markup skeleton for all four widgets
css/
  styles.css        — all visual styling; responsive grid, widget cards, typography
js/
  app.js            — all application logic; four widget modules + shared utilities
```

No sub-directories are needed beyond `css/` and `js/`. All resources are local and self-contained.

### Module Organisation inside `js/app.js`

The single JavaScript file is organised into clearly delimited sections using block comments. Each section is an IIFE-style object or namespace to avoid polluting the global scope. The top-level execution block at the bottom of the file wires everything together on `DOMContentLoaded`.

```
app.js
├── StorageUtil          — thin wrapper around localStorage (read, write, error handling)
├── GreetingWidget       — clock/date/greeting display and minute-interval refresh
├── FocusTimerWidget     — countdown state machine, control wiring, completion notification
├── TodoListWidget       — task CRUD, validation, persistence, DOM rendering
├── QuickLinksWidget     — link CRUD, validation, URL normalisation, persistence, DOM rendering
└── init()               — bootstraps all four widgets on DOMContentLoaded
```

### Dependency Graph

```
index.html
    └── js/app.js
            ├── StorageUtil  ←── TodoListWidget
            │                └── QuickLinksWidget
            ├── GreetingWidget   (no storage dependency)
            ├── FocusTimerWidget (no storage dependency)
            ├── TodoListWidget
            └── QuickLinksWidget
```

`GreetingWidget` and `FocusTimerWidget` are pure runtime widgets with no storage dependency. `TodoListWidget` and `QuickLinksWidget` both depend on `StorageUtil`.

---

## Components and Interfaces

### StorageUtil

Centralises all `localStorage` access so widget code never calls `localStorage` directly.

```js
StorageUtil = {
  read(key)        → Array   // Returns parsed array or [] on failure; calls console.error on parse error
  write(key, arr)  → void    // Serialises to JSON; catches QuotaExceededError and surfaces UI alert
}
```

Error policy:
- **Bad JSON / non-array**: log to `console.error`, return `[]`, set an in-memory flag so the widget can show a persistence-unavailable banner.
- **QuotaExceededError on write**: display a visible page-level error toast and leave the in-memory state intact.

---

### GreetingWidget

Owns the `#greeting-widget` DOM section.

**Responsibilities:**
- Render current time in `HH:MM` (24-hour), full date as `DayOfWeek, Month DD, YYYY`, and a contextual greeting string.
- Schedule updates aligned to the system clock's minute boundary using a two-phase approach:
  1. On init, compute milliseconds until the next full minute and set a one-shot `setTimeout`.
  2. Inside that timeout, call the render function once and then start a `setInterval` at 60 000 ms.
- This alignment ensures the display never lags behind the real clock minute.

**Greeting logic:**

| Hour range (24h) | Greeting       |
|------------------|----------------|
| 05:00 – 11:59    | Good Morning   |
| 12:00 – 17:59    | Good Afternoon |
| 18:00 – 21:59    | Good Evening   |
| 22:00 – 04:59    | Good Night     |

**Interface:**
```js
GreetingWidget = {
  init()           → void   // Renders immediately, schedules minute-aligned interval
  _render()        → void   // Internal: reads Date, updates DOM
  _getGreeting(h)  → string // Pure function: hour (0–23) → greeting string
}
```

---

### FocusTimerWidget

Owns the `#focus-timer-widget` DOM section.

**State machine:**

```
         ┌──────────────────────────────────┐
         ▼                                  │
    [IDLE / 25:00]                          │
         │  Start pressed                   │
         ▼                                  │
    [RUNNING]                               │
         │  Stop pressed ──► [PAUSED]       │ Reset pressed (from any state)
         │                      │           │
         │  Start pressed ◄─────┘           │
         │                                  │
         │  countdown hits 00:00            │
         ▼                                  │
    [COMPLETE] ──────────────────────────── ┘
```

**State transitions and control enabling rules:**

| State    | Start    | Stop     | Reset    |
|----------|----------|----------|----------|
| IDLE     | enabled  | disabled | disabled |
| RUNNING  | disabled | enabled  | enabled  |
| PAUSED   | enabled  | disabled | enabled  |
| COMPLETE | disabled | disabled | enabled  |

**Countdown mechanism:** A `setInterval` fires every 1 000 ms and decrements the internal `remainingSeconds` counter. The display is updated each tick. On reaching 0, the interval is cleared and the completion notification is shown.

**Completion notification:** A `<div id="timer-notification">` is hidden by default (`display:none`) and made visible when the timer reaches 00:00. It is hidden again when the user clicks "Dismiss" or activates Reset.

**Interface:**
```js
FocusTimerWidget = {
  init()       → void
  _start()     → void
  _stop()      → void
  _reset()     → void
  _tick()      → void   // called by setInterval
  _render()    → void   // updates display and button states
  _notify()    → void   // shows completion notification
  _dismiss()   → void   // hides notification
}
```

---

### TodoListWidget

Owns the `#todo-list-widget` DOM section.

**Task lifecycle:** add → (edit | complete-toggle | delete) → persist.

**Rendering strategy:** The task list DOM is fully re-rendered from the in-memory `tasks[]` array after every mutating operation. This keeps rendering logic simple and eliminates incremental-update bugs.

**Input validation rules:**

| Condition                          | Action                          |
|------------------------------------|---------------------------------|
| Empty or whitespace-only           | Reject; show validation message |
| Length > 500 characters            | Reject; show validation message |
| Valid (1–500 non-empty characters) | Accept; add/update task         |

**Edit flow:** Clicking the edit button on a task replaces that task's `<li>` text span with an `<input>` element pre-populated with the current description. Clicking "Save" or pressing Enter confirms; clicking "Cancel" or pressing Escape discards.

**Persistence:** After every mutating operation, `StorageUtil.write(TASKS_KEY, tasks)` is called synchronously within the same call stack, so the 500 ms requirement is trivially met.

**Interface:**
```js
TodoListWidget = {
  init()                   → void
  _load()                  → void        // reads from storage, calls _render
  _addTask(description)    → void
  _editTask(id, newDesc)   → void
  _toggleComplete(id)      → void
  _deleteTask(id)          → void
  _persist()               → void        // calls StorageUtil.write
  _render()                → void        // full re-render of task list DOM
  _validate(desc)          → {ok, error} // pure validation function
}
```

---

### QuickLinksWidget

Owns the `#quick-links-widget` DOM section.

**URL normalisation:** If a submitted URL does not start with `http://` or `https://`, prepend `https://`. Validation of the final URL (length ≤ 2048, no illegal characters) happens after normalisation.

**Label validation rules:**

| Condition              | Action                          |
|------------------------|---------------------------------|
| Empty                  | Reject; show validation message |
| Length > 100 chars     | Reject; show validation message |

**URL validation rules (after normalisation):**

| Condition              | Action                          |
|------------------------|---------------------------------|
| Empty (before prepend) | Reject; show validation message |
| Length > 2048 chars    | Reject; show validation message |
| Invalid URL characters | Reject; show validation message |

**Link buttons:** Each link renders as a `<button>` (or `<a target="_blank">`) element. A separate delete icon sits beside each link. Clicking the link opens the URL via `window.open(url, '_blank', 'noopener,noreferrer')`.

**Rendering strategy:** Same full re-render approach as `TodoListWidget`.

**Interface:**
```js
QuickLinksWidget = {
  init()                       → void
  _load()                      → void
  _addLink(label, url)         → void
  _deleteLink(id)              → void
  _normaliseUrl(url)           → string
  _validateLabel(label)        → {ok, error}
  _validateUrl(url)            → {ok, error}
  _persist()                   → void
  _render()                    → void
}
```

---

## Data Models

### Task Object

```js
{
  id:          string,   // crypto.randomUUID() or Date.now().toString() as fallback
  description: string,   // 1–500 characters, trimmed before storage
  completed:   boolean,  // false on creation; toggled by complete control
  createdAt:   number    // Date.now() timestamp; used to preserve insertion order
}
```

### Link Object

```js
{
  id:    string,  // crypto.randomUUID() or Date.now().toString() as fallback
  label: string,  // 1–100 characters, trimmed before storage
  url:   string   // normalised URL (always starts with http:// or https://), ≤ 2048 chars
}
```

### localStorage Keys

| Key                       | Value Type    | Owner Widget       |
|---------------------------|---------------|--------------------|
| `tld_tasks`               | JSON string   | TodoListWidget     |
| `tld_links`               | JSON string   | QuickLinksWidget   |

The `tld_` prefix namespaces all keys to this application, preventing collision with other apps on the same origin.

### Serialisation Format

Both collections are stored as JSON arrays of their respective objects:

```json
// tld_tasks example
[
  { "id": "abc123", "description": "Buy groceries", "completed": false, "createdAt": 1700000000000 },
  { "id": "def456", "description": "Read chapter 4", "completed": true, "createdAt": 1700000001000 }
]

// tld_links example
[
  { "id": "ghi789", "label": "GitHub", "url": "https://github.com" }
]
```

---

## UI Layout Design

### Responsive Grid

```css
/* ≥ 768px: 2-column grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
}

/* < 768px: single column */
@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

Widget placement in the grid (left-to-right, top-to-bottom):

```
┌──────────────────┬──────────────────┐
│  Greeting Widget │   Focus Timer    │
│  (col 1, row 1)  │  (col 2, row 1)  │
├──────────────────┼──────────────────┤
│   To-Do List     │   Quick Links    │
│  (col 1, row 2)  │  (col 2, row 2)  │
└──────────────────┴──────────────────┘
```

On narrow viewports (< 768px), all four widgets stack vertically in source order.

### Typography and Accessibility

- Body font size: minimum 16px.
- Each widget has a visible `<h2>` heading (e.g. "Focus Timer", "My Tasks", "Quick Links") for semantic structure and accessibility.
- The greeting time display uses a larger font (`2rem+`) for quick readability.
- All interactive controls (`<button>`, `<input>`) have visible focus styles and `aria-label` attributes where the button text alone is insufficient (e.g., delete and edit icon buttons).
- Colour contrast must meet WCAG AA (≥ 4.5:1 for normal text).

### HTML Skeleton (abbreviated)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Life Dashboard</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="dashboard-grid">
    <section id="greeting-widget">
      <h2>Hello</h2>
      <p id="greeting-time"></p>
      <p id="greeting-date"></p>
      <p id="greeting-message"></p>
    </section>

    <section id="focus-timer-widget">
      <h2>Focus Timer</h2>
      <p id="timer-display">25:00</p>
      <div id="timer-controls">
        <button id="timer-start">Start</button>
        <button id="timer-stop" disabled>Stop</button>
        <button id="timer-reset" disabled>Reset</button>
      </div>
      <div id="timer-notification" hidden>
        Session complete! <button id="timer-dismiss">Dismiss</button>
      </div>
    </section>

    <section id="todo-list-widget">
      <h2>My Tasks</h2>
      <form id="todo-form">
        <input id="todo-input" type="text" maxlength="500" placeholder="Add a task…">
        <button type="submit">Add</button>
        <p id="todo-error" role="alert" hidden></p>
      </form>
      <ul id="todo-list"></ul>
    </section>

    <section id="quick-links-widget">
      <h2>Quick Links</h2>
      <form id="links-form">
        <input id="link-label" type="text" maxlength="100" placeholder="Label">
        <input id="link-url"   type="text" placeholder="URL">
        <button type="submit">Add</button>
        <p id="links-error" role="alert" hidden></p>
      </form>
      <div id="links-list"></div>
    </section>
  </main>
  <div id="storage-error-toast" hidden></div>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## Key Algorithms

### Greeting Logic

```
function _getGreeting(hour):  // hour is 0–23
  if 5 ≤ hour ≤ 11  → "Good Morning"
  if 12 ≤ hour ≤ 17 → "Good Afternoon"
  if 18 ≤ hour ≤ 21 → "Good Evening"
  else               → "Good Night"   // 22–23 and 0–4
```

### Minute-Aligned Clock Update

```
function init():
  _render()                        // immediate render on page load
  now = new Date()
  msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
  setTimeout(() => {
    _render()
    setInterval(_render, 60_000)   // fire every 60s from here
  }, msUntilNextMinute)
```

### Timer Countdown

```
_start():
  if state is COMPLETE or remainingSeconds == 0: return
  state = RUNNING
  intervalId = setInterval(_tick, 1000)
  _render()

_tick():
  remainingSeconds -= 1
  if remainingSeconds <= 0:
    remainingSeconds = 0
    clearInterval(intervalId)
    state = COMPLETE
    _notify()
  _render()

_reset():
  clearInterval(intervalId)
  remainingSeconds = TIMER_DURATION   // 1500
  state = IDLE
  _dismiss()
  _render()
```

### localStorage Read/Write

```
StorageUtil.read(key):
  try:
    raw = localStorage.getItem(key)
    if raw is null: return []
    parsed = JSON.parse(raw)
    if not Array.isArray(parsed): throw new Error("not an array")
    return parsed
  catch e:
    console.error(`[tld] Failed to parse storage key "${key}": ${e.message}`)
    return []

StorageUtil.write(key, arr):
  try:
    localStorage.setItem(key, JSON.stringify(arr))
  catch e:
    if e.name === "QuotaExceededError":
      showStorageFullToast()
    else:
      console.error(`[tld] Failed to write storage key "${key}": ${e.message}`)
```

### Task ID Generation

```
function generateId():
  if crypto.randomUUID is supported: return crypto.randomUUID()
  else: return Date.now().toString(36) + Math.random().toString(36).slice(2)
```

---

## Error Handling

| Scenario | Detection | User-facing response | Internal response |
|---|---|---|---|
| Add/edit task with empty input | `_validate()` returns `{ok: false}` | Show inline `#todo-error` paragraph | Reject, do not mutate state |
| Add/edit task > 500 chars | Same | Same, with char-limit message | Same |
| Add link with empty label | `_validateLabel()` | Show inline `#links-error` | Reject |
| Add link with label > 100 chars | Same | Same | Same |
| Add link with empty URL | `_validateUrl()` | Show inline `#links-error` | Reject |
| Add link with invalid/oversized URL | Same | Same | Same |
| localStorage read returns bad JSON | `JSON.parse` throws in `StorageUtil.read` | None (silent); widget shows empty list | `console.error`, return `[]` |
| localStorage read returns non-array | Type check in `StorageUtil.read` | None (silent) | `console.error`, return `[]` |
| localStorage write hits quota | `QuotaExceededError` catch | Visible toast: "Storage full, data not saved" | Log error |
| localStorage unavailable entirely | `try/catch` around all storage calls | Widget-level banner: "Persistence unavailable" | In-memory operation continues |
| Timer Start pressed at 00:00 | State check in `_start()` | Start button remains disabled | No-op |
| timer notification not dismissed before reset | Reset handler calls `_dismiss()` | Notification hidden automatically | State reset to IDLE |

Validation error messages are displayed in `role="alert"` paragraphs adjacent to the relevant form, hidden by default and shown only on rejection. They are cleared whenever the user successfully submits a valid value.

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Time display formatting

*For any* integer `remainingSeconds` in the range 0–1500, `_formatTimerDisplay(remainingSeconds)` SHALL return a string of the form `MM:SS` where MM is the zero-padded minutes and SS is the zero-padded seconds, and `MM * 60 + SS === remainingSeconds`.

**Validates: Requirements 2.2**

---

### Property 2: Date string formatting

*For any* `Date` object, `_formatDate(date)` SHALL return a string that matches the pattern `DayOfWeek, Month DD, YYYY` (e.g. `Monday, January 01, 2024`), where DayOfWeek and Month are derived from the date's local timezone values.

**Validates: Requirements 1.2**

---

### Property 3: Greeting correctness

*For any* integer `hour` in the range 0–23, `_getGreeting(hour)` SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, with the following mapping:

- 5 ≤ hour ≤ 11 → `"Good Morning"`
- 12 ≤ hour ≤ 17 → `"Good Afternoon"`
- 18 ≤ hour ≤ 21 → `"Good Evening"`
- hour < 5 or hour ≥ 22 → `"Good Night"`

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Stop preserves remaining time

*For any* timer state where `remainingSeconds > 0` and the timer is RUNNING, calling `_stop()` SHALL leave `remainingSeconds` unchanged and transition state to PAUSED.

**Validates: Requirements 2.4**

---

### Property 5: Reset always returns to initial state

*For any* timer state (IDLE, RUNNING, PAUSED, or COMPLETE) and any value of `remainingSeconds`, calling `_reset()` SHALL result in `remainingSeconds === 1500`, `state === IDLE`, and the Start button being enabled and Stop button being disabled.

**Validates: Requirements 2.6**

---

### Property 6: Valid task addition increases list size

*For any* existing task array and any valid task description (a non-empty, non-whitespace-only string of 1–500 characters), calling `_addTask(description)` SHALL increase `tasks.length` by exactly 1, and the newly added task SHALL have a `description` equal to the trimmed input and `completed === false`.

**Validates: Requirements 3.1**

---

### Property 7: Invalid task descriptions are always rejected

*For any* string that is empty, composed entirely of whitespace, or longer than 500 characters, `_validate(description)` SHALL return `{ ok: false }` with a non-empty `error` message, and the task array SHALL remain unchanged.

**Validates: Requirements 3.2, 3.5**

---

### Property 8: Edit correctly updates a task's description

*For any* existing task and any valid new description (1–500 non-empty characters), calling `_editTask(id, newDescription)` SHALL update that task's `description` to the trimmed new value while leaving all other fields (`id`, `completed`, `createdAt`) unchanged.

**Validates: Requirements 3.4**

---

### Property 9: Completion toggle is a round-trip

*For any* task, calling `_toggleComplete(id)` twice SHALL return the task's `completed` field to its original value (i.e., `toggle(toggle(x)) === x`). Calling it once SHALL flip the `completed` boolean.

**Validates: Requirements 3.6**

---

### Property 10: Delete removes the target item

*For any* collection (tasks or links) and any item id present in that collection, calling `_deleteTask(id)` or `_deleteLink(id)` SHALL result in a collection that contains no item with that `id`, and the collection length SHALL decrease by exactly 1.

**Validates: Requirements 3.7, 4.7**

---

### Property 11: Serialisation is a round-trip

*For any* array of Task objects or Link objects, serialising the array to JSON via `StorageUtil.write(key, arr)` and then deserialising via `StorageUtil.read(key)` SHALL produce an array that deep-equals the original, preserving all fields and insertion order.

**Validates: Requirements 3.8, 3.9, 4.8, 4.9, 5.2, 5.3**

---

### Property 12: Valid link addition increases list size

*For any* existing links array and any valid label (1–100 characters) and normalised URL (starts with `http://` or `https://`, ≤ 2048 chars), calling `_addLink(label, url)` SHALL increase `links.length` by exactly 1, and the new link SHALL have the correct `label` and `url` fields.

**Validates: Requirements 4.1**

---

### Property 13: URL normalisation prepends https://

*For any* URL string that does not start with `"http://"` or `"https://"`, `_normaliseUrl(url)` SHALL return `"https://" + url`. For any URL string that already starts with `"http://"` or `"https://"`, `_normaliseUrl(url)` SHALL return the original string unchanged.

**Validates: Requirements 4.4**

---

### Property 14: Invalid link submissions are always rejected

*For any* label that is empty or longer than 100 characters, OR any URL that (after normalisation) exceeds 2048 characters or contains characters invalid in a URL, the submission SHALL be rejected: `_validateLabel()` or `_validateUrl()` SHALL return `{ ok: false }`, and the links array SHALL remain unchanged.

**Validates: Requirements 4.2, 4.5**

---

## Testing Strategy

### Approach

This project uses a dual testing approach suited to a zero-dependency Vanilla JS application:

- **Property-based tests** verify universal correctness properties across a large randomised input space (minimum 100 iterations per property).
- **Unit/example tests** cover specific scenarios, edge cases, error conditions, and integration points between components.

Since the application is pure Vanilla JS with no build tooling, tests are written using **[fast-check](https://fast-check.dev/)** (property-based) and **[Vitest](https://vitest.dev/)** (test runner), both available as dev-only dependencies. The application itself retains zero runtime dependencies.

Alternatively, if zero dev-dependencies is preferred, a self-contained test harness using `fast-check` via a CDN in a separate `test.html` page can be used.

### Property-Based Tests

Each property-based test corresponds to a numbered correctness property above. Test configuration:

- Minimum 100 iterations per property (fast-check default is 100).
- Each test is tagged with a comment referencing its design property.
- Tag format: `// Feature: todo-life-dashboard, Property N: <property title>`

| Property | Module | Generator Inputs |
|---|---|---|
| P1 — Timer display formatting | FocusTimerWidget | Integer in [0, 1500] |
| P2 — Date string formatting | GreetingWidget | Random `Date` objects (year 2000–2100) |
| P3 — Greeting correctness | GreetingWidget | Integer in [0, 23] |
| P4 — Stop preserves time | FocusTimerWidget | Integer in [1, 1500] |
| P5 — Reset always resets | FocusTimerWidget | State enum × Integer [0, 1500] |
| P6 — Valid task addition | TodoListWidget | Non-empty string [1, 500 chars] × existing task array |
| P7 — Invalid task rejection | TodoListWidget | Empty strings, whitespace strings, strings > 500 chars |
| P8 — Edit updates description | TodoListWidget | Existing task × valid new description string |
| P9 — Toggle round-trip | TodoListWidget | Task with random boolean `completed` |
| P10 — Delete removes item | TodoListWidget / QuickLinksWidget | Non-empty array × valid id in array |
| P11 — Serialisation round-trip | StorageUtil | Array of Task objects / Link objects |
| P12 — Valid link addition | QuickLinksWidget | Valid label [1, 100] × valid URL |
| P13 — URL normalisation | QuickLinksWidget | Arbitrary strings × strings starting with http/https |
| P14 — Invalid link rejection | QuickLinksWidget | Empty labels, labels > 100 chars, URLs > 2048 chars |

### Unit / Example Tests

Unit tests cover scenarios that are not universal properties:

- Timer initialises to 25:00 (2.1)
- Start control disables itself and enables Stop while RUNNING (2.3)
- Start at 00:00 does nothing (2.9, edge case)
- Countdown reaching 00:00 shows notification (2.7)
- Edit flow renders pre-populated input field (3.3)
- LocalStorage unavailability shows error banner (3.11, 4.11)
- Invalid JSON in storage initialises to [] and calls console.error (5.4)
- QuotaExceededError on write shows toast (5.5)
- `window.open` called with correct URL and `_blank` target on link click (4.6)

### Accessibility and Visual Tests

- Manual review against WCAG AA contrast ratios.
- Keyboard navigation test: all controls reachable and operable via Tab + Enter/Space.
- Screen reader test: `role="alert"` elements announced correctly.
- Responsive layout test: verify 2-column layout at 768px+ and single-column below.

### Test File Location

All automated tests reside in `js/app.test.js` (or a sibling `test/` directory), keeping the production `js/app.js` free of test code.


---

## Feature Extensions

The following sections extend the original design to cover three new features added after the initial implementation: Light/Dark Mode (Requirement 8), Custom Name in Greeting (Requirement 9), and Prevent Duplicate Tasks (Requirement 10).

---

### Feature 8: Light/Dark Mode Theme Toggle

#### CSS Strategy

Dark mode is implemented via a single class toggle on `<body>`. All dark-mode colour overrides are scoped under `.dark-mode` in `css/styles.css`. This keeps the HTML clean and makes the theme completely reversible with one DOM mutation.

```css
/* Default (light) values on :root or body */
body {
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --card-bg: #f5f5f5;
  /* …other tokens… */
}

/* Dark overrides — all scoped to a single class */
body.dark-mode {
  --bg-color: #1a1a1a;
  --text-color: #f0f0f0;
  --card-bg: #2c2c2c;
  /* …other tokens… */
}
```

Using CSS custom properties (variables) as the token layer means every widget inherits the theme automatically — no per-widget JS changes are needed.

#### localStorage Key

| Key             | Value            | Owner              |
|-----------------|------------------|--------------------|
| `tld_theme`     | `"dark"` or `""` | ThemeToggle module |

Storing `"dark"` (truthy) vs an empty string or `null` (falsy) keeps the logic simple. On load, any truthy value restores dark mode.

#### Flash Prevention

The theme class must be applied before the browser paints. The safest client-side approach without a build step is to inline a tiny `<script>` in `<head>` (before `<body>` content) that reads `localStorage.getItem('tld_theme')` and conditionally adds the class immediately:

```html
<head>
  <!-- …meta, link… -->
  <script>
    (function() {
      if (localStorage.getItem('tld_theme') === 'dark') {
        document.documentElement.classList.add('dark-mode');
      }
    })();
  </script>
</head>
```

This runs synchronously before any rendering. The class is applied to `<html>` (documentElement) at this point, so CSS rules must also target `html.dark-mode body` or the class is moved to `<body>` once `DOMContentLoaded` fires (handled in `ThemeToggle.init()`).

**Design decision:** Apply to `<body>` via `ThemeToggle.init()` at runtime. The inline script applies to `<html>` only to suppress flash; `init()` normalises it onto `<body>` on load.

#### ThemeToggle Module Interface

```js
ThemeToggle = {
  STORAGE_KEY: 'tld_theme',
  init()         → void,  // reads saved preference, applies class, wires button
  _apply(dark)   → void,  // toggles body.dark-mode class and updates aria-label
  _toggle()      → void,  // flips current state, persists, calls _apply
  _persist(dark) → void   // writes 'dark' or '' to localStorage
}
```

#### HTML Addition

A single toggle button added to the page header (or a fixed position element):

```html
<button id="theme-toggle" aria-label="Switch to dark mode">🌙 Dark Mode</button>
```

The `aria-label` is updated by `_apply()` to read "Switch to dark mode" (when light is active) or "Switch to light mode" (when dark is active).

---

### Feature 9: Custom Name in Greeting

#### Data Model Addition

```js
// localStorage key: tld_username
// Value: a string of 1–50 characters (trimmed), or null if never set
```

| Key              | Value Type | Owner           |
|------------------|------------|-----------------|
| `tld_username`   | JSON string (or raw string) | GreetingWidget |

The name is stored as a plain string (not wrapped in an object) since it is a single scalar value.

#### Personalised Greeting Format

```
No name saved:  "Good Morning"
Name saved:     "Good Morning, Alex!"
```

The exclamation mark and comma are appended by the rendering layer, not stored. `_buildGreeting(hour, name)` returns the formatted string.

```js
function _buildGreeting(hour, name) {
  const base = _getGreeting(hour);
  return name ? `${base}, ${name}!` : base;
}
```

#### Name Validation Rules

| Condition                                | Action                          |
|------------------------------------------|---------------------------------|
| Empty or whitespace-only after trim      | Reject; show validation message |
| Trimmed length > 50 characters           | Reject; show validation message |
| Valid (1–50 non-empty trimmed characters)| Accept; persist and render      |

#### Updated GreetingWidget Interface

New methods added to the existing `GreetingWidget` object:

```js
GreetingWidget = {
  // … existing methods unchanged …
  _loadName()                → string | null   // reads tld_username from localStorage
  _saveName(name)            → void            // writes trimmed name to localStorage
  _validateName(name)        → {ok, error}     // pure validation function
  _showNamePrompt()          → void            // reveals #greeting-name-form
  _hideNamePrompt()          → void            // hides #greeting-name-form
  _buildGreeting(hour, name) → string          // pure: constructs full greeting string
}
```

`_render()` is updated to call `_buildGreeting(hour, _loadName())` instead of `_getGreeting(hour)` directly.

#### HTML Additions inside `#greeting-widget`

```html
<p id="greeting-message"></p>  <!-- existing; now shows personalised greeting -->

<div id="greeting-name-form">
  <input id="greeting-name-input" type="text" maxlength="50" placeholder="Enter your name…">
  <button id="greeting-name-submit">Save</button>
  <button id="greeting-name-cancel" hidden>Cancel</button>
  <p id="greeting-name-error" role="alert" hidden></p>
</div>

<button id="greeting-name-edit" hidden>✏️ Edit name</button>
```

- On first load (no name): `#greeting-name-form` is visible, `#greeting-name-cancel` is hidden (nothing to cancel), `#greeting-name-edit` is hidden.
- After name is set: `#greeting-name-form` is hidden, `#greeting-name-edit` is visible.
- When editing: `#greeting-name-form` is revealed pre-populated, `#greeting-name-cancel` becomes visible.

---

### Feature 10: Prevent Duplicate Tasks

#### Duplicate-Check Algorithm

The duplicate check runs inside `_validate(desc, currentTaskId?)` and uses a case-insensitive comparison against all stored tasks. The optional `currentTaskId` parameter is supplied during edit operations to exclude the task being edited from the comparison (self-match exemption).

```
function _isDuplicate(trimmedDesc, currentTaskId):
  lowerDesc = trimmedDesc.toLowerCase()
  for each task in tasks[]:
    if task.id === currentTaskId: continue   // self-match exemption
    if task.description.toLowerCase() === lowerDesc: return true
  return false
```

#### Updated `_validate` Signature

```js
_validate(desc, currentTaskId = null) → {ok, error}
```

When `currentTaskId` is `null` (add operation), all existing tasks are checked. When `currentTaskId` is a task's `id` (edit operation), that task is excluded.

#### Updated CRUD Callers

| Caller        | `currentTaskId` argument |
|---------------|--------------------------|
| `_addTask`    | `null` (no exemption)    |
| `_editTask`   | `id` of the task being edited |

No other parts of the data model or storage schema change — duplicate prevention is a pure in-memory validation step with no storage impact.

#### Error Messages

| Scenario         | Message                                             |
|------------------|-----------------------------------------------------|
| Add duplicate    | "A task with this description already exists."      |
| Edit duplicate   | "Another task with this description already exists."|

---

## Additional Correctness Properties

*The following properties extend the Correctness Properties section to cover Requirements 8, 9, and 10.*

---

### Property 15: Theme toggle is idempotent over two activations

*For any* initial theme state (light or dark), calling `_toggle()` twice SHALL return the `<body>` element's class list and the value in `localStorage` to their original state.

**Validates: Requirements 8.2, 8.7**

---

### Property 16: Theme toggle persists the correct value

*For any* initial theme state, calling `_toggle()` SHALL write the new (opposite) theme identifier to `localStorage`, such that `localStorage.getItem('tld_theme')` equals `"dark"` when dark mode is active and `""` or `null` when light mode is active.

**Validates: Requirements 8.4**

---

### Property 17: Theme toggle updates aria-label to reflect active theme

*For any* theme state (light or dark), `_apply(dark)` SHALL set the toggle button's `aria-label` to `"Switch to light mode"` when `dark` is `true`, and to `"Switch to dark mode"` when `dark` is `false`.

**Validates: Requirements 8.8**

---

### Property 18: Personalised greeting includes the stored name

*For any* valid name string (1–50 non-empty characters) and any hour in 0–23, `_buildGreeting(hour, name)` SHALL return a string that starts with the correct base greeting for that hour and contains the name followed by an exclamation mark (e.g. `"Good Morning, Alex!"`).

**Validates: Requirements 9.3, 9.5, 9.7**

---

### Property 19: Invalid names are always rejected by name validation

*For any* string that is empty, composed entirely of whitespace, or longer than 50 characters, `_validateName(name)` SHALL return `{ ok: false }` with a non-empty `error` message, and the stored name in `localStorage` SHALL remain unchanged.

**Validates: Requirements 9.4, 9.8**

---

### Property 20: Duplicate task descriptions are always rejected

*For any* non-empty task list and any new description that, after trimming and lower-casing, matches any existing task's description, `_validate(desc, null)` SHALL return `{ ok: false }`, and the `tasks[]` array SHALL remain unchanged regardless of the matching task's completion state.

**Validates: Requirements 10.1, 10.6**

---

### Property 21: Editing a task to its own description is not rejected (self-match exemption)

*For any* existing task, calling `_validate(task.description, task.id)` SHALL return `{ ok: true }`, confirming that editing a task to its own current description is always permitted.

**Validates: Requirements 10.5**

---

### Property 22: Editing a task to match a different task's description is rejected

*For any* task list with at least two tasks and any edit where the new description (after trimming and lower-casing) matches a different task's description, `_validate(newDesc, editedTask.id)` SHALL return `{ ok: false }`.

**Validates: Requirements 10.3**

---

## Updated Testing Strategy Additions

### New Property-Based Tests (Properties 15–22)

| Property | Module | Generator Inputs |
|---|---|---|
| P15 — Theme toggle round-trip | ThemeToggle | Boolean initial state (light/dark) |
| P16 — Theme persists correct value | ThemeToggle | Boolean initial state |
| P17 — aria-label reflects active theme | ThemeToggle | Boolean `dark` flag |
| P18 — Personalised greeting format | GreetingWidget | Valid name string [1–50] × Integer [0–23] |
| P19 — Invalid name rejection | GreetingWidget | Empty strings, whitespace strings, strings > 50 chars |
| P20 — Duplicate add rejected | TodoListWidget | Non-empty task array × description matching existing task |
| P21 — Self-match not rejected | TodoListWidget | Any existing task |
| P22 — Edit to other's description rejected | TodoListWidget | Task list ≥ 2 tasks × new desc matching a different task |

### New Unit / Example Tests

- Theme defaults to light when no `tld_theme` key in localStorage (8.3)
- Dark mode class applied on load when `tld_theme === "dark"` (8.5)
- No-name state shows prompt on first load (9.1, 9.2)
- Name form hidden and edit button visible after name is set (9.5, 9.6)
- Cancel edit discards changes and restores original greeting (9.9)
- `tld_username` key used for name storage (9.10)
- Duplicate rejection message retains input text (10.2)
- Edit duplicate rejection message retains edit field text (10.4)
