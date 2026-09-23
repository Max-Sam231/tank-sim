import { TankTopView } from "../views/TankTopView.js";
import { TankSideView } from "../views/TankSideView.js";
import { TankSideRightView } from "../views/TankSideRightView.js";
import { HeaterController } from "./hangar/HeaterController.js";
import { ZipBoxController } from "./hangar/ZipBoxController.js";

/**
 * Сцена ангара: осмотр танка снаружи.
 *
 * Отвечает за переключение видов (сверху / левый борт / правый борт),
 * рентген-режим и переходы к рабочим местам экипажа. Внутренние сцены
 * подогревателя и ящика ЗИП вынесены в отдельные контроллеры.
 */
const HATCH_SCENES = {
  driver: "driver",
  commander: "commander",
  gunner: "gunner",
};

const ZONE_SCENES = {
  "heater-rear-left": "heater",
};

const TANK_IMAGES = {
  normal: "./img/hangar/tank.png",
  xray: "./img/hangar/tank_xray.png",
};

/** Виды ангара в порядке переключения кнопкой. */
const VIEW_ORDER = ["top", "side", "side-right"];

const VIEW_DEFS = {
  top: { sectionId: "tank-top-view", View: TankTopView, hasXray: true },
  side: { sectionId: "tank-side-view", View: TankSideView, hasXray: false },
  "side-right": { sectionId: "tank-side-right-view", View: TankSideRightView, hasXray: false },
};

export class HangarScene {
  constructor(app) {
    this.app = app;
    this.currentView = null;
    this.currentMode = "top";

    this.heater = new HeaterController(app);
    this.zipBox = new ZipBoxController(app);
  }

  init() {
    this.bindUI();
    this.showTopView();
  }

  bindUI() {
    this._bindOnce(document.getElementById("switchViewBtn"), "click", () => this.toggleView());

    this._bindOnce(
      document.querySelector("#tank-top-view .scene-hitbox-layer"),
      "click",
      (e) => this._onHatchClick(e),
    );
    this._bindOnce(
      document.querySelector("#tank-side-view .side-hitbox-layer"),
      "click",
      (e) => this._onZoneClick(e),
    );

    this.heater.bindUI();
    this.zipBox.bindUI();
  }

  /** Вешает обработчик один раз, даже если сцена открывается повторно. */
  _bindOnce(el, eventName, handler) {
    if (!el || el.dataset.bound === "1") return;
    el.dataset.bound = "1";
    el.addEventListener(eventName, handler);
  }

  // --- Переходы к рабочим местам -----------------------------------------

  enterDriverCabin() {
    this.app?.changeScene?.("driver");
  }

  enterCommanderCabin() {
    this.app?.changeScene?.("commander");
  }

  _onHatchClick(event) {
    const hit = event.target.closest(".hitbox");
    if (!hit) return;

    if (hit.dataset.zone) {
      this._onZoneClick(event);
      return;
    }

    const sceneName = HATCH_SCENES[hit.dataset.hatch];
    if (sceneName) this.app?.changeScene?.(sceneName);
  }

  _onZoneClick(event) {
    const hit = event.target.closest(".hitbox");
    const zone = hit?.dataset.zone;
    if (!zone) return;

    if (zone === "zip-box") {
      this.app.changeScene("zip-box");
      // Доступность козырька зависит от состояния выхлопа — обновляем после перехода
      setTimeout(() => this.zipBox.updateCapHitbox(), 50);
      return;
    }

    const sceneName = ZONE_SCENES[zone];
    if (sceneName) this.app?.changeScene?.(sceneName);
  }

  // --- Переключение видов -------------------------------------------------

  toggleView() {
    const nextIndex = (VIEW_ORDER.indexOf(this.currentMode) + 1) % VIEW_ORDER.length;
    this.showView(VIEW_ORDER[nextIndex]);
  }

  showView(mode) {
    const def = VIEW_DEFS[mode];
    if (!def) return;

    this.destroyCurrentView();

    for (const [name, other] of Object.entries(VIEW_DEFS)) {
      document.getElementById(other.sectionId)?.classList.toggle("hidden", name !== mode);
    }

    this.currentView = new def.View(this.app, this);
    this.currentView.init();
    this.currentMode = mode;
    this.currentView.resetXrayState?.();

    const xrayBtn = document.getElementById("xrayBtn");
    if (xrayBtn) xrayBtn.classList.toggle("hidden", !def.hasXray);
    if (def.hasXray) this._wireXray(xrayBtn);
  }

  showTopView() {
    this.showView("top");
    this.zipBox.syncDOM();
  }

  showSideView() {
    this.showView("side");
  }

  showSideRightView() {
    this.showView("side-right");
  }

  _wireXray(xrayBtn) {
    const tankImg = document.querySelector("#tank-top-view .tank-layer-top");
    if (!xrayBtn || !tankImg) return;

    xrayBtn.onclick = () => {
      const isXray = tankImg.classList.contains("xray-active");

      tankImg.classList.remove("xray-transition", "normal-transition");
      void tankImg.offsetWidth; // перезапуск CSS-анимации
      tankImg.classList.add(isXray ? "normal-transition" : "xray-transition");

      tankImg.src = isXray ? TANK_IMAGES.normal : TANK_IMAGES.xray;
      tankImg.classList.toggle("xray-active", !isXray);
      xrayBtn.classList.toggle("is-active", !isXray);
      xrayBtn.textContent = isXray ? "Рентген" : "Обычный вид";
    };
  }

  // --- Синхронизация внутренних сцен --------------------------------------

  syncHeaterDOM() {
    this.heater.syncDOM();
  }

  syncZipBoxDOM() {
    this.zipBox.syncDOM();
  }

  dispose() {
    this.destroyCurrentView();
  }

  destroyCurrentView() {
    this.currentView?.dispose?.();
    this.currentView = null;
  }
}
