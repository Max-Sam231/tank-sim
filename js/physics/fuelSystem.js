/**
 * Топливная система: подача топлива и расход из баков.
 *
 * Давление создаёт либо работающий двигатель, либо БЦН при условии,
 * что система прокачана ручным насосом (не меньше трёх качков).
 */
const WORKING_PRESSURE = 1.8;
const PRESSURE_RATE = 3.0;
const REQUIRED_PRIMER_PUMPS = 3;

const INTERNAL_TANK_L = 190;
const EXTERNAL_TANK_L = 400;
const EXTERNAL_TANK_MIN_L = 100;

/** Давление топлива и признаки работы насосов. */
function updateFuelSupply(state, ctx) {
  let changed = false;

  ctx.isBcnActive = ctx.isMassOn && (state.bcn === "on" || state.bcn === "pump");
  ctx.isMznActive = ctx.isMassOn && Boolean(state.mznEngine);

  changed = state._setSensorBool("is_bcn_active", ctx.isBcnActive) || changed;
  changed = state._setSensorBool("is_mzn_active", ctx.isMznActive) || changed;

  const isPrimed = ctx.isBcnActive && state.fuelPrimerPumps >= REQUIRED_PRIMER_PUMPS;
  const target = state._engineRunning || isPrimed ? WORKING_PRESSURE : 0.0;

  ctx.fuelPressure = state._approach(state.sensors.fuel_pressure, target, PRESSURE_RATE, ctx.dt);
  changed = state._setSensor("fuel_pressure", ctx.fuelPressure, { min: 0, max: 3 }) || changed;

  return changed;
}

/** Выработка топлива из внутреннего и наружного баков. */
function updateFuelLevels(state, ctx) {
  ctx.fuelLevelInternal = state.sensors.fuel_level_internal;

  if (!state._engineRunning) return false;

  const burnRate = 0.0012 + ctx.throttle * 0.002;

  // Баки вырабатываются пропорционально своему объёму
  ctx.fuelLevelInternal = state._clamp(
    ctx.fuelLevelInternal - burnRate * ctx.dt * INTERNAL_TANK_L,
    0.0,
    INTERNAL_TANK_L,
  );
  const external = state._clamp(
    state.sensors.fuel_level_external - burnRate * ctx.dt * EXTERNAL_TANK_L,
    EXTERNAL_TANK_MIN_L,
    EXTERNAL_TANK_L,
  );

  let changed = state._setSensor("fuel_level_internal", ctx.fuelLevelInternal, {
    min: 0,
    max: INTERNAL_TANK_L,
  });
  changed =
    state._setSensor("fuel_level_external", external, {
      min: EXTERNAL_TANK_MIN_L,
      max: EXTERNAL_TANK_L,
    }) || changed;

  return changed;
}

export { updateFuelSupply, updateFuelLevels };
