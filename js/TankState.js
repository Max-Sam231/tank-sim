class TankState {
  constructor() {
    this.isBatteryOn = false;
    this.isBrakePressed = false;
    this.parkingBrakeLatched = false;

    this.scenario = {
      startMethod: "starter-generator",
      ambientTempC: 15,
    };
    
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
    this.signalLamps = 0; // 0=closed cover, 1=open, 2=on

    this.sensors = {
      air_left_cylinder: 80.0,
      air_right_cylinder: 80.0,
      air_start_pressure: 0.0,
      engine_rpm: 0,
      oil_pressure_engine: 0.0,
      oil_pressure_gearbox: 0.0,
      fuel_pressure: 0.0,
      coolant_temp: 20.0,
      oil_temp: 20.0,
      voltage: 0.0,
      speed_kmh: 0.0,
      fuel_level: 100.0,
      is_bcn_active: false,
      is_mzn_active: false,
    };

    this.lamps = {
      battery_charge: false,
      oil_pressure_alarm: false,
      overheat: false,
      fuel_reserve: false,
      gear_engaged: false,
    };

    this._engineRunning = false;
    this._crankTime = 0;
    this._batteryVoltage = 25.0;
    this._timeSinceLastEmit = 0;

    this._brakeHoldTime = 0;
    this._brakeHoldTriggered = false;

    this._parkingBrakeHoldThresholdSec = 1.2;

    this._listeners = new Set();
  }

  reset() {
    this.isBatteryOn = false;
    this.isBrakePressed = false;
    this.parkingBrakeLatched = false;

    this.manometer = 0;
    this.instrumentPanel = false;
    this.leftTank = false;
    this.bcn = false;
    this.shutters = false;
    this.rightTank = false;
    this.fuelPrimerLever = false;
    this.fuelManualFeed = 0;
    this.gearLever = "neutral";
    this.gasPedal = false;
    this.airBleedValve = false;

    this.azr = 0;
    this.epk = false;
    this.horn = false;
    this.mznEngine = false;
    this.ammeterButton = false;

    this.leftRightTanks = 1;
    this.sparkPlug = 1;
    this.engineStart = 1;

    this.emergencyHatchRotation = false;
    this.oilPumpGearbox = false;
    this.commanderCall = false;
    this.airIntake = false;

    this.heating = false;
    this.combined = false;
    this.leftLights = false;
    this.rightLights = false;
    this.gabrateLights = false;
    this.lightsAll = false;
    this.waterAntifreeze = false;
    this.gpk = false;
    this.bcaTca = false;
    this.mznTow = 0;
    this.starter = 0;
    this.signalLamps = 0;

    this.sensors.air_left_cylinder = 80.0;
    this.sensors.air_right_cylinder = 80.0;
    this.sensors.air_start_pressure = 0.0;
    this.sensors.engine_rpm = 0;
    this.sensors.oil_pressure_engine = 0.0;
    this.sensors.oil_pressure_gearbox = 0.0;
    this.sensors.fuel_pressure = 0.0;
    this.sensors.coolant_temp = Number.isFinite(this.scenario?.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    this.sensors.oil_temp = Number.isFinite(this.scenario?.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    this.sensors.voltage = 0.0;
    this.sensors.speed_kmh = 0.0;
    this.sensors.fuel_level = 100.0;
    this.sensors.is_bcn_active = false;
    this.sensors.is_mzn_active = false;

    this.lamps.battery_charge = false;
    this.lamps.oil_pressure_alarm = false;
    this.lamps.overheat = false;
    this.lamps.fuel_reserve = false;
    this.lamps.gear_engaged = false;

    this._engineRunning = false;
    this._crankTime = 0;
    this._batteryVoltage = 25.0;
    this._timeSinceLastEmit = 0;
    this._brakeHoldTime = 0;
    this._brakeHoldTriggered = false;

    this._emit();
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
      brakeEffective: this.isBrakePressed || this.parkingBrakeLatched,
      parkingBrakeLatched: this.parkingBrakeLatched,
      engineRunning: this._engineRunning,

      scenario: { ...this.scenario },
      scenario_start_method: this.scenario.startMethod,
      scenario_ambient_temp_c: this.scenario.ambientTempC,
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
      signalLamps: this.signalLamps,

      sensors: { ...this.sensors },
      lamps: { ...this.lamps },

      air_left_cylinder: this.sensors.air_left_cylinder,
      air_right_cylinder: this.sensors.air_right_cylinder,
      air_start_pressure: this.sensors.air_start_pressure,
      engine_rpm: this.sensors.engine_rpm,
      oil_pressure_engine: this.sensors.oil_pressure_engine,
      oil_pressure_gearbox: this.sensors.oil_pressure_gearbox,
      fuel_pressure: this.sensors.fuel_pressure,
      coolant_temp: this.sensors.coolant_temp,
      oil_temp: this.sensors.oil_temp,
      voltage: this.sensors.voltage,
      speed_kmh: this.sensors.speed_kmh,
      fuel_level: this.sensors.fuel_level,
      is_bcn_active: this.sensors.is_bcn_active,
      is_mzn_active: this.sensors.is_mzn_active,

      lamp_battery_charge: this.lamps.battery_charge,
      lamp_oil_pressure_alarm: this.lamps.oil_pressure_alarm,
      lamp_overheat: this.lamps.overheat,
      lamp_fuel_reserve: this.lamps.fuel_reserve,
      lamp_gear_engaged: this.lamps.gear_engaged,
    };
  }

  setScenario({ startMethod, ambientTempC } = {}) {
    let changed = false;

    if (typeof startMethod === "string" && startMethod) {
      if (this.scenario.startMethod !== startMethod) {
        this.scenario.startMethod = startMethod;
        changed = true;
      }
    }

    if (Number.isFinite(ambientTempC)) {
      const nextTemp = Math.round(ambientTempC);
      if (this.scenario.ambientTempC !== nextTemp) {
        this.scenario.ambientTempC = nextTemp;
        changed = true;
      }
    }

    if (changed && !this._engineRunning) {
      this._setSensor("coolant_temp", this.scenario.ambientTempC, { min: -50, max: 120, epsilon: 0 });
      this._setSensor("oil_temp", this.scenario.ambientTempC, { min: -50, max: 120, epsilon: 0 });
    }

    if (changed) this._emit();
  }

  _clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  _approach(current, target, ratePerSec, dt) {
    if (!Number.isFinite(current)) current = 0;
    if (!Number.isFinite(target)) target = 0;
    if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) return target;
    if (!Number.isFinite(dt) || dt <= 0) return current;

    const delta = target - current;
    const step = ratePerSec * dt;
    if (Math.abs(delta) <= step) return target;
    return current + Math.sign(delta) * step;
  }

  _setSensor(key, value, { min = -Infinity, max = Infinity, epsilon = 1e-3 } = {}) {
    const next = this._clamp(Number(value), min, max);
    const prev = Number(this.sensors[key]);
    if (!Number.isFinite(next) && !Number.isFinite(prev)) return false;
    if (Number.isFinite(prev) && Number.isFinite(next) && Math.abs(prev - next) < epsilon) return false;
    this.sensors[key] = next;
    return true;
  }

  _setLamp(key, value) {
    const next = Boolean(value);
    if (this.lamps[key] === next) return false;
    this.lamps[key] = next;
    return true;
  }

  _setSensorBool(key, value) {
    const next = Boolean(value);
    if (this.sensors[key] === next) return false;
    this.sensors[key] = next;
    return true;
  }

  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25);

    let changed = false;

    const isMassOn = Boolean(this.isBatteryOn);
    const starterPressed = this.starter === 2;

    if (this.isBrakePressed) {
      this._brakeHoldTime += dt;
      if (!this._brakeHoldTriggered && this._brakeHoldTime >= this._parkingBrakeHoldThresholdSec) {
        this.parkingBrakeLatched = !this.parkingBrakeLatched;
        this._brakeHoldTriggered = true;
        changed = true;
      }
    } else {
      this._brakeHoldTime = 0;
      this._brakeHoldTriggered = false;
    }

    const startMethod = this.scenario.startMethod;
    const requiresAirStart = startMethod === "air-start";

    const gearRatioMap = {
      neutral: 0,
      R: -0.04,
      "1": 0.03,
      "2": 0.05,
      "3": 0.07,
      "4": 0.09,
      "5": 0.11,
    };

    const gearRatio = gearRatioMap[this.gearLever] ?? 0;

    const isBcnActive = isMassOn && Boolean(this.bcn);
    const isMznActive = isMassOn && Boolean(this.mznEngine);
    changed = this._setSensorBool("is_bcn_active", isBcnActive) || changed;
    changed = this._setSensorBool("is_mzn_active", isMznActive) || changed;

    let targetFuelPressure = this._engineRunning ? 1.8 : (isBcnActive ? 1.8 : 0.0);
    const fuelPressure = this._approach(this.sensors.fuel_pressure, targetFuelPressure, 3.0, dt);
    changed = this._setSensor("fuel_pressure", fuelPressure, { min: 0, max: 3 }) || changed;

    if (!isMassOn) {
      this._batteryVoltage = 25.0;
    } else if (!this._engineRunning) {
      const drainRate = 0.002;
      this._batteryVoltage = this._clamp(this._batteryVoltage - drainRate * dt, 15.0, 26.0);
    }

    let baseVoltage = 0.0;
    if (isMassOn) {
      baseVoltage = this._engineRunning ? 27.8 : this._batteryVoltage;
    }

    const canCrank = isMassOn && baseVoltage >= 18.0;
    const starterSag = starterPressed && canCrank ? 5.0 : 0.0;
    const voltage = this._clamp(baseVoltage - starterSag, 0.0, 28.5);
    changed = this._setSensor("voltage", voltage, { min: 0, max: 28.5 }) || changed;

    const leftAirOpen = Boolean(this.leftTank);
    const rightAirOpen = Boolean(this.rightTank);
    const bleedOpen = Boolean(this.airBleedValve);

    const leftAir = this.sensors.air_left_cylinder;
    const rightAir = this.sensors.air_right_cylinder;
    const openPressures = [];
    if (leftAirOpen) openPressures.push(leftAir);
    if (rightAirOpen) openPressures.push(rightAir);
    const airStartPressure = openPressures.length ? openPressures.reduce((a, b) => a + b, 0) / openPressures.length : 0.0;
    changed = this._setSensor("air_start_pressure", airStartPressure, { min: 0, max: 100 }) || changed;

    const isCranking = starterPressed && canCrank && !this._engineRunning;

    if (bleedOpen) {
      const bleedRate = 6.0;
      if (leftAirOpen) changed = this._setSensor("air_left_cylinder", leftAir - bleedRate * dt, { min: 0, max: 100 }) || changed;
      if (rightAirOpen) changed = this._setSensor("air_right_cylinder", rightAir - bleedRate * dt, { min: 0, max: 100 }) || changed;
    }

    if (isCranking && requiresAirStart) {
      const crankAirRate = 2.2;
      if (leftAirOpen) changed = this._setSensor("air_left_cylinder", this.sensors.air_left_cylinder - crankAirRate * dt, { min: 0, max: 100 }) || changed;
      if (rightAirOpen) changed = this._setSensor("air_right_cylinder", this.sensors.air_right_cylinder - crankAirRate * dt, { min: 0, max: 100 }) || changed;
    }

    const fuelOk = fuelPressure >= 0.8;
    const airOk = requiresAirStart ? airStartPressure >= 10.0 : true;
    const primerOk = Boolean(this.fuelPrimerLever);
    const manualOk = this.fuelManualFeed >= 10;

    if (isCranking && fuelOk && airOk && manualOk && primerOk) {
      this._crankTime += dt;
    } else {
      this._crankTime = 0;
    }

    if (!this._engineRunning && this._crankTime >= 1.5) {
      this._engineRunning = true;
      this._crankTime = 0;
    }

    if (this._engineRunning && (!fuelOk || !isMassOn) && this.sensors.engine_rpm <= 850) {
      this._engineRunning = false;
    }

    const throttle = this._clamp((this.gasPedal ? 0.7 : 0.0) + (this.fuelManualFeed / 100) * 0.5, 0.0, 1.0);

    let targetRpm = 0;
    if (this._engineRunning) {
      targetRpm = Math.round(900 + throttle * 1700);
    } else if (isCranking) {
      targetRpm = 150;
    }

    const rpmRate = this._engineRunning ? 2500 : 700;
    const rpm = Math.round(this._approach(this.sensors.engine_rpm, targetRpm, rpmRate, dt));
    changed = this._setSensor("engine_rpm", rpm, { min: 0, max: 3000, epsilon: 0 }) || changed;

    let targetOilEngine = 0.0;
    if (this._engineRunning) targetOilEngine = 5.5;
    else if (isMznActive && voltage >= 20.0) targetOilEngine = 3.5;
    const oilEngineRate = this._engineRunning ? 6.0 : 1.2;
    const oilEngine = this._approach(this.sensors.oil_pressure_engine, targetOilEngine, oilEngineRate, dt);
    changed = this._setSensor("oil_pressure_engine", oilEngine, { min: 0, max: 10 }) || changed;

    const targetOilGearbox = this._engineRunning ? 2.5 : 0.0;
    const oilGearbox = this._approach(this.sensors.oil_pressure_gearbox, targetOilGearbox, 4.0, dt);
    changed = this._setSensor("oil_pressure_gearbox", oilGearbox, { min: 0, max: 5 }) || changed;

    const ambient = Number.isFinite(this.scenario.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    const rpmFactor = this._engineRunning ? this._clamp((rpm - 900) / 1700, 0.0, 1.0) : 0.0;
    const targetCoolant = this._engineRunning ? 80.0 + rpmFactor * 15.0 : ambient;
    const targetOilTemp = this._engineRunning ? 85.0 + rpmFactor * 20.0 : ambient;
    const heatRate = this._engineRunning ? 2.0 : 1.0;
    const coolRate = this._engineRunning ? 0.0 : 0.7;

    let coolantTemp = this.sensors.coolant_temp;
    coolantTemp = targetCoolant > coolantTemp
      ? this._approach(coolantTemp, targetCoolant, heatRate, dt)
      : this._approach(coolantTemp, targetCoolant, coolRate, dt);
    changed = this._setSensor("coolant_temp", coolantTemp, { min: 0, max: 120 }) || changed;

    let oilTemp = this.sensors.oil_temp;
    oilTemp = targetOilTemp > oilTemp
      ? this._approach(oilTemp, targetOilTemp, heatRate, dt)
      : this._approach(oilTemp, targetOilTemp, coolRate, dt);
    changed = this._setSensor("oil_temp", oilTemp, { min: 0, max: 120 }) || changed;

    let speedTarget = 0.0;
    if (this._engineRunning && gearRatio !== 0) {
      speedTarget = Math.abs(gearRatio) * (rpm / 1000) * 55.0 * throttle;
      if (gearRatio < 0) speedTarget *= -1;
    }

    const accel = this._engineRunning ? 6.0 : 10.0;
    const decel = 12.0;
    let speed = this.sensors.speed_kmh;
    if (Math.abs(speedTarget) > Math.abs(speed)) speed = this._approach(speed, speedTarget, accel, dt);
    else speed = this._approach(speed, speedTarget, decel, dt);
    changed = this._setSensor("speed_kmh", speed, { min: -20, max: 80 }) || changed;

    let fuelLevel = this.sensors.fuel_level;
    if (this._engineRunning) {
      const burnRate = 0.0012 + throttle * 0.002;
      fuelLevel = this._clamp(fuelLevel - burnRate * dt * 100, 0.0, 100.0);
      changed = this._setSensor("fuel_level", fuelLevel, { min: 0, max: 100 }) || changed;
    }

    const lampTest = this.signalLamps === 2;
    changed = this._setLamp("battery_charge", lampTest || (isMassOn && !this._engineRunning)) || changed;
    changed = this._setLamp(
      "oil_pressure_alarm",
      lampTest || (rpm > 0 && oilEngine < 2.0) || (this._engineRunning && oilEngine < 3.0)
    ) || changed;
    changed = this._setLamp("overheat", lampTest || coolantTemp >= 112.0 || oilTemp >= 112.0) || changed;
    changed = this._setLamp("fuel_reserve", lampTest || fuelLevel <= 15.0) || changed;
    changed = this._setLamp("gear_engaged", lampTest || this.gearLever !== "neutral") || changed;

    this._timeSinceLastEmit += dt;
    if (changed || this._timeSinceLastEmit >= 0.25) {
      this._timeSinceLastEmit = 0;
      this._emit();
    }
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

  setMznEnginePressed(isPressed) {
    const next = Boolean(isPressed);
    if (this.mznEngine === next) return;
    this.mznEngine = next;
    this._emit();
  }

  setStarterPressed(isPressed) {
    const next = Boolean(isPressed);
    const desired = next ? 2 : 1;
    if (this.starter === desired) return;
    this.starter = desired;
    this._emit();
  }

  // Manometer - set pressure value
  setManometer(value) {
    this.manometer = Math.max(0, Math.min(300, value)); // 0-300 PSI
    this._emit();
  }

  toggleInstrumentPanel() {
    this.setInstrumentPanelOpen(!this.instrumentPanel);
  }

  setInstrumentPanelOpen(isOpen) {
    const next = Boolean(isOpen);
    if (this.instrumentPanel === next) return;
    this.instrumentPanel = next;
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
    if (this.azr === 0) {
      // First click - open cover
      this.azr = 1;
    } else {
      // Subsequent clicks - toggle between open (1) and pressed (2)
      this.azr = this.azr === 1 ? 2 : 1;
    }
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
    this.setMznEnginePressed(!this.mznEngine);
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
    if (this.mznTow === 0) {
      // First click - open cover
      this.mznTow = 1;
    } else {
      // Subsequent clicks - toggle between open (1) and pressed (2)
      this.mznTow = this.mznTow === 1 ? 2 : 1;
    }
    this._emit();
  }

  cycleStarter() {
    if (this.starter === 0) {
      // First click - open cover
      this.starter = 1;
    } else {
      // Subsequent clicks - toggle between open (1) and pressed (2)
      this.starter = this.starter === 1 ? 2 : 1;
    }
    this._emit();
  }

  cycleSignalLamps() {
    if (this.signalLamps === 0) {
      // First click - open cover
      this.signalLamps = 1;
    } else {
      // Subsequent clicks - toggle between open (1) and pressed (2)
      this.signalLamps = this.signalLamps === 1 ? 2 : 1;
    }
    this._emit();
  }
}

export { TankState };
