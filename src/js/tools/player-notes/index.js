// Player Notes & Task Log Module
import template from './template.html?raw';
import { fill, getShell, getTemplate } from '../../modules/template.js';
export const toolMetadata = {
  id: 'player-notes',
  name: 'Settlement & Player Notes',
  category: 'Settlement',
  icon: '📝',
  description:
    'Keep track of deed construction tasks, prospecting veins, skill goals, and project checklists.',
};

export function unmount() {
  // Cleanup if needed
}

export function mount(container) {
  let activeFilter = 'All';

  function getNotes() {
    return JSON.parse(localStorage.getItem('wurm_player_notes') || '[]');
  }

  function saveNotes(notes) {
    localStorage.setItem('wurm_player_notes', JSON.stringify(notes));
  }

  // Pre-populate with starter sample if empty
  if (getNotes().length === 0) {
    saveNotes([
      {
        id: '1',
        title: 'Stone House Expansion',
        category: 'Deed Tasks',
        priority: 'High',
        completed: false,
        text: 'Need 120 stone bricks and 40 mortar for the south deed wall extension.',
        date: new Date().toLocaleDateString(),
      },
      {
        id: '2',
        title: 'High Quality Iron Vein',
        category: 'Mining & Veins',
        priority: 'Medium',
        completed: false,
        text: 'Found 78QL iron vein at tile (1420, 1180), 4 tiles underground.',
        date: new Date().toLocaleDateString(),
      },
    ]);
  }

  container.innerHTML = fill(getShell(template), {});
  const noteTpl = getTemplate(template, 'note-template');
  const emptyTpl = getTemplate(template, 'notes-empty-template');

  const notesListEl = container.querySelector('#notes-container');

  function renderNotes() {
    const notes = getNotes();
    const filtered =
      activeFilter === 'All' ? notes : notes.filter((n) => n.category === activeFilter);

    if (filtered.length === 0) {
      notesListEl.innerHTML = emptyTpl;
      return;
    }

    notesListEl.innerHTML = filtered
      .map((note) => {
        const priorityClass =
          note.priority === 'High'
            ? 'priority-high'
            : note.priority === 'Low'
              ? 'priority-low'
              : 'priority-normal';
        return fill(noteTpl, {
          ...note,
          priorityClass,
          done: note.completed ? 'completed' : '',
          checked: note.completed ? 'checked' : '',
        });
      })
      .join('');

    // Toggle complete
    notesListEl.querySelectorAll('.chk-complete').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const notes = getNotes();
        const found = notes.find((n) => n.id === id);
        if (found) {
          found.completed = e.target.checked;
          saveNotes(notes);
          renderNotes();
        }
      });
    });

    // Delete note
    notesListEl.querySelectorAll('.btn-delete-note').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const notes = getNotes().filter((n) => n.id !== id);
        saveNotes(notes);
        renderNotes();
      });
    });
  }

  // Filter chips
  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderNotes();
    });
  });

  // Add Note
  container.querySelector('#add-note-btn').addEventListener('click', () => {
    const titleInput = container.querySelector('#note-title');
    const categorySelect = container.querySelector('#note-category');
    const prioritySelect = container.querySelector('#note-priority');
    const textInput = container.querySelector('#note-text');

    const title = titleInput.value.trim();
    if (!title) {
      alert('Please enter a note title.');
      return;
    }

    const newNote = {
      id: Date.now().toString(),
      title,
      category: categorySelect.value,
      priority: prioritySelect.value,
      completed: false,
      text: textInput.value.trim(),
      date: new Date().toLocaleDateString(),
    };

    const notes = getNotes();
    notes.unshift(newNote);
    saveNotes(notes);

    titleInput.value = '';
    textInput.value = '';
    renderNotes();
  });

  // Export
  container.querySelector('#export-notes-btn').addEventListener('click', () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(getNotes(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `wurm-tools-notes-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  renderNotes();
}
