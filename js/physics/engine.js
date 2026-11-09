/**
 * Двигатель: прокрутка, пуск, обороты.
 *
 * Пуск требует одновременного выполнения всех условий по топливу, воздуху,
 * маслу и подаче — и непрерывной прокрутки в течение полутора секунд.
 * Любое нарушение сбрасывает отсчёт: так тренажёр не прощает пуск
 * с пропущенным шагом алгоритма.
 */
const CRANK_TIME_TO_START_SEC = 1.5;

const MIN_FUEL_PRESSURE = 0.8;
const MIN_AIR_PRESSURE = 10.0;
const REQUIRED_PRIMER_PUMPS = 3;
const MIN_OIL_PRESSURE_AIR_START = 2.0;
const MIN_OIL_PRESSURE = 1.5;
const MIN_FUEL_FEED_PERCENT = 10;

const STALL_RPM = 850;
const IDLE_RPM = 750;
const MAX_RPM = 2200;
const CRANKING_RPM = 150;
const MANUAL_FEED_EXPONENT = 2.3;
const MANUAL_FEED_RPM = 1250;
const GAS_PEDAL_RPM = 1100;

const RPM_RATE_RUNNING = 2500;
const RPM_RATE_CRANKING = 700;

/**
 * Определяет, идёт ли прокрутка и каким способом.
 * Ничего не пишет в показания: результат нужен и расходу воздуха, и пуску.
 */
function computeCrankingMode(state, ctx) {
  const notRunning = !state._engineRunning;

  ctx.isAirCranking = ctx.requiresAirStart && ctx.epkPressed && ctx.canCrank && notRunning;
  ctx.isStarterCranking =
    ctx.requiresElectricStart && ctx.starterPressed && ctx.canCrank && notRunning;
  ctx.isCombinedCranking =
    ctx.requiresCombinedStart &&
    Boolean(state.combined) &&
    ctx.starterPressed &&
    ctx.epkPressed &&
    ctx.canCrank &&
    notRunning;

  ctx.isCranking = ctx.isAirCranking || ctx.isStarterCranking || ctx.isCombinedCranking;
}

/** Все ли условия пуска выполнены прямо сейчас. */
function isReadyToStart(state, ctx) {
  const needsAir = ctx.requiresAirStart || ctx.requiresCombinedStart;

  const fuelOk = ctx.fuelPressure >= MIN_FUEL_PRESSURE;
  const airOk = needsAir ? ctx.airStartPressure >= MIN_AIR_PRESSURE : true;
  const primerOk = state.fuelPrimerPumps >= REQUIRED_PRIMER_PUMPS;
  const feedOk = Boolean(state.gasPedal) || state.fuelManualFeed >= MIN_FUEL_FEED_PERCENT;

  // Воздушный пуск требует подтверждённой прокачки масла, остальные — нет
  const oilOk = ctx.requiresAirStart
    ? ctx.isMznActive && state.sensors.oil_pressure_engine >= MIN_OIL_PRESSURE_AIR_START
    : state.sensors.oil_pressure_engine >= MIN_OIL_PRESSURE || state._oilPrimed;

  return fuelOk && airOk && primerOk && feedOk && oilOk;
}

/**
 * Переход двигателя между «не работает» и «работает».
 * Показаний не пишет, поэтому подписчиков сам по себе не будит:
 * следом меняются обороты, они и вызывают перерисовку.
 */
function updateEngineState(state, ctx) {
  state._crankTime = ctx.isCranking && isReadyToStart(state, ctx) ? state._crankTime + ctx.dt : 0;

  if (!state._engineRunning && state._crankTime >= CRANK_TIME_TO_START_SEC) {
    state._engineRunning = true;
    state._engineJustStarted = true;
    state._engineRunTime = 0;
    state._crankTime = 0;
  }

  // Глохнет при потере подачи топлива или снятии массы, но только на малых оборотах
  const fuelOk = ctx.fuelPressure >= MIN_FUEL_PRESSURE;
  const starved = !fuelOk || !ctx.isMassOn;
  if (state._engineRunning && starved && state.sensors.engine_rpm <= STALL_RPM) {
    // Глушить двигатель снятием массы нельзя: для этого есть механизм остановки
    if (!ctx.isMassOn) {
      state.recordViolation?.("Двигатель заглушен снятием массы вместо механизма остановки");
    }

    state._engineRunning = false;
    state._engineRunTime = 0;
    state._oilPrimed = false;
  }

  if (state._engineRunning) state._engineRunTime += ctx.dt;

  return false;
}

/** Обороты двигателя по ручной подаче и педали газа. */
function updateRpm(state, ctx) {
  ctx.throttle = state._clamp(
    (state.gasPedal ? 0.7 : 0.0) + (state.fuelManualFeed / 100) * 0.5,
    0.0,
    1.0,
  );

  let target = 0;
  if (state._engineRunning) {
    const manualPart = state.fuelManualFeed / 100;
    const manualContribution = Math.pow(manualPart, MANUAL_FEED_EXPONENT) * MANUAL_FEED_RPM;
    const pedalContribution = state.gasPedal ? GAS_PEDAL_RPM : 0;
    target = Math.min(
      Math.round(IDLE_RPM + manualContribution + pedalContribution),
      MAX_RPM,
    );
  } else if (ctx.isCranking) {
    target = CRANKING_RPM;
  }

  const rate = state._engineRunning ? RPM_RATE_RUNNING : RPM_RATE_CRANKING;
  ctx.rpm = Math.round(state._approach(state.sensors.engine_rpm, target, rate, ctx.dt));

  return state._setSensor("engine_rpm", ctx.rpm, { min: 0, max: 4000, epsilon: 0 });
}

export { computeCrankingMode, updateEngineState, updateRpm };
