import { el, readStore, writeStore, showToast } from "../ui.js";

const STORE_KEY = "pocket:notes";

export const meta = {
  id: "notes",
  name: "Notes",
  glyphClass: "notes",
  dock: true,
  icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#7a5300" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5z"/></svg>',
};

export function mount(container, ctx) {
  let notes = readStore(STORE_KEY, []);
  let openId = null;

  function save() {
    writeStore(STORE_KEY, notes);
  }

  function titleOf(note) {
    const firstLine = (note.body.split("\n")[0] || "").trim();
    return firstLine || "New note";
  }

  function previewOf(note) {
    const rest = note.body.split("\n").slice(1).join(" ").trim();
    return rest || "No additional text";
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderList() {
    container.innerHTML = "";
    ctx.setActions([
      el("button", { class: "btn btn-primary", text: "+ New", onclick: () => { createNote(); } }),
    ]);

    if (notes.length === 0) {
      container.appendChild(el("div", { class: "empty-state" }, [
        el("div", { text: "No notes yet." }),
        el("button", { class: "btn btn-primary", text: "Write your first note", onclick: () => createNote() }),
      ]));
      return;
    }

    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    const list = el("ul", { class: "notes-list" });
    for (const note of sorted) {
      list.appendChild(el("li", { class: "note-item", onclick: () => openNote(note.id) }, [
        el("div", { class: "note-text" }, [
          el("div", { class: "note-title", text: titleOf(note) }),
          el("div", { class: "note-preview", text: previewOf(note) }),
        ]),
        el("span", { class: "note-time", text: fmtTime(note.updatedAt) }),
        el("button", {
          class: "note-del",
          "aria-label": "Delete note",
          html: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
          onclick: (e) => { e.stopPropagation(); deleteNote(note.id); },
        }),
      ]));
    }
    container.appendChild(list);
  }

  function createNote() {
    const note = { id: `n${Date.now()}`, body: "", updatedAt: Date.now() };
    notes.push(note);
    save();
    openNote(note.id);
  }

  function deleteNote(id) {
    notes = notes.filter((n) => n.id !== id);
    save();
    renderList();
    showToast("Note deleted");
  }

  function openNote(id) {
    openId = id;
    renderEditor();
  }

  function renderEditor() {
    container.innerHTML = "";
    const note = notes.find((n) => n.id === openId);
    if (!note) { renderList(); return; }

    ctx.setActions([
      el("button", { class: "btn btn-outline", text: "Notes", onclick: () => { openId = null; renderList(); } }),
      el("button", { class: "btn btn-danger", text: "Delete", onclick: () => deleteNote(note.id) }),
    ]);

    const textarea = el("textarea", {
      class: "field",
      placeholder: "Start typing…",
      oninput: (e) => {
        note.body = e.target.value;
        note.updatedAt = Date.now();
        save();
      },
    });
    textarea.value = note.body;
    container.appendChild(el("div", { class: "note-editor" }, [textarea]));
    setTimeout(() => textarea.focus(), 50);
  }

  renderList();

  return function unmount() {
    ctx.setActions([]);
  };
}
