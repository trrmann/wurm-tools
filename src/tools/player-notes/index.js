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
        <div style="display: flex; gap: 0.5rem;">
          <button id="export-notes-btn" class="btn btn-secondary btn-sm">💾 Export JSON</button>
        </div>
      </div>

      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="color: var(--accent-gold); font-size: 0.9rem; margin-bottom: 0.75rem; text-transform: uppercase;">+ New Note or Task</h4>
        <div class="form-grid" style="margin-bottom: 0.75rem;">
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
        <div class="input-group" style="margin-bottom: 0.75rem;">
          <label class="input-label" for="note-text">Details / Coordinates / Supply List</label>
          <textarea id="note-text" class="custom-input" rows="2" placeholder="Coordinates, materials needed, notes..."></textarea>
        </div>
        <button id="add-note-btn" class="btn btn-primary btn-sm">+ Add Note</button>
      </div>

      <!-- Filter Chips -->
      <div class="chips-group" style="margin-bottom: 1.25rem;">
        <span style="font-size: 0.8rem; color: var(--text-dim); align-self: center;">Filter:</span>
        <button type="button" class="chip-btn active" data-filter="All">All</button>
        <button type="button" class="chip-btn" data-filter="Deed Tasks">Deed Tasks</button>
        <button type="button" class="chip-btn" data-filter="Mining & Veins">Mining & Veins</button>
        <button type="button" class="chip-btn" data-filter="Crafting Projects">Crafting Projects</button>
        <button type="button" class="chip-btn" data-filter="Skill Training">Skill Training</button>
      </div>

      <!-- Notes Grid -->
      <div id="notes-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
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
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-dim); font-size: 0.9rem;">
          No notes found in this category. Use the form above to add one!
        </div>
      `;
      return;
    }

    notesListEl.innerHTML = filtered
      .map((note) => {
        const priorityColor =
          note.priority === 'High'
            ? 'var(--accent-red)'
            : note.priority === 'Low'
              ? 'var(--text-dim)'
              : 'var(--accent-gold)';
        return `
        <div class="stat-card" style="padding: 1rem; opacity: ${note.completed ? '0.6' : '1'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); text-decoration: ${note.completed ? 'line-through' : 'none'};">
              ${note.title}
            </h4>
            <span style="font-size: 0.7rem; color: ${priorityColor}; font-weight: 700; border: 1px solid ${priorityColor}; padding: 0.1rem 0.4rem; border-radius: 4px;">
              ${note.priority}
            </span>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-dim); margin: 0.25rem 0 0.5rem;">
            ${note.category} • ${note.date}
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted); white-space: pre-wrap; line-height: 1.4; margin-bottom: 0.75rem; flex: 1;">
            ${note.text}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
            <label style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
              <input type="checkbox" class="chk-complete" data-id="${note.id}" ${note.completed ? 'checked' : ''}> Completed
            </label>
            <button type="button" class="btn-delete-note" data-id="${note.id}" style="background: none; border: none; color: var(--accent-red); cursor: pointer; font-size: 0.78rem;">Delete</button>
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
