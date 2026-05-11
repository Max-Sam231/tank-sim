// js/HangarScene.js
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
        if (this.el) {
            this.el.addEventListener("click", this.onHatchClick);
        }
    }

    onHatchClick(event) {
        const target = event.target.closest('[data-hatch], [data-action]');
        if (!target) return;

        const hatch = target.dataset.hatch;
        const action = target.dataset.action;

        // Вход в кабину водителя
        if (hatch === "driver" || action === "enter_driver_seat") {
            this.enterDriverCabin();
        } 
        // ВХОД В КАБИНУ КОМАНДИРА
        else if (hatch === "commander" || action === "enter_commander_seat") {
            this.enterCommanderCabin();
        } 
        else if (hatch === "gunner" || action === "enter_gunner_seat") {
            console.log("Gunner hatch clicked (not implemented)");
        }
    }

    enterDriverCabin() {
        console.log("Entering driver cabin...");
        this.app.changeScene("driver", "scene-driver");
    }

    // Новый метод для перехода к командиру
    enterCommanderCabin() {
        console.log("Entering commander cabin...");
        this.app.changeScene("commander", "scene-commander");
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