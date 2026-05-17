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

    // Обработчик для сцены обогревателя (шпингалеты + открытие борта)
    const heaterHitboxes = document.querySelector("#scene-heater .heater-hitbox-layer");
    if (heaterHitboxes && heaterHitboxes.dataset.bound !== "1") {
        heaterHitboxes.dataset.bound = "1";
        heaterHitboxes.addEventListener("click", (e) => this._onHeaterZoneClick(e));
    }
}

_onHeaterZoneClick(e) {
    const hit = e.target.closest(".hitbox.interactive");
    if (!hit) return;

    const zone = hit.dataset.zone;
    if (!zone) return;

    console.log(`Зона обогревателя: ${zone}`);

    // Обработка шпингалетов
    if (zone.startsWith("hinge-latch")) {
        const latchId = zone.split("-")[2]; // "1", "2" или "3"
        this.app.state?.toggleHingeLatch?.(latchId);
        
        // Визуальная обратная связь: меняем стиль снятого шпингалета
        if (this.app.state?.[`hingeLatch${latchId}`]) {
            hit.style.fill = "rgba(0,255,0,0.3)";
            hit.style.stroke = "rgba(0,255,0,0.8)";
        } else {
            hit.style.fill = "rgba(255,0,0,0.2)";
            hit.style.stroke = "rgba(255,0,0,0.6)";
        }
        return;
    }

    // Обработка открытия борта
    if (zone === "side-panel-open") {
        if (this.app.state?.canOpenSidePanel?.()) {
            this.app.state?.openSidePanel?.();
            this.app.changeScene?.("side-panel-open");
        } else {
            console.log("Сначала снимите все шпингалеты");
            // Визуальная подсказка: мигание зоны
            hit.style.animation = "pulse 0.3s ease 3";
        }
        return;
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