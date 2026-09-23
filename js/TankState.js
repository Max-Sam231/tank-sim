import { updatePhysics } from "./physics/index.js";
import { stopEngine as shutDownEngine, isReadyToStop } from "./physics/engineShutdown.js";
import { dischargeCylinder, canDischarge } from "./physics/fireSuppression.js";
import { serviceAirFilter as washFilterCassettes } from "./physics/airFilter.js";

const EMIT_INTERVAL_SEC = 0.25;

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
      heading_deg: 0.0,
      gyro_spin_up: 0.0,
      is_gyro_ready: false,
      cooldown_progress: 0.0,
      is_smoke_screen_active: false,
      fire_level: 0.0,
      is_fire_detected: false,
      air_filter_vacuum: 100.0,
      is_air_filter_clogged: false,
      is_contaminated: false,
      compartment_pressure: 0.0,
      filter_life_left: 1.0,
      is_compartment_sealed: false,
      night_vision_range: 0.0,
      night_vision_glare: 0.0,
      is_night_vision_ready: false,
      gyro_heading_deg: 0.0,
      yaw_rate_deg: 0.0,
      water_depth_m: 0.0,
      water_level: 0.0,
      is_flooding: false,
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
    this._gyroSpinUpTime = 0;
    this._idleCooldownTime = 0;
    this.ppoAuto = true;
    this.ppoCylindersUsed = 0;
    this._ppoDischargeTime = 0;
    this._limitBreachTime = {};
    this.airFilterClogging = 0;
    this.pazAuto = true;
    this.blowerOn = false;
    this.filterMode = false;
    this.filterLifeUsed = 0;
    this._blowerSpinUpTime = 0;
    this.tvneMode = 0;
    this._tvneWarmUpTime = 0;
    this._tvneGlare = 0;
    this._gyroDrift = 0;
    this.leftLever = 0;
    this.rightLever = 0;
    this.opvtSealed = false;
    this.opvtPipeInstalled = false;
    this.opvtExhaustSealed = false;
    this.opvtPumpChecked = false;
    this.opvtPumpOn = false;
    this.violations = [];
    this._timeSinceLastEmit = 0;

    this._brakeHoldTime = 0;
    this._brakeHoldTriggered = false;

    this._parkingBrakeHoldThresholdSec = 1.2;
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
    this.hasExhaustCap = false;        // Взял ли игрок козырёк из ЗИП
    this.exhaustCapInstalled = false;
    this._heaterBurning = false;
    this.boHeatingActive = false;
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
    this.sensors.heading_deg = 0.0;
    this.sensors.gyro_spin_up = 0.0;
    this.sensors.is_gyro_ready = false;
    this.sensors.cooldown_progress = 0.0;
    this.sensors.is_smoke_screen_active = false;
    this.sensors.fire_level = 0.0;
    this.sensors.is_fire_detected = false;
    this.sensors.air_filter_vacuum = 100.0;
    this.sensors.is_air_filter_clogged = false;
    this.sensors.is_contaminated = false;
    this.sensors.compartment_pressure = 0.0;
    this.sensors.filter_life_left = 1.0;
    this.sensors.is_compartment_sealed = false;
    this.sensors.night_vision_range = 0.0;
    this.sensors.night_vision_glare = 0.0;
    this.sensors.is_night_vision_ready = false;
    this.sensors.gyro_heading_deg = 0.0;
    this.sensors.yaw_rate_deg = 0.0;
    this.sensors.water_depth_m = 0.0;
    this.sensors.water_level = 0.0;
    this.sensors.is_flooding = false;

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
    this._gyroSpinUpTime = 0;
    this._idleCooldownTime = 0;
    this.ppoAuto = true;
    this.ppoCylindersUsed = 0;
    this._ppoDischargeTime = 0;
    this._limitBreachTime = {};
    this.airFilterClogging = 0;
    this.pazAuto = true;
    this.blowerOn = false;
    this.filterMode = false;
    this.filterLifeUsed = 0;
    this._blowerSpinUpTime = 0;
    this.tvneMode = 0;
    this._tvneWarmUpTime = 0;
    this._tvneGlare = 0;
    this._gyroDrift = 0;
    this.leftLever = 0;
    this.rightLever = 0;
    this.opvtSealed = false;
    this.opvtPipeInstalled = false;
    this.opvtExhaustSealed = false;
    this.opvtPumpChecked = false;
    this.opvtPumpOn = false;
    this.violations = [];
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
    this.boHeatingActive = false;
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
      // Датчики кладутся и вложенно, и плоско: исторически потребители
      // читают их по короткому имени. Раскладка автоматическая, иначе
      // новый датчик молча оказывается undefined у всех читателей.
      ...this.sensors,

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
      boHeatingActive: this.boHeatingActive,
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
      violations: [...this.violations],
      ppoAuto: this.ppoAuto,
      ppoCylindersUsed: this.ppoCylindersUsed,
      airFilterClogging: this.airFilterClogging,
      pazAuto: this.pazAuto,
      blowerOn: this.blowerOn,
      filterMode: this.filterMode,
      tvneMode: this.tvneMode,
      leftLever: this.leftLever,
      rightLever: this.rightLever,
      opvtSealed: this.opvtSealed,
      opvtPipeInstalled: this.opvtPipeInstalled,
      opvtExhaustSealed: this.opvtExhaustSealed,
      opvtPumpChecked: this.opvtPumpChecked,
      opvtPumpOn: this.opvtPumpOn,

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
  /** Переключает булев орган управления и уведомляет подписчиков. */
  _toggle(field) {
    this[field] = !this[field];
    this._emit();
  }

  /** Переводит многопозиционный орган управления в следующее положение по кругу. */
  _cycle(field, positions) {
    this[field] = (this[field] + 1) % positions;
    this._emit();
  }

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

  /**
   * Один шаг симуляции. Физика разнесена по подсистемам в js/physics/,
   * здесь остаётся только решение, будить ли подписчиков: перерисовка
   * идёт либо при изменении показаний, либо не реже четырёх раз в секунду.
   */
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const changed = updatePhysics(this, dt);

    this._timeSinceLastEmit += dt;
    if (changed || this._timeSinceLastEmit >= EMIT_INTERVAL_SEC) {
      this._timeSinceLastEmit = 0;
      this._emit();
    }
  }

  /**
   * Записывает нарушение для разбора занятия.
   * Повторы не копятся: одно и то же нарушение отмечается один раз.
   */
  recordViolation(text) {
    if (!text || this.violations.includes(text)) return false;
    this.violations.push(text);
    return true;
  }

  /** Можно ли сейчас штатно заглушить двигатель. */
  canStopEngine() {
    return isReadyToStop(this);
  }

  /**
   * Останавливает двигатель механизмом остановки.
   * Остановка без охлаждения на холостом ходу засчитывается как нарушение.
   */
  stopEngine() {
    const { stopped, violation } = shutDownEngine(this);
    if (!stopped) return false;

    this.recordViolation(violation);
    this._emit();
    return true;
  }

  /** Снимает все вводные и очищает журнал — подготовка к новой попытке. */
  clearIncidents() {
    this.sensors.fire_level = 0;
    this.sensors.is_fire_detected = false;
    this.sensors.water_depth_m = 0;
    this.sensors.water_level = 0;
    this.sensors.is_contaminated = false;

    this.ppoCylindersUsed = 0;
    this._ppoDischargeTime = 0;
    this.airFilterClogging = 0;
    this.filterLifeUsed = 0;
    this.violations = [];
    this._limitBreachTime = {};

    this._emit();
  }

  /** Зажигает пожар в МТО — вводная от преподавателя. */
  startFire(level = 0.1) {
    this.sensors.fire_level = this._clamp(level, 0, 1);
    this._emit();
  }

  /** Переключает ППО между автоматическим и ручным режимом. */
  togglePpoMode() {
    this._toggle("ppoAuto");
  }

  /** Разряжает баллон ППО вручную. */
  dischargePpo() {
    if (!canDischarge(this)) return false;
    dischargeCylinder(this);
    this._emit();
    return true;
  }

  /** Задаёт загрязнение воздухоочистителя — вводная от преподавателя. */
  setAirFilterClogging(level) {
    this.airFilterClogging = this._clamp(Number(level) || 0, 0, 1);
    this._emit();
  }

  /** Промывает кассеты воздухоочистителя — нужен ключ из ЗИП. */
  serviceAirFilter() {
    if (!washFilterCassettes(this)) return false;
    this._emit();
    return true;
  }

  /** Включает нагнетатель фильтровентиляционной установки. */
  toggleBlower() {
    this._toggle("blowerOn");
  }

  /** Пускает воздух через фильтр-поглотитель или напрямую. */
  toggleFilterMode() {
    this._toggle("filterMode");
  }

  /** Переключает ПАЗ между автоматическим и ручным режимом. */
  togglePazMode() {
    this._toggle("pazAuto");
  }

  /** Переключает ТВНЕ: выключен, пассивный, активный. */
  cycleNightVision() {
    this._cycle("tvneMode", 3);
  }

  /** Задаёт заражение местности — вводная от преподавателя. */
  setContaminated(isContaminated) {
    this.sensors.is_contaminated = Boolean(isContaminated);
    this._emit();
  }

  /** Переводит рычаг управления: отпущен, первое положение, второе. */
  cycleLeftLever() {
    this._cycle("leftLever", 3);
  }

  cycleRightLever() {
    this._cycle("rightLever", 3);
  }

  /** Прямая установка положения рычага — для удержания мышью. */
  setLever(side, position) {
    const key = side === "left" ? "leftLever" : "rightLever";
    this[key] = this._clamp(Number(position) || 0, 0, 2);
    this._emit();
  }

  // --- Оборудование подводного вождения ---------------------------------

  toggleOpvtSealed() {
    this._toggle("opvtSealed");
  }

  toggleOpvtPipe() {
    this._toggle("opvtPipeInstalled");
  }

  toggleOpvtExhaustSeal() {
    this._toggle("opvtExhaustSealed");
  }

  toggleOpvtPumpCheck() {
    this._toggle("opvtPumpChecked");
  }

  /** Водооткачивающий насос. */
  toggleOpvtPump() {
    this._toggle("opvtPumpOn");
  }

  /** Заводит машину в воду на заданную глубину — вводная от преподавателя. */
  setWaterDepth(meters) {
    this.sensors.water_depth_m = Math.max(0, Number(meters) || 0);
    this._emit();
  }

  toggleBattery() {
    this._toggle("isBatteryOn");
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
    this._toggle("leftTank");
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
    this._toggle("rightTank");
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
    this._toggle("airBleedValve");
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
    this._toggle("epk");
  }

  toggleHorn() {
    this._toggle("horn");
  }

  toggleMznEngine() {
    this.setMznEnginePressed(!this.mznEngine);
  }

  toggleAmmeterButton() {
    this._toggle("ammeterButton");
  }

  cycleLeftRightTanks() {
    this.leftRightTanks = this.leftRightTanks === 0 ? 1 : 0;
    this._emit();
  }

  cycleSparkPlug() {
    this._cycle("sparkPlug", 3);
  }

  cycleEngineStart() {
    this._cycle("engineStart", 3);
  }

  toggleEmergencyHatchRotation() {
    this._toggle("emergencyHatchRotation");
  }

  toggleOilPumpGearbox() {
    this._toggle("oilPumpGearbox");
  }

  _calculateBoHeatingActive() {
    const isMassOn = Boolean(this.isBatteryOn);
    return Boolean(isMassOn && this.heating && (this._engineRunning || this._heaterBurning || (this.sensors?.coolant_temp >= 40)));
  }

  toggleHeating() {
    this.heating = !this.heating;
    this.boHeatingActive = this._calculateBoHeatingActive();
    this._emit();
  }

  toggleCombined() {
    this._toggle("combined");
  }

  toggleLeftLights() {
    this._toggle("leftLights");
  }

  toggleRightLights() {
    this._toggle("rightLights");
  }

  toggleGabrateLights() {
    this._toggle("gabrateLights");
  }

  toggleLightsAll() {
    this._toggle("lightsAll");
  }

  toggleWaterAntifreeze() {
    this._toggle("waterAntifreeze");
  }

  toggleGpk() {
    this._toggle("gpk");
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
    this._toggle("cabinLight");
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
    this._toggle("heaterFuelValve");
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
