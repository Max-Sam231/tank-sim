import { ACTION_MODAL_DEFS } from "./actionModalDefs.js";
import { ChoiceModal } from "./ChoiceModal.js";
import { FuelFeedModal } from "./FuelFeedModal.js";

/**
 * Набор модальных окон органов управления кабины.
 *
 * Владеет всеми окнами выбора положения (БЦН, жалюзи, передачи, подача топлива),
 * прокидывает выбор в TankState и закрывает окна по клику мимо.
 */
class ActionModals {
  /**
   * @param {object} deps
   * @param {import("../TankState.js").TankState} deps.state
   * @param {(action: string) => void} [deps.onAction] уведомление о совершённом действии
   */
  constructor({ state, onAction }) {
    this.state = state;
    this.onAction = typeof onAction === "function" ? onAction : () => {};

    this._modals = new Map();

    for (const [name, def] of Object.entries(ACTION_MODAL_DEFS)) {
      const modal = new ChoiceModal(def, (value) => {
        def.apply(this.state, value);
        this.onAction(def.notifyAction);
      });
      this._modals.set(name, { modal, def });
    }

    const fuelFeed = new FuelFeedModal((percentage) => {
      this.state.setFuelManualFeed(percentage);
      this.onAction("fuel-manual-feed");
    });
    this._modals.set("fuelFeed", {
      modal: fuelFeed,
      def: { stateKey: "fuelManualFeed" },
    });

    this._wireOutsideClick();
  }

  /** Открывает окно, подставив текущее значение из состояния. */
  open(name) {
    const entry = this._modals.get(name);
    if (!entry) return;
    entry.modal.show(this.state.getSnapshot()[entry.def.stateKey]);
  }

  hideAll() {
    this._modals.forEach(({ modal }) => modal.hide());
  }

  get isAnyOpen() {
    for (const { modal } of this._modals.values()) {
      if (modal.isOpen) return true;
    }
    return false;
  }

  _wireOutsideClick() {
    this._handleDocumentPointerDown = (event) => {
      if (!this.isAnyOpen) return;

      const target = event.target;
      const insideContent =
        target && typeof target.closest === "function" && target.closest(".bcn-modal-content");
      if (insideContent) return;

      this.hideAll();
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", this._handleDocumentPointerDown, true);
  }

  dispose() {
    if (this._handleDocumentPointerDown) {
      document.removeEventListener("pointerdown", this._handleDocumentPointerDown, true);
      this._handleDocumentPointerDown = null;
    }
  }
}

export { ActionModals };
