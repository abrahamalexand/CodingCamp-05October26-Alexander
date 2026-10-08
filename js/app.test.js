// app.test.js — To-Do List Life Dashboard
// Tests populated in tasks 4.2, 5.3, 6.4, 8.4, 9.4, 11.2

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Bootstrap helpers
// ---------------------------------------------------------------------------

const APP_SRC = readFileSync(resolve(__dirname, 'app.js'), 'utf8');

/**
 * Load the app source into the current jsdom globalThis scope and return
 * the StorageUtil object.  app.js uses `const StorageUtil = (() => {...})()` —
 * a module-level const that doesn't auto-attach to globalThis — so we wrap
 * the source in an assignment that does.
 */
function loadStorageUtil() {
  // Patch the source to expose StorageUtil on globalThis so tests can access it
  const patched = APP_SRC.replace(
    'const StorageUtil = (',
    'globalThis.StorageUtil = ('
  );
  // eslint-disable-next-line no-eval
  eval(patched);
  return globalThis.StorageUtil;
}

// ---------------------------------------------------------------------------
// StorageUtil — unit tests  (task 4.1 verification)
// ---------------------------------------------------------------------------

describe('StorageUtil', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="storage-error-toast" hidden></div>';
  });

  it('read() returns [] when key is absent', () => {
    const S = loadStorageUtil();
    expect(S.read('missing_key')).toEqual([]);
  });

  it('read() returns the stored array for a valid key', () => {
    const S = loadStorageUtil();
    const data = [{ id: '1', description: 'Buy milk', completed: false, createdAt: 1 }];
    localStorage.setItem('tld_tasks', JSON.stringify(data));
    expect(S.read('tld_tasks')).toEqual(data);
  });

  it('read() returns [] and calls console.error when JSON is malformed', () => {
    const S = loadStorageUtil();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('tld_tasks', 'not { valid json');
    expect(S.read('tld_tasks')).toEqual([]);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('read() returns [] and calls console.error when stored value is not an array', () => {
    const S = loadStorageUtil();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('tld_tasks', JSON.stringify({ notAnArray: true }));
    expect(S.read('tld_tasks')).toEqual([]);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('write() serialises the array into localStorage', () => {
    const S = loadStorageUtil();
    const data = [{ id: '2', label: 'GitHub', url: 'https://github.com' }];
    S.write('tld_links', data);
    expect(JSON.parse(localStorage.getItem('tld_links'))).toEqual(data);
  });

  it('write() reveals #storage-error-toast on QuotaExceededError', () => {
    const S = loadStorageUtil();
    const toast = document.getElementById('storage-error-toast');
    expect(toast.hasAttribute('hidden')).toBe(true);

    const quotaError = Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError; });

    S.write('tld_tasks', [{ id: '1' }]);

    expect(toast.hasAttribute('hidden')).toBe(false);
    expect(toast.textContent.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('write() calls console.error for non-quota errors', () => {
    const S = loadStorageUtil();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('some other error');
    });
    S.write('tld_tasks', []);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Bootstrap helpers for GreetingWidget and FocusTimerWidget
// ---------------------------------------------------------------------------

/**
 * Patch APP_SRC to expose GreetingWidget on globalThis.
 * StorageUtil must also be patched so the eval doesn't throw on
 * the `const StorageUtil` declaration (it was already declared by loadStorageUtil).
 */
function loadGreetingWidget() {
  const patched = APP_SRC
    .replace('const StorageUtil = (', 'globalThis.StorageUtil = (')
    .replace('const GreetingWidget = (', 'globalThis.GreetingWidget = (');
  // eslint-disable-next-line no-eval
  eval(patched);
  return globalThis.GreetingWidget;
}

/**
 * Patch APP_SRC to expose FocusTimerWidget on globalThis.
 * Sets up the required timer DOM before eval so _render() in init() finds elements.
 */
function loadFocusTimerWidget() {
  document.body.innerHTML = `
    <p id="timer-display">25:00</p>
    <button id="timer-start">Start</button>
    <button id="timer-stop" disabled>Stop</button>
    <button id="timer-reset" disabled>Reset</button>
    <div id="timer-notification" hidden></div>
    <button id="timer-dismiss">Dismiss</button>
  `;
  const patched = APP_SRC
    .replace('const StorageUtil = (', 'globalThis.StorageUtil = (')
    .replace('const GreetingWidget = (', 'globalThis.GreetingWidget = (')
    .replace('const FocusTimerWidget = (', 'globalThis.FocusTimerWidget = (');
  // eslint-disable-next-line no-eval
  eval(patched);
  return globalThis.FocusTimerWidget;
}

// ---------------------------------------------------------------------------
// GreetingWidget — unit tests  (task 5 verification)
// ---------------------------------------------------------------------------

describe('GreetingWidget._getGreeting', () => {
  let G;
  beforeEach(() => {
    G = loadGreetingWidget();
  });

  it('returns "Good Night" for hour 0 (midnight)', () => {
    expect(G._getGreeting(0)).toBe('Good Night');
  });

  it('returns "Good Morning" for hour 5 (boundary start)', () => {
    expect(G._getGreeting(5)).toBe('Good Morning');
  });

  it('returns "Good Morning" for hour 11 (boundary end)', () => {
    expect(G._getGreeting(11)).toBe('Good Morning');
  });

  it('returns "Good Afternoon" for hour 12 (boundary start)', () => {
    expect(G._getGreeting(12)).toBe('Good Afternoon');
  });

  it('returns "Good Afternoon" for hour 17 (boundary end)', () => {
    expect(G._getGreeting(17)).toBe('Good Afternoon');
  });

  it('returns "Good Evening" for hour 18 (boundary start)', () => {
    expect(G._getGreeting(18)).toBe('Good Evening');
  });

  it('returns "Good Evening" for hour 21 (boundary end)', () => {
    expect(G._getGreeting(21)).toBe('Good Evening');
  });

  it('returns "Good Night" for hour 22 (boundary start)', () => {
    expect(G._getGreeting(22)).toBe('Good Night');
  });

  it('returns "Good Night" for hour 23', () => {
    expect(G._getGreeting(23)).toBe('Good Night');
  });
});

describe('GreetingWidget._formatDate', () => {
  let G;
  beforeEach(() => {
    G = loadGreetingWidget();
  });

  it('returns a string matching "DayOfWeek, Month DD, YYYY" pattern', () => {
    const testDate = new Date('2024-01-15T12:00:00');
    const result = G._formatDate(testDate);
    // Pattern: "Monday, January 15, 2024" — DayOfWeek, Month DD, YYYY
    expect(result).toMatch(/^[A-Z][a-z]+, [A-Z][a-z]+ \d{2}, \d{4}$/);
  });

  it('formats a known date correctly', () => {
    // January 1, 2024 is a Monday
    const testDate = new Date(2024, 0, 1, 12, 0, 0); // local time noon
    const result = G._formatDate(testDate);
    expect(result).toMatch(/^[A-Z][a-z]+, January 01, 2024$/);
  });
});

// ---------------------------------------------------------------------------
// FocusTimerWidget — unit tests  (task 6 verification)
// ---------------------------------------------------------------------------

describe('FocusTimerWidget._formatTimerDisplay', () => {
  let F;
  beforeEach(() => {
    F = loadFocusTimerWidget();
  });

  it('displays 25:00 for 1500 seconds (initial state)', () => {
    expect(F._formatTimerDisplay(1500)).toBe('25:00');
  });

  it('displays 00:00 for 0 seconds (complete state)', () => {
    expect(F._formatTimerDisplay(0)).toBe('00:00');
  });

  it('displays 01:30 for 90 seconds', () => {
    expect(F._formatTimerDisplay(90)).toBe('01:30');
  });

  it('displays 00:59 for 59 seconds', () => {
    expect(F._formatTimerDisplay(59)).toBe('00:59');
  });

  it('displays 10:00 for 600 seconds', () => {
    expect(F._formatTimerDisplay(600)).toBe('10:00');
  });
});

describe('FocusTimerWidget state machine', () => {
  let F;
  beforeEach(() => {
    vi.useFakeTimers();
    F = loadFocusTimerWidget();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises to IDLE state with 1500 seconds remaining', () => {
    expect(F.getState()).toBe('IDLE');
    expect(F.getRemainingSeconds()).toBe(1500);
  });

  it('transitions to RUNNING state after _start()', () => {
    F._start();
    expect(F.getState()).toBe('RUNNING');
  });

  it('_stop() from RUNNING transitions to PAUSED and preserves remaining time', () => {
    F._start();
    // Advance a few ticks to change remaining time
    vi.advanceTimersByTime(5000);
    const timeBeforeStop = F.getRemainingSeconds();
    F._stop();
    expect(F.getState()).toBe('PAUSED');
    expect(F.getRemainingSeconds()).toBe(timeBeforeStop);
  });

  it('_reset() from any state returns to IDLE with 1500 seconds', () => {
    // Start, then reset
    F._start();
    vi.advanceTimersByTime(3000);
    F._reset();
    expect(F.getState()).toBe('IDLE');
    expect(F.getRemainingSeconds()).toBe(1500);
  });

  it('_reset() from PAUSED returns to IDLE with 1500 seconds', () => {
    F._start();
    F._stop();
    F._reset();
    expect(F.getState()).toBe('IDLE');
    expect(F.getRemainingSeconds()).toBe(1500);
  });

  it('Start button is disabled in RUNNING state after _start()', () => {
    F._start();
    const startBtn = document.getElementById('timer-start');
    expect(startBtn.disabled).toBe(true);
  });

  it('Stop button is enabled in RUNNING state after _start()', () => {
    F._start();
    const stopBtn = document.getElementById('timer-stop');
    expect(stopBtn.disabled).toBe(false);
  });

  it('Start button is enabled in IDLE state on initial render', () => {
    // FocusTimerWidget starts in IDLE — call _render to set initial DOM state
    F._render();
    const startBtn = document.getElementById('timer-start');
    expect(startBtn.disabled).toBe(false);
  });

  it('Stop button is disabled in IDLE state on initial render', () => {
    F._render();
    const stopBtn = document.getElementById('timer-stop');
    expect(stopBtn.disabled).toBe(true);
  });

  it('shows #timer-notification when countdown reaches 00:00', () => {
    F._start();
    // Advance all 1500 seconds
    vi.advanceTimersByTime(1500 * 1000);
    const notif = document.getElementById('timer-notification');
    expect(notif.hasAttribute('hidden')).toBe(false);
    expect(F.getState()).toBe('COMPLETE');
    expect(F.getRemainingSeconds()).toBe(0);
  });

  it('_start() does nothing when state is COMPLETE', () => {
    // Drive timer to COMPLETE
    F._start();
    vi.advanceTimersByTime(1500 * 1000);
    expect(F.getState()).toBe('COMPLETE');
    // Calling _start again should be a no-op
    F._start();
    expect(F.getState()).toBe('COMPLETE');
  });

  it('_reset() hides #timer-notification', () => {
    // Drive to COMPLETE to show notification
    F._start();
    vi.advanceTimersByTime(1500 * 1000);
    expect(document.getElementById('timer-notification').hasAttribute('hidden')).toBe(false);
    // Reset should hide it
    F._reset();
    expect(document.getElementById('timer-notification').hasAttribute('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap helper for TodoListWidget
// ---------------------------------------------------------------------------

/**
 * Patch APP_SRC to expose TodoListWidget (and its dependencies) on globalThis.
 * _render() is a placeholder at this stage, so no DOM is required beyond
 * the storage-error-toast element that StorageUtil needs.
 */
function loadTodoListWidget() {
  document.body.innerHTML = '<div id="storage-error-toast" hidden></div>';
  const patched = APP_SRC
    .replace('const StorageUtil = (', 'globalThis.StorageUtil = (')
    .replace('const GreetingWidget = (', 'globalThis.GreetingWidget = (')
    .replace('const FocusTimerWidget = (', 'globalThis.FocusTimerWidget = (')
    .replace('const TodoListWidget = (', 'globalThis.TodoListWidget = (');
  // eslint-disable-next-line no-eval
  eval(patched);
  return globalThis.TodoListWidget;
}

// ---------------------------------------------------------------------------
// TodoListWidget._validate — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget._validate', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
  });

  it('accepts a plain one-word description', () => {
    expect(T._validate('Buy milk')).toEqual({ ok: true });
  });

  it('accepts a single non-whitespace character', () => {
    expect(T._validate('x')).toEqual({ ok: true });
  });

  it('accepts a description of exactly 500 characters', () => {
    expect(T._validate('a'.repeat(500))).toEqual({ ok: true });
  });

  it('rejects an empty string', () => {
    const result = T._validate('');
    expect(result.ok).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only string', () => {
    const result = T._validate('   \t\n  ');
    expect(result.ok).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects a description of 501 characters', () => {
    const result = T._validate('a'.repeat(501));
    expect(result.ok).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects null / undefined gracefully', () => {
    expect(T._validate(null).ok).toBe(false);
    expect(T._validate(undefined).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TodoListWidget.generateId — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget.generateId', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
  });

  it('returns a non-empty string', () => {
    expect(typeof T.generateId()).toBe('string');
    expect(T.generateId().length).toBeGreaterThan(0);
  });

  it('returns different values on successive calls', () => {
    const id1 = T.generateId();
    const id2 = T.generateId();
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// TodoListWidget._addTask — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget._addTask', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
    T.setTasks([]);
  });

  it('adds a task and returns { ok: true }', () => {
    const result = T._addTask('Write tests');
    expect(result).toEqual({ ok: true });
    expect(T.getTasks()).toHaveLength(1);
  });

  it('creates task with trimmed description and completed: false', () => {
    T._addTask('  Buy groceries  ');
    const task = T.getTasks()[0];
    expect(task.description).toBe('Buy groceries');
    expect(task.completed).toBe(false);
  });

  it('creates task with id and createdAt fields', () => {
    T._addTask('Task with id');
    const task = T.getTasks()[0];
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);
    expect(typeof task.createdAt).toBe('number');
  });

  it('accumulates multiple tasks in insertion order', () => {
    T._addTask('First');
    T._addTask('Second');
    T._addTask('Third');
    const descs = T.getTasks().map(t => t.description);
    expect(descs).toEqual(['First', 'Second', 'Third']);
  });

  it('rejects an empty description and does not mutate tasks[]', () => {
    const result = T._addTask('');
    expect(result.ok).toBe(false);
    expect(T.getTasks()).toHaveLength(0);
  });

  it('rejects a 501-character description and does not mutate tasks[]', () => {
    const result = T._addTask('a'.repeat(501));
    expect(result.ok).toBe(false);
    expect(T.getTasks()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TodoListWidget._editTask — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget._editTask', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
    T.setTasks([]);
    T._addTask('Original description');
  });

  it('updates description and returns { ok: true }', () => {
    const id = T.getTasks()[0].id;
    const result = T._editTask(id, 'Updated description');
    expect(result).toEqual({ ok: true });
    expect(T.getTasks()[0].description).toBe('Updated description');
  });

  it('trims the new description before saving', () => {
    const id = T.getTasks()[0].id;
    T._editTask(id, '  Trimmed  ');
    expect(T.getTasks()[0].description).toBe('Trimmed');
  });

  it('leaves id, completed, and createdAt unchanged', () => {
    const original = T.getTasks()[0];
    T._editTask(original.id, 'New description');
    const updated = T.getTasks()[0];
    expect(updated.id).toBe(original.id);
    expect(updated.completed).toBe(original.completed);
    expect(updated.createdAt).toBe(original.createdAt);
  });

  it('rejects an empty new description and leaves tasks unchanged', () => {
    const id = T.getTasks()[0].id;
    const result = T._editTask(id, '');
    expect(result.ok).toBe(false);
    expect(T.getTasks()[0].description).toBe('Original description');
  });

  it('returns error when id is not found', () => {
    const result = T._editTask('nonexistent-id', 'New description');
    expect(result.ok).toBe(false);
    expect(result.error.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TodoListWidget._toggleComplete — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget._toggleComplete', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
    T.setTasks([]);
    T._addTask('Toggle me');
  });

  it('flips completed from false to true', () => {
    const id = T.getTasks()[0].id;
    expect(T.getTasks()[0].completed).toBe(false);
    T._toggleComplete(id);
    expect(T.getTasks()[0].completed).toBe(true);
  });

  it('flips completed from true back to false (round-trip)', () => {
    const id = T.getTasks()[0].id;
    T._toggleComplete(id);
    T._toggleComplete(id);
    expect(T.getTasks()[0].completed).toBe(false);
  });

  it('does not affect other tasks in the list', () => {
    T._addTask('Untouched task');
    const idFirst = T.getTasks()[0].id;
    T._toggleComplete(idFirst);
    expect(T.getTasks()[1].completed).toBe(false);
  });

  it('no-ops silently for a non-existent id', () => {
    expect(() => T._toggleComplete('ghost-id')).not.toThrow();
    expect(T.getTasks()[0].completed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TodoListWidget._deleteTask — unit tests  (task 8.1)
// ---------------------------------------------------------------------------

describe('TodoListWidget._deleteTask', () => {
  let T;
  beforeEach(() => {
    localStorage.clear();
    T = loadTodoListWidget();
    T.setTasks([]);
    T._addTask('Task A');
    T._addTask('Task B');
    T._addTask('Task C');
  });

  it('removes the target task by id', () => {
    const idB = T.getTasks()[1].id;
    T._deleteTask(idB);
    const remaining = T.getTasks().map(t => t.description);
    expect(remaining).not.toContain('Task B');
  });

  it('decreases tasks length by exactly 1', () => {
    const id = T.getTasks()[0].id;
    T._deleteTask(id);
    expect(T.getTasks()).toHaveLength(2);
  });

  it('preserves the order of the remaining tasks', () => {
    const idA = T.getTasks()[0].id;
    T._deleteTask(idA);
    const descs = T.getTasks().map(t => t.description);
    expect(descs).toEqual(['Task B', 'Task C']);
  });

  it('no-ops gracefully for a non-existent id', () => {
    T._deleteTask('does-not-exist');
    expect(T.getTasks()).toHaveLength(3);
  });
});
