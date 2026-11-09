/**
 * Система воздухопуска: два баллона и клапан выпуска воздуха.
 *
 * Давление пуска — среднее по открытым баллонам. Воздух уходит при
 * открытом клапане выпуска и при прокрутке двигателем сжатым воздухом.
 */
const MAX_PRESSURE = 165;
const BLEED_RATE = 6.0; // стравливание через клапан выпуска
const CRANK_RATE = 0.9; // расход на прокрутку двигателя

/** Давление пуска по открытым баллонам. */
function updateAirPressure(state, ctx) {
  const openPressures = [];
  if (state.leftTank) openPressures.push(state.sensors.air_left_cylinder);
  if (state.rightTank) openPressures.push(state.sensors.air_right_cylinder);

  ctx.airStartPressure = openPressures.length
    ? openPressures.reduce((a, b) => a + b, 0) / openPressures.length
    : 0.0;

  return state._setSensor("air_start_pressure", ctx.airStartPressure, {
    min: 0,
    max: MAX_PRESSURE,
  });
}

/**
 * Расход воздуха из баллонов.
 * Вызывается после определения режима прокрутки — расход от него зависит.
 */
function updateAirConsumption(state, ctx) {
  let rate = 0.0;
  if (state.airBleedValve) rate += BLEED_RATE;
  if (ctx.isAirCranking || ctx.isCombinedCranking) rate += CRANK_RATE;

  if (rate === 0.0) return false;

  let changed = false;
  for (const [tankKey, sensorKey] of [
    ["leftTank", "air_left_cylinder"],
    ["rightTank", "air_right_cylinder"],
  ]) {
    if (!state[tankKey]) continue;
    changed =
      state._setSensor(sensorKey, state.sensors[sensorKey] - rate * ctx.dt, {
        min: 0,
        max: MAX_PRESSURE,
      }) || changed;
  }

  return changed;
}

export { updateAirPressure, updateAirConsumption };
