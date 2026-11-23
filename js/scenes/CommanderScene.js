export class CommanderScene {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById("scene-commander");
    this.lookBtn = document.getElementById("commanderLookBtn");
    this.handleAction = this.handleAction.bind(this);
    this._onLookClick = this._onLookClick.bind(this);
  }

  init() {
    console.log("CommanderScene init");
    if (this.el) this.el.addEventListener("click", this.handleAction);
    if (this.lookBtn) this.lookBtn.addEventListener("click", this._onLookClick);
    this._syncFuelValveVisual();
  }

  handleAction(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    switch (target.dataset.action) {
      case "exit_to_hangar":
        this.app.changeScene("hangar", "scene-hangar");
        break;
      case "toggle_commander_view":
        this.app.state.toggleCommanderView();
        this._syncFuelValveVisual();
        break;
      case "enter_driver_seat":
        this.app.changeScene("driver", "scene-driver");
        break;
      case "toggle_heater_fuel_valve":
        // Чтобы увидеть тросик/рычаг — сначала наклон взгляда вниз
        if (this.app.state.commanderView !== "tilted") {
          this.app.state.toggleCommanderView();
        }
        this.app.state.toggleHeaterFuelValve();
        this._syncFuelValveVisual();
        this.app.actionNotifier?.notify(
          "toggle_heater_fuel_valve",
          this.app.state.getSnapshot(),
        );
        console.log(
          "⛽ Топливный кран подогревателя:",
          this.app.state.heaterFuelValve ? "ОТКРЫТ" : "ЗАКРЫТ",
        );
        break;
    }
  }

  _onLookClick(event) {
    event.stopPropagation();
    this.app.state.toggleCommanderView();
    this._syncFuelValveVisual();
  }

  /**
   * Картинки тросика:
   * - straight → straight.png
   * - tilted + heaterFuelValve=false → tilted.png (рычаг опущен, кран закрыт)
   * - tilted + heaterFuelValve=true  → fuel_valve_up.png (рычаг поднят, кран открыт)
   */
  _syncFuelValveVisual() {
    const isTilted = this.app.state?.commanderView === "tilted";
    const isValveUp = Boolean(this.app.state?.heaterFuelValve);

    this.el?.classList.toggle("commander-view-tilted", isTilted);
    this.el?.classList.toggle("valve-up", isTilted && isValveUp);

    if (this.lookBtn) {
      this.lookBtn.textContent = isTilted ? "Взгляд прямо" : "Взгляд вниз";
    }
  }

  dispose() {
    console.log("CommanderScene dispose");
    if (this.el) this.el.removeEventListener("click", this.handleAction);
    if (this.lookBtn) this.lookBtn.removeEventListener("click", this._onLookClick);
  }
}
