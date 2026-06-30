# Noted – Tasks & Notes

A simple Chrome/Edge extension for quick tasks and notes, right from your toolbar.

## Installation (unpacked / developer mode)

1. Unzip this extension folder somewhere on your computer.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked**.
5. Select the `extension` folder (the one containing `manifest.json`).
6. Pin the Noted icon to your toolbar for easy access.

## Updating

If you make changes to the files (or replace them with a new version), go back to
`chrome://extensions` and click the **reload icon** on the Noted card — no need to
remove and re-add it.

## Features

### Tasks
- Quick-add a task with title, priority (low/medium/high), tag, and due date.
- Filter by All / Active / Done / High priority.
- Sort by date created, priority, due date, or alphabetically.
- Click the checkbox to mark complete, edit, or delete a task.
- "Clear completed" removes all finished tasks at once.
- Tasks with a due date get a reminder via Chrome notifications.

### Notes
- Click **+** to create a new note.
- Rich text editor: bold, italic, underline, bullet/numbered lists, clear formatting.
- Tag notes (Work, Personal, Ideas, Research) and filter by tag.
- Notes auto-save 1.5s after you stop typing, or click "Save note" manually.

### Search
Click the search icon in the header to search across tasks and notes.

### Settings
Click the gear icon to:
- Switch theme (Dark / Light / Midnight)
- Pick an accent color
- Set which tab opens by default
- Export all data to a JSON backup file
- Import data from a JSON backup file
- Clear all data (tasks + notes) — cannot be undone

## Data storage

All tasks, notes, and settings are stored locally using `chrome.storage.local`.
Nothing is sent to any server. Use **Export** in Settings to back up your data,
and **Import** to restore it (e.g., after reinstalling or moving to another machine).

## Permissions used

- `storage` — saves your tasks/notes/settings locally
- `alarms` — schedules due-date reminders
- `notifications` — shows the reminder notification when a task is due

## Troubleshooting

- **Nothing shows up / popup looks broken**: reload the extension from
  `chrome://extensions` after any file changes.
- **Reminders don't fire**: make sure notifications are allowed for Chrome in your
  OS settings, and that the browser is running (Chrome alarms don't fire if the
  browser is fully closed).
