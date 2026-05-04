import { TankState } from './js/TankState.js';
import { UIController } from './js/UIController.js';
import { FullscreenManager } from './js/FullscreenManager.js';

function bootstrap() {
  const sceneEl = document.getElementById("scene");
  const consoleEl = document.getElementById("debugConsole");

  if (!sceneEl || !consoleEl) return;

  const state = new TankState();
  const ui = new UIController({ rootEl: sceneEl, consoleEl, state });

  // Setup fullscreen and instrument panel
  FullscreenManager.setup();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
