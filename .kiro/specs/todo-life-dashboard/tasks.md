# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a fully client-side, single-page web application with four productivity widgets (Greeting, Focus Timer, To-Do List, Quick Links), all persisted via `localStorage`. The project has no build step, no framework, and no external runtime dependencies. Implementation follows the module architecture defined in the design document.

---

## Tasks

- [x] 1. Scaffold project file structure and set up testing framework
  - Create `index.html`, `css/styles.css`, and `js/app.js` as empty files
  - Create `js/app.test.js` for automated tests
  - Add `package.json` with `vitest` and `fast-check` as dev dependencies
  - Add a `vitest.config.js` (or inline config) pointing to the `js/` directory
  - _Requirements: 6.2, 6.3, 7.2, 7.4_

- [x] 2. Build the HTML skeleton
  - [x] 2.1 Write the complete `index.html` markup
    - Add `<!DOCTYPE html>`, `<meta charset>`, viewport meta tag, and `<title>Life Dashboard</title>`
    - Link `css/styles.css` in `<head>` and `js/app.js` as last `<body>` child
    - Add `<main class="dashboard-grid">` containing four `<section>` elements: `#greeting-widget`, `#focus-timer-widget`, `#todo-list-widget`, `#quick-links-widget`
    - Each section must include an `<h2>` heading (e.g. "Focus Timer", "My Tasks", "Quick Links")
    - Add timer display, controls, and `<div id="timer-notification" hidden>` with dismiss button
    - Add todo `<form id="todo-form">`, `<input id="todo-input" maxlength="500">`, `<p id="todo-error" role="alert" hidden>`, and `<ul id="todo-list">`
    - Add links `<form id="links-form">`, label/URL inputs, `<p id="links-error" role="alert" hidden>`, and `<div id="links-list">`
    - Add `<div id="storage-error-toast" hidden>` for quota error notifications
    - _Requirements: 6.1, 6.4, 7.2_

- [x] 3. Implement CSS styling
  - [x] 3.1 Write base styles and responsive grid layout in `css/styles.css`
    - Set `body` font size to minimum 16px
    - Implement `.dashboard-grid` as a 2-column CSS grid with `gap: 1.5rem` for viewports ≥ 768px
    - Add `@media (max-width: 767px)` rule to collapse grid to a single column
    - Style widget cards with visible borders/backgrounds to create clear visual hierarchy
    - _Requirements: 6.2, 6.5, 6.6, 6.7_

  - [x] 3.2 Style each widget and interactive controls
    - Style `#greeting-widget` time display at `2rem+` font size for quick readability
    - Style `#timer-display` prominently; style button enabled/disabled states visually
    - Style `#timer-notification` as a visible overlay/banner (hidden by default via CSS)
    - Style completed tasks with `text-decoration: line-through` for visual distinction
    - Style validation error paragraphs (`#todo-error`, `#links-error`) with a distinct colour
    - Add visible focus outlines for all `<button>` and `<input>` elements
    - Style `#storage-error-toast` as a fixed/sticky visible banner
    - Add `aria-label` attribute stubs in CSS comment for edit/delete icon buttons (to be wired in JS)
    - _Requirements: 3.6, 6.4, 6.5_

- [x] 4. Implement `StorageUtil` in `js/app.js`
  - [x] 4.1 Write the `StorageUtil` module
    - Implement `StorageUtil.read(key)`: calls `localStorage.getItem`, parses JSON, validates it is an array, returns `[]` and calls `console.error` on parse failure or non-array result
    - Implement `StorageUtil.write(key, arr)`: calls `JSON.stringify` + `localStorage.setItem`, catches `QuotaExceededError` and calls `showStorageFullToast()`, logs all other errors via `console.error`
    - Implement `showStorageFullToast()` helper to reveal `#storage-error-toast` with an appropriate message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 4.2 Write property test for StorageUtil serialisation round-trip
    - **Property 11: Serialisation is a round-trip**
    - **Validates: Requirements 3.8, 3.9, 4.8, 4.9, 5.2, 5.3**
    - Use `fc.array(fc.record({ id: fc.string(), description: fc.string(), completed: fc.boolean(), createdAt: fc.integer() }))` as generator
    - `// Feature: todo-life-dashboard, Property 11: Serialisation is a round-trip`

- [x] 5. Implement `GreetingWidget` in `js/app.js`
  - [x] 5.1 Implement `GreetingWidget._getGreeting(hour)` and `GreetingWidget._render()`
    - Write `_getGreeting(h)` pure function mapping hour 0–23 to `"Good Morning"` / `"Good Afternoon"` / `"Good Evening"` / `"Good Night"` per the design table
    - Write `_render()` to read `new Date()`, format time as `HH:MM` (24-hour, zero-padded), format date as `DayOfWeek, Month DD, YYYY` via `Intl.DateTimeFormat` or manual day/month arrays, call `_getGreeting`, and update `#greeting-time`, `#greeting-date`, `#greeting-message` DOM elements
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 5.2 Implement `GreetingWidget.init()` with minute-aligned scheduling
    - Implement `init()`: call `_render()` immediately, then compute `msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()`, set a one-shot `setTimeout` that calls `_render()` and then starts a `setInterval(_render, 60_000)`
    - _Requirements: 1.1, 1.8_

  - [ ]* 5.3 Write property tests for GreetingWidget
    - **Property 3: Greeting correctness** — generator `fc.integer({ min: 0, max: 23 })`; assert return value is exactly one of the four greeting strings with the correct hour mapping
    - **Property 2: Date string formatting** — generator `fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })`; assert output matches pattern `DayOfWeek, Month DD, YYYY`
    - `// Feature: todo-life-dashboard, Property 3: Greeting correctness`
    - `// Feature: todo-life-dashboard, Property 2: Date string formatting`
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 6. Implement `FocusTimerWidget` in `js/app.js`
  - [x] 6.1 Implement timer state machine and helper functions
    - Define constants: `TIMER_DURATION = 1500`, states `IDLE | RUNNING | PAUSED | COMPLETE`
    - Implement `_formatTimerDisplay(remainingSeconds)` returning zero-padded `MM:SS` string
    - Implement `_render()` to update `#timer-display` text and set button `disabled` states per the design state/control table
    - Implement `_notify()` to remove `hidden` attribute from `#timer-notification`; implement `_dismiss()` to restore it
    - _Requirements: 2.1, 2.3, 2.6, 2.7_

  - [x] 6.2 Implement timer control handlers `_start()`, `_stop()`, `_reset()`, `_tick()`
    - `_start()`: guard against COMPLETE or `remainingSeconds === 0`; set state to RUNNING; start `setInterval(_tick, 1000)`; call `_render()`
    - `_tick()`: decrement `remainingSeconds`; if `<= 0` clear interval, set state to COMPLETE, call `_notify()`; call `_render()`
    - `_stop()`: clear interval; set state to PAUSED; call `_render()`
    - `_reset()`: clear interval; set `remainingSeconds = TIMER_DURATION`; set state to IDLE; call `_dismiss()`; call `_render()`
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 6.3 Wire timer button event listeners in `FocusTimerWidget.init()`
    - Attach click listeners on `#timer-start` → `_start()`, `#timer-stop` → `_stop()`, `#timer-reset` → `_reset()`, `#timer-dismiss` → `_dismiss()`
    - Call `_render()` at end of `init()` to set initial button states
    - _Requirements: 2.1, 2.3_

  - [ ]* 6.4 Write property tests for FocusTimerWidget
    - **Property 1: Time display formatting** — generator `fc.integer({ min: 0, max: 1500 })`; assert `MM * 60 + SS === remainingSeconds` and result matches `MM:SS` pattern
    - **Property 4: Stop preserves remaining time** — generator `fc.integer({ min: 1, max: 1500 })`; set state RUNNING, call `_stop()`, assert `remainingSeconds` unchanged and state is PAUSED
    - **Property 5: Reset always returns to initial state** — generator state enum × `fc.integer({ min: 0, max: 1500 })`; call `_reset()`, assert `remainingSeconds === 1500`, `state === IDLE`, Start enabled, Stop disabled
    - `// Feature: todo-life-dashboard, Property 1: Time display formatting`
    - `// Feature: todo-life-dashboard, Property 4: Stop preserves remaining time`
    - `// Feature: todo-life-dashboard, Property 5: Reset always returns to initial state`
    - **Validates: Requirements 2.2, 2.4, 2.6**

