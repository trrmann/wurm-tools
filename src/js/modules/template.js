// Minimal HTML template helpers: markup lives in .html files, JS only supplies data.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// {{key}} is HTML-escaped, {{{key}}} is inserted as-is (for pre-rendered fragments).
export function fill(template, data = {}) {
  return template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => String(data[key] ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(data[key]));
}

// Returns the markup of <template id="..."> found inside a raw HTML document/fragment.
export function getTemplate(raw, id) {
  const holder = document.createElement('template');
  holder.innerHTML = raw;
  const tpl = holder.content.querySelector(`template#${id}`);
  return tpl ? tpl.innerHTML : '';
}

// Returns the raw markup with every nested <template> removed (the visible shell).
export function getShell(raw) {
  const holder = document.createElement('template');
  holder.innerHTML = raw;
  holder.content.querySelectorAll('template').forEach((t) => t.remove());
  const div = document.createElement('div');
  div.append(holder.content);
  return div.innerHTML;
}
