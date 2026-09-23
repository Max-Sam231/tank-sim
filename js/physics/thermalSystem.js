/**
 * Тепловой режим: подогреватель и температуры охлаждающей жидкости и масла.
 *
 * Подогреватель двигателя независим от обогрева боевого отделения: первый
 * греет систему охлаждения перед пуском, второй гонит тёплый воздух в
 * обитаемое отделение.
 */
const RUNNING_COOLANT_C = 80.0;
const RUNNING_OIL_C = 85.0;
const RPM_HEAT_COOLANT_C = 15.0;
const RPM_HEAT_OIL_C = 20.0;

const HEATER_COOLANT_C = 70.0;
const HEATER_OIL_C = 65.0;

const RATE_ENGINE = 2.0;
const RATE_HEATER = 1.5; // ускорено против реального: занятие не должно упираться в ожидание
const RATE_AMBIENT_HEAT = 1.0;
const RATE_AMBIENT_COOL = 0.7;

const RPM_FACTOR_MIN = 900;
const RPM_FACTOR_SPAN = 1700;

/**
 * Состояние подогревателя двигателя.
 * Розжиг возможен только при установленном козырьке выхлопа.
 */
function updateHeater(state, ctx) {
  const wasBurning = state._heaterBurning;

  const isReady = ctx.isMassOn && state.heaterFuelValve && state.exhaustCapInstalled;
  if (isReady && state.sparkPlug === 2) state._heaterBurning = true;
  if (!state.heaterFuelValve || !ctx.isMassOn || !state.exhaustCapInstalled) {
    state._heaterBurning = false;
  }

  let changed = state._heaterBurning !== wasBurning;

  const nextBoHeating = state._calculateBoHeatingActive();
  if (state.boHeatingActive !== nextBoHeating) changed = true;
  state.boHeatingActive = nextBoHeating;

  return changed;
}

/** Температуры охлаждающей жидкости и масла. */
function updateTemperatures(state, ctx) {
  ctx.rpmFactor = state._engineRunning
    ? state._clamp((ctx.rpm - RPM_FACTOR_MIN) / RPM_FACTOR_SPAN, 0.0, 1.0)
    : 0.0;

  let targetCoolant = ctx.ambient;
  let targetOil = ctx.ambient;
  let heatRate = RATE_AMBIENT_HEAT;
  let coolRate = RATE_AMBIENT_COOL;

  if (state._engineRunning) {
    targetCoolant = RUNNING_COOLANT_C + ctx.rpmFactor * RPM_HEAT_COOLANT_C;
    targetOil = RUNNING_OIL_C + ctx.rpmFactor * RPM_HEAT_OIL_C;
    heatRate = RATE_ENGINE;
    coolRate = 0.0;
  } else if (state._heaterBurning) {
    targetCoolant = HEATER_COOLANT_C;
    targetOil = HEATER_OIL_C;
    heatRate = RATE_HEATER;
    coolRate = 0.0;
  }

  /** Нагрев и остывание идут с разной скоростью. */
  const towards = (current, target) =>
    state._approach(current, target, target > current ? heatRate : coolRate, ctx.dt);

  ctx.coolantTemp = towards(state.sensors.coolant_temp, targetCoolant);
  ctx.oilTemp = towards(state.sensors.oil_temp, targetOil);

  let changed = state._setSensor("coolant_temp", ctx.coolantTemp, { min: -50, max: 120 });
  changed = state._setSensor("oil_temp", ctx.oilTemp, { min: -50, max: 120 }) || changed;

  return changed;
}

export { updateHeater, updateTemperatures };
