import { MENU_SCREENS, FULLSCREEN_PROMPT_HTML } from "./menu/menuScreens.js";
import { requestFullscreen } from "./fullscreen.js";

/**
 * Стартовое меню: выбор режима занятия и условий тренировки.
 *
 * Разметка экранов лежит в menu/menuScreens.js — здесь только
 * переключение между ними и сбор выбранных условий.
 */
const DEFAULTS = {
  startMethod: "prestart-preparation",
  ambientTemp: 20,
  fuelType: "diesel",
};

class StartMenu {
  constructor({ rootEl, onTrainingStart, onInstruction, onFamiliarization }) {
    this.rootEl = rootEl;
    this.onTrainingStart = onTrainingStart;
    this.onInstruction = onInstruction;
    this.onFamiliarization = onFamiliarization;
    this.currentScreen = "main";

    this._build();
  }

  _build() {
    for (const screen of MENU_SCREENS) {
      const el = document.createElement("div");
      el.className = screen.className;
      el.setAttribute("data-screen", screen.name);
      el.innerHTML = screen.html;
      this.rootEl.appendChild(el);
    }

    const prompt = document.createElement("div");
    prompt.className = "start-fullscreen-modal";
    prompt.innerHTML = FULLSCREEN_PROMPT_HTML;
    this.rootEl.appendChild(prompt);

    this._wireEvents();
    this.showScreen("main");
    this._showFullscreenModal();
  }

  // --- События -------------------------------------------------------------

  /** Куда ведёт каждая кнопка главного меню. */
  get _navTargets() {
    return {
      training: () => this.showScreen("training"),
      familiarization: () => this.onFamiliarization?.(),
      instruction: () => {
        this.showScreen("instruction");
        this.onInstruction?.();
      },
      authors: () => this.showScreen("authors"),
      back: () => this.showScreen("main"),
    };
  }

  _wireEvents() {
    this.rootEl.addEventListener("click", (event) => {
      this._navTargets[event.target.dataset.action]?.();
    });

    this._wireInstructionTabs();

    this.rootEl.querySelector("#scenarioApply")?.addEventListener("click", () => {
      this.onTrainingStart?.(this._readScenario());
    });

    this.rootEl.querySelector("#startFullscreenButton")?.addEventListener("click", () => {
      requestFullscreen().catch(() => {});
      this._hideFullscreenModal();
    });
  }

  /** Вкладки внутри экрана инструкции. */
  _wireInstructionTabs() {
    const tabButtons = this.rootEl.querySelectorAll(".instruction-tab-btn");

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        const targetTab = event.target.dataset.tab;
        if (!targetTab) return;

        tabButtons.forEach((other) => other.classList.remove("active"));
        this.rootEl
          .querySelectorAll(".instruction-tab-pane")
          .forEach((pane) => pane.classList.remove("active"));

        event.target.classList.add("active");
        this.rootEl.querySelector(`#${targetTab}`)?.classList.add("active");
      });
    });
  }

  /** Условия тренировки, выбранные на экране настройки. */
  _readScenario() {
    const value = (selector) => this.rootEl.querySelector(selector)?.value;

    const rawTemp = Number(value("#scenarioAmbientTemp"));

    return {
      startMethod: value("#scenarioStartMethod") || DEFAULTS.startMethod,
      ambientTemp: Number.isFinite(rawTemp) ? rawTemp : DEFAULTS.ambientTemp,
      fuelType: value("#scenarioFuelType") || DEFAULTS.fuelType,
    };
  }

  // --- Показ экранов -------------------------------------------------------

  _showFullscreenModal() {
    const modal = this.rootEl.querySelector(".start-fullscreen-modal");
    if (modal) modal.style.display = "flex";
  }

  _hideFullscreenModal() {
    const modal = this.rootEl.querySelector(".start-fullscreen-modal");
    if (modal) modal.style.display = "none";
  }

  showScreen(name) {
    this.rootEl.querySelectorAll(".start-screen").forEach((screen) => {
      screen.classList.toggle("is-active", screen.getAttribute("data-screen") === name);
    });
    this.currentScreen = name;
  }

  hide() {
    this.rootEl.classList.add("is-hidden");
  }

  show() {
    this.rootEl.classList.remove("is-hidden");
    this.showScreen("main");
  }
}

export { StartMenu };
