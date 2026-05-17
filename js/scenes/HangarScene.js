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
        const btn = document.getElementById("switchViewBtn");
        if (btn && btn.dataset.bound !== "1") {
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => this.toggleView());
        }

        //Хитбокс-люки
        const topHitboxes = document.querySelector("#tank-top-view .scene-hitbox-layer");
        if (topHitboxes && topHitboxes.dataset.bound !== "1") {
            topHitboxes.dataset.bound = "1";
            topHitboxes.addEventListener("click", (e) => this._onHatchClick(e));
        }

        //Хитбокс-люки
        const sideHitboxes = document.querySelector("#tank-side-view .side-hitbox-layer");
        if (sideHitboxes && sideHitboxes.dataset.bound !== "1") {
            sideHitboxes.dataset.bound = "1";
            sideHitboxes.addEventListener("click", (e) => this._onZoneClick(e));
        }
    }

    _onHatchClick(e) {
        const hit = e.target.closest(".hitbox.interactive");
        if (!hit) return;

        const hatch = hit.dataset.hatch;
        if (!hatch) return;

        console.log(`Люк: ${hatch}`);

        const sceneMap = {
            "driver": "driver",
            "commander": "commander",
            "gunner": "gunner"
        };

        const sceneName = sceneMap[hatch];
        if (sceneName && typeof this.app?.changeScene === "function") {
            this.app.changeScene(sceneName);
        }
    }

    _onZoneClick(e) {
        const hit = e.target.closest(".hitbox.interactive");
        if (!hit) return;

        const zone = hit.dataset.zone;
        if (!zone) return;

        console.log(`Зона: ${zone}`);

        const zoneMap = {
            "heater-rear-left": "heater"
        };

        const sceneName = zoneMap[zone];
        if (sceneName && typeof this.app?.changeScene === "function") {
            this.app.changeScene(sceneName);
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