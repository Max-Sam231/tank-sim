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

        const topHitboxes = document.querySelector("#tank-top-view .scene-hitbox-layer");
        if (topHitboxes && topHitboxes.dataset.bound !== "1") {
            topHitboxes.dataset.bound = "1";
            topHitboxes.addEventListener("click", (e) => this._onHatchClick(e));
        }

        const sideHitboxes = document.querySelector("#tank-side-view .side-hitbox-layer");
        if (sideHitboxes && sideHitboxes.dataset.bound !== "1") {
            sideHitboxes.dataset.bound = "1";
            sideHitboxes.addEventListener("click", (e) => this._onZoneClick(e));
        }

        // Обработчик для ОБЕИХ слоёв хитбоксов обогревателя
        const heaterHitboxesClosed = document.querySelector("#scene-heater .heater-hitbox-closed");
        const heaterHitboxesOpened = document.querySelector("#scene-heater .heater-hitbox-opened");

        if (heaterHitboxesClosed && heaterHitboxesClosed.dataset.bound !== "1") {
            heaterHitboxesClosed.dataset.bound = "1";
            heaterHitboxesClosed.addEventListener("click", (e) => this._onHeaterZoneClick(e));
        }

        if (heaterHitboxesOpened && heaterHitboxesOpened.dataset.bound !== "1") {
            heaterHitboxesOpened.dataset.bound = "1";
            heaterHitboxesOpened.addEventListener("click", (e) => this._onHeaterZoneClick(e));
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

    _onHeaterZoneClick(e) {
        const hit = e.target.closest(".hitbox.interactive");
        if (!hit) return;

        const zone = hit.dataset.zone;
        if (!zone) return;

        console.log(`Зона обогревателя: ${zone}`);

        if (zone.startsWith("hinge-latch")) {
            const latchId = zone.split("-")[2];
            this.app.state?.toggleHingeLatch?.(latchId);

            if (this.app.state?.[`hingeLatch${latchId}`]) {
                hit.style.fill = "rgba(0,255,0,0.3)";
                hit.style.stroke = "rgba(0,255,0,0.8)";
            } else {
                hit.style.fill = "rgba(255,0,0,0.2)";
                hit.style.stroke = "rgba(255,0,0,0.6)";
            }
            return;
        }

        if (zone === "side-panel-open") {
            this._toggleHeaterPanel(true);
            return;
        }

        if (zone === "side-panel-close") {
            this._toggleHeaterPanel(false);
            return;
        }

        if (zone === "heater-exhaust-closeup") {
            console.log("Переключаем на крупный план выхлопа");
            this._showHeaterExhaustCloseup(true);
            return;
        }

        if (zone === "heater-exhaust-back") {
            console.log("Возврат из крупного плана");
            this._showHeaterExhaustCloseup(false);
            return;
        }

        if (zone === "heater-valve") {
            console.log("Клик по клапану");
            return;
        }

        if (zone === "heater-rear-left") {
            this.app.changeScene("heater");
        }
    }

    _toggleHeaterPanel(isOpen) {
        const heaterSection = document.getElementById("scene-heater");
        if (!heaterSection) return;

        const img = heaterSection.querySelector("img[src*='rear_left_heater']");
        const closedLayer = heaterSection.querySelector(".heater-hitbox-closed");
        const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
        const hint = heaterSection.querySelector("p");

        if (img) {
            img.src = isOpen
                ? "./img/heater/rear_left_heater_opened.jpg"
                : "./img/heater/rear_left_heater.jpg";
        }

        if (closedLayer && openedLayer) {
            closedLayer.classList.toggle("hidden", isOpen);
            openedLayer.classList.toggle("hidden", !isOpen);
        }

        if (hint) {
            hint.textContent = isOpen ? "Борт открыт" : "Откройте борт";
        }
    }

    _showHeaterExhaustCloseup(isCloseup) {
        const heaterSection = document.getElementById("scene-heater");
        if (!heaterSection) return;

        const img = heaterSection.querySelector("img[src*='rear_left_heater']");
        const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
        const hint = heaterSection.querySelector("p");

        if (img) {
            img.src = isCloseup
                ? "./img/heater/exhaust_closeup.jpg"
                : "./img/heater/rear_left_heater_opened.jpg";
        }

        if (openedLayer) {
            const exhaustHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-closeup"]');
            const valveHitbox = openedLayer.querySelector('[data-zone="heater-valve"]');
            const closeHitbox = openedLayer.querySelector('[data-zone="side-panel-close"]');
            const backHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-back"]');

            if (exhaustHitbox) exhaustHitbox.classList.toggle("hidden", isCloseup);
            if (valveHitbox) valveHitbox.classList.toggle("hidden", isCloseup);
            if (closeHitbox) closeHitbox.classList.toggle("hidden", isCloseup);
            if (backHitbox) backHitbox.classList.toggle("hidden", !isCloseup);
        }

        if (hint) {
            hint.textContent = isCloseup ? "Выхлоп обогревателя" : "Борт открыт";
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

        const heaterSection = document.getElementById("scene-heater");
        if (heaterSection) {
            const img = heaterSection.querySelector("img[src*='rear_left_heater']");
            const closedLayer = heaterSection.querySelector(".heater-hitbox-closed");
            const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
            const hint = heaterSection.querySelector("p");

            if (img) img.src = "./img/heater/rear_left_heater.jpg";
            if (closedLayer) closedLayer.classList.remove("hidden");
            if (openedLayer) {
                openedLayer.classList.add("hidden");
                openedLayer.querySelectorAll(".hitbox").forEach(hb => hb.classList.remove("hidden"));
            }
            if (hint) hint.textContent = "Откройте борт";
        }
    }

    dispose() {
        this.destroyCurrentView();
    }

    destroyCurrentView() {
        this.currentView?.dispose?.();
        this.currentView = null;
    }
}