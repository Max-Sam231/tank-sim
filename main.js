import { TankState } from './js/TankState.js';
import { UIController } from './js/UIController.js';
import { FullscreenManager } from './js/FullscreenManager.js';
import { StartMenu } from './js/StartMenu.js';
import { TrainingEngine } from './js/TrainingEngine.js';
import { FinishReportModal } from './js/FinishReportModal.js';

const APP_MODE = "prod";
const IS_DEBUG = APP_MODE === "debug";

function bootstrap() {
  const sceneEl = document.getElementById("scene");
  const consoleEl = document.getElementById("debugConsole");
  const startMenuContainerEl = document.getElementById("startMenuContainer");
  const finishBtnEl = document.getElementById("simFinishButton");

  if (!sceneEl || !consoleEl || !startMenuContainerEl) return;

  document.body.classList.toggle("app-debug", IS_DEBUG);
  document.body.classList.toggle("app-prod", !IS_DEBUG);

  const state = new TankState();
  const ui = new UIController({ rootEl: sceneEl, consoleEl, state, isDebug: IS_DEBUG });

  const training = new TrainingEngine({ state });

  const reportModal = new FinishReportModal({
    onContinue: () => {
      startLoop();
    },
    onMenu: () => {
      stopLoop();
      startMenu.show();
    },
  });

  let rafId = null;
  let isLoopRunning = false;
  const startLoop = () => {
    if (isLoopRunning) return;
    isLoopRunning = true;
    let lastTs = performance.now();
    const loop = (ts) => {
      if (!isLoopRunning) return;
      const dt = Math.max(0, (ts - lastTs) / 1000);
      lastTs = ts;
      state.tick(dt);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    isLoopRunning = false;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const startMenu = new StartMenu({
    rootEl: startMenuContainerEl,
    onTrainingStart: ({ startMethod, ambientTemp }) => {
      stopLoop();
      state.setScenario({ startMethod, ambientTempC: ambientTemp });
      state.reset();
      training.setGoal({ startMethod, ambientTempC: ambientTemp });
      startMenu.hide();
      startLoop();
    },
    onInstruction: () => {
      // Placeholder for instruction logic
    },
  });

  if (finishBtnEl) {
    finishBtnEl.addEventListener("click", () => {
      stopLoop();
      reportModal.show(training.getReport());
    });
  }

  // Setup fullscreen and instrument panel
  FullscreenManager.setup();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
