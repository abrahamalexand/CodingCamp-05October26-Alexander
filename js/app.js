/* app.js — To-Do List Life Dashboard */

/* ==========================================================================
   StorageUtil — thin wrapper around localStorage
   ========================================================================== */

const StorageUtil = (() => {
  /**
   * Show the global storage-full error toast with a descriptive message.
   * Reveals #storage-error-toast by removing its `hidden` attribute.
   */
  function showStorageFullToast() {
    const toast = document.getElementById('storage-error-toast');
    if (toast) {
      toast.textContent = 'Storage is full — your latest changes could not be saved. '
        + 'Try removing some tasks or links to free up space.';
      toast.removeAttribute('hidden');
    }
  }

  /**
   * Read a JSON-serialised array from localStorage.
   *
   * @param {string} key — the localStorage key to read
   * @returns {Array} the parsed array, or [] on any failure
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('not an array');
      }
      return parsed;
    } catch (e) {
      console.error(`[tld] Failed to parse storage key "${key}": ${e.message}`);
      return [];
    }
  }

  /**
   * Serialise an array and write it to localStorage.
   * Catches QuotaExceededError and shows a visible toast; logs all other errors.
   *
   * @param {string} key — the localStorage key to write
   * @param {Array}  arr — the array to serialise and store
   *
   * Requirements: 5.1, 5.2, 5.5, 5.6
   */
  function write(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showStorageFullToast();
      } else {
        console.error(`[tld] Failed to write storage key "${key}": ${e.message}`);
      }
    }
  }

  return { read, write };
})();

/* ==========================================================================
   GreetingWidget — live clock, date, and contextual greeting
   ========================================================================== */

const GreetingWidget = (() => {
  /**
   * Return a contextual greeting string for the given 24-hour value.
   *
   * @param {number} h — hour in range 0–23
   * @returns {string} one of "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
   *
   * Requirements: 1.3, 1.4, 1.5, 1.6
   */
  function _getGreeting(h) {
    if (h >= 5 && h <= 11) return 'Good Morning';
    if (h >= 12 && h <= 17) return 'Good Afternoon';
    if (h >= 18 && h <= 21) return 'Good Evening';
    return 'Good Night'; // 22–23 and 0–4
  }

  /**
   * Format a Date into the display date string "DayOfWeek, Month DD, YYYY".
   * Uses Intl.DateTimeFormat with 'en-US' locale and the browser's local timezone.
   *
   * @param {Date} date
   * @returns {string} e.g. "Monday, January 01, 2024"
   *
   * Requirements: 1.2, 1.7
   */
  function _formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date);
  }

  /**
   * Validate a user-supplied display name before saving.
   *
   * Rules (applied after trimming):
   *  • Empty / whitespace-only  → rejected
   *  • Length > 50              → rejected
   *  • Length 1–50              → accepted
   *
   * @param {string} name — raw name input from the user
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 9.3, 9.4, 9.5
   */
  function _validateName(name) {
    const trimmed = (name || '').trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Name cannot be empty.' };
    }
    if (trimmed.length > 50) {
      return { ok: false, error: 'Name must be 50 characters or fewer.' };
    }
    return { ok: true };
  }

  /**
   * Read the saved display name from localStorage.
   *
   * @returns {string|null} the stored name string, or null if none is saved
   *
   * Requirements: 9.1, 9.10
   */
  function _loadName() {
    const saved = localStorage.getItem('tld_username');
    return saved || null;
  }

  /**
   * Persist a trimmed display name to localStorage.
   *
   * @param {string} name — validated name (trimmed before writing)
   *
   * Requirements: 9.7, 9.8
   */
  function _saveName(name) {
    localStorage.setItem('tld_username', name.trim());
  }

  /**
   * Combine a base greeting with an optional personalised name.
   * When name is non-null and non-empty after trimming, appends ", name!" to
   * the base greeting string.  Falls back to the plain greeting otherwise.
   *
   * @param {number}      hour — 24-hour value passed to _getGreeting
   * @param {string|null} name — stored display name, or null/empty if not set
   * @returns {string} e.g. "Good Morning, Alex!" or "Good Morning"
   *
   * Requirements: 9.1, 9.7, 9.8
   */
  function _buildGreeting(hour, name) {
    const base = _getGreeting(hour);
    if (name && name.trim().length > 0) {
      return base + ', ' + name.trim() + '!';
    }
    return base;
  }

  /**
   * Read the current time from the system clock and update all three greeting
   * DOM elements: time, date, and greeting message.
   *
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.1
   */
  function _render() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Zero-pad hours and minutes for 24-hour HH:MM format
    const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    const dateStr = _formatDate(now);
    const greetStr = _buildGreeting(h, _loadName());

    const timeEl = document.getElementById('greeting-time');
    const dateEl = document.getElementById('greeting-date');
    const msgEl  = document.getElementById('greeting-message');

    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
    if (msgEl)  msgEl.textContent  = greetStr;
  }

  /**
   * Show the name prompt form.
   * If editMode is true, pre-populate the input with the saved name and reveal
   * the Cancel button.  If false, clear the input and hide Cancel.
   * Also hides the "Edit name" button while the form is visible.
   *
   * @param {boolean} editMode — true when editing an existing name
   *
   * Requirements: 9.2, 9.6, 9.9
   */
  function _showNamePrompt(editMode) {
    const form       = document.getElementById('greeting-name-form');
    const input      = document.getElementById('greeting-name-input');
    const cancelBtn  = document.getElementById('greeting-name-cancel');
    const editBtn    = document.getElementById('greeting-name-edit');

    if (form)      form.removeAttribute('hidden');
    if (editBtn)   editBtn.setAttribute('hidden', '');

    if (editMode) {
      if (input)     input.value = _loadName() || '';
      if (cancelBtn) cancelBtn.removeAttribute('hidden');
    } else {
      if (input)     input.value = '';
      if (cancelBtn) cancelBtn.setAttribute('hidden', '');
    }
  }

  /**
   * Hide the name prompt form and clear any validation error.
   * Shows the "Edit name" button only when a name is already saved.
   *
   * Requirements: 9.6, 9.9
   */
  function _hideNamePrompt() {
    const form      = document.getElementById('greeting-name-form');
    const editBtn   = document.getElementById('greeting-name-edit');
    const errorEl   = document.getElementById('greeting-name-error');

    if (form)    form.setAttribute('hidden', '');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.setAttribute('hidden', '');
    }

    if (_loadName()) {
      if (editBtn) editBtn.removeAttribute('hidden');
    } else {
      if (editBtn) editBtn.setAttribute('hidden', '');
    }
  }

  /**
   * Render immediately on page load, then schedule minute-aligned updates.
   *
   * Phase 1: fire a one-shot setTimeout for the exact milliseconds until the
   *          next full clock minute.
   * Phase 2: inside that timeout, render once and start a 60 000 ms interval
   *          so the display stays in sync with the real clock minute boundary.
   *
   * Requirements: 1.1, 1.8
   */
  function init() {
    _render(); // immediate render — Requirement 1.8

    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
      _render();
      setInterval(_render, 60_000);
    }, msUntilNextMinute);

    // ── Name prompt controls ───────────────────────────────────────────────

    const nameInput   = document.getElementById('greeting-name-input');
    const submitBtn   = document.getElementById('greeting-name-submit');
    const cancelBtn   = document.getElementById('greeting-name-cancel');
    const editBtn     = document.getElementById('greeting-name-edit');
    const errorEl     = document.getElementById('greeting-name-error');

    // Save button: validate → save → hide prompt → re-render greeting
    if (submitBtn && nameInput) {
      submitBtn.addEventListener('click', () => {
        const result = _validateName(nameInput.value);
        if (result.ok) {
          _saveName(nameInput.value);
          _hideNamePrompt();
          _render();
        } else {
          if (errorEl) {
            errorEl.textContent = result.error;
            errorEl.removeAttribute('hidden');
          }
        }
      });
    }

    // Cancel button: discard changes and hide the form
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        _hideNamePrompt();
      });
    }

    // Edit button: re-open the form in edit mode
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        _showNamePrompt(true);
      });
    }

    // Initial state: show prompt when no name is saved; hide it when one exists
    if (_loadName() === null) {
      _showNamePrompt(false);
    } else {
      _hideNamePrompt();
      _render();
    }
  }

  return {
    init,
    _getGreeting,
    _formatDate,
    _render,
    _validateName,
    _loadName,
    _saveName,
    _buildGreeting,
    _showNamePrompt,
    _hideNamePrompt,
  };
})();

/* ==========================================================================
   FocusTimerWidget — Pomodoro-style 25-minute countdown timer
   ========================================================================== */

const FocusTimerWidget = (() => {
  /** Duration of one Pomodoro session in seconds (25 minutes). */
  const TIMER_DURATION = 1500;

  /** Enumeration of valid timer states. */
  const STATE = {
    IDLE:     'IDLE',
    RUNNING:  'RUNNING',
    PAUSED:   'PAUSED',
    COMPLETE: 'COMPLETE',
  };

  // ── Mutable state ──────────────────────────────────────────────────────────
  let state            = STATE.IDLE;
  let remainingSeconds = TIMER_DURATION;
  let intervalId       = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Convert a raw second count into a zero-padded MM:SS display string.
   *
   * @param {number} s — remaining seconds in range 0–1500
   * @returns {string} e.g. "25:00", "04:37", "00:00"
   *
   * Requirements: 2.2
   * Property 1: Time display formatting
   */
  function _formatTimerDisplay(s) {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /**
   * Sync the DOM with the current timer state:
   *  • Update #timer-display text content.
   *  • Enable / disable #timer-start, #timer-stop, #timer-reset according to
   *    the state/control table from the design document.
   *
   * State/control table:
   *   IDLE     → Start enabled,  Stop disabled, Reset disabled
   *   RUNNING  → Start disabled, Stop enabled,  Reset enabled
   *   PAUSED   → Start enabled,  Stop disabled, Reset enabled
   *   COMPLETE → Start disabled, Stop disabled, Reset enabled
   *
   * Requirements: 2.1, 2.3, 2.6, 2.7
   */
  function _render() {
    const displayEl = document.getElementById('timer-display');
    const startBtn  = document.getElementById('timer-start');
    const stopBtn   = document.getElementById('timer-stop');
    const resetBtn  = document.getElementById('timer-reset');

    if (displayEl) {
      displayEl.textContent = _formatTimerDisplay(remainingSeconds);
    }

    if (!startBtn || !stopBtn || !resetBtn) return;

    switch (state) {
      case STATE.IDLE:
        startBtn.disabled = false;
        stopBtn.disabled  = true;
        resetBtn.disabled = true;
        break;

      case STATE.RUNNING:
        startBtn.disabled = true;
        stopBtn.disabled  = false;
        resetBtn.disabled = false;
        break;

      case STATE.PAUSED:
        startBtn.disabled = false;
        stopBtn.disabled  = true;
        resetBtn.disabled = false;
        break;

      case STATE.COMPLETE:
        startBtn.disabled = true;
        stopBtn.disabled  = true;
        resetBtn.disabled = false;
        break;

      default:
        break;
    }
  }

  /**
   * Show the session-complete notification banner.
   * Removes the `hidden` attribute from #timer-notification so CSS makes it visible.
   *
   * Requirements: 2.7
   */
  function _notify() {
    const notif = document.getElementById('timer-notification');
    if (notif) notif.removeAttribute('hidden');
  }

  /**
   * Hide the session-complete notification banner.
   * Restores the `hidden` attribute on #timer-notification.
   *
   * Requirements: 2.7
   */
  function _dismiss() {
    const notif = document.getElementById('timer-notification');
    if (notif) notif.setAttribute('hidden', '');
  }

  // ── Control handlers ──────────────────────────────────────────────────────

  /**
   * Start (or resume) the countdown.
   * Guards against starting when already COMPLETE or when time has run out.
   *
   * Requirements: 2.2, 2.3, 2.5, 2.9
   */
  function _start() {
    // Requirement 2.9: do nothing if state is COMPLETE or no time remains.
    if (state === STATE.COMPLETE || remainingSeconds === 0) return;

    state = STATE.RUNNING;
    intervalId = setInterval(_tick, 1000);
    _render();
  }

  /**
   * Decrement the counter by one second on each interval tick.
   * When the countdown reaches zero, clear the interval, transition to
   * COMPLETE, and show the session-complete notification.
   *
   * Requirements: 2.2, 2.7
   */
  function _tick() {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(intervalId);
      intervalId = null;
      state = STATE.COMPLETE;
      _notify();
    }
    _render();
  }

  /**
   * Pause the running countdown, preserving the remaining time.
   *
   * Requirements: 2.4
   */
  function _stop() {
    clearInterval(intervalId);
    intervalId = null;
    state = STATE.PAUSED;
    _render();
  }

  /**
   * Stop any active countdown and return the timer to its initial state.
   * Also hides the session-complete notification if it is visible.
   *
   * Requirements: 2.6, 2.8
   */
  function _reset() {
    clearInterval(intervalId);
    intervalId = null;
    remainingSeconds = TIMER_DURATION; // 1500 seconds = 25 minutes
    state = STATE.IDLE;
    _dismiss();
    _render();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  /**
   * Wire click listeners for all four timer controls and perform an initial
   * render so button disabled/enabled states are correct on page load.
   *
   * Requirements: 2.1, 2.3
   */
  function init() {
    document.getElementById('timer-start')  .addEventListener('click', _start);
    document.getElementById('timer-stop')   .addEventListener('click', _stop);
    document.getElementById('timer-reset')  .addEventListener('click', _reset);
    document.getElementById('timer-dismiss').addEventListener('click', _dismiss);
    _render(); // set initial button states — Req 2.1
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    init,
    _formatTimerDisplay,
    _render,
    _notify,
    _dismiss,
    _start,
    _stop,
    _reset,
    _tick,
    STATE,
    // Expose mutable state via getter functions so tests can read current values
    // without holding stale references.
    getState:            () => state,
    getRemainingSeconds: () => remainingSeconds,
  };
})();

/* ==========================================================================
   TodoListWidget — task CRUD, validation, persistence, DOM rendering
   ========================================================================== */

const TodoListWidget = (() => {
  /** localStorage key for the tasks collection. */
  const TASKS_KEY = 'tld_tasks';

  /** In-memory task array; authoritative source of truth for the widget. */
  let tasks = [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Generate a unique identifier for a new task.
   * Prefers the cryptographically-secure `crypto.randomUUID()` API and falls
   * back to a time-based random string in environments that lack it.
   *
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Check whether a trimmed description already exists in `tasks[]`,
   * optionally excluding the task being edited (identified by `currentTaskId`).
   * Comparison is case-insensitive.
   *
   * @param {string}      trimmedDesc   — already-trimmed description to check
   * @param {string|null} currentTaskId — id of the task being edited, or null for new tasks
   * @returns {boolean} true if a duplicate exists
   *
   * Requirements: 10.1, 10.2, 10.5, 10.6
   */
  function _isDuplicate(trimmedDesc, currentTaskId) {
    return tasks.some(
      t => t.id !== currentTaskId &&
           t.description.toLowerCase() === trimmedDesc.toLowerCase()
    );
  }

  /**
   * Validate a task description before adding or editing.
   *
   * Rules (applied after trimming):
   *  • Empty / whitespace-only  → rejected
   *  • Length > 500             → rejected
   *  • Duplicate description    → rejected (case-insensitive, excludes currentTaskId)
   *  • Length 1–500, unique     → accepted
   *
   * @param {string}      desc          — raw input from the user
   * @param {string|null} currentTaskId — id of the task being edited, or null for new tasks
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 3.2, 3.5, 10.1, 10.2, 10.5, 10.6
   */
  function _validate(desc, currentTaskId = null) {
    const trimmed = (desc || '').trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Task description cannot be empty.' };
    }
    if (trimmed.length > 500) {
      return { ok: false, error: 'Task description must be 500 characters or fewer.' };
    }
    if (_isDuplicate(trimmed, currentTaskId)) {
      return { ok: false, error: 'A task with this description already exists.' };
    }
    return { ok: true };
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * Serialise the current `tasks[]` array to localStorage.
   * Delegates to StorageUtil so quota / JSON errors are handled centrally.
   *
   * Requirements: 3.8
   */
  function _persist() {
    StorageUtil.write(TASKS_KEY, tasks);
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * Add a new task with the given description.
   * Validates first; on failure returns the error without mutating state.
   * On success, creates the Task object, appends it, persists, and re-renders.
   *
   * @param {string} description — raw user input
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 3.1, 3.2, 3.8
   */
  function _addTask(description) {
    const result = _validate(description, null);
    if (!result.ok) return result;

    const task = {
      id:          generateId(),
      description: description.trim(),
      completed:   false,
      createdAt:   Date.now(),
    };
    tasks.push(task);
    _persist();
    _render();
    return { ok: true };
  }

  /**
   * Update the description of an existing task, identified by its `id`.
   * Validates the new description; on failure returns the error.
   * Only the `description` field is mutated — `id`, `completed`, and
   * `createdAt` are preserved.
   *
   * @param {string} id      — the task's unique identifier
   * @param {string} newDesc — the replacement description (raw input)
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 3.4, 3.5, 3.8
   */
  function _editTask(id, newDesc) {
    const result = _validate(newDesc, id);
    if (!result.ok) return result;

    const task = tasks.find(t => t.id === id);
    if (!task) return { ok: false, error: 'Task not found.' };

    task.description = newDesc.trim();
    _persist();
    _render();
    return { ok: true };
  }

  /**
   * Toggle the `completed` boolean of the task with the given `id`.
   * No-ops silently if the `id` is not found.
   *
   * @param {string} id
   *
   * Requirements: 3.6, 3.8
   */
  function _toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      _persist();
      _render();
    }
  }

  /**
   * Permanently remove the task with the given `id` from the list.
   * Re-assigns `tasks` to a filtered copy, persists, and re-renders.
   *
   * @param {string} id
   *
   * Requirements: 3.7, 3.8
   */
  function _deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    _persist();
    _render();
  }

  // ── Error display helpers ──────────────────────────────────────────────────

  /**
   * Show an inline validation error message in the todo form.
   *
   * @param {string} msg — the validation error to display
   *
   * Requirements: 3.2, 3.5
   */
  function _showTodoError(msg) {
    const el = document.getElementById('todo-error');
    if (el) {
      el.textContent = msg;
      el.removeAttribute('hidden');
    }
  }

  /**
   * Hide the inline todo validation error paragraph.
   *
   * Requirements: 3.2
   */
  function _hideTodoError() {
    const el = document.getElementById('todo-error');
    if (el) el.setAttribute('hidden', '');
  }

  // ── Loading and Rendering ─────────────────────────────────────────────────

  /**
   * Load tasks from localStorage and trigger a full re-render.
   * If StorageUtil returns an empty array due to an unavailable/corrupt store,
   * the widget continues operating in-memory and shows no error banner here
   * (StorageUtil.read already calls console.error; write failures show the toast).
   *
   * Requirements: 3.9, 3.10, 3.11
   */
  function _load() {
    tasks = StorageUtil.read(TASKS_KEY);
    _render();
  }

  /**
   * Fully re-render the task list DOM from the current `tasks[]` array.
   * Clears the <ul> and rebuilds it in insertion order.
   *
   * Each <li> contains:
   *  • A <span class="task-description"> (strikethrough when completed)
   *  • A complete-toggle <button> (✓ / ↩)
   *  • An edit <button> (✎)
   *  • A delete <button> (✕)
   *
   * Requirements: 3.1, 3.3, 3.6, 3.9, 3.10
   */
  function _render() {
    const ul = document.getElementById('todo-list');
    if (!ul) return;
    ul.innerHTML = '';

    tasks.forEach(task => {
      const li = document.createElement('li');
      if (task.completed) li.classList.add('task-complete');

      // Description span
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Complete toggle button
      const completeBtn = document.createElement('button');
      completeBtn.type = 'button';
      completeBtn.textContent = task.completed ? '↩' : '✓';
      completeBtn.setAttribute(
        'aria-label',
        task.completed
          ? `Mark task incomplete: ${task.description}`
          : `Mark task complete: ${task.description}`
      );
      completeBtn.addEventListener('click', () => _toggleComplete(task.id));

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = '✎';
      editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
      editBtn.addEventListener('click', () => _startEdit(li, task));

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
      deleteBtn.addEventListener('click', () => _deleteTask(task.id));

      li.appendChild(span);
      li.appendChild(completeBtn);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      ul.appendChild(li);
    });
  }

  /**
   * Switch a task <li> into inline-edit mode.
   * Replaces the description span with a pre-populated <input maxlength="500">
   * and Save / Cancel buttons.
   *
   * Keyboard shortcuts: Enter → confirm, Escape → discard.
   * Confirming calls _editTask(); on validation failure _showTodoError() is
   * called. On success _hideTodoError() is called and _editTask re-renders.
   * Cancelling calls _render() to discard all changes.
   *
   * Requirements: 3.3, 3.4, 3.5
   */
  function _startEdit(li, task) {
    li.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.maxLength = 500;
    input.value = task.description;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'task-save-btn';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';

    function confirmEdit() {
      const result = _editTask(task.id, input.value);
      if (!result.ok) {
        _showTodoError(result.error);
      } else {
        _hideTodoError();
        // _editTask already calls _render(), so the edit mode is cleaned up
      }
    }

    function cancelEdit() {
      _render(); // discard changes — restore list from in-memory state
    }

    saveBtn.addEventListener('click', confirmEdit);
    cancelBtn.addEventListener('click', cancelEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  confirmEdit();
      if (e.key === 'Escape') cancelEdit();
    });

    li.appendChild(input);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
    input.focus();
    input.select();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  /**
   * Bootstrap the TodoListWidget:
   *  1. Restore persisted tasks from localStorage and render them.
   *  2. Attach a submit listener on #todo-form that adds a new task,
   *     clears the input on success, or shows a validation error on failure.
   *
   * Requirements: 3.1, 3.2, 3.9
   */
  function init() {
    _load(); // restore tasks from storage — Req 3.9

    const form  = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = _addTask(input.value);
      if (result.ok) {
        input.value = '';
        _hideTodoError();
      } else {
        _showTodoError(result.error);
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Lifecycle
    init,
    // Core CRUD
    _validate,
    _isDuplicate,
    generateId,
    _addTask,
    _editTask,
    _toggleComplete,
    _deleteTask,
    _persist,
    _render,
    _load,
    _showTodoError,
    _hideTodoError,
    _startEdit,
    // State accessors used by tests
    getTasks:  () => tasks,
    setTasks:  (t) => { tasks = t; },
  };
})();

/* ==========================================================================
   QuickLinksWidget — link CRUD, validation, URL normalisation, persistence,
   DOM rendering
   ========================================================================== */

const QuickLinksWidget = (() => {
  /** localStorage key for the links collection. */
  const LINKS_KEY = 'tld_links';

  /** In-memory links array; authoritative source of truth for the widget. */
  let links = [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Generate a unique identifier for a new link.
   * Mirrors the same strategy used by TodoListWidget.
   *
   * @returns {string}
   */
  function _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Ensure the URL has an explicit scheme.
   * If the trimmed URL does not start with "http://" or "https://", prepend
   * "https://".  Already-schemed URLs are returned unchanged.
   *
   * @param {string} url — raw URL input from the user
   * @returns {string} normalised URL (always starts with http:// or https://)
   *
   * Requirements: 4.4
   */
  function _normaliseUrl(url) {
    const s = (url || '').trim();
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
      return 'https://' + s;
    }
    return s;
  }

  /**
   * Validate a link label before adding.
   *
   * Rules (applied after trimming):
   *  • Empty / whitespace-only  → rejected
   *  • Length > 100             → rejected
   *  • Length 1–100             → accepted
   *
   * @param {string} label — raw label input from the user
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 4.2, 4.3
   */
  function _validateLabel(label) {
    const trimmed = (label || '').trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Label cannot be empty.' };
    }
    if (trimmed.length > 100) {
      return { ok: false, error: 'Label must be 100 characters or fewer.' };
    }
    return { ok: true };
  }

  /**
   * Validate a URL after normalisation.
   *
   * Rules:
   *  • Length > 2048                      → rejected
   *  • Fails `new URL()` constructor test → rejected (invalid characters / structure)
   *
   * @param {string} url — normalised URL (already has http:// or https:// prefix)
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 4.3, 4.5
   */
  function _validateUrl(url) {
    if ((url || '').length > 2048) {
      return { ok: false, error: 'URL must be 2048 characters or fewer.' };
    }
    try {
      new URL(url); // throws on invalid URL structure
      return { ok: true };
    } catch {
      return { ok: false, error: 'Please enter a valid URL.' };
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * Serialise the current `links[]` array to localStorage.
   * Delegates to StorageUtil so quota / JSON errors are handled centrally.
   *
   * Requirements: 4.8
   */
  function _persist() {
    StorageUtil.write(LINKS_KEY, links);
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * Add a new link with the given label and URL.
   * Validates label, normalises URL, then validates the normalised URL.
   * On failure returns the error without mutating state.
   * On success, creates the Link object, appends it, persists, and re-renders.
   *
   * @param {string} label — raw label input from the user
   * @param {string} url   — raw URL input from the user
   * @returns {{ ok: true } | { ok: false, error: string }}
   *
   * Requirements: 4.1, 4.2, 4.4, 4.5, 4.8
   */
  function _addLink(label, url) {
    const labelResult = _validateLabel(label);
    if (!labelResult.ok) return labelResult;

    const normUrl = _normaliseUrl(url);
    const urlResult = _validateUrl(normUrl);
    if (!urlResult.ok) return urlResult;

    const link = {
      id:    _generateId(),
      label: label.trim(),
      url:   normUrl,
    };
    links.push(link);
    _persist();
    _render();
    return { ok: true };
  }

  /**
   * Permanently remove the link with the given `id` from the list.
   * Re-assigns `links` to a filtered copy, persists, and re-renders.
   *
   * @param {string} id
   *
   * Requirements: 4.7, 4.8
   */
  function _deleteLink(id) {
    links = links.filter(l => l.id !== id);
    _persist();
    _render();
  }

  // ── Error display helpers ──────────────────────────────────────────────────

  /**
   * Show an inline validation error message in the links form.
   *
   * @param {string} msg — the validation error to display
   *
   * Requirements: 4.2, 4.3, 4.5
   */
  function _showLinksError(msg) {
    const el = document.getElementById('links-error');
    if (el) {
      el.textContent = msg;
      el.removeAttribute('hidden');
    }
  }

  /**
   * Hide the inline links validation error paragraph.
   *
   * Requirements: 4.2
   */
  function _hideLinksError() {
    const el = document.getElementById('links-error');
    if (el) el.setAttribute('hidden', '');
  }

  // ── Loading and Rendering ─────────────────────────────────────────────────

  /**
   * Load links from localStorage and trigger a full re-render.
   * If StorageUtil returns an empty array due to an unavailable/corrupt store,
   * the widget shows an inline message in #links-list.
   *
   * Requirements: 4.9, 4.10, 4.11
   */
  function _load() {
    links = StorageUtil.read(LINKS_KEY);
    _render();
  }

  /**
   * Fully re-render the links list DOM from the current `links[]` array.
   * Clears the #links-list div and rebuilds it in insertion order.
   *
   * Each entry is a <div class="link-entry"> containing:
   *  • A <button class="link-open-btn"> with the link label as text content,
   *    opens the URL in a new tab via window.open
   *  • A <button class="link-delete-btn"> (✕) to remove the link
   *
   * Requirements: 4.1, 4.6, 4.9, 4.10
   */
  function _render() {
    const container = document.getElementById('links-list');
    if (!container) return;
    container.innerHTML = '';

    links.forEach(link => {
      const entry = document.createElement('div');
      entry.className = 'link-entry';

      // Open-link button
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'link-open-btn';
      openBtn.textContent = link.label;
      openBtn.setAttribute('aria-label', `Open link: ${link.label}`);
      openBtn.addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
      deleteBtn.addEventListener('click', () => _deleteLink(link.id));

      entry.appendChild(openBtn);
      entry.appendChild(deleteBtn);
      container.appendChild(entry);
    });
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  /**
   * Bootstrap the QuickLinksWidget:
   *  1. Restore persisted links from localStorage and render them.
   *  2. Attach a submit listener on #links-form that adds a new link,
   *     clears both inputs on success, or shows a validation error on failure.
   *
   * Requirements: 4.1, 4.2, 4.9
   */
  function init() {
    _load(); // restore links from storage — Req 4.9

    const form       = document.getElementById('links-form');
    const labelInput = document.getElementById('link-label');
    const urlInput   = document.getElementById('link-url');
    if (!form || !labelInput || !urlInput) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = _addLink(labelInput.value, urlInput.value);
      if (result.ok) {
        labelInput.value = '';
        urlInput.value   = '';
        _hideLinksError();
      } else {
        _showLinksError(result.error);
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Lifecycle
    init,
    // Validation / normalisation
    _normaliseUrl,
    _validateLabel,
    _validateUrl,
    // Core CRUD
    _addLink,
    _deleteLink,
    _persist,
    _render,
    _load,
    _showLinksError,
    _hideLinksError,
    // State accessors used by tests
    getLinks:  () => links,
    setLinks:  (l) => { links = l; },
  };
})();

/* ==========================================================================
   ThemeToggle — light / dark mode persistence and toggle
   ========================================================================== */

const ThemeToggle = (() => {
  const STORAGE_KEY = 'tld_theme';

  /**
   * Apply or remove the `dark-mode` class on `document.body` and update the
   * toggle button's `aria-label` and text content to match the active theme.
   *
   * @param {boolean} dark — true to activate dark mode, false for light mode
   *
   * Requirements: 8.2, 8.3, 8.7, 8.8
   */
  function _apply(dark) {
    if (dark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }

  /**
   * Flip the current theme, persist the new value, and apply the change.
   *
   * Requirements: 8.4, 8.5
   */
  function _toggle() {
    const isDark = document.body.classList.contains('dark-mode');
    const newDark = !isDark;
    localStorage.setItem(STORAGE_KEY, newDark ? 'dark' : '');
    _apply(newDark);
  }

  /**
   * Initialise the theme on page load:
   *  1. Read the saved preference from localStorage.
   *  2. Move the `dark-mode` class from `<html>` (set by the inline flash-
   *     prevention script in <head>) to `<body>` if present.
   *  3. Apply the correct theme and wire the toggle button click listener.
   *
   * Requirements: 8.2, 8.5
   */
  function init() {
    const savedDark = localStorage.getItem(STORAGE_KEY) === 'dark';
    // Normalise: inline script may have added dark-mode to <html> to avoid FOUC.
    // Remove it from documentElement and let _apply() manage it on body instead.
    if (document.documentElement.classList.contains('dark-mode')) {
      document.documentElement.classList.remove('dark-mode');
    }
    _apply(savedDark);

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', _toggle);
  }

  return { init, _apply, _toggle, STORAGE_KEY };
})();

/* ==========================================================================
   Bootstrap — wire all widgets on DOMContentLoaded
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  ThemeToggle.init();
  GreetingWidget.init();
  FocusTimerWidget.init();
  TodoListWidget.init();
  QuickLinksWidget.init();
});
