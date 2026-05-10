export class HangarScene {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById("scene-hangar");
        
        this.onHatchClick = this.onHatchClick.bind(this);
    }

    init() {
        console.log("HangarScene init");
        this.enableInteractions();
    }

    enableInteractions() {
        // Слушаем клики только внутри ангара
        if (this.el) {
            this.el.addEventListener("click", this.onHatchClick);
        }
    }

    onHatchClick(event) {
        const target = event.target.closest('[data-hatch], [data-action]');
        if (!target) return;

        const hatch = target.dataset.hatch;
        const action = target.dataset.action;

        if (hatch === "driver" || action === "enter_driver_seat") {
            this.enterDriverCabin();
        } else if (hatch === "commander") {
            console.log("Commander hatch clicked (not implemented)");
        } else if (hatch === "gunner") {
            console.log("Gunner hatch clicked (not implemented)");
        }
    }

    enterDriverCabin() {
        console.log("Entering driver cabin...");
        this.app.changeScene("driver", "scene-driver");
    }

    update(dt) {
        // Пока пусто
    }

    dispose() {
        if (this.el) {
            this.el.removeEventListener("click", this.onHatchClick);
        }
        console.log("HangarScene disposed");
    }
}