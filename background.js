// Background service worker for Noted extension

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('task-reminder-')) {
    const taskId = alarm.name.replace('task-reminder-', '');
    const result = await chrome.storage.local.get('tasks');
    const tasks = result.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Task Reminder – Noted',
        message: task.title,
        priority: 2
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['tasks', 'notes', 'settings'], (result) => {
    if (!result.tasks) chrome.storage.local.set({ tasks: [] });
    if (!result.notes) chrome.storage.local.set({ notes: [] });
    if (!result.settings) {
      chrome.storage.local.set({
        settings: { theme: 'dark', defaultView: 'tasks' }
      });
    }
  });
});
