import { TankTopView } from "../views/TankTopView.js";
import { TankSideView } from "../views/TankSideView.js";
import { TankSideRightView } from "../views/TankSideRightView.js"; // <-- новый импорт

export class HangarScene {
    constructor(app) {
        this.app = app;
        this.currentView = null;
        this.currentMode = "top"; // top -> side -> side-right -> top
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
        const sceneMap = { "driver": "driver", "commander": "commander", "gunner": "gunner" };
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
        const zoneMap = { "heater-rear-left": "heater" };
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

        if (zone === "side-panel-open") { this._toggleHeaterPanel(true); return; }
        if (zone === "side-panel-close") { this._toggleHeaterPanel(false); return; }
        if (zone === "heater-exhaust-closeup") { this._showHeaterExhaustCloseup(true); return; }
        if (zone === "heater-exhaust-back") { this._showHeaterExhaustCloseup(false); return; }

        if (zone === "exhaust-bolt-1" || zone === "exhaust-bolt-2") {
            const boltId = zone.split("-")[2];
            this.app.state?.toggleExhaustBolt?.(boltId);
            if (this.app.state?.[`exhaustBolt${boltId}`]) {
                hit.style.fill = "rgba(0,255,0,0.4)";
                hit.style.stroke = "rgba(0,255,0,0.9)";
            } else {
                hit.style.fill = "rgba(255,200,50,0.2)";
                hit.style.stroke = "rgba(255,200,50,0.7)";
            }
            return;
        }

        if (zone === "exhaust-cover") {
            if (this.app.state?.canRemoveExhaustCover?.()) {
                this.app.state?.removeExhaustCover?.();
                this._showExhaustCoverRemoved(true);
            } else {
                console.log("Сначала открутите оба болта");
                hit.style.animation = "pulse 0.3s ease 3";
            }
            return;
        }

        if (zone === "heater-valve") { console.log("Клик по клапану"); return; }
        if (zone === "heater-rear-left") { this.app.changeScene("heater"); }
    }

    _toggleHeaterPanel(isOpen) {
        const heaterSection = document.getElementById("scene-heater");
        if (!heaterSection) return;
        const img = heaterSection.querySelector(".scene-content > img");
        const closedLayer = heaterSection.querySelector(".heater-hitbox-closed");
        const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
        const hint = heaterSection.querySelector("p");
        if (img) {
            img.src = isOpen ? "./img/heater/rear_left_heater_opened.jpg" : "./img/heater/rear_left_heater.jpg";
        }
        if (closedLayer && openedLayer) {
            closedLayer.classList.toggle("hidden", isOpen);
            openedLayer.classList.toggle("hidden", !isOpen);
        }
        if (openedLayer) this._setCloseupState(openedLayer, false);
        if (hint) hint.textContent = isOpen ? "Борт открыт" : "Откройте борт";
    }

    _setCloseupState(openedLayer, isCloseup) {
        const coverRemoved = this.app.state?.exhaustCoverRemoved || false;
        const exhaustHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-closeup"]');
        const closeHitbox = openedLayer.querySelector('[data-zone="side-panel-close"]');
        const backHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-back"]');
        const bolt1 = openedLayer.querySelector('[data-zone="exhaust-bolt-1"]');
        const bolt2 = openedLayer.querySelector('[data-zone="exhaust-bolt-2"]');
        const cover = openedLayer.querySelector('[data-zone="exhaust-cover"]');
        if (exhaustHitbox) exhaustHitbox.classList.toggle("hidden", isCloseup || coverRemoved);
        if (closeHitbox) closeHitbox.classList.toggle("hidden", isCloseup);
        if (backHitbox) backHitbox.classList.toggle("hidden", !isCloseup);
        if (bolt1) bolt1.classList.toggle("hidden", !isCloseup || coverRemoved);
        if (bolt2) bolt2.classList.toggle("hidden", !isCloseup || coverRemoved);
        if (cover) cover.classList.toggle("hidden", !isCloseup || coverRemoved);
    }

    _showExhaustCoverRemoved(isRemoved) {
        const heaterSection = document.getElementById("scene-heater");
        if (!heaterSection) return;
        const img = heaterSection.querySelector(".scene-content > img");
        const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
        const hint = heaterSection.querySelector("p");
        if (img) {
            img.src = isRemoved ? "./img/heater/exhaust_cover_removed.jpg" : "./img/heater/exhaust_closeup.jpg";
        }
        if (openedLayer) this._setCloseupState(openedLayer, isRemoved ? false : true);
        if (hint) hint.textContent = isRemoved ? "Крышка снята" : "Открутите болты";
    }

    _showHeaterExhaustCloseup(isCloseup) {
        const heaterSection = document.getElementById("scene-heater");
        if (!heaterSection) return;
        const img = heaterSection.querySelector(".scene-content > img");
        const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
        const hint = heaterSection.querySelector("p");
        if (img) {
            img.src = isCloseup ? "./img/heater/exhaust_closeup.jpg" : "./img/heater/rear_left_heater_opened.jpg";
        }
        if (openedLayer) {
            const exhaustHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-closeup"]');
            const valveHitbox = openedLayer.querySelector('[data-zone="heater-valve"]');
            const closeHitbox = openedLayer.querySelector('[data-zone="side-panel-close"]');
            const backHitbox = openedLayer.querySelector('[data-zone="heater-exhaust-back"]');
            const bolt1 = openedLayer.querySelector('[data-zone="exhaust-bolt-1"]');
            const bolt2 = openedLayer.querySelector('[data-zone="exhaust-bolt-2"]');
            const cover = openedLayer.querySelector('[data-zone="exhaust-cover"]');
            if (exhaustHitbox) exhaustHitbox.classList.toggle("hidden", isCloseup);
            if (valveHitbox) valveHitbox.classList.toggle("hidden", isCloseup);
            if (closeHitbox) closeHitbox.classList.toggle("hidden", isCloseup);
            if (backHitbox) backHitbox.classList.toggle("hidden", !isCloseup);
            const coverRemoved = this.app.state?.exhaustCoverRemoved || false;
            if (bolt1) bolt1.classList.toggle("hidden", !isCloseup || coverRemoved);
            if (bolt2) bolt2.classList.toggle("hidden", !isCloseup || coverRemoved);
            if (cover) cover.classList.toggle("hidden", !isCloseup || coverRemoved);
        }
        if (hint) hint.textContent = isCloseup ? "Открутите болты" : "Борт открыт";
    }

    toggleView() {
        if (this.currentMode === "top") {
            this.showSideView();
        } else if (this.currentMode === "side") {
            this.showSideRightView();
        } else {
            this.showTopView();
        }
    }

    showTopView() {
        this.destroyCurrentView();
        document.getElementById("tank-top-view")?.classList.remove("hidden");
        document.getElementById("tank-side-view")?.classList.add("hidden");
        document.getElementById("tank-side-right-view")?.classList.add("hidden");
        this.currentView = new TankTopView(this.app, this);
        this.currentView.init();
        this.currentMode = "top";

        const xrayBtn = document.getElementById("xrayBtn");
        const tankImg = document.querySelector("#tank-top-view .tank-layer-top");
        if (this.currentView?.resetXrayState) {
            this.currentView.resetXrayState();
        }
        if (xrayBtn && tankImg) {
            xrayBtn.onclick = () => {
                const isXray = tankImg.classList.contains("xray-active");
                tankImg.classList.remove("xray-transition", "normal-transition");
                void tankImg.offsetWidth;
                tankImg.classList.add(isXray ? "normal-transition" : "xray-transition");
                tankImg.src = isXray ? "./img/hangar/tank.png" : "./img/hangar/tank_xray.png";
                tankImg.classList.toggle("xray-active", !isXray);
                xrayBtn.classList.toggle("is-active", !isXray);
                xrayBtn.textContent = isXray ? "Рентген" : "Обычный вид";
            };
        }
    }

    showSideView() {
        this.destroyCurrentView();
        document.getElementById("tank-side-view")?.classList.remove("hidden");
        document.getElementById("tank-top-view")?.classList.add("hidden");
        document.getElementById("tank-side-right-view")?.classList.add("hidden");
        this.currentView = new TankSideView(this.app, this);
        this.currentView.init();
        this.currentMode = "side";
        if (this.currentView?.resetXrayState) {
            this.currentView.resetXrayState();
        }
        const xrayBtn = document.getElementById("xrayBtn");
        if (xrayBtn) xrayBtn.classList.add("hidden");

        this._resetHeaterState();
    }

    showSideRightView() {
        this.destroyCurrentView();
        document.getElementById("tank-side-right-view")?.classList.remove("hidden");
        document.getElementById("tank-top-view")?.classList.add("hidden");
        document.getElementById("tank-side-view")?.classList.add("hidden");
        this.currentView = new TankSideRightView(this.app, this);
        this.currentView.init();
        this.currentMode = "side-right";

        const xrayBtn = document.getElementById("xrayBtn");
        if (xrayBtn) xrayBtn.classList.add("hidden");

        this._resetHeaterState();
    }

    _resetHeaterState() {
        const heaterSection = document.getElementById("scene-heater");
        if (heaterSection) {
            const img = heaterSection.querySelector(".scene-content > img");
            const closedLayer = heaterSection.querySelector(".heater-hitbox-closed");
            const openedLayer = heaterSection.querySelector(".heater-hitbox-opened");
            const hint = heaterSection.querySelector("p");
            if (img) img.src = "./img/heater/rear_left_heater.jpg";
            if (closedLayer) closedLayer.classList.remove("hidden");
            if (openedLayer) {
                openedLayer.classList.add("hidden");
                openedLayer.querySelectorAll(".hitbox").forEach(hb => {
                    hb.classList.remove("hidden");
                    if (hb.dataset.zone?.startsWith("exhaust-bolt")) {
                        hb.style.fill = "rgba(255,200,50,0.2)";
                        hb.style.stroke = "rgba(255,200,50,0.7)";
                    }
                });
            }
            if (hint) hint.textContent = "Откройте борт";
            if (this.app.state) {
                this.app.state.exhaustBolt1 = false;
                this.app.state.exhaustBolt2 = false;
                this.app.state.exhaustCoverRemoved = false;
            }
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