export class DriverScene {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById("scene-driver");
        
        this.handleExit = this.handleExit.bind(this);
    }

    init() {
        console.log("DriverScene init");

        const finishBtn = document.getElementById("simFinishButton");
        if (finishBtn) finishBtn.classList.remove("hidden");

        if (this.el) {
            this.el.addEventListener("click", this.handleExit);
        }
    }

    handleExit(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        if (target.dataset.action === "exit_to_hangar") {
            this.app.changeScene("hangar", "scene-hangar");
        }
    }

    update(dt) {
        // Обновление состояния UI через app.ui, если нужно
        // Например: this.app.ui.update();
    }

    dispose() {
        console.log("DriverScene dispose");
        
        const finishBtn = document.getElementById("simFinishButton");
        if (finishBtn) finishBtn.classList.add("hidden");

        if (this.el) {
            this.el.removeEventListener("click", this.handleExit);
        }
    }
}