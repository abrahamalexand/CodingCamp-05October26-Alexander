# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a lightweight, client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub accessible from any modern browser, requiring no backend server or account setup. The dashboard combines a live greeting widget, a Pomodoro-style focus timer, a persistent to-do list, and a customizable quick-links panel — all data stored locally in the browser via the Local Storage API.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-based greeting message.
- **Focus_Timer**: The Pomodoro-style countdown timer component with a 25-minute default duration.
- **Todo_List**: The UI component that manages the user's task items (add, edit, complete, delete).
- **Task**: A single to-do item stored and displayed by the Todo_List.
- **Quick_Links**: The UI component that displays user-defined shortcut buttons to external URLs.
- **Link**: A single quick-link entry consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **Timer_Session**: One active countdown cycle of the Focus_Timer from start to zero.
- **Modern_Browser**: Google Chrome (latest), Mozilla Firefox (latest), Microsoft Edge (latest), or Apple Safari (latest).

---

## Requirements

---

### Requirement 1: Live Greeting and Date/Time Display

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I have immediate situational awareness without checking a separate clock.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in 24-hour HH:MM format, updated on each new clock minute (aligned to the system clock minute boundary).
2. THE Greeting_Widget SHALL display the current full date in "DayOfWeek, Month DD, YYYY" format, derived from the browser's local timezone.
3. WHEN the local time is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local time is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local time is between 18:00 and 21:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the local time is between 22:00 and 04:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Night".
7. THE Greeting_Widget SHALL derive time and date values from the browser's native `Date` API without requiring any network requests.
8. THE Greeting_Widget SHALL render the initial time, date, and greeting within 1 second of the page becoming interactive.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can apply focused work intervals (Pomodoro technique) directly from my Dashboard.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise to a duration of 25 minutes (1500 seconds) on page load, displaying "25:00".
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down in one-second intervals, updating the displayed MM:SS value each second.
3. WHILE a Timer_Session is active, THE Focus_Timer SHALL disable the Start control and enable the Stop control.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHILE the Focus_Timer is paused with remaining time greater than zero, THE Focus_Timer SHALL enable the Start control so the user can resume.
6. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to "25:00", returning the Focus_Timer to its initial state with the Start control enabled and the Stop control disabled.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visible on-screen notification indicating the session is complete, remaining visible until the user dismisses it or activates the Reset control.
8. THE Focus_Timer SHALL NOT require page reload to begin a new Timer_Session after reset.
9. IF the user activates the Start control while the displayed time is 00:00, THEN THE Focus_Timer SHALL NOT begin a countdown and the Start control SHALL remain disabled until the Reset control is activated.

---

### Requirement 3: To-Do List — Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a persistent to-do list, so that I can track my daily work items without losing them when I close the browser.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description of 1 to 500 characters, THE Todo_List SHALL add a new Task to the list and display it immediately without requiring a page reload.
2. IF the user attempts to submit a task description that is empty or exceeds 500 characters, THEN THE Todo_List SHALL reject the submission, keep the input field visible with its current content, and display an inline validation message indicating the reason for rejection.
3. WHEN the user activates the edit control on a Task, THE Todo_List SHALL render the Task description as an editable text field pre-populated with the existing description and limit input to 500 characters.
4. WHEN the user confirms an edit with a non-empty description of 1 to 500 characters, THE Todo_List SHALL update the Task's stored and displayed description.
5. IF the user confirms an edit with an empty description or a description exceeding 500 characters, THEN THE Todo_List SHALL reject the update, retain the original Task description, and display an inline validation message indicating the reason for rejection.
6. WHEN the user activates the complete control on a Task, THE Todo_List SHALL toggle the Task's completion state and apply a visual distinction to completed Tasks that is visually distinguishable from incomplete Tasks (e.g., strikethrough text).
7. WHEN the user activates the delete control on a Task, THE Todo_List SHALL remove the Task permanently from both the displayed list and Local_Storage.
8. THE Todo_List SHALL persist all Tasks (description and completion state) to Local_Storage within 500 milliseconds after every add, edit, complete-toggle, or delete operation.
9. WHEN the Dashboard loads, THE Todo_List SHALL restore all Tasks from Local_Storage and render them in the order they were originally added, within 1 second of the page load event.
10. WHEN Local_Storage contains no saved Tasks, THE Todo_List SHALL render an empty list with no error.
11. IF Local_Storage is unavailable or a read/write operation fails, THEN THE Todo_List SHALL display an error message indicating that persistence is unavailable and continue to allow Task operations for the current session without persisting data.

---

### Requirement 4: Quick Links — Shortcut Management

