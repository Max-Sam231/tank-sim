export class CommanderScene {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById("scene-commander");
        this.handleAction = this.handleAction.bind(this);
    }

    init() {
        console.log("CommanderScene init");
        if (this.el) this.el.addEventListener("click", this.handleAction);
        this._syncFuelValveVisual();
    }

    handleAction(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        switch (target.dataset.action) {
            case 'exit_to_hangar':
                this.app.changeScene("hangar", "scene-hangar");
                break;
            case 'toggle_commander_view':
                this.app.state.toggleCommanderView();
                this._syncFuelValveVisual();
                break;
            case 'enter_driver_seat':
                this.app.changeScene("driver", "scene-driver");
                break;
            case 'toggle_heater_fuel_valve':
                this.app.state.toggleHeaterFuelValve();
                this._syncFuelValveVisual();
                console.log("⛽ Клапан:", this.app.state.heaterFuelValve ? "ПОДНЯТ" : "ОПУЩЕН");
                break;
        }
    }

    _syncFuelValveVisual() {
    const isTilted = this.app.state?.commanderView === 'tilted';
    const isValveUp = this.app.state?.heaterFuelValve === true;
    
    this.el.classList.toggle('commander-view-tilted', isTilted);
    this.el.classList.toggle('valve-up', isTilted && isValveUp);
}

    dispose() {
        console.log("CommanderScene dispose");
        if (this.el) this.el.removeEventListener("click", this.handleAction);
    }
}