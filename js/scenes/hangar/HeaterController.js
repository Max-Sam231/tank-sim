import { setHitboxEngaged, pulseHitbox } from "./hitboxStyle.js";

/**
 * Сцена подогревателя (#scene-heater): открытие борта, шпингалеты,
 * крупный план выхлопа, болты, крышка и козырёк.
 *
 * Вся разметка этой сцены принадлежит только этому контроллеру —
 * HangarScene к ней не обращается.
 */
const IMAGES = {
  panelClosed: "./img/heater/rear_left_heater.jpg",
  panelOpened: "./img/heater/rear_left_heater_opened.jpg",
  exhaustCloseup: "./img/heater/exhaust_closeup.jpg",
  coverRemoved: "./img/heater/exhaust_cover_removed.jpg",
  coverRemovedWithCap: "./img/heater/exhaust_cover_removed_with_cap.jpg",
};

const HINTS = {
  panelClosed: "Откройте борт",
  panelOpened: "Борт открыт",
  unscrewBolts: "Открутите болты",
  coverRemoved: "Крышка снята",
  capInstalled: "Козырёк установлен",
  capRemoved: "Козырёк снят",
  latchesBlocked: "Нельзя открыть борт: закрыты шпингалеты!",
};

const LATCH_IDS = ["1", "2", "3"];

class HeaterController {
  constructor(app) {
    this.app = app;
    this.isCloseup = false;
  }

  get state() {
    return this.app.state;
  }

  get sectionEl() {
    return document.getElementById("scene-heater");
  }

  // --- Разметка сцены -----------------------------------------------------

  _els() {
    const section = this.sectionEl;
    if (!section) return null;

    return {
      section,
      img: section.querySelector(".scene-content > img"),
      closedLayer: section.querySelector(".heater-hitbox-closed"),
      openedLayer: section.querySelector(".heater-hitbox-opened"),
      hint: section.querySelector("p"),
    };
  }

  /** Картинка, соответствующая текущему состоянию узла выхлопа. */
  _closeupImage() {
    if (this.state?.exhaustCapInstalled) return IMAGES.coverRemovedWithCap;
    if (this.state?.exhaustCoverRemoved) return IMAGES.coverRemoved;
    return IMAGES.exhaustCloseup;
  }

  /** Подсказка, соответствующая текущему состоянию сцены. */
  _hintText(sidePanelOpen) {
    if (!sidePanelOpen) return HINTS.panelClosed;
    if (!this.isCloseup) return HINTS.panelOpened;
    return this.state?.exhaustCoverRemoved ? HINTS.coverRemoved : HINTS.unscrewBolts;
  }

  // --- Привязка событий ---------------------------------------------------

  bindUI() {
    const section = this.sectionEl;

    for (const selector of [".heater-hitbox-closed", ".heater-hitbox-opened"]) {
      const layer = section?.querySelector(selector);
      if (layer && layer.dataset.bound !== "1") {
        layer.dataset.bound = "1";
        layer.addEventListener("click", (e) => this.onZoneClick(e));
      }
    }

    this._bindButton("heaterCloseupBackBtn", () => this.showCloseup(false));
    this._bindButton("heaterClosePanelBtn", () => this.closeSidePanel());
    this._bindButton("installExhaustCapBtn", () => {
      if (!this.state?.canInstallExhaustCap?.()) return;
      this.state.installExhaustCap();
      this.showCapInstalled(true);
    });
    this._bindButton("removeExhaustCapBtn", () => {
      if (!this.state) return;
      this.state.removeExhaustCap();
      this.showCapInstalled(false);
    });
    this._bindButton("screwExhaustCoverBtn", () => {
      if (!this.state) return;
      this.state.installExhaustCover();
      this.showCoverRemoved(false);
    });
  }

  _bindButton(id, handler) {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", handler);
  }

  // --- Обработка кликов по зонам -----------------------------------------

  onZoneClick(event) {
    const hit = event.target.closest(".hitbox");
    const zone = hit?.dataset.zone;
    if (!zone) return;

    if (zone.startsWith("hinge-latch")) return this._onLatchClick(hit, zone);
    if (zone.startsWith("exhaust-bolt")) return this._onBoltClick(hit, zone);

    switch (zone) {
      case "side-panel-open":
        return this._onSidePanelOpen(hit);
      case "side-panel-close":
        return this.closeSidePanel();
      case "heater-exhaust-closeup":
        return this.showCloseup(true);
      case "exhaust-cover":
        return this._onCoverClick(hit);
      case "install-exhaust-cap":
        return this._onInstallCapClick(hit);
      case "heater-rear-left":
        return this.app.changeScene("heater");
      case "heater-valve":
      default:
        return undefined;
    }
  }

  _onLatchClick(hit, zone) {
    const latchId = zone.split("-")[2];
    this.state?.toggleHingeLatch?.(latchId);
    setHitboxEngaged(hit, Boolean(this.state?.[`hingeLatch${latchId}`]));
  }

  _onBoltClick(hit, zone) {
    if (!this.state?.canUnscrewExhaustBolts?.()) {
      // Без ключа из ящика ЗИП болты не открутить
      pulseHitbox(hit);
      return;
    }

    const boltId = zone.split("-")[2];
    this.state?.toggleExhaustBolt?.(boltId);
    setHitboxEngaged(hit, Boolean(this.state?.[`exhaustBolt${boltId}`]));
  }

  _onSidePanelOpen(hit) {
    if (this.state && !this.state.canOpenSidePanel()) {
      pulseHitbox(hit);
      this._flashHint(HINTS.latchesBlocked);
      return;
    }

    this.state?.setSidePanelOpen?.(true);
    this.toggleSidePanel(true);
  }

  _onCoverClick(hit) {
    if (!this.state?.canRemoveExhaustCover?.()) {
      // Крышка снимается только после обоих открученных болтов
      pulseHitbox(hit);
      return;
    }

    this.state?.removeExhaustCover?.();
    this.showCoverRemoved(true);
  }

  _onInstallCapClick(hit) {
    if (!this.state?.canInstallExhaustCap?.()) {
      pulseHitbox(hit);
      return;
    }

    this.state?.installExhaustCap?.();
    this.showCapInstalled(true);
  }

  /** Показывает сообщение и возвращает штатную подсказку через 2 с. */
  _flashHint(message) {
    const hint = this.sectionEl?.querySelector("p");
    if (!hint) return;

    hint.textContent = message;
    setTimeout(() => {
      hint.textContent = this._hintText(Boolean(this.state?.sidePanelOpen));
    }, 2000);
  }

  // --- Переходы состояния сцены ------------------------------------------

  closeSidePanel() {
    if (this.state) {
      for (const id of LATCH_IDS) this.state[`hingeLatch${id}`] = false;
      this.state.setSidePanelOpen(false);
    }
    this.toggleSidePanel(false);
  }

  toggleSidePanel(isOpen) {
    const els = this._els();
    if (!els) return;

    this.isCloseup = false;

    if (els.img) els.img.src = isOpen ? IMAGES.panelOpened : IMAGES.panelClosed;

    if (els.closedLayer && els.openedLayer) {
      els.closedLayer.classList.toggle("hidden", isOpen);
      els.openedLayer.classList.toggle("hidden", !isOpen);
    }

    // Закрыли борт — сбрасываем подсветку шпингалетов
    if (!isOpen && els.closedLayer) {
      els.closedLayer.querySelectorAll(".hitbox").forEach((hb) => {
        if (hb.dataset.zone?.startsWith("hinge-latch")) setHitboxEngaged(hb, false);
      });
    }

    if (els.openedLayer) this._applyCloseupState(els.openedLayer, false);

    document.getElementById("heaterClosePanelBtn")?.classList.toggle("hidden", !isOpen);
    if (els.hint) els.hint.textContent = this._hintText(isOpen);
  }

  showCloseup(isCloseup) {
    const els = this._els();
    if (!els) return;

    this.isCloseup = isCloseup;

    if (els.img) els.img.src = isCloseup ? this._closeupImage() : IMAGES.panelOpened;

    if (els.openedLayer) {
      this._applyCloseupState(els.openedLayer, isCloseup);
      els.openedLayer
        .querySelector('[data-zone="heater-valve"]')
        ?.classList.toggle("hidden", isCloseup);
    }

    if (els.hint) els.hint.textContent = this._hintText(true);
  }

