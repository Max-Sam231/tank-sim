class TankState {
  constructor() {
    this.isBatteryOn = false;
    this.isBrakePressed = false;
    
    // Cabin controls state
    this.manometer = 0; // Pressure value
    this.instrumentPanel = false;
    this.leftTank = false;
    this.bcn = false;
    this.shutters = false;
    this.rightTank = false;
    this.fuelPrimerLever = false;
    this.fuelManualFeed = 0; // 0-100
    this.gearLever = 'neutral'; // neutral, 1, 2, 3, 4, 5, R
    this.gasPedal = false;
    this.airBleedValve = false;

    // Instrument panel controls
    this.azr = 0; // 0=closed cover, 1=open, 2=on
    this.epk = false;
    this.horn = false;
    this.mznEngine = false;
    this.ammeterButton = false;

    this.leftRightTanks = 1; // 0=right, 1=middle, 2=left
    this.sparkPlug = 1; // 0=right, 1=middle, 2=left
    this.engineStart = 1; // 0=right, 1=middle, 2=left

    this.emergencyHatchRotation = false;
    this.oilPumpGearbox = false;
    this.commanderCall = false;
    this.airIntake = false;

    // Instrument panel remaining toggles (tmb1/tmb2)
    this.heating = false;
    this.combined = false;
    this.leftLights = false;
    this.rightLights = false;
    this.gabrateLights = false;
    this.lightsAll = false;
    this.waterAntifreeze = false;
    this.gpk = false;
    this.bcaTca = false;
    this.mznTow = 0; // 0=closed, 1=open idle, 2=open pressed
    this.starter = 0; // 0=closed, 1=open idle, 2=open pressed
    this.signalLampsCover = false;
    this.signalLampsControl = false;

    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot);
  }

  getSnapshot() {
    return {
      isBatteryOn: this.isBatteryOn,
      isBrakePressed: this.isBrakePressed,
      manometer: this.manometer,
      instrumentPanel: this.instrumentPanel,
      leftTank: this.leftTank,
      bcn: this.bcn,
      shutters: this.shutters,
      rightTank: this.rightTank,
      fuelPrimerLever: this.fuelPrimerLever,
      fuelManualFeed: this.fuelManualFeed,
      gearLever: this.gearLever,
      gasPedal: this.gasPedal,
      airBleedValve: this.airBleedValve,
      azr: this.azr,
      epk: this.epk,
      horn: this.horn,
      mznEngine: this.mznEngine,
      ammeterButton: this.ammeterButton,
      leftRightTanks: this.leftRightTanks,
      sparkPlug: this.sparkPlug,
      engineStart: this.engineStart,
      emergencyHatchRotation: this.emergencyHatchRotation,
      oilPumpGearbox: this.oilPumpGearbox,
      commanderCall: this.commanderCall,
      airIntake: this.airIntake,
      heating: this.heating,
      combined: this.combined,
      leftLights: this.leftLights,
      rightLights: this.rightLights,
      gabrateLights: this.gabrateLights,
      lightsAll: this.lightsAll,
      waterAntifreeze: this.waterAntifreeze,
      gpk: this.gpk,
      bcaTca: this.bcaTca,
      mznTow: this.mznTow,
      starter: this.starter,
      signalLampsCover: this.signalLampsCover,
      signalLampsControl: this.signalLampsControl,
    };
  }

  toggleBattery() {
    this.isBatteryOn = !this.isBatteryOn;
    this._emit();
  }

  setBrakePressed(isPressed) {
    const next = Boolean(isPressed);
    if (this.isBrakePressed === next) return;
    this.isBrakePressed = next;
    this._emit();
  }

  // Manometer - set pressure value
  setManometer(value) {
    this.manometer = Math.max(0, Math.min(300, value)); // 0-300 PSI
    this._emit();
  }

  toggleInstrumentPanel() {
    this.instrumentPanel = !this.instrumentPanel;
    this._emit();
  }

  toggleLeftTank() {
    this.leftTank = !this.leftTank;
    this._emit();
  }

  toggleBcn() {
    this.bcn = !this.bcn;
    this._emit();
  }

  toggleShutters() {
    this.shutters = !this.shutters;
    this._emit();
  }

  toggleRightTank() {
    this.rightTank = !this.rightTank;
    this._emit();
  }

  toggleFuelPrimerLever() {
    this.fuelPrimerLever = !this.fuelPrimerLever;
    this._emit();
  }

  setFuelManualFeed(value) {
    this.fuelManualFeed = Math.max(0, Math.min(100, value)); // 0-100%
    this._emit();
  }

  adjustFuelManualFeed(delta) {
    this.setFuelManualFeed(this.fuelManualFeed + delta);
  }

  cycleGearLever() {
    const gears = ['neutral', '1', '2', '3', '4', '5', 'R'];
    const currentIndex = gears.indexOf(this.gearLever);
    this.gearLever = gears[(currentIndex + 1) % gears.length];
    this._emit();
  }

  setGasPedal(isPressed) {
    const next = Boolean(isPressed);
    if (this.gasPedal === next) return;
    this.gasPedal = next;
    this._emit();
  }

  toggleAirBleedValve() {
    this.airBleedValve = !this.airBleedValve;
    this._emit();
  }

  cycleAzr() {
    this.azr = (this.azr + 1) % 3;
    this._emit();
  }

  toggleEpk() {
    this.epk = !this.epk;
    this._emit();
  }

  toggleHorn() {
    this.horn = !this.horn;
    this._emit();
  }

  toggleMznEngine() {
    this.mznEngine = !this.mznEngine;
    this._emit();
  }

  toggleAmmeterButton() {
    this.ammeterButton = !this.ammeterButton;
    this._emit();
  }

  cycleLeftRightTanks() {
    this.leftRightTanks = (this.leftRightTanks + 1) % 3;
    this._emit();
  }

  cycleSparkPlug() {
    this.sparkPlug = (this.sparkPlug + 1) % 3;
    this._emit();
  }

  cycleEngineStart() {
    this.engineStart = (this.engineStart + 1) % 3;
    this._emit();
  }

  toggleEmergencyHatchRotation() {
    this.emergencyHatchRotation = !this.emergencyHatchRotation;
    this._emit();
  }

  toggleOilPumpGearbox() {
    this.oilPumpGearbox = !this.oilPumpGearbox;
    this._emit();
  }

  toggleCommanderCall() {
    this.commanderCall = !this.commanderCall;
    this._emit();
  }

  toggleAirIntake() {
    this.airIntake = !this.airIntake;
    this._emit();
  }

  toggleHeating() {
    this.heating = !this.heating;
    this._emit();
  }

  toggleCombined() {
    this.combined = !this.combined;
    this._emit();
  }

  toggleLeftLights() {
    this.leftLights = !this.leftLights;
    this._emit();
  }

  toggleRightLights() {
    this.rightLights = !this.rightLights;
    this._emit();
  }

  toggleGabrateLights() {
    this.gabrateLights = !this.gabrateLights;
    this._emit();
  }

  toggleLightsAll() {
    this.lightsAll = !this.lightsAll;
    this._emit();
  }

  toggleWaterAntifreeze() {
    this.waterAntifreeze = !this.waterAntifreeze;
    this._emit();
  }

  toggleGpk() {
    this.gpk = !this.gpk;
    this._emit();
  }

  toggleBcaTca() {
    this.bcaTca = !this.bcaTca;
    this._emit();
  }

  cycleMznTow() {
    this.mznTow = (this.mznTow + 1) % 3;
    this._emit();
  }

  cycleStarter() {
    this.starter = (this.starter + 1) % 3;
    this._emit();
  }

  toggleSignalLampsCover() {
    this.signalLampsCover = !this.signalLampsCover;
    this._emit();
  }

  toggleSignalLampsControl() {
    this.signalLampsControl = !this.signalLampsControl;
    this._emit();
  }
}

export { TankState };