- [x] 7. Checkpoint — Ensure all tests pass for StorageUtil, GreetingWidget, and FocusTimerWidget
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement `TodoListWidget` in `js/app.js`
  - [x] 8.1 Implement task validation and CRUD functions
    - Implement `_validate(desc)`: returns `{ ok: true }` for trimmed length 1–500; returns `{ ok: false, error: '...' }` for empty/whitespace-only or > 500 chars
    - Implement `generateId()` helper: use `crypto.randomUUID()` with `Date.now().toString(36) + Math.random().toString(36).slice(2)` as fallback
    - Implement `_addTask(description)`: validate, create Task object `{ id, description: trimmed, completed: false, createdAt: Date.now() }`, push to `tasks[]`, call `_persist()` and `_render()`
    - Implement `_editTask(id, newDesc)`: validate, update matching task's `description` (trim), leave `id`/`completed`/`createdAt` unchanged, call `_persist()` and `_render()`
    - Implement `_toggleComplete(id)`: flip `completed` boolean on matching task, call `_persist()` and `_render()`
    - Implement `_deleteTask(id)`: filter out matching task, call `_persist()` and `_render()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 8.2 Implement `TodoListWidget._render()` and `_load()`
    - Implement `_load()`: call `StorageUtil.read('tld_tasks')`, assign to `tasks[]`, call `_render()`; if storage unavailable show persistence-unavailable banner
    - Implement `_render()`: clear `<ul id="todo-list">`, iterate `tasks[]` in insertion order, create `<li>` for each task with: description span (strikethrough class when `completed`), edit button with `aria-label="Edit task"`, complete button with `aria-label="Toggle complete"`, delete button with `aria-label="Delete task"`
    - Edit flow: clicking edit replaces description span with a pre-populated `<input maxlength="500">`; "Save" / Enter confirms; "Cancel" / Escape discards without mutation
    - Show `#todo-error` with message on validation failure; clear it on successful submission
    - _Requirements: 3.1, 3.3, 3.6, 3.9, 3.10, 3.11_

  - [x] 8.3 Wire todo form submission in `TodoListWidget.init()`
    - Attach `submit` listener on `#todo-form`: prevent default, call `_addTask(input.value)`, clear input on success
    - Call `_load()` at start of `init()`
    - _Requirements: 3.1, 3.2, 3.9_

  - [ ]* 8.4 Write property tests for TodoListWidget
    - **Property 6: Valid task addition increases list size** — generator `fc.string({ minLength: 1, maxLength: 500 })` filtered to non-whitespace-only; assert `tasks.length` increases by 1, new task has trimmed description and `completed === false`
    - **Property 7: Invalid task descriptions are always rejected** — generators: `fc.constant('')`, `fc.string().filter(s => s.trim() === '')`, `fc.string({ minLength: 501 })`; assert `_validate()` returns `{ ok: false }` and `tasks[]` is unchanged
    - **Property 8: Edit correctly updates a task's description** — generator existing task × valid new description; assert only `description` field changes
    - **Property 9: Completion toggle is a round-trip** — generator task with random `completed`; assert double-toggle restores original value
    - **Property 10: Delete removes the target item** — generator non-empty tasks array × valid id; assert item gone and length decreases by 1
    - `// Feature: todo-life-dashboard, Property 6: Valid task addition increases list size`
    - `// Feature: todo-life-dashboard, Property 7: Invalid task descriptions are always rejected`
    - `// Feature: todo-life-dashboard, Property 8: Edit correctly updates a task's description`
    - `// Feature: todo-life-dashboard, Property 9: Completion toggle is a round-trip`
    - `// Feature: todo-life-dashboard, Property 10: Delete removes the target item`
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 3.7**

