/**
 * main.js — Application Entry Point
 *
 * Initialises the application, wires event listeners, and starts the game.
 * All heavy logic lives in the imported modules.
 */
import { resetFullGame, restoreFinalShowdownCheckpoint, resolveCallOutQTE } from "./systems/gameFlow.js";
import { handleStarPlatinumActivation } from "./abilities/starPlatinum.js";
import { handleAskAvdol, registerAvdolCallback } from "./abilities/avdol.js";
import { updateAllUI } from "./ui/render.js";
import { toggleNotesModal, renderNotesModal } from "./ui/notes.js";
import { SoundFX } from "./systems/soundFX.js";
import { GameData } from "./state.js";

/* ------------------------------------------------------------------
   DOMContentLoaded
   ------------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {

  /* -------- Avdol callback: update UI after advice -------- */
  registerAvdolCallback(() => updateAllUI());

  /* -------- Star Platinum button -------- */
  document.getElementById("btnStarPlatinum")
    ?.addEventListener("click", handleStarPlatinumActivation);

  /* -------- Ask Avdol button -------- */
  document.getElementById("btnAskAvdol")
    ?.addEventListener("click", handleAskAvdol);

  /* -------- QTE Call Out Cheat button -------- */
  document.getElementById("btnCallOutCheat")
    ?.addEventListener("click", () => resolveCallOutQTE(true));

  /* -------- Evidence Modal: close → launch QTE -------- */
  document.getElementById("btnCloseEvidenceModal")
    ?.addEventListener("click", () => {
      document.getElementById("evidenceModal")?.classList.remove("open");
      // Import gameFlow lazily to avoid top-level circular dependency
      import("./systems/gameFlow.js").then(({ startCallOutQTE, stateMachine: sm }) => {
        // Re-check state after modal closes
        import("./state.js").then(({ stateMachine }) => {
          if (stateMachine.currentState === "CHEATING_SEQUENCE") {
            startCallOutQTE();
          }
        });
      });
    });

  /* -------- Review Evidence Diagram -------- */
  document.getElementById("btnReviewDiagram")
    ?.addEventListener("click", () => {
      document.getElementById("evidenceModal")?.classList.add("open");
    });

  /* -------- Notes modal -------- */
  document.getElementById("btnToggleNotes")
    ?.addEventListener("click", toggleNotesModal);
  document.getElementById("btnCloseNotes")
    ?.addEventListener("click", () => {
      document.getElementById("notesModal")?.classList.remove("open");
    });

  /* -------- DS Inspector -------- */
  const inspectorDrawer = document.getElementById("dsInspectorDrawer");
  const inspectorBtn    = document.getElementById("btnToggleInspector");

  function toggleInspector() {
    inspectorDrawer?.classList.toggle("open");
    inspectorBtn?.classList.toggle("active-toggle");
    import("./ui/render.js").then(({ updateInspectorPanel }) => updateInspectorPanel());
  }
  inspectorBtn?.addEventListener("click", toggleInspector);
  document.getElementById("btnCloseInspector")?.addEventListener("click", toggleInspector);

  /* -------- Audio toggle -------- */
  const audioBtn = document.getElementById("btnToggleAudio");
  audioBtn?.addEventListener("click", () => {
    SoundFX.enabled = !SoundFX.enabled;
    audioBtn.textContent = SoundFX.enabled ? "🔊 SFX: ON" : "🔇 SFX: OFF";
  });

  /* -------- Rules modal -------- */
  document.getElementById("btnOpenRules")
    ?.addEventListener("click", () => document.getElementById("rulesModal")?.classList.add("open"));
  document.getElementById("btnCloseRulesModal")
    ?.addEventListener("click", () => document.getElementById("rulesModal")?.classList.remove("open"));

  /* -------- Restart / Retry -------- */
  document.getElementById("btnRestartGame")
    ?.addEventListener("click", resetFullGame);
  document.getElementById("btnEndingRestart")
    ?.addEventListener("click", resetFullGame);
  document.getElementById("btnRetryFinalHand")
    ?.addEventListener("click", restoreFinalShowdownCheckpoint);

  /* -------- Keyboard shortcuts -------- */
  window.addEventListener("keydown", e => {
    if (e.code === "Space" && GameData.timingActive) {
      e.preventDefault();
      handleStarPlatinumActivation();
    } else if ((e.key === "e" || e.key === "E") && GameData.qteActive) {
      e.preventDefault();
      resolveCallOutQTE(true);
    } else if (e.key === "a" || e.key === "A") {
      handleAskAvdol();
    } else if (e.key === "i" || e.key === "I") {
      toggleInspector();
    } else if (e.key === "n" || e.key === "N") {
      toggleNotesModal();
    }
  });

  /* -------- Click outside modals to close -------- */
  ["rulesModal", "notesModal"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) {
        document.getElementById(id).classList.remove("open");
      }
    });
  });

  /* -------- Start the game -------- */
  resetFullGame();
});
