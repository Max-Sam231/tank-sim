import { requestFullscreen, isFullscreen, onFullscreenChange } from "./fullscreen.js";

const EXIT_PROMPT = {
  title: "Вернитесь в полноэкранный режим",
  desc: "Программа может некорректно работать в оконном режиме",
  button: "Перейти в полноэкранный режим",
};

/**
 * Напоминание о полноэкранном режиме во время занятия.
 *
 * Следит за выходом из полного экрана и показывает окно с предложением
 * вернуться. Само разворачивание живёт в fullscreen.js.
 */
export class FullscreenManager {
  static requestFullscreenOnLoad() {
    return requestFullscreen();
  }

  static updateFullscreenModal() {
    const modal = document.getElementById("fullscreenModal");
    const title = document.getElementById("modalTitle");
    const desc = document.getElementById("modalDesc");
    const button = document.getElementById("modalButton");

    if (!modal || !title || !desc || !button) return;

    if (isFullscreen()) {
      modal.classList.add("hidden");
      return;
    }

    modal.classList.remove("hidden");
    title.textContent = EXIT_PROMPT.title;
    desc.textContent = EXIT_PROMPT.desc;
    button.textContent = EXIT_PROMPT.button;
  }

  static setup() {
    document
      .getElementById("modalButton")
      ?.addEventListener("click", () => requestFullscreen().catch(() => {}));

    // Возврат из приборной панели к общему виду кабины
    document.getElementById("instrumentPanelBack")?.addEventListener("click", () => {
      document.getElementById("instrumentPanelModal")?.classList.add("hidden");
      document.getElementById("scene")?.classList.remove("instrument-panel-open");
    });

    onFullscreenChange(() => this.updateFullscreenModal());
    this.updateFullscreenModal();
  }
}
