export class TankSideView {
    constructor(app, hangarScene) {
        this.app = app;
        this.hangarScene = hangarScene;

        this.el = document.getElementById("tank-side-view");

        this.onClick = this.onClick.bind(this);
    }

    init() {
        console.log("TankSideView init");

        this.el?.addEventListener("click", this.onClick);
    }

    onClick(event) {
        const target = event.target.closest("[data-zone]");

        if (!target) return;

        const zone = target.dataset.zone;

        if (zone === "driver") {
            this.hangarScene.enterDriverCabin();
        }
    }

    dispose() {
        this.el?.removeEventListener("click", this.onClick);
    }
}