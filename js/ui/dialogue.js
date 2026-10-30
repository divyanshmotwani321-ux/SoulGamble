/**
 * dialogue.js — Dialogue Queue and Text Rendering
 *
 * Uses the shared dialogueQueue (Queue data structure) to
 * sequence dramatic dialogue beats.
 */
import { dialogueQueue } from "../state.js";

/**
 * Enqueues then immediately dequeues a dialogue line (direct display).
 * The queue size hint remains visible in the UI for the inspector.
 */
export function setDialogue(speaker, text) {
  dialogueQueue.enqueue({ speaker, text });
  const current = dialogueQueue.dequeue();
  const speakerEl = document.getElementById("dialogueSpeaker");
  const textEl    = document.getElementById("dialogueText");
  if (speakerEl) speakerEl.textContent = current.speaker;
  if (textEl)    textEl.textContent    = current.text;
}

export function setConsequencePreview(text) {
  const el = document.getElementById("consequencePreview");
  if (el) el.textContent = text;
}