  showCoverRemoved(isRemoved) {
    const els = this._els();
    if (!els) return;

    this.isCloseup = true;

    if (els.img) els.img.src = isRemoved ? IMAGES.coverRemoved : IMAGES.exhaustCloseup;
    if (els.openedLayer) this._applyCloseupState(els.openedLayer, true);
    if (els.hint) els.hint.textContent = isRemoved ? HINTS.coverRemoved : HINTS.unscrewBolts;
  }

  showCapInstalled(isInstalled) {
    const els = this._els();
    if (!els) return;

    if (els.img) els.img.src = isInstalled ? IMAGES.coverRemovedWithCap : IMAGES.coverRemoved;
    if (els.openedLayer) this._applyCloseupState(els.openedLayer, true);
    if (els.hint) els.hint.textContent = isInstalled ? HINTS.capInstalled : HINTS.capRemoved;
  }

  /** Раскладывает хитбоксы и кнопки по режиму: общий план или крупный. */
  _applyCloseupState(openedLayer, isCloseup) {
    const coverRemoved = Boolean(this.state?.exhaustCoverRemoved);
    const hasKey = Boolean(this.state?.hasZipKey);
    const hasCap = Boolean(this.state?.hasExhaustCap);
    const capInstalled = Boolean(this.state?.exhaustCapInstalled);

    const zone = (name) => openedLayer.querySelector(`[data-zone="${name}"]`);

    zone("heater-exhaust-closeup")?.classList.toggle("hidden", isCloseup);
    zone("side-panel-close")?.classList.toggle("hidden", isCloseup);

    document.getElementById("heaterBackBtn")?.classList.toggle("hidden", isCloseup);
    document.getElementById("heaterCloseupBackBtn")?.classList.toggle("hidden", !isCloseup);
    document.getElementById("heaterClosePanelBtn")?.classList.toggle("hidden", isCloseup);

    for (const boltId of ["1", "2"]) {
      const bolt = zone(`exhaust-bolt-${boltId}`);
      if (!bolt) continue;
      bolt.classList.toggle("hidden", !isCloseup || coverRemoved);
      bolt.classList.toggle("has-key", hasKey);
      bolt.title = hasKey ? `Болт ${boltId}` : `Болт ${boltId} (нужен ключ)`;
    }

    zone("exhaust-cover")?.classList.toggle("hidden", !isCloseup || coverRemoved);

    const atExhaust = isCloseup && coverRemoved;
    document
      .getElementById("installExhaustCapBtn")
      ?.classList.toggle("hidden", !(atExhaust && hasCap && !capInstalled));
    document
      .getElementById("removeExhaustCapBtn")
      ?.classList.toggle("hidden", !(atExhaust && capInstalled));
    document
      .getElementById("screwExhaustCoverBtn")
      ?.classList.toggle("hidden", !(atExhaust && !capInstalled));
  }

  /** Восстанавливает разметку сцены по состоянию — после возврата в сцену. */
  syncDOM() {
    const els = this._els();
    if (!els) return;

    const sidePanelOpen = Boolean(this.state?.sidePanelOpen);

    if (els.img) {
      if (!sidePanelOpen) {
        els.img.src = IMAGES.panelClosed;
      } else {
        els.img.src = this.isCloseup ? this._closeupImage() : IMAGES.panelOpened;
      }
    }

    if (els.closedLayer && els.openedLayer) {
      els.closedLayer.classList.toggle("hidden", sidePanelOpen);
      els.openedLayer.classList.toggle("hidden", !sidePanelOpen);
    }

    if (els.closedLayer) {
      els.closedLayer.querySelectorAll(".hitbox").forEach((hb) => {
        const zone = hb.dataset.zone;
        if (!zone?.startsWith("hinge-latch")) return;
        const latchId = zone.split("-")[2];
        setHitboxEngaged(hb, Boolean(this.state?.[`hingeLatch${latchId}`]));
      });
    }

    if (els.openedLayer) {
      this._applyCloseupState(els.openedLayer, this.isCloseup);
      els.openedLayer
        .querySelector('[data-zone="heater-valve"]')
        ?.classList.toggle("hidden", this.isCloseup);

      for (const boltId of ["1", "2"]) {
        const bolt = els.openedLayer.querySelector(`[data-zone="exhaust-bolt-${boltId}"]`);
        setHitboxEngaged(bolt, Boolean(this.state?.[`exhaustBolt${boltId}`]));
      }
    }

    if (els.hint) els.hint.textContent = this._hintText(sidePanelOpen);
  }
}

export { HeaterController };
