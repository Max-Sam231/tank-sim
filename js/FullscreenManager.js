export class FullscreenManager {
  static requestFullscreenOnLoad() {
    const doc = document.documentElement;
    // Try modern fullscreen API
    if (doc.requestFullscreen) {
      return doc.requestFullscreen();
    } else if (doc.webkitRequestFullscreen) {
      return doc.webkitRequestFullscreen();
    } else if (doc.msRequestFullscreen) {
      return doc.msRequestFullscreen();
    }
    return Promise.reject(new Error("Fullscreen not supported"));
  }

  static updateFullscreenModal() {
    const modal = document.getElementById("fullscreenModal");
    const title = document.getElementById("modalTitle");
    const desc = document.getElementById("modalDesc");
    const button = document.getElementById("modalButton");

    if (!modal || !title || !desc || !button) return;

    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );

    if (isFullscreen) {
      modal.classList.add("hidden");
    } else {
      modal.classList.remove("hidden");
      title.textContent = "Вернитесь в полноэкранный режим";
      desc.textContent = "Программа может некорректно работать в оконном режиме";
      button.textContent = "Перейти в полноэкранный режим";
    }
  }

  static setup() {
    // Setup fullscreen modal
    const modalButton = document.getElementById("modalButton");
    if (modalButton) {
      modalButton.addEventListener("click", () => {
        this.requestFullscreenOnLoad().catch(() => {});
      });
    }

    // Setup instrument panel back button
    const backButton = document.getElementById("instrumentPanelBack");
    if (backButton) {
      backButton.addEventListener("click", () => {
        const modal = document.getElementById("instrumentPanelModal");
        if (modal) {
          modal.classList.add("hidden");
          const sceneEl = document.getElementById("scene");
          if (sceneEl) {
            sceneEl.classList.remove("instrument-panel-open");
          }
        }
      });
    }

    // Listen for fullscreen changes
    const fullscreenEvents = ["fullscreenchange", "webkitfullscreenchange", "msfullscreenchange"];
    fullscreenEvents.forEach(event => {
      document.addEventListener(event, () => this.updateFullscreenModal());
    });

    // Initial state
    this.updateFullscreenModal();
  }
}