- [x] 9. Implement `QuickLinksWidget` in `js/app.js`
  - [x] 9.1 Implement link validation and URL normalisation
    - Implement `_normaliseUrl(url)`: if URL does not start with `http://` or `https://`, prepend `https://`; return normalised string unchanged otherwise
    - Implement `_validateLabel(label)`: returns `{ ok: false, error }` for empty or > 100 chars; `{ ok: true }` otherwise
    - Implement `_validateUrl(url)`: takes the already-normalised URL; returns `{ ok: false, error }` if length > 2048 or URL contains characters invalid per URL spec; `{ ok: true }` otherwise
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 9.2 Implement link CRUD functions and `_render()`
    - Implement `_addLink(label, url)`: validate label, normalise URL, validate normalised URL, create Link object `{ id, label: trimmed, url: normalised }`, push to `links[]`, call `_persist()` and `_render()`
    - Implement `_deleteLink(id)`: filter out matching link, call `_persist()` and `_render()`
    - Implement `_render()`: clear `#links-list`, iterate `links[]`, create a `<button>` (or `<a target="_blank">`) per link that calls `window.open(url, '_blank', 'noopener,noreferrer')` on click, plus a delete button with `aria-label="Delete link"`
    - Implement `_load()`: call `StorageUtil.read('tld_links')`, assign to `links[]`, call `_render()`; on storage failure show inline message in `#links-list`
    - Show `#links-error` with message on validation failure; clear it on successful submission
    - _Requirements: 4.1, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 9.3 Wire links form submission in `QuickLinksWidget.init()`
    - Attach `submit` listener on `#links-form`: prevent default, call `_addLink(labelInput.value, urlInput.value)`, clear both inputs on success
    - Call `_load()` at start of `init()`
    - _Requirements: 4.1, 4.9_

  - [ ]* 9.4 Write property tests for QuickLinksWidget
    - **Property 12: Valid link addition increases list size** — generator valid label [1–100] × valid normalised URL; assert `links.length` increases by 1, new link has correct `label` and `url`
    - **Property 13: URL normalisation prepends https://** — two generators: strings not starting with `http://`/`https://` (assert `"https://" + url` returned) and strings already starting with either (assert unchanged)
    - **Property 14: Invalid link submissions are always rejected** — generators: empty labels, labels > 100 chars, URLs > 2048 chars after normalisation; assert `_validateLabel()` or `_validateUrl()` returns `{ ok: false }` and `links[]` unchanged
    - **Property 10: Delete removes the target item** (links side) — generator non-empty links array × valid id; assert item gone and length decreases by 1
    - `// Feature: todo-life-dashboard, Property 12: Valid link addition increases list size`
    - `// Feature: todo-life-dashboard, Property 13: URL normalisation prepends https://`
    - `// Feature: todo-life-dashboard, Property 14: Invalid link submissions are always rejected`
    - `// Feature: todo-life-dashboard, Property 10: Delete removes the target item`
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.7**

- [x] 10. Checkpoint — Ensure all tests pass for TodoListWidget and QuickLinksWidget
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire all modules together in `init()` and finalise `js/app.js`
  - [x] 11.1 Implement the top-level `init()` bootstrap function
    - Add a `DOMContentLoaded` listener at the bottom of `app.js` that calls `StorageUtil` setup (no-op), then `GreetingWidget.init()`, `FocusTimerWidget.init()`, `TodoListWidget.init()`, `QuickLinksWidget.init()` in order
    - Verify no global variable leakage: all module objects use `const` or are wrapped in an IIFE
    - _Requirements: 1.8, 3.9, 4.9, 7.1, 7.3_

  - [ ]* 11.2 Write unit tests for integration and edge cases
    - Timer initialises to 25:00 on page load (2.1)
    - Start disables itself and enables Stop while RUNNING (2.3)
    - Start at 00:00 does nothing and Start remains disabled (2.9)
    - Countdown reaching 00:00 shows `#timer-notification` (2.7)
    - Edit flow renders pre-populated `<input>` (3.3)
    - `localStorage` unavailability shows persistence-unavailable banner (3.11, 4.11)
    - Invalid JSON in storage initialises to `[]` and calls `console.error` (5.4)
    - `QuotaExceededError` on write shows `#storage-error-toast` (5.5)
    - `window.open` called with correct URL and `_blank` target on link click (4.6)
    - _Requirements: 2.1, 2.3, 2.7, 2.9, 3.3, 3.11, 4.6, 4.11, 5.4, 5.5_

