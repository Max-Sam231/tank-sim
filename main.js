import { TankState } from './js/TankState.js';
import { UIController } from './js/UIController.js';
import { FullscreenManager } from './js/FullscreenManager.js';
import { StartMenu } from './js/StartMenu.js';
import { TrainingEngine } from './js/TrainingEngine.js';
import { FinishReportModal } from './js/FinishReportModal.js';
import { ActionNotifier } from './js/ActionNotifier.js';

import { SceneManager } from './js/SceneManager.js';
import { HangarScene } from './js/scenes/HangarScene.js';
import { DriverScene } from './js/scenes/DriverScene.js';
import { CommanderScene } from './js/scenes/CommanderScene.js';

const APP_MODE = "debug"; // "debug" или "prod"
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
  const actionNotifier = new ActionNotifier({ rootEl: document.body });

  const ui = new UIController({
    rootEl: sceneEl,
    consoleEl,
    state,
    isDebug: IS_DEBUG,
    actionNotifier
  });

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

  const sceneManager = new SceneManager();

  const app = {
    state,
    ui,
    sceneManager,
    sceneEl,
    scene: null,
    assets: {
      get: () => null
    },
    raycastFromMouse: () => null,
    changeScene: (name, id) => changeScene(name, id),
  };

  const hangarScene = new HangarScene(app);
  const driverScene = new DriverScene(app);
  const commanderScene = new CommanderScene(app);

  const changeScene = (name, sceneId) => {
    switch (name) {
      case "hangar":
        sceneManager.change(hangarScene, sceneId || "scene-hangar");
        app.getScene = () => sceneManager.currentScene;
        break;

      case "driver":
        sceneManager.change(driverScene, sceneId || "scene-driver");
        break;

      case "commander":
        sceneManager.change(commanderScene, sceneId || "scene-commander");
        break;

      case "heater":
        sceneManager.change(null, sceneId || "scene-heater");
        break;
      case "zip-box":
        sceneManager.change(null, sceneId || "scene-zip-box");
        break;
    }
  };

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
      sceneManager.update(dt);

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

      state.setScenario({
        startMethod,
        ambientTempC: ambientTemp
      });

      state.reset();
      training.setGoal({
        startMethod,
        ambientTempC: ambientTemp
      });

      startMenu.hide();

      changeScene("hangar");

      startLoop();
    },

    onInstruction: () => {
    },
  });

  if (finishBtnEl) {
    finishBtnEl.addEventListener("click", () => {
      stopLoop();
      reportModal.show(training.getReport());
    });
  }

  const heaterBackBtn = document.getElementById("heaterBackBtn");
  if (heaterBackBtn) {
    heaterBackBtn.addEventListener("click", () => {
      changeScene("hangar");
      setTimeout(() => {
        hangarScene?.showSideView?.();
      }, 50);
    });
  }
  const zipBackBtn = document.getElementById("zipBackBtn");
  if (zipBackBtn) {
    zipBackBtn.addEventListener("click", () => {
      changeScene("hangar");
    });
  }

  FullscreenManager.setup();

  startMenu.show();

  changeScene("hangar");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}