/**
 * notes.js — Persistent Evidence Log
 *
 * Manages the evidenceNotes array and its compact Notes drawer/modal.
 * Notes are never erased when the modal closes.
 */
import { evidenceNotes } from "../state.js";

/**
 * Opens or closes the notes modal.
 */
export function toggleNotesModal() {
  const modal = document.getElementById("notesModal");
  if (!modal) return;
  modal.classList.toggle("open");
  if (modal.classList.contains("open")) {
    renderNotesModal();
  }
}

export function closeNotesModal() {
  const modal = document.getElementById("notesModal");
  if (modal) modal.classList.remove("open");
}

/**
 * Renders the evidence notes list inside the notes modal.
 * Called whenever the modal opens or notes change.
 */
export function renderNotesModal() {
  const container = document.getElementById("notesModalBody");
  if (!container) return;

  const badge = document.getElementById("notesBadge");
  if (badge) badge.textContent = evidenceNotes.length;

  if (evidenceNotes.length === 0) {
    container.innerHTML = `<p class="notes-empty">No cheating evidence logged yet. Use Star Platinum if you spot suspicious dealing.</p>`;
    return;
  }
  container.innerHTML = "";
  evidenceNotes.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-entry";
    div.innerHTML = `
      <div class="note-entry-title">📌 ${note.title}</div>
      <div class="note-entry-body">${note.body}</div>
    `;
    container.appendChild(div);
  });
}

/**
 * Shows a brief toast notification when a new note is added.
 */
export function showNoteToast(title) {
  let toast = document.getElementById("noteToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "noteToast";
    toast.className = "note-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = `📌 Note Saved: ${title}`;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 3200);
}
