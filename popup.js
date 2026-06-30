let tasks = [], notes = [];
let settings = { theme: 'dark', defaultView: 'tasks' };
let filter = 'all', sort = 'created', search = '', activeNoteId = null, loadedNoteId = null;

const $ = (id) => document.getElementById(id);
const save = (key, val) => chrome.storage.local.set({ [key]: val });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const tagColor = (tag) => `hsl(${{work:205,personal:145,shopping:35,health:100,finance:20,ideas:280,research:195}[tag] ?? 230}, 90%, 65%)`;
const isOverdue = (iso) => !!iso && new Date(iso) < new Date();
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), opts = { hour: '2-digit', minute: '2-digit' };
  if (d.toDateString() === now.toDateString()) return `Today ${d.toLocaleTimeString([], opts)}`;
  if (d.toDateString() === new Date(now.getTime() + 86400000).toDateString()) return `Tomorrow ${d.toLocaleTimeString([], opts)}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], opts);
};

function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.hidden = true, ms);
}

document.addEventListener('DOMContentLoaded', async () => {
  const r = await chrome.storage.local.get(['tasks', 'notes', 'settings']);
  tasks = r.tasks || [];
  notes = r.notes || [];
  settings = r.settings || settings;
  applySettings();
  switchTab(settings.defaultView || 'tasks');
  render();
  bindEvents();
});

function applySettings() {
  document.body.className = `theme-${settings.theme || 'dark'}`;
  if ($('themeSelect')) $('themeSelect').value = settings.theme || 'dark';
  if ($('defaultViewSelect')) $('defaultViewSelect').value = settings.defaultView || 'tasks';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('tasksPanel').classList.toggle('hidden', tab !== 'tasks');
  $('notesPanel').classList.toggle('hidden', tab !== 'notes');
}

function render() {
  renderTasks();
  renderNotes();
  $('taskCount').textContent = tasks.filter(t => !t.completed).length;
  $('noteCount').textContent = notes.length;
}

function visibleTasks() {
  let list = tasks.filter(t =>
    (!search || t.title.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || (filter === 'active' && !t.completed) || (filter === 'completed' && t.completed) || (filter === 'high' && t.priority === 'high'))
  );
  const cmp = {
    priority: (a, b) => ({ high:0, medium:1, low:2, none:3 }[a.priority||'none']) - ({ high:0, medium:1, low:2, none:3 }[b.priority||'none']),
    due: (a, b) => (a.due ? new Date(a.due) : Infinity) - (b.due ? new Date(b.due) : Infinity),
    alpha: (a, b) => a.title.localeCompare(b.title),
    created: (a, b) => b.createdAt - a.createdAt,
  }[sort];
  list.sort(cmp);
  list.sort((a, b) => a.completed - b.completed);
  return list;
}

function renderTasks() {
  const list = visibleTasks(), root = $('taskList');
  root.querySelectorAll('.task-item').forEach(el => el.remove());
  $('taskEmpty').hidden = list.length > 0;
  $('taskFooter').hidden = list.length === 0;
  if (list.length) {
    $('taskSummary').textContent = `${tasks.filter(t => !t.completed).length} remaining`;
    list.forEach(t => root.appendChild(buildTaskEl(t)));
  }
  $('clearCompletedBtn').style.display = tasks.some(t => t.completed) ? '' : 'none';
}

function buildTaskEl(t) {
  const el = document.createElement('div');
  el.className = 'task-item' + (t.completed ? ' completed' : '');
  el.dataset.id = t.id;
  const overdue = !t.completed && isOverdue(t.due);
  const due = t.due ? fmtDate(t.due) : '';
  el.innerHTML = `
    <div class="priority-dot priority-${t.priority || 'none'}"></div>
    <div class="task-check" data-action="toggle">
      <svg class="task-check-icon" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="task-body">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta">
        ${t.tag ? `<span class="task-tag" style="--tag-color:${tagColor(t.tag)}">${t.tag}</span>` : ''}
        ${due ? `<span class="task-due ${overdue ? 'overdue' : ''}"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>${esc(due)}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn" data-action="edit" title="Edit"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5L9 2.5l1.5 1.5-7 7H2v-1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></button>
      <button class="icon-btn danger" data-action="delete" title="Delete"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 5.5v4M7.5 5.5v4M2.5 3.5l.6 7h6.8l.6-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>`;
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'toggle') toggleTask(t.id);
    if (action === 'delete') deleteTask(t.id);
    if (action === 'edit') editTask(t.id);
  });
  return el;
}

function addTask(title, priority, tag, due) {
  if (!title.trim()) return;
  const task = { id: uid(), title: title.trim(), completed: false, priority: priority || 'none', tag: tag || '', due: due || '', createdAt: Date.now() };
  tasks.unshift(task);
  save('tasks', tasks);
  if (due) {
    const when = new Date(due).getTime();
    if (when > Date.now()) chrome.alarms.create(`task-reminder-${task.id}`, { when });
  }
  render();
  toast('Task added');
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completed = !t.completed;
  t.completedAt = t.completed ? Date.now() : null;
  save('tasks', tasks); render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save('tasks', tasks); render(); toast('Task deleted');
}

function editTask(id) {
  const t = tasks.find(t => t.id === id);
  const title = t && prompt('Edit task:', t.title);
  if (!title?.trim()) return;
  t.title = title.trim();
  save('tasks', tasks); render(); toast('Task updated');
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  save('tasks', tasks); render(); toast('Cleared completed tasks');
}

function visibleNotes() {
  const tag = $('noteTagFilter')?.value || '';
  return notes
    .filter(n => (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())) && (!tag || n.tag === tag))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderNotes() {
  const list = visibleNotes(), root = $('noteList');
  root.querySelectorAll('.note-list-item').forEach(el => el.remove());
  $('noteEmpty').hidden = list.length > 0;
  list.forEach(n => root.appendChild(buildNoteEl(n)));

  if (activeNoteId && activeNoteId !== loadedNoteId) {
    const note = notes.find(n => n.id === activeNoteId);
    note ? loadNoteInEditor(note) : closeNoteEditor();
  } else if (!activeNoteId) {
    loadedNoteId = null;
  }
}

function buildNoteEl(n) {
  const div = document.createElement('div');
  div.className = 'note-list-item' + (n.id === activeNoteId ? ' active' : '');
  const preview = n.body.replace(/<[^>]+>/g, '').slice(0, 40);
  div.innerHTML = `
    <div class="nl-title">${esc(n.title || 'Untitled')}</div>
    <div class="nl-preview">${esc(preview) || '—'}</div>
    <div class="nl-date">${new Date(n.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>`;
  div.addEventListener('click', () => { activeNoteId = n.id; renderNotes(); });
  return div;
}