**User Story:** As a user, I want to add and manage buttons that open my favourite websites, so that I can navigate to frequently used URLs without leaving the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a label and a valid URL, THE Quick_Links component SHALL add a new Link button to the panel and display it immediately, appending it after the last existing Link.
2. IF the user submits an empty label or a label exceeding 100 characters, THEN THE Quick_Links component SHALL reject the submission and display an inline validation message indicating the label requirement.
3. IF the user submits an empty URL, THEN THE Quick_Links component SHALL reject the submission and display an inline validation message indicating the URL requirement.
4. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Quick_Links component SHALL prepend "https://" to the URL before saving.
5. IF the user submits a URL that, after any prepending, exceeds 2048 characters or contains characters invalid in a URL, THEN THE Quick_Links component SHALL reject the submission and display an inline validation message indicating the URL is invalid.
6. WHEN the user activates a Link button, THE Quick_Links component SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
7. WHEN the user activates the delete control on a Link, THE Quick_Links component SHALL remove that Link from the panel permanently and update the display immediately.
8. THE Quick_Links component SHALL persist all Links (label and URL) to Local_Storage after every add or delete operation, overwriting the previous saved state.
9. WHEN the Dashboard loads, THE Quick_Links component SHALL restore all Links from Local_Storage and render them in the order they were originally added.
10. WHEN Local_Storage contains no saved Links, THE Quick_Links component SHALL render the panel empty with no error.
11. IF Local_Storage is unavailable or reading from Local_Storage fails on Dashboard load, THEN THE Quick_Links component SHALL render the panel empty and display an inline message indicating that saved links could not be loaded.

---

### Requirement 5: Data Persistence and Local Storage Integrity

**User Story:** As a user, I want my tasks and quick links to survive browser restarts and page refreshes, so that I never lose my data unexpectedly.

#### Acceptance Criteria

1. THE Dashboard SHALL use separate, uniquely named Local_Storage keys for Task data and Link data to prevent data collisions.
2. THE Dashboard SHALL serialise Task and Link collections as JSON strings before writing to Local_Storage.
3. WHEN reading from Local_Storage, THE Dashboard SHALL deserialise the JSON string into an array of objects before use.
4. IF Local_Storage data for Tasks or Links cannot be parsed as valid JSON, or the parsed value is not an array, THEN THE Dashboard SHALL initialise that collection as an empty array and call `console.error` with a descriptive message.
5. IF a write operation to Local_Storage throws a `QuotaExceededError`, THEN THE Dashboard SHALL display a visible error message informing the user that storage is full and the data could not be saved.
6. THE Dashboard SHALL NOT store any data to remote servers; all persistence SHALL be limited to the client's Local_Storage.

---

### Requirement 6: Layout and Visual Design

**User Story:** As a user, I want a clean, visually organised Dashboard, so that I can quickly locate each widget without cognitive overhead.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets (Greeting_Widget, Focus_Timer, Todo_List, Quick_Links) on a single HTML page without requiring navigation between pages.
2. THE Dashboard SHALL apply styles exclusively from a single CSS file located in the `css/` directory.
3. THE Dashboard SHALL apply behaviour exclusively from a single JavaScript file located in the `js/` directory.
4. THE Dashboard SHALL display a clear visual hierarchy by rendering each widget with a heading-level element (h1–h6) containing visible label text identifying that widget.
5. THE Dashboard SHALL use a font size of at least 16px for body text to meet readable typography standards.
6. WHEN rendered on a viewport width of 768px or wider, THE Dashboard SHALL arrange widgets in a layout of at least 2 columns.
7. WHEN rendered on a viewport width narrower than 768px, THE Dashboard SHALL arrange widgets in a single-column layout.

---

### Requirement 7: Browser Compatibility and Performance

