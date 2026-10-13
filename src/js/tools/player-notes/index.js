// Player Notes & Task Log Module
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

  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-header-block">
        <div>
          <h2><span>📝</span> Settlement & Player Notes</h2>
          <p>Organize prospecting veins, building supplies, skill benchmarks, and deed chores with local persistence.</p>
        </div>
        <div class="notes-header-actions">
          <button id="export-notes-btn" class="btn btn-secondary btn-sm">💾 Export JSON</button>
        </div>
      </div>

      <div class="notes-form-box">
        <h4 class="notes-section-title">+ New Note or Task</h4>
        <div class="form-grid notes-form-grid">
          <div class="input-group">
            <label class="input-label" for="note-title">Title / Objective</label>
            <input type="text" id="note-title" class="custom-input" placeholder="e.g., Forge 50QL Steel Anvil">
          </div>
          <div class="input-group">
            <label class="input-label" for="note-category">Category</label>
            <select id="note-category" class="custom-select">
              <option value="Deed Tasks">Deed Tasks</option>
              <option value="Mining & Veins">Mining & Veins</option>
              <option value="Crafting Projects">Crafting Projects</option>
              <option value="Skill Training">Skill Training</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label" for="note-priority">Priority</label>
            <select id="note-priority" class="custom-select">
              <option value="Normal">Normal</option>
              <option value="High">High Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>
        <div class="input-group notes-input-group-spaced">
          <label class="input-label" for="note-text">Details / Coordinates / Supply List</label>
          <textarea id="note-text" class="custom-input" rows="2" placeholder="Coordinates, materials needed, notes..."></textarea>
        </div>
        <button id="add-note-btn" class="btn btn-primary btn-sm">+ Add Note</button>
      </div>

      <!-- Filter Chips -->
      <div class="chips-group notes-filter-chips">
        <span class="notes-filter-label">Filter:</span>
        <button type="button" class="chip-btn active" data-filter="All">All</button>
        <button type="button" class="chip-btn" data-filter="Deed Tasks">Deed Tasks</button>
        <button type="button" class="chip-btn" data-filter="Mining & Veins">Mining & Veins</button>
        <button type="button" class="chip-btn" data-filter="Crafting Projects">Crafting Projects</button>
        <button type="button" class="chip-btn" data-filter="Skill Training">Skill Training</button>
      </div>

      <!-- Notes Grid -->
      <div id="notes-container" class="notes-grid">
        <!-- Dynamically rendered -->
      </div>
    </div>
  `;

  const notesListEl = container.querySelector('#notes-container');

  function renderNotes() {
    const notes = getNotes();
    const filtered =
      activeFilter === 'All' ? notes : notes.filter((n) => n.category === activeFilter);

    if (filtered.length === 0) {
      notesListEl.innerHTML = `
        <div class="notes-empty-state">
          No notes found in this category. Use the form above to add one!
        </div>
      `;
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
        return `
        <div class="stat-card notes-card ${note.completed ? 'completed' : ''}">
          <div class="notes-card-header">
            <h4 class="notes-card-title ${note.completed ? 'completed' : ''}">
              ${note.title}
            </h4>
            <span class="notes-priority-badge ${priorityClass}">
              ${note.priority}
            </span>
          </div>

          <div class="notes-meta">
            ${note.category} • ${note.date}
          </div>

          <div class="notes-body-text">
            ${note.text}
          </div>

          <div class="notes-footer-row">
            <label class="notes-checkbox-label">
              <input type="checkbox" class="chk-complete" data-id="${note.id}" ${note.completed ? 'checked' : ''}> Completed
            </label>
            <button type="button" class="btn-delete-note" data-id="${note.id}">Delete</button>
          </div>
        </div>
      `;
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
