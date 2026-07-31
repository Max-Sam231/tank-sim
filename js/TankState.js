class TankState {
  constructor() {
    this.isBatteryOn = false;
    this.isBrakePressed = false;
    this.parkingBrakeLatched = false;
    this.commanderView = 'straight';
    this.scenario = {
      startMethod: "prestart-preparation",
      ambientTempC: 20,
      fuelType: "diesel",
    };

    // Cabin controls state
    this.manometer = 0; // Pressure value
    this.instrumentPanel = false;
    this.leftTank = false;
    this.bcn = 'off'; // 'off', 'on', 'pump'
    this.shutters = 0; // 0-4: 0=closed, 1=half-closed, 2=middle, 3=half-open, 4=open
    this.rightTank = false;
    this.fuelPrimerLever = false;
    this.fuelPrimerPumps = 0; // number of primer lever pumps
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

    this.leftRightTanks = 1; // 0=right, 1=left
    this.sparkPlug = 1; // 0=right, 1=middle, 2=left
    this.engineStart = 1; // 0=right, 1=middle, 2=left

    this.emergencyHatchRotation = false;
    this.oilPumpGearbox = false;
    // Note: commander-call and air-intake are now indicator lamps only (in lamps object)

    // Instrument panel remaining toggles (tmb1/tmb2)
    this.cabinLight = false;
    this.heating = false;
    this.combined = false;
    this.leftLights = false;
    this.rightLights = false;
    this.gabrateLights = false;
    this.lightsAll = false;
    this.waterAntifreeze = false;
    this.gpk = false;
    this.bcaTca = 1; // 0=БЦН, 1=off, 2=ТДА
    this.mznTow = 0; // 0=closed, 1=open idle, 2=open pressed
    this.starter = 0; // 0=closed, 1=open idle, 2=open pressed
    this.signalLamps = 0; // 0=closed cover, 1=open, 2=on

    this.sensors = {
      air_left_cylinder: 150.0,
      air_right_cylinder: 150.0,
      air_start_pressure: 0.0,
      engine_rpm: 0,
      oil_pressure_engine: 0.0,
      oil_pressure_gearbox: 0.0,
      fuel_pressure: 0.0,
      coolant_temp: 20.0,
      oil_temp: 20.0,
      voltage: 0.0,
      amperage: 0.0,
      speed_kmh: 0.0,
      fuel_level_internal: 190.0,
      fuel_level_external: 400.0,
      is_bcn_active: false,
      is_mzn_active: false,
    };

    this.lamps = {
      battery_charge: false,
      oil_pressure_alarm: false,
      overheat: false,
      fuel_reserve: false,
      gear_engaged: false,
      commander_call: false,
      air_intake: false,
    };

    this._engineRunning = false;
    this._engineJustStarted = false;
    this._engineRunTime = 0; // Track engine run time for VA-540 charge current curve
    this._crankTime = 0;
    this._batteryVoltage = 25.0;
    this._oilPrimed = false;
    this._timeSinceLastEmit = 0;

    this._brakeHoldTime = 0;
    this._brakeHoldTriggered = false;

    this._parkingBrakeHoldThresholdSec = 1.2;
    this.exhaustBolt1 = false;
    this.exhaustBolt2 = false;
    this.exhaustCoverRemoved = false;

    this.hasZipKey = false;
    this.exhaustBoltsUnscrewed = false;

    this.heaterFuelValve = false;
    this.hasExhaustCap = false;        // Взял ли игрок козырёк из ЗИП
    this.exhaustCapInstalled = false;
    this._heaterBurning = false;
    this._listeners = new Set();

  }

  reset() {
    this.isBatteryOn = false;
    this.isBrakePressed = false;
    this.parkingBrakeLatched = false;

    this.manometer = 0;
    this.instrumentPanel = false;
    this.leftTank = false;
    this.bcn = 'off';
    this.shutters = 0;
    this.rightTank = false;
    this.fuelPrimerLever = false;
    this.fuelPrimerPumps = 0;
    this.fuelManualFeed = 0;
    this.gearLever = "neutral";
    this.gasPedal = false;
    this.airBleedValve = false;

    this.azr = 0;
    this.epk = false;
    this.horn = false;
    this.mznEngine = false;
    this.ammeterButton = false;

    this.leftRightTanks = 1; // 0=right, 1=left
    this.sparkPlug = 1;
    this.engineStart = 1;

    this.emergencyHatchRotation = false;
    this.oilPumpGearbox = false;
    // Note: commander-call and air-intake lamps are reset via lamps object above

    this.heating = false;
    this.combined = false;
    this.leftLights = false;
    this.rightLights = false;
    this.gabrateLights = false;
    this.lightsAll = false;
    this.waterAntifreeze = false;
    this.gpk = false;
    this.bcaTca = 1; // 0=БЦН, 1=off, 2=ТДА
    this.mznTow = 0;
    this.starter = 0;
    this.signalLamps = 0;

    this.sensors.air_left_cylinder = 150.0;
    this.sensors.air_right_cylinder = 150.0;
    this.sensors.air_start_pressure = 0.0;
    this.sensors.engine_rpm = 0;
    this.sensors.oil_pressure_engine = 0.0;
    this.sensors.oil_pressure_gearbox = 0.0;
    this.sensors.fuel_pressure = 0.0;
    this.sensors.coolant_temp = Number.isFinite(this.scenario?.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    this.sensors.oil_temp = Number.isFinite(this.scenario?.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    this.sensors.voltage = 0.0;
    this.sensors.amperage = 0.0;
    this.sensors.speed_kmh = 0.0;
    this.sensors.fuel_level_internal = 190.0;
    this.sensors.fuel_level_external = 400.0;
    this.sensors.is_bcn_active = false;
    this.sensors.is_mzn_active = false;

    this.lamps.battery_charge = false;
    this.lamps.oil_pressure_alarm = false;
    this.lamps.overheat = false;
    this.lamps.fuel_reserve = false;
    this.lamps.gear_engaged = false;
    this.lamps.commander_call = false;
    this.lamps.air_intake = false;

    this._engineRunning = false;
    this._engineJustStarted = false;
    this._engineRunTime = 0;
    this._crankTime = 0;
    this._batteryVoltage = 25.0;
    this._oilPrimed = false;
    this._timeSinceLastEmit = 0;
    this._brakeHoldTime = 0;
    this._brakeHoldTriggered = false;
    this.cabinLight = false;

    this.hingeLatch1 = false;
    this.hingeLatch2 = false;
    this.hingeLatch3 = false;
    this.sidePanelOpen = false;
    this.exhaustBolt1 = false;
    this.exhaustBolt2 = false;
    this.exhaustCoverRemoved = false;

    this.hasZipKey = false;
    this.exhaustBoltsUnscrewed = false;

    this.heaterFuelValve = false;

    this.hasExhaustCap = false;
    this.exhaustCapInstalled = false;
    this._heaterBurning = false;
    this._emit();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) listener(snapshot);
    this._engineJustStarted = false;
  }


  getSnapshot() {
    return {
      commanderView: this.commanderView,
      isBatteryOn: this.isBatteryOn,
      isBrakePressed: this.isBrakePressed,
      brakeEffective: this.isBrakePressed || this.parkingBrakeLatched,
      parkingBrakeLatched: this.parkingBrakeLatched,
      engineRunning: this._engineRunning,
      engineJustStarted: this._engineJustStarted,
      cabinLight: this.cabinLight,

      scenario: { ...this.scenario },
      scenario_start_method: this.scenario.startMethod,
      scenario_ambient_temp_c: this.scenario.ambientTempC,
      scenario_fuel_type: this.scenario.fuelType,
      manometer: this.manometer,
      instrumentPanel: this.instrumentPanel,
      leftTank: this.leftTank,
      bcn: this.bcn,
      shutters: this.shutters,
      rightTank: this.rightTank,
      fuelPrimerLever: this.fuelPrimerLever,
      fuelPrimerPumps: this.fuelPrimerPumps,
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
      // Note: commanderCall and airIntake are now in lamps object only
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
      amperage: this.sensors.amperage,
      speed_kmh: this.sensors.speed_kmh,
      fuel_level_internal: this.sensors.fuel_level_internal,
      fuel_level_external: this.sensors.fuel_level_external,
      is_bcn_active: this.sensors.is_bcn_active,
      is_mzn_active: this.sensors.is_mzn_active,

      lamp_battery_charge: this.lamps.battery_charge,
      lamp_oil_pressure_alarm: this.lamps.oil_pressure_alarm,
      lamp_overheat: this.lamps.overheat,
      lamp_fuel_reserve: this.lamps.fuel_reserve,
      lamp_gear_engaged: this.lamps.gear_engaged,
      lamp_commander_call: this.lamps.commander_call,
      lamp_air_intake: this.lamps.air_intake,
      hingeLatch1: this.hingeLatch1,
      hingeLatch2: this.hingeLatch2,
      hingeLatch3: this.hingeLatch3,
      sidePanelOpen: this.sidePanelOpen,
      exhaustBolt1: this.exhaustBolt1,
      exhaustBolt2: this.exhaustBolt2,
      exhaustCoverRemoved: this.exhaustCoverRemoved,

      hasZipKey: this.hasZipKey,
      exhaustBoltsUnscrewed: this.exhaustBoltsUnscrewed,

      heaterFuelValve: this.heaterFuelValve,

      hasExhaustCap: this.hasExhaustCap,
      exhaustCapInstalled: this.exhaustCapInstalled,
      heaterBurning: this._heaterBurning,
    };
  }

  setScenario({ startMethod, ambientTempC, fuelType } = {}) {
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

    if (fuelType === "diesel" || fuelType === "gasoline") {
      if (this.scenario.fuelType !== fuelType) {
        this.scenario.fuelType = fuelType;
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

  /**
   * Calculate generator charge current for VA-540 voltmeter-ammeter
   * Based on technical manual for T-72 tank electrical system
   * @param {number} runTime - seconds since engine started
   * @param {number} dischargeLoad - current consumption in A (to cover)
   * @returns {number} charge current in A (positive = charging)
   */
  _calculateChargeCurrent(runTime, dischargeLoad) {
    // Initial peak charge after start: +200 to +300 A
    // Settles over several minutes to +20 to +40 A (covering consumption + trickle charge)

    // Charge curve: exponential decay from peak to steady state
    const peakCharge = 250.0; // A - initial high charge
    const steadyCharge = dischargeLoad + 25.0; // Cover consumption + ~25A for systems

    // Time constants from manual:
    // - First minute: significant drop from peak
    // - Several minutes: settles to steady state
    const timeConstant = 60.0; // 1 minute for noticeable drop
    const decayFactor = Math.exp(-runTime / timeConstant);

    const chargeCurrent = steadyCharge + (peakCharge - steadyCharge) * decayFactor;

    return Math.max(steadyCharge, chargeCurrent); // Never below steady state
  }

  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25);

    let changed = false;

    const isMassOn = Boolean(this.isBatteryOn);
    const starterPressed = this.starter === 2;
    const epkPressed = Boolean(this.epk);

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

    const isBcnActive = isMassOn && (this.bcn === 'on' || this.bcn === 'pump');
    const isMznActive = isMassOn && Boolean(this.mznEngine);
    changed = this._setSensorBool("is_bcn_active", isBcnActive) || changed;
    changed = this._setSensorBool("is_mzn_active", isMznActive) || changed;

    let targetFuelPressure = 0.0;
    if (this._engineRunning) {
      targetFuelPressure = 1.8;
    } else if (isBcnActive && this.fuelPrimerPumps >= 3) {
      targetFuelPressure = 1.8;
    }
    const fuelPressure = this._approach(this.sensors.fuel_pressure, targetFuelPressure, 3.0, dt);
    changed = this._setSensor("fuel_pressure", fuelPressure, { min: 0, max: 3 }) || changed;

    if (!isMassOn) {
      this._batteryVoltage = 25.0;
    } else if (!this._engineRunning) {
      const drainRate = 0.0002;
      this._batteryVoltage = this._clamp(this._batteryVoltage - drainRate * dt, 15.0, 26.0);
    }

    let baseVoltage = 0.0;
    if (isMassOn) {
      baseVoltage = this._engineRunning ? 27.8 : this._batteryVoltage;
    }
    const canCrank = isMassOn && baseVoltage >= 18.0;
    const requiresElectricStart = startMethod === "electric-start";
    const requiresCombinedStart = startMethod === "combined-start";

    const starterSag = (requiresElectricStart || requiresCombinedStart) && starterPressed && canCrank ? 5.0 : 0.0;
    const targetVoltage = this._clamp(baseVoltage - starterSag, 0.0, 30.0);
    const voltageInertiaRate = 5.0; // Slow, realistic mechanical needle movement
    const voltage = targetVoltage > this.sensors.voltage
      ? targetVoltage
      : this._approach(this.sensors.voltage, targetVoltage, voltageInertiaRate, dt);
    changed = this._setSensor("voltage", voltage, { min: 0, max: 30 }) || changed;

    const leftAirOpen = Boolean(this.leftTank);
    const rightAirOpen = Boolean(this.rightTank);
    const bleedOpen = Boolean(this.airBleedValve);

    const leftAir = this.sensors.air_left_cylinder;
    const rightAir = this.sensors.air_right_cylinder;
    const openPressures = [];
    if (leftAirOpen) openPressures.push(leftAir);
    if (rightAirOpen) openPressures.push(rightAir);
    const airStartPressure = openPressures.length ? openPressures.reduce((a, b) => a + b, 0) / openPressures.length : 0.0;
    changed = this._setSensor("air_start_pressure", airStartPressure, { min: 0, max: 165 }) || changed;

    const isAirCranking = requiresAirStart && epkPressed && canCrank && !this._engineRunning;
    const isStarterCranking = requiresElectricStart && starterPressed && canCrank && !this._engineRunning;
    const isCombinedCranking = requiresCombinedStart && Boolean(this.combined) && starterPressed && epkPressed && canCrank && !this._engineRunning;
    const isCranking = isAirCranking || isStarterCranking || isCombinedCranking;

    if (bleedOpen) {
      const bleedRate = 6.0;
      if (leftAirOpen) changed = this._setSensor("air_left_cylinder", leftAir - bleedRate * dt, { min: 0, max: 165 }) || changed;
      if (rightAirOpen) changed = this._setSensor("air_right_cylinder", rightAir - bleedRate * dt, { min: 0, max: 165 }) || changed;
    }

    if (isAirCranking || isCombinedCranking) {
      const crankAirRate = 0.9;
      if (leftAirOpen) changed = this._setSensor("air_left_cylinder", this.sensors.air_left_cylinder - crankAirRate * dt, { min: 0, max: 165 }) || changed;
      if (rightAirOpen) changed = this._setSensor("air_right_cylinder", this.sensors.air_right_cylinder - crankAirRate * dt, { min: 0, max: 165 }) || changed;
    }

    const fuelOk = fuelPressure >= 0.8;
    const airOk = (requiresAirStart || requiresCombinedStart) ? airStartPressure >= 10.0 : true;
    const primerOk = this.fuelPrimerPumps >= 3;
    const fuelCommandOk = (requiresAirStart || requiresCombinedStart) ? (Boolean(this.gasPedal) || this.fuelManualFeed >= 10) : (this.fuelManualFeed >= 10 || Boolean(this.gasPedal));
    const oilStartOk = requiresAirStart ? (isMznActive && this.sensors.oil_pressure_engine >= 2.0) : (this.sensors.oil_pressure_engine >= 1.5 || this._oilPrimed);

    if (isCranking && fuelOk && airOk && fuelCommandOk && primerOk && oilStartOk) {
      this._crankTime += dt;
    } else {
      this._crankTime = 0;
    }


    if (!this._engineRunning && this._crankTime >= 1.5) {
      this._engineRunning = true;
      this._engineJustStarted = true;
      this._engineRunTime = 0;
      this._crankTime = 0;
    }

    if (this._engineRunning && (!fuelOk || !isMassOn) && this.sensors.engine_rpm <= 850) {
      this._engineRunning = false;
      this._engineRunTime = 0;
      this._oilPrimed = false;
    }

    // Track engine run time for charge current curve
    if (this._engineRunning) {
      this._engineRunTime += dt;
    }

    const throttle = this._clamp((this.gasPedal ? 0.7 : 0.0) + (this.fuelManualFeed / 100) * 0.5, 0.0, 1.0);

    let targetRpm = 0;
    if (this._engineRunning) {
      const manualPart = this.fuelManualFeed / 100;
      const manualContribution = Math.pow(manualPart, 2.3) * 1250;
      const pedalContribution = this.gasPedal ? 1100 : 0;
      targetRpm = Math.round(750 + manualContribution + pedalContribution);
      targetRpm = Math.min(targetRpm, 2200);
    } else if (isCranking) {
      targetRpm = 150;
    }

    const rpmRate = this._engineRunning ? 2500 : 700;
    const rpm = Math.round(this._approach(this.sensors.engine_rpm, targetRpm, rpmRate, dt));
    changed = this._setSensor("engine_rpm", rpm, { min: 0, max: 4000, epsilon: 0 }) || changed;

    let targetOilEngine = 0.0;
    if (this._engineRunning) targetOilEngine = 5.5;
    else if (isMznActive && voltage >= 20.0) targetOilEngine = 3.5;
    const oilEngineRate = this._engineRunning ? 6.0 : (isMznActive ? 1.2 : 0.12);
    const oilEngine = this._approach(this.sensors.oil_pressure_engine, targetOilEngine, oilEngineRate, dt);
    changed = this._setSensor("oil_pressure_engine", oilEngine, { min: 0, max: 15 }) || changed;

    if (this.sensors.oil_pressure_engine >= 2.0) {
      this._oilPrimed = true;
    }

    const targetOilGearbox = this._engineRunning ? 2.5 : 0.0;
    const oilGearbox = this._approach(this.sensors.oil_pressure_gearbox, targetOilGearbox, 4.0, dt);
    changed = this._setSensor("oil_pressure_gearbox", oilGearbox, { min: 0, max: 15 }) || changed;

    const ambient = Number.isFinite(this.scenario.ambientTempC) ? this.scenario.ambientTempC : 20.0;
    const rpmFactor = this._engineRunning ? this._clamp((rpm - 900) / 1700, 0.0, 1.0) : 0.0;

    // Heater state logic
    const isHeaterActive = isMassOn && this.heating && this.heaterFuelValve && this.exhaustCapInstalled;
    if (isHeaterActive && this.sparkPlug === 2) {
      this._heaterBurning = true;
    }
    if (!isHeaterActive) {
      this._heaterBurning = false;
    }

    let targetCoolant = ambient;
    let targetOilTemp = ambient;
    let heatRate = 1.0;
    let coolRate = 0.7;

    if (this._engineRunning) {
      targetCoolant = 80.0 + rpmFactor * 15.0;
      targetOilTemp = 85.0 + rpmFactor * 20.0;
      heatRate = 2.0;
      coolRate = 0.0;
    } else if (this._heaterBurning) {
      targetCoolant = 70.0;
      targetOilTemp = 65.0;
      heatRate = 1.5; // Quick warming rate for training purposes
      coolRate = 0.0;
    }

    let coolantTemp = this.sensors.coolant_temp;
    coolantTemp = targetCoolant > coolantTemp
      ? this._approach(coolantTemp, targetCoolant, heatRate, dt)
      : this._approach(coolantTemp, targetCoolant, coolRate, dt);
    changed = this._setSensor("coolant_temp", coolantTemp, { min: -50, max: 120 }) || changed;

    let oilTemp = this.sensors.oil_temp;
    oilTemp = targetOilTemp > oilTemp
      ? this._approach(oilTemp, targetOilTemp, heatRate, dt)
      : this._approach(oilTemp, targetOilTemp, coolRate, dt);
    changed = this._setSensor("oil_temp", oilTemp, { min: -50, max: 120 }) || changed;

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
    changed = this._setSensor("speed_kmh", speed, { min: 0, max: 100 }) || changed;

    // VA-540 Voltammeter physics (asymmetric scale: 100-0-500 A)
    // Negative values = discharge (left of zero, 0-100A scale)
    // Positive values = charge (right of zero, 0-500A scale)
    let targetAmperage = 0.0;

    if (isMassOn) {
      // Base consumption: КИП (instrument panel) + control systems
      let dischargeCurrent = 5.0; // ~5-10 A base load

      // БЦН (fuel priming pump) consumption
      if (isBcnActive) {
        dischargeCurrent += 20.0; // ~20-30 A total with BCN
      }

      // МЗН (engine oil priming pump) - high current draw
      if (isMznActive) {
        dischargeCurrent = 80.0; // ~70-90 A peak
      }

      // Starter cranking: main current bypasses shunt, but auxiliary systems draw power
      // Starter relay + Ignition "Impulse" + start valve + MZN if active
      if (isCranking) {
        dischargeCurrent = 100.0; // Hits -100A (left limit), may vibrate slightly
      }

      if (this._engineRunning) {
        // Generator mode: SG-10-1S produces power
        // Initially high charge current, then settles as batteries recover
        const runTime = this._engineRunTime || 0;
        const chargeCurrent = this._calculateChargeCurrent(runTime, dischargeCurrent);
        targetAmperage = chargeCurrent;
      } else {
        // Battery discharge mode (negative values = left of zero on gauge)
        targetAmperage = -dischargeCurrent;
      }
    }

    // Apply needle inertia: slower approach rate for realistic mechanical inertia
    const inertiaRate = 12.0; // Extremely smooth mechanical inertia for VA-540 ammeter needle
    const amperage = this._approach(this.sensors.amperage, targetAmperage, inertiaRate, dt);
    changed = this._setSensor("amperage", amperage, { min: -100, max: 500 }) || changed;

    // Fuel levels: internal (0-190L) and external (100-400L) based on leftRightTanks
    let fuelLevelInternal = this.sensors.fuel_level_internal;
    let fuelLevelExternal = this.sensors.fuel_level_external;
    if (this._engineRunning) {
      const burnRate = 0.0012 + throttle * 0.002;
      // Burn from both tanks proportionally
      const burnInternal = burnRate * dt * 190;
      const burnExternal = burnRate * dt * 400;
      fuelLevelInternal = this._clamp(fuelLevelInternal - burnInternal, 0.0, 190.0);
      fuelLevelExternal = this._clamp(fuelLevelExternal - burnExternal, 100.0, 400.0);
      changed = this._setSensor("fuel_level_internal", fuelLevelInternal, { min: 0, max: 190 }) || changed;
      changed = this._setSensor("fuel_level_external", fuelLevelExternal, { min: 100, max: 400 }) || changed;
    }

    const lampTest = this.signalLamps === 2;
    changed = this._setLamp("battery_charge", lampTest || (isMassOn && !this._engineRunning)) || changed;
    changed = this._setLamp(
      "oil_pressure_alarm",
      lampTest || (rpm > 0 && oilEngine < 2.0) || (this._engineRunning && oilEngine < 3.0)
    ) || changed;
    changed = this._setLamp("overheat", lampTest || coolantTemp >= 112.0 || oilTemp >= 112.0) || changed;
    changed = this._setLamp("fuel_reserve", lampTest || fuelLevelInternal <= 15.0) || changed;
    changed = this._setLamp("gear_engaged", lampTest || this.gearLever !== "neutral") || changed;
    changed = this._setLamp("commander_call", lampTest) || changed;
    changed = this._setLamp("air_intake", lampTest) || changed;

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

  setBcnMode(mode) {
    if (mode === 'off' || mode === 'on' || mode === 'pump') {
      if (this.bcn !== mode) {
        this.bcn = mode;
        this._emit();
      }
    }
  }

  toggleBcn() {
    // Legacy toggle for compatibility - cycles through modes
    if (this.bcn === 'off') this.bcn = 'on';
    else if (this.bcn === 'on') this.bcn = 'pump';
    else this.bcn = 'off';
    this._emit();
  }

  toggleShutters() {
    this.shutters = (this.shutters + 1) % 5;
    this._emit();
  }

  setShutters(position) {
    const pos = parseInt(position, 10);
    if (pos >= 0 && pos <= 4) {
      this.shutters = pos;
      this._emit();
    }
  }

  toggleRightTank() {
    this.rightTank = !this.rightTank;
    this._emit();
  }

  pumpFuelPrimerLever() {
    this.fuelPrimerPumps += 1;
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
    const gears = ['neutral', '1', '2', '3', '4', '5', '6', '7', 'R'];
    const currentIndex = gears.indexOf(this.gearLever);
    this.gearLever = gears[(currentIndex + 1) % gears.length];
    this._emit();
  }

  setGearLever(gear) {
    const validGears = ['neutral', '1', '2', '3', '4', '5', '6', '7', 'R'];
    if (validGears.includes(gear)) {
      this.gearLever = gear;
      this._emit();
    }
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
    this.leftRightTanks = this.leftRightTanks === 0 ? 1 : 0;
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

  // Note: toggleCommanderCall and toggleAirIntake removed - these are now indicator lamps only

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

  cycleBcaTca() {
    // 0=БЦН, 1=off, 2=ТДА
    // Cycle: 1 -> 0 -> 2 -> 1
    if (this.bcaTca === 1) {
      this.bcaTca = 0;
    } else if (this.bcaTca === 0) {
      this.bcaTca = 2;
    } else {
      this.bcaTca = 1;
    }
    this._emit();
  }

  toggleBcaTca() {
    this.cycleBcaTca();
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
  toggleCommanderView() {
    if (this.commanderView === 'straight') {
      this.commanderView = 'tilted';
    } else {
      this.commanderView = 'straight';
    }
    this._emit();
  }
  toggleCabinLight() {
    this.cabinLight = !this.cabinLight;
    this._emit();
  }
  toggleHingeLatch(latchId) {
    if (latchId === "latch1" || latchId === "1") this.hingeLatch1 = !this.hingeLatch1;
    else if (latchId === "latch2" || latchId === "2") this.hingeLatch2 = !this.hingeLatch2;
    else if (latchId === "latch3" || latchId === "3") this.hingeLatch3 = !this.hingeLatch3;
    else return;
    this._emit();
  }

  setSidePanelOpen(isOpen) {
    this.sidePanelOpen = Boolean(isOpen);
    this._emit();
  }

  canOpenSidePanel() {
    return this.hingeLatch1 && this.hingeLatch2 && this.hingeLatch3;
  }

  openSidePanel() {
    if (this.canOpenSidePanel()) {
      this.sidePanelOpen = true;
      this._emit();
    }
  }
  toggleExhaustBolt(boltId) {
    if (boltId === "1") this.exhaustBolt1 = !this.exhaustBolt1;
    else if (boltId === "2") this.exhaustBolt2 = !this.exhaustBolt2;
    else return;
    this._emit();
  }

  canRemoveExhaustCover() {
    return this.exhaustBolt1 && this.exhaustBolt2;
  }


  removeExhaustCover() {
    if (this.canRemoveExhaustCover()) {
      this.exhaustCoverRemoved = true;
      this._emit();
    }
  }

  installExhaustCover() {
    this.exhaustCoverRemoved = false;
    this.exhaustBolt1 = false;
    this.exhaustBolt2 = false;
    this._emit();
  }

  // Новые методы:
  takeZipKey() {
    this.hasZipKey = true;
    this._emit();
  }

  canUnscrewExhaustBolts() {
    return this.hasZipKey;
  }

  unscrewExhaustBolts() {
    if (this.canUnscrewExhaustBolts()) {
      this.exhaustBoltsUnscrewed = true;
      this._emit();
    }
  }

  toggleHeaterFuelValve() {
    this.heaterFuelValve = !this.heaterFuelValve;
    this._emit();
  }

  isHeaterFuelFlowing() {
    return this.heaterFuelValve;
  }
  takeExhaustCap() {
    if (!this.hasExhaustCap) {
      this.hasExhaustCap = true;
      this._emit();
    }
  }

  installExhaustCap() {
    if (this.hasExhaustCap && !this.exhaustCapInstalled) {
      this.exhaustCapInstalled = true;
      this._emit();
    }
  }

  removeExhaustCap() {
    if (this.exhaustCapInstalled) {
      this.exhaustCapInstalled = false;
      this._emit();
    }
  }

  canTakeExhaustCap() {
    return !this.hasExhaustCap;
  }

  canInstallExhaustCap() {
    // Установить можно, если козырёк в инвентаре и ещё не установлен
    return this.hasExhaustCap && !this.exhaustCapInstalled && this.exhaustCoverRemoved;
  }
}

export { TankState };