**User Story:** As a user, I want the Dashboard to load and respond instantly in any modern browser, so that it does not slow down my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL load and render all widget DOM elements as visible and interactive within 2 seconds on a connection of at least 25 Mbps download using a Modern_Browser.
2. THE Dashboard SHALL function correctly as a standalone HTML file opened directly in a Modern_Browser (file:// protocol) without requiring a web server.
3. WHEN the user interacts with any control (button click, form submit, timer tick), THE Dashboard SHALL update the DOM within 100 milliseconds of the triggering event.
4. THE Dashboard SHALL NOT depend on any external JavaScript frameworks, CSS frameworks, or CDN-hosted libraries.
5. THE Dashboard SHALL NOT make any network requests during normal operation; all resources SHALL be self-contained.

---

### Requirement 8: Light/Dark Mode Theme Toggle

**User Story:** As a user, I want to toggle between a light and dark colour theme, so that I can use the Dashboard comfortably in different lighting conditions without straining my eyes.

#### Acceptance Criteria

1. THE Dashboard SHALL render a theme toggle control (button or switch) that is persistently visible regardless of viewport size or scroll position.
2. WHEN the user activates the theme toggle control, THE Dashboard SHALL switch the active colour theme between light mode and dark mode by toggling a CSS class on the `<body>` element.
3. WHEN the Dashboard loads for the first time with no saved theme preference, THE Dashboard SHALL apply light mode as the default theme.
4. WHEN the user activates the theme toggle control, THE Dashboard SHALL persist the selected theme identifier to Local_Storage so that the preference survives page refreshes.
5. WHEN the Dashboard loads and a saved theme preference exists in Local_Storage, THE Dashboard SHALL restore that theme within 1 second of the page load event, before any widget content renders, to prevent a flash of the wrong theme.
6. THE Dashboard SHALL apply the dark theme exclusively by toggling a single CSS class (`dark-mode`) on the `<body>` element, with all dark-mode colour overrides scoped to that class selector in `css/styles.css`.
7. THE Dashboard SHALL NOT require a page reload to apply a theme change; the switch SHALL take effect immediately on toggle activation.
8. THE Dashboard SHALL update the theme toggle control's accessible label (`aria-label` or visible text) to reflect the currently active theme so users with assistive technologies know what action the control will perform.

---

### Requirement 9: Custom Name in Greeting

**User Story:** As a user, I want the greeting widget to display my name, so that the Dashboard feels personalised and immediately familiar each time I open it.

#### Acceptance Criteria

1. WHEN the Dashboard loads and no name is saved in Local_Storage, THE Greeting_Widget SHALL display only the generic greeting (e.g. "Good Morning") without any name.
2. WHEN the Dashboard loads and no name is saved in Local_Storage, THE Greeting_Widget SHALL display a visible prompt inviting the user to enter their name, including a text input field and a confirm control.
3. WHEN the user submits a non-empty name of 1 to 50 characters via the name prompt, THE Greeting_Widget SHALL save the trimmed name to Local_Storage, hide the prompt, and update the greeting to the personalised form (e.g. "Good Morning, Alex!").
4. IF the user submits an empty name or a name exceeding 50 characters via the name prompt, THEN THE Greeting_Widget SHALL reject the input and display an inline validation message indicating the reason for rejection.
5. WHEN the Dashboard loads and a saved name exists in Local_Storage, THE Greeting_Widget SHALL display the personalised greeting (e.g. "Good Morning, Alex!") and hide the name prompt.
6. THE Greeting_Widget SHALL display a visible edit-name control that, when activated, reveals the name input field pre-populated with the currently saved name so the user can change it.
7. WHEN the user confirms an updated name of 1 to 50 non-empty characters, THE Greeting_Widget SHALL update the stored name in Local_Storage and refresh the displayed greeting immediately.
8. IF the user confirms an updated name that is empty or exceeds 50 characters, THEN THE Greeting_Widget SHALL reject the update and display an inline validation message.
9. WHEN the user cancels a name edit without submitting, THE Greeting_Widget SHALL discard changes, hide the input field, and leave the stored name and displayed greeting unchanged.
10. THE Greeting_Widget SHALL store the user's name under a uniquely named Local_Storage key (`tld_username`) that does not conflict with any other Dashboard storage key.

---

### Requirement 10: Prevent Duplicate Tasks

**User Story:** As a user, I want the to-do list to prevent duplicate entries, so that my task list stays clean and I do not accidentally track the same work item twice.

#### Acceptance Criteria

1. WHEN the user attempts to add a new task whose description, after trimming, matches the description of any existing Task in the list by a case-insensitive exact comparison (regardless of that Task's completion state), THEN THE Todo_List SHALL reject the submission.
2. WHEN a task submission is rejected due to a duplicate description, THE Todo_List SHALL display an inline validation message stating that the task already exists, and the input field SHALL retain the user's entered text.
3. WHEN the user attempts to confirm an edit of a Task whose new description, after trimming, matches the description of any other existing Task by a case-insensitive exact comparison, THEN THE Todo_List SHALL reject the update.
4. WHEN an edit is rejected due to a duplicate description, THE Todo_List SHALL display an inline validation message stating that a task with that description already exists, and the edit input field SHALL retain the user's entered text.
5. THE Todo_List SHALL permit a Task to be edited to its own current description without triggering a duplicate rejection (i.e., a self-match is not treated as a duplicate).
6. THE duplicate-check SHALL be performed after trimming whitespace from the input, using the same trimmed description that would be stored, ensuring that leading/trailing whitespace differences do not create apparent duplicates.
