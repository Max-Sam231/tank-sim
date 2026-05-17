import { TankTopView } from "../views/TankTopView.js";
import { TankSideView } from "../views/TankSideView.js";

export class HangarScene {
    constructor(app) {
        this.app = app;

        this.currentView = null;
        this.currentMode = "top";
    }

    init() {
        console.log("HangarScene init");

        this.bindUI();
        this.showTopView();
    }

    bindUI() {
        // === 1. Кнопка переключения вида (топ/сайд) ===
        const btn = document.getElementById("switchViewBtn");
        if (btn && btn.dataset.bound !== "1") {
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => this.toggleView());
        }

        // === 2. КЛИКИ ПО ЛЮКАМ (хитбоксы) ===
        const hitboxLayer = document.querySelector("#scene-hangar .scene-hitbox-layer");
        if (hitboxLayer && hitboxLayer.dataset.bound !== "1") {
            hitboxLayer.dataset.bound = "1";

            // Используем делегирование: один слушатель на весь SVG
            hitboxLayer.addEventListener("click", (e) => {
                // Ищем ближайший интерактивный полигон
                const hit = e.target.closest(".hitbox.interactive");
                if (!hit) return;

                const hatch = hit.dataset.hatch; // "driver" | "commander" | "gunner"
                if (!hatch) return;


                // Маппинг: атрибут data-hatch -> имя сцены в main.js
                const sceneMap = {
                    "driver": "driver",
                    "commander": "commander",
                    "gunner": "gunner"
                };

                const sceneName = sceneMap[hatch];

                if (sceneName && typeof this.app?.changeScene === "function") {
                    this.app.changeScene(sceneName);
                }
            });
        }
    }

    toggleView() {
        if (this.currentMode === "top") {
            this.showSideView();
        } else {
            this.showTopView();
        }
    }

    showTopView() {
        this.destroyCurrentView();

        document.getElementById("tank-top-view")?.classList.remove("hidden");
        document.getElementById("tank-side-view")?.classList.add("hidden");

        this.currentView = new TankTopView(this.app, this);
        this.currentView.init();

        this.currentMode = "top";
    }

    showSideView() {
        this.destroyCurrentView();

        document.getElementById("tank-side-view")?.classList.remove("hidden");
        document.getElementById("tank-top-view")?.classList.add("hidden");

        this.currentView = new TankSideView(this.app, this);
        this.currentView.init();

        this.currentMode = "side";
    }

    dispose() {
        this.destroyCurrentView();
    }

    destroyCurrentView() {
        this.currentView?.dispose?.();
        this.currentView = null;
    }
}