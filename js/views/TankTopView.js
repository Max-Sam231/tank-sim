export class TankTopView {
    constructor(app, hangarScene) {
        this.app = app;
        this.hangarScene = hangarScene;

        this.el = document.getElementById("tank-top-view");

        this.onClick = this.onClick.bind(this);
    }

    init() {
        console.log("TankTopView init");

        console.log(this.el);

        this.el?.addEventListener("click", this.onClick);
    }

    onClick(event) {

        const target = event.target.closest("[data-hatch]");

        if (!target) return;

        const hatch = target.dataset.hatch;

        console.log("CLICK:", hatch);

        if (hatch === "driver") {
            this.hangarScene.enterDriverCabin();
        }

        else if (hatch === "commander") {
            this.hangarScene.enterCommanderCabin();
        }
    }

    dispose() {
        this.el?.removeEventListener("click", this.onClick);
    }
}