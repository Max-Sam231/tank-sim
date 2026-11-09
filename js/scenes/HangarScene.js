import { TankTopView } from "../views/TankTopView.js";
import { TankSideView } from "../views/TankSideView.js";
import { TankSideRightView } from "../views/TankSideRightView.js";
import { Tank3DView } from "../views/Tank3DView.js";
import { HeaterController } from "./hangar/HeaterController.js";
import { ZipBoxController } from "./hangar/ZipBoxController.js";

/**
 * Сцена ангара.
 *
 * Режим 3D — вход в люки / ЗИП.
 * Режим 2D — осмотр сверху/сбоку без входа в люки; на видах
 * с рентген-картинкой можно отдельно включить слой «Рентген».
 */
const ZONE_SCENES = {
  "heater-rear-left": "heater",
};

/** Только 2D-листы (без 3D). */
const VIEW_2D_ORDER = ["top", "side", "side-right"];

const VIEW_DEFS = {
  top: {
    sectionId: "tank-top-view",
    View: TankTopView,
    xray: {
      imgSelector: "#tank-top-view .tank-layer-top",
      normal: "./img/hangar/tank.png",
      xray: "./img/hangar/tank_xray.png",
    },
  },
  side: {
    sectionId: "tank-side-view",
    View: TankSideView,
    xray: null, // нет отдельной картинки
  },
  "side-right": {
    sectionId: "tank-side-right-view",
    View: TankSideRightView,
    xray: {
      imgSelector: "#tank-side-right-view .tank-layer-side-right",
      normal: "./img/hangar/tank_side_right.png",
      xray: "./img/hangar/tank_side_right_xray.png",
    },
  },
  "3d": {
    sectionId: "tank-3d-view",
    View: Tank3DView,
    xray: null,
  },
};

export class HangarScene {
  constructor(app) {
    this.app = app;
    this.currentView = null;
    this.currentMode = "3d";

    this.heater = new HeaterController(app);
    this.zipBox = new ZipBoxController(app);
  }

  init() {
    this.bindUI();
    // После кабины / старта тренировки всегда возвращаемся к 3D
    this.showView("3d");
  }

  bindUI() {
    this._bindOnce(document.getElementById("switchViewBtn"), "click", () => this.toggleView());
    this._bindOnce(document.getElementById("hangarXrayBtn"), "click", () => this.toggleXrayLayer());

    this._bindOnce(
      document.querySelector("#tank-top-view .scene-hitbox-layer"),
      "click",
      (e) => this._onTopHit(e),
    );
    this._bindOnce(
      document.querySelector("#tank-side-view .side-hitbox-layer"),
      "click",
      (e) => this._onZoneClick(e),
    );

    this.heater.bindUI();
    this.zipBox.bindUI();
  }

  _bindOnce(el, eventName, handler) {
    if (!el || el.dataset.bound === "1") return;
    el.dataset.bound = "1";
    el.addEventListener(eventName, handler);
  }

  // --- Переходы ------------------------------------------------------------

  enterDriverCabin() {
    this.app?.changeScene?.("driver");
  }

  enterCommanderCabin() {
    this.app?.changeScene?.("commander");
  }

  enterZipBox() {
    this.app?.changeScene?.("zip-box");
    setTimeout(() => this.zipBox.updateCapHitbox(), 50);
  }

  /** Вход только с 3D-хитпоинтов. */
  activateHotspot({ hatch, zone } = {}) {
    if (hatch === "driver") return this.enterDriverCabin();
    if (hatch === "commander") return this.enterCommanderCabin();
    if (hatch === "gunner") return this.app?.changeScene?.("gunner");
    if (zone === "zip-box") return this.enterZipBox();
    if (zone === "heater-rear-left") return this.app?.changeScene?.("heater");
  }

  /** На 2D сверху люки и ЗИП отключены — только осмотр. */
  _onTopHit(event) {
    const hit = event.target.closest(".hitbox");
    if (!hit) return;
    if (hit.dataset.hatch) return;
    if (hit.dataset.zone === "zip-box") return;
    if (hit.dataset.zone) this._onZoneClick(event);
  }

  _onZoneClick(event) {
    const hit = event.target.closest(".hitbox");
    const zone = hit?.dataset.zone;
    if (!zone) return;

    // Подогреватель остаётся на боковом 2D (сценарий разогрева)
    if (zone === "zip-box") return;

    const sceneName = ZONE_SCENES[zone];
    if (sceneName) this.app?.changeScene?.(sceneName);
  }

  // --- Переключение видов -------------------------------------------------

  /**
   * 3D → «2D вид сверху».
   * В 2D листаем top → side → side-right → обратно в 3D.
   */
  toggleView() {
    if (this.currentMode === "3d") {
      this.showView("top");
      return;
    }

    const idx = VIEW_2D_ORDER.indexOf(this.currentMode);
    const next = VIEW_2D_ORDER[idx + 1];
    this.showView(next || "3d");
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

    const hangar = document.getElementById("scene-hangar");
    hangar?.classList.toggle("hangar-mode-3d", mode === "3d");
    hangar?.classList.toggle("hangar-mode-2d", mode !== "3d");

    this._syncXrayButton(mode);
    this._updateSwitchLabel(mode);

    if (mode === "top") this.zipBox.syncDOM();
  }

  _updateSwitchLabel(mode) {
    const btn = document.getElementById("switchViewBtn");
    if (!btn) return;
    // Подпись = куда ведёт следующий клик
    const labels = {
      "3d": "2D вид сверху",
      top: "2D вид сбоку",
      side: "2D вид справа",
      "side-right": "К 3D",
    };
    btn.textContent = labels[mode] || "Сменить вид";
  }

  showTopView() {
    this.showView("top");
  }

  showSideView() {
    this.showView("side");
  }

  showSideRightView() {
    this.showView("side-right");
  }

  show3DView() {
    this.showView("3d");
  }

  // --- Рентген-слой на 2D -------------------------------------------------

  _syncXrayButton(mode) {
    const btn = document.getElementById("hangarXrayBtn");
    if (!btn) return;

    const xray = VIEW_DEFS[mode]?.xray;
    btn.classList.toggle("hidden", !xray);
    btn.classList.remove("is-active");
    btn.textContent = "Рентген";

    const img = xray ? document.querySelector(xray.imgSelector) : null;
    if (img) {
      img.classList.remove("xray-active", "xray-transition", "normal-transition");
      img.src = xray.normal;
      img.dataset.transitioning = "0";
    }

    // Старые кнопки внутри видов больше не используем
    document.getElementById("xrayBtn")?.classList.add("hidden");
    document.getElementById("xrayBtnRight")?.classList.add("hidden");
  }

  toggleXrayLayer() {
    const xray = VIEW_DEFS[this.currentMode]?.xray;
    const btn = document.getElementById("hangarXrayBtn");
    if (!xray || !btn) return;

    const tankImg = document.querySelector(xray.imgSelector);
    if (!tankImg || tankImg.dataset.transitioning === "1") return;

    const isXray = tankImg.classList.contains("xray-active");
    tankImg.dataset.transitioning = "1";

    tankImg.classList.remove("xray-transition", "normal-transition");
    void tankImg.offsetWidth;
    tankImg.classList.add(isXray ? "normal-transition" : "xray-transition");

    const newSrc = isXray ? xray.normal : xray.xray;
    const preload = new Image();
    preload.onload = () => {
      tankImg.src = newSrc;
      tankImg.classList.toggle("xray-active", !isXray);
      btn.classList.toggle("is-active", !isXray);
      btn.textContent = isXray ? "Рентген" : "Обычный вид";
      setTimeout(() => {
        tankImg.dataset.transitioning = "0";
      }, 400);
    };
    preload.onerror = () => {
      tankImg.dataset.transitioning = "0";
    };
    preload.src = newSrc;
  }

  // --- Синхронизация внутренних сцен --------------------------------------

  syncHeaterDOM() {
    this.heater.syncDOM();
  }

  syncZipBoxDOM() {
    this.zipBox.syncDOM();
  }

  update(dt) {
    this.currentView?.update?.(dt);
  }

  enterMenuBackdrop() {
    this.showView("3d");
    this.currentView?.setMenuMode?.(true);
  }

  leaveMenuBackdrop() {
    this.currentView?.setMenuMode?.(false);
  }

  dispose() {
    this.destroyCurrentView();
  }

  destroyCurrentView() {
    this.currentView?.dispose?.();
    this.currentView = null;
  }
}
