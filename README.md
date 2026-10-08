# Life Dashboard

A personal productivity dashboard built with plain HTML, CSS, and Vanilla JavaScript. No frameworks, no build step, no internet connection required — just open `index.html` and start working.

---

## Features

### Clock and Greeting
- Displays the current time (24-hour HH:MM) and full date
- Contextual greeting based on time of day: Good Morning / Afternoon / Evening / Night
- Updates automatically every minute, aligned to the real clock boundary
- **Personalised name** — enter your name once and every greeting includes it (e.g. *Good Morning, Alex!*)

### Focus Timer
- 25-minute Pomodoro-style countdown timer
- Start, Stop (pause), and Reset controls with correct enable/disable states at each phase
- Session-complete notification banner when the countdown reaches 00:00

### To-Do List
- Add, edit, complete, and delete tasks
- Inline edit mode — Save/Cancel via button or Enter/Escape keyboard shortcut
- **Duplicate prevention** — case-insensitive check blocks adding the same task twice
- Validation rejects empty descriptions and entries over 500 characters
- All tasks persist across page refreshes via `localStorage`

### Quick Links
- Save shortcut buttons to your favourite websites
- Automatic `https://` prepend for URLs entered without a scheme
- URL format and length validation
- Opens links in a new tab with `noopener,noreferrer`
- Links persist across sessions via `localStorage`

### Light / Dark Mode
- One-click toggle between light and dark colour schemes
- Theme preference is saved — no flash of wrong theme on reload
- All colours are CSS custom properties; every widget adapts automatically

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic elements, ARIA attributes) |
| Styling | CSS3 (custom properties, responsive grid) |
| Behaviour | Vanilla JavaScript (ES2020+, zero runtime dependencies) |
| Storage | Browser `localStorage` |
| Testing | Vitest + fast-check (property-based tests) |

**Zero runtime dependencies.** The only packages in `package.json` are dev-only testing tools.

---

## Project Structure

```
CodingCamp-05October26-Alexander/
├── index.html          Single HTML entry point
├── css/
│   └── styles.css      All styling: responsive grid, widget cards, dark mode
├── js/
│   ├── app.js          All application logic: six modules + bootstrap
│   └── app.test.js     63 unit and property-based tests
├── package.json
└── vitest.config.js
```

### Module Architecture (js/app.js)

```
app.js
├── StorageUtil         localStorage read/write with quota and error handling
├── ThemeToggle         Light/dark mode toggle and persistence
├── GreetingWidget      Clock, date, personalised greeting
├── FocusTimerWidget    Pomodoro countdown state machine
├── TodoListWidget      Task CRUD, duplicate check, validation
├── QuickLinksWidget    Link CRUD, URL normalisation, validation
└── DOMContentLoaded    Bootstraps all modules in order
```

---

## Getting Started

No installation needed for normal use.

**Open directly in a browser:**

Double-click `index.html`, or drag it into any modern browser window. Works as a `file://` URL — no web server required.

**Run the tests (optional):**

```bash
npm install
npm test
```

All 63 tests should pass.

---

## Browser Support

| Browser | Support |
|---|---|
| Google Chrome | Latest |
| Mozilla Firefox | Latest |
| Microsoft Edge | Latest |
| Apple Safari | Latest |

---

## Data and Privacy

All data is stored exclusively in your browser's `localStorage`. Nothing is sent to any server. Clearing your browser storage will erase saved tasks, links, name, and theme preference.

| localStorage Key | Contents |
|---|---|
| `tld_tasks` | Your to-do items |
| `tld_links` | Your quick links |
| `tld_username` | Your display name |
| `tld_theme` | Theme preference (light or dark) |

---

## Responsive Layout

| Viewport | Layout |
|---|---|
| 768 px and wider | 2-column grid |
| Narrower than 768 px | Single column |

---

## License

Built as a mini project for the **RevoU Coding Camp** program.