- [x] 12. Final checkpoint — Verify full implementation
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify the page opens correctly as a `file://` URL in a modern browser
  - Confirm 2-column layout at ≥ 768px and single-column layout below 768px

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 10, and 12 ensure incremental validation
- Property tests validate universal correctness properties; unit tests cover specific scenarios and edge cases
- The `fast-check` and `vitest` packages are dev-only — they do not add runtime dependencies to the application
- All four modules should be defined before `init()` in `app.js` to avoid reference errors at bootstrap

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.4"] },
    { "id": 5, "tasks": ["6.3", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.4"] },
    { "id": 7, "tasks": ["8.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.4"] },
    { "id": 9, "tasks": ["9.3"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2"] }
  ]
}
```

---

## Feature Extension Tasks

The following tasks implement the three new features described in Requirements 8, 9, and 10.

---

- [ ] 13. Implement Light/Dark Mode Theme Toggle
  - [ ] 13.1 Add CSS custom property tokens and `.dark-mode` overrides in `css/styles.css`
    - Define CSS custom properties (`--bg-color`, `--text-color`, `--card-bg`, `--border-color`, `--input-bg`, etc.) on the `body` element for the light theme defaults
    - Add `body.dark-mode { … }` block that overrides each custom property with dark-theme values
    - Replace all hard-coded colour values in existing widget styles with `var(--*)` references so they inherit the active theme automatically
    - _Requirements: 8.2, 8.6_

  - [ ] 13.2 Add the theme toggle button to `index.html` and the flash-prevention inline script
    - Add `<button id="theme-toggle" aria-label="Switch to dark mode">🌙 Dark Mode</button>` to a header or fixed position element visible at all viewport sizes
    - Add an inline `<script>` in `<head>` (before `<link rel="stylesheet">`) that reads `localStorage.getItem('tld_theme')` and immediately adds `dark-mode` class to `document.documentElement` if the value is `"dark"`, preventing a flash of unstyled/wrong-theme content
    - _Requirements: 8.1, 8.5_

  - [ ] 13.3 Implement the `ThemeToggle` module in `js/app.js`
    - Define `ThemeToggle` object with `STORAGE_KEY = 'tld_theme'`
    - Implement `_apply(dark)`: adds/removes `dark-mode` class on `document.body`; updates `#theme-toggle` `aria-label` to `"Switch to light mode"` when dark is active, `"Switch to dark mode"` otherwise
    - Implement `_toggle()`: reads current state from `document.body.classList`, flips it, calls `_persist()` and `_apply()`
    - Implement `_persist(dark)`: writes `"dark"` or `""` to `localStorage` via `StorageUtil.write` (or direct `localStorage.setItem` since the value is a scalar)
    - Implement `init()`: reads saved preference, normalises the `dark-mode` class onto `document.body` (from `document.documentElement` set by inline script), wires `#theme-toggle` click listener to `_toggle()`
    - Call `ThemeToggle.init()` inside the top-level `DOMContentLoaded` bootstrap (after other widget inits)
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [ ]* 13.4 Write property tests for ThemeToggle
    - **Property 15: Theme toggle is idempotent over two activations** — generator: boolean initial dark state; apply state, call `_toggle()` twice, assert body class list and localStorage value match original
    - **Property 16: Theme toggle persists the correct value** — generator: boolean initial state; call `_toggle()`, assert `localStorage.getItem('tld_theme')` equals `"dark"` iff new state is dark
    - **Property 17: aria-label reflects active theme** — generator: boolean `dark` flag; call `_apply(dark)`, assert aria-label equals `"Switch to light mode"` when dark, `"Switch to dark mode"` otherwise
    - `// Feature: todo-life-dashboard, Property 15: Theme toggle is idempotent over two activations`
    - `// Feature: todo-life-dashboard, Property 16: Theme toggle persists the correct value`
    - `// Feature: todo-life-dashboard, Property 17: aria-label reflects active theme`
    - **Validates: Requirements 8.2, 8.4, 8.7, 8.8**

- [ ] 14. Implement Custom Name in Greeting Widget
  - [ ] 14.1 Add name prompt HTML elements inside `#greeting-widget` in `index.html`
    - Add `<div id="greeting-name-form">` containing: `<input id="greeting-name-input" type="text" maxlength="50" placeholder="Enter your name…">`, `<button id="greeting-name-submit">Save</button>`, `<button id="greeting-name-cancel" hidden>Cancel</button>`, and `<p id="greeting-name-error" role="alert" hidden></p>`
    - Add `<button id="greeting-name-edit" hidden>✏️ Edit name</button>` after the form div
    - _Requirements: 9.2, 9.6_

  - [ ] 14.2 Implement name validation and storage helpers in `GreetingWidget`
    - Implement `_validateName(name)`: returns `{ ok: true }` for trimmed length 1–50; returns `{ ok: false, error: '...' }` for empty/whitespace-only or length > 50 characters
    - Implement `_loadName()`: calls `localStorage.getItem('tld_username')`, returns the string if truthy, else `null`
    - Implement `_saveName(name)`: writes trimmed name to `localStorage.setItem('tld_username', name.trim())`
    - Implement `_buildGreeting(hour, name)`: returns `_getGreeting(hour) + ', ' + name + '!'` when name is non-null/non-empty, otherwise returns `_getGreeting(hour)` unchanged
    - Update `GreetingWidget._render()` to call `_buildGreeting(hour, _loadName())` for the greeting text instead of calling `_getGreeting(hour)` directly
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.7, 9.8, 9.10_

  - [ ] 14.3 Implement name prompt show/hide logic and event wiring in `GreetingWidget.init()`
    - Implement `_showNamePrompt(editMode)`: removes `hidden` from `#greeting-name-form`; if `editMode` is true, pre-populate `#greeting-name-input` with `_loadName()` and show `#greeting-name-cancel`; if false, clear input and hide cancel button; hide `#greeting-name-edit`
    - Implement `_hideNamePrompt()`: adds `hidden` to `#greeting-name-form`, shows `#greeting-name-edit` if a name is saved, clears `#greeting-name-error`
    - Wire `#greeting-name-submit` click: call `_validateName(input.value)`; on success call `_saveName()`, call `_hideNamePrompt()`, call `_render()`; on failure show `#greeting-name-error` with message
    - Wire `#greeting-name-cancel` click: call `_hideNamePrompt()` with no state change
    - Wire `#greeting-name-edit` click: call `_showNamePrompt(true)`
    - On `init()`, call `_loadName()`; if null call `_showNamePrompt(false)`; else call `_hideNamePrompt()`, then call `_render()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 14.4 Write property tests for GreetingWidget name feature
    - **Property 18: Personalised greeting includes the stored name** — generator `fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)` × `fc.integer({ min: 0, max: 23 })`; assert `_buildGreeting(hour, name)` starts with the correct base greeting and contains `, <name>!`
    - **Property 19: Invalid names are always rejected** — generators: `fc.constant('')`, `fc.string().filter(s => s.trim() === '')`, `fc.string({ minLength: 51 })`; assert `_validateName()` returns `{ ok: false }` and localStorage is unchanged
    - `// Feature: todo-life-dashboard, Property 18: Personalised greeting includes the stored name`
    - `// Feature: todo-life-dashboard, Property 19: Invalid names are always rejected`
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.7, 9.8**

- [ ] 15. Implement Prevent Duplicate Tasks
  - [ ] 15.1 Update `TodoListWidget._validate()` to accept a `currentTaskId` parameter and perform duplicate checking
    - Change `_validate(desc)` signature to `_validate(desc, currentTaskId = null)`
    - Add `_isDuplicate(trimmedDesc, currentTaskId)` helper: iterates `tasks[]`, skips the task whose `id === currentTaskId`, returns `true` if any remaining task's `description.toLowerCase() === trimmedDesc.toLowerCase()`
    - In `_validate()`, after the existing length/whitespace checks pass, call `_isDuplicate(trimmedDesc, currentTaskId)`; if it returns `true`, return `{ ok: false, error: 'A task with this description already exists.' }`
    - _Requirements: 10.1, 10.2, 10.5, 10.6_

  - [ ] 15.2 Update `_addTask()` and `_editTask()` callers to pass `currentTaskId`
    - Update `_addTask(description)`: pass `null` as `currentTaskId` to `_validate()` (no self-exemption needed for new tasks)
    - Update `_editTask(id, newDesc)`: pass the task's `id` as `currentTaskId` to `_validate()` so the task being edited is excluded from the duplicate check
    - Update error display in the edit flow to show `#todo-error` (or an inline edit-field error) with the returned `error` message when `_validate()` returns `{ ok: false }`, retaining the current text in the edit input field
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ]* 15.3 Write property tests for duplicate task prevention
    - **Property 20: Duplicate task descriptions are always rejected** — generator: `fc.array(taskRecord, { minLength: 1 })`; pick a random existing task description (with optional whitespace padding and random casing variation); call `_validate(desc, null)`; assert `{ ok: false }` and `tasks[]` unchanged
    - **Property 21: Self-match not rejected** — generator: any existing task; call `_validate(task.description, task.id)`; assert `{ ok: true }`
    - **Property 22: Edit to other's description rejected** — generator: `fc.array(taskRecord, { minLength: 2 })`; pick two distinct tasks; call `_validate(task2.description, task1.id)`; assert `{ ok: false }`
    - `// Feature: todo-life-dashboard, Property 20: Duplicate task descriptions are always rejected`
    - `// Feature: todo-life-dashboard, Property 21: Self-match not rejected`
    - `// Feature: todo-life-dashboard, Property 22: Edit to other task's description rejected`
    - **Validates: Requirements 10.1, 10.3, 10.5, 10.6**

- [ ] 16. Checkpoint — Ensure all new feature tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify theme persists across simulated page reload (clear body class, call `ThemeToggle.init()`, assert class restored)
  - Verify personalised greeting renders correctly in browser after entering a name
  - Verify duplicate task rejection fires for both add and edit flows

---

## Updated Task Dependency Graph

The graph below extends the original, covering only the new leaf tasks (13.1–15.3). Waves continue from where the original graph ended (last wave ID was 11).

```json
{
  "waves": [
    { "id": 12, "tasks": ["13.1", "14.1", "15.1"] },
    { "id": 13, "tasks": ["13.2", "14.2", "15.2"] },
    { "id": 14, "tasks": ["13.3", "14.3"] },
    { "id": 15, "tasks": ["13.4", "14.4", "15.3"] }
  ]
}
```