function loadNoteInEditor(n) {
  $('noteEditor').hidden = false;
  $('noteTitleInput').value = n.title || '';
  $('noteBody').innerHTML = n.body || '';
  $('noteTagSelect').value = n.tag || '';
  $('noteLastSaved').textContent = 'Last saved ' + new Date(n.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  loadedNoteId = n.id;
}

function closeNoteEditor() {
  activeNoteId = loadedNoteId = null;
  $('noteEditor').hidden = true;
}

function newNote() {
  const note = { id: uid(), title: '', body: '', tag: '', createdAt: Date.now(), updatedAt: Date.now() };
  notes.unshift(note);
  save('notes', notes);
  activeNoteId = note.id;
  renderNotes();
  setTimeout(() => $('noteTitleInput').focus(), 50);
}

function saveCurrentNote() {
  const n = notes.find(n => n.id === activeNoteId);
  if (!n) return;
  n.title = $('noteTitleInput').value.trim() || 'Untitled';
  n.body = $('noteBody').innerHTML;
  n.tag = $('noteTagSelect').value;
  n.updatedAt = Date.now();
  save('notes', notes);
  renderNotes();
  $('noteLastSaved').textContent = 'Last saved ' + new Date(n.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  toast('Note saved');
}

function deleteCurrentNote() {
  if (!activeNoteId || !confirm('Delete this note?')) return;
  notes = notes.filter(n => n.id !== activeNoteId);
  save('notes', notes); closeNoteEditor(); renderNotes(); toast('Note deleted');
}

function exportData() {
  const blob = new Blob([JSON.stringify({ tasks, notes, settings, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `noted-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Data exported');
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.tasks)) save('tasks', tasks = data.tasks);
      if (Array.isArray(data.notes)) save('notes', notes = data.notes);
      render();
      toast('Data imported successfully');
    } catch { toast('Import failed: invalid file'); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Clear ALL tasks and notes? This cannot be undone.')) return;
  tasks = []; notes = [];
  save('tasks', tasks); save('notes', notes);
  closeNoteEditor(); render(); toast('All data cleared');
}

let sortMenuEl = null;
function toggleSortMenu() {
  if (sortMenuEl) return closeSortMenu();
  const opts = [['created', 'Date created'], ['priority', 'Priority'], ['due', 'Due date'], ['alpha', 'Alphabetical']];
  sortMenuEl = document.createElement('div');
  sortMenuEl.className = 'sort-menu';
  sortMenuEl.innerHTML = opts.map(([val, label]) =>
    `<button class="sort-menu-item${sort === val ? ' active' : ''}" data-val="${val}">${label}</button>`).join('');
  sortMenuEl.addEventListener('click', (e) => {
    const val = e.target.dataset.val;
    if (val) { sort = val; closeSortMenu(); renderTasks(); }
  });
  $('app').appendChild(sortMenuEl);
  setTimeout(() => document.addEventListener('click', outsideSort), 0);
}
function closeSortMenu() {
  sortMenuEl?.remove();
  sortMenuEl = null;
  document.removeEventListener('click', outsideSort);
}
function outsideSort(e) { if (sortMenuEl && !sortMenuEl.contains(e.target)) closeSortMenu(); }

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  const searchBar = $('searchBar'), searchInput = $('searchInput');
  $('searchToggle').addEventListener('click', () => {
    searchBar.hidden = !searchBar.hidden;
    $('searchToggle').classList.toggle('active', !searchBar.hidden);
    if (searchBar.hidden) { search = ''; render(); } else setTimeout(() => searchInput.focus(), 50);
  });
  $('searchClose').addEventListener('click', () => { searchBar.hidden = true; $('searchToggle').classList.remove('active'); search = ''; render(); });
  searchInput.addEventListener('input', () => { search = searchInput.value; render(); });

  const taskInput = $('taskInput'), metaRow = $('taskMetaRow');
  taskInput.addEventListener('input', () => metaRow.hidden = !taskInput.value.trim());
  const submitTask = () => {
    addTask(taskInput.value, $('taskPriority').value, $('taskTag').value, $('taskDue').value);
    taskInput.value = '';
    metaRow.hidden = true;
    $('taskPriority').value = 'none';
    $('taskTag').value = '';
    $('taskDue').value = '';
  };
  $('addTaskBtn').addEventListener('click', submitTask);
  taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTask(); });

  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    renderTasks();
  }));

  $('sortBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleSortMenu(); });
  $('clearCompletedBtn').addEventListener('click', clearCompleted);

  $('newNoteBtn').addEventListener('click', newNote);
  $('saveNoteBtn').addEventListener('click', saveCurrentNote);
  $('deleteNoteBtn').addEventListener('click', deleteCurrentNote);
  $('noteTagFilter').addEventListener('change', renderNotes);

  let autoSave;
  const queueAutoSave = () => { clearTimeout(autoSave); autoSave = setTimeout(saveCurrentNote, 1500); };
  $('noteTitleInput').addEventListener('input', queueAutoSave);
  $('noteBody').addEventListener('input', queueAutoSave);

  document.querySelectorAll('.fmt-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
    $('noteBody').focus();
  }));

  $('settingsToggle').addEventListener('click', () => { $('settingsPanel').hidden = false; applySettings(); });
  $('settingsClose').addEventListener('click', () => $('settingsPanel').hidden = true);
  $('themeSelect').addEventListener('change', (e) => { settings.theme = e.target.value; save('settings', settings); applySettings(); });
  $('defaultViewSelect').addEventListener('change', (e) => { settings.defaultView = e.target.value; save('settings', settings); });
  $('exportBtn').addEventListener('click', exportData);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => { importData(e.target.files[0]); e.target.value = ''; });
  $('clearAllBtn').addEventListener('click', clearAllData);
}
