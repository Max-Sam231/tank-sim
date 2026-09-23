/**
 * Смазка: давление масла в двигателе и в коробке передач.
 *
 * До пуска давление создаёт МЗН — маслозакачивающий насос. Факт удачной
 * прокачки запоминается (_oilPrimed): двигатель разрешено пускать и после
 * выключения насоса, пока давление не упало окончательно.
 */
const RUNNING_PRESSURE = 5.5;
const MZN_PRESSURE = 3.5;
const MZN_MIN_VOLTAGE = 20.0;
const PRIMED_THRESHOLD = 2.0;

const RATE_RUNNING = 6.0;
const RATE_MZN = 1.2;
const RATE_IDLE = 0.12;

const GEARBOX_PRESSURE = 2.5;
const GEARBOX_RATE = 4.0;
const GEARBOX_PRIMING_PRESSURE = 1.5; // даёт МЗН КП до пуска и при буксировке
const GEARBOX_PRIMING_RATE = 1.0;

/** Давление масла в двигателе. */
function updateEngineOil(state, ctx) {
  let target = 0.0;
  if (state._engineRunning) target = RUNNING_PRESSURE;
  else if (ctx.isMznActive && ctx.voltage >= MZN_MIN_VOLTAGE) target = MZN_PRESSURE;

  let rate = RATE_IDLE;
  if (state._engineRunning) rate = RATE_RUNNING;
  else if (ctx.isMznActive) rate = RATE_MZN;

  ctx.oilEngine = state._approach(state.sensors.oil_pressure_engine, target, rate, ctx.dt);
  const changed = state._setSensor("oil_pressure_engine", ctx.oilEngine, { min: 0, max: 15 });

  if (state.sensors.oil_pressure_engine >= PRIMED_THRESHOLD) state._oilPrimed = true;

  return changed;
}

/**
 * Давление смазки в коробке передач.
 *
 * На работающем двигателе его создаёт штатный насос. До пуска и при
 * буксировке давление даёт маслозакачивающий насос КП: без него трогаться
 * и буксировать нельзя — планетарные ряды останутся без смазки.
 *
 * ВНИМАНИЕ: давление от МЗН КП требует сверки с РЭ Т-72.
 */
function updateGearboxOil(state, ctx) {
  const isTowPumpPressed = state.mznTow === 2;
  const isPumpPowered = ctx.isMassOn && ctx.voltage >= MZN_MIN_VOLTAGE;
  const isPriming = isPumpPowered && (Boolean(state.oilPumpGearbox) || isTowPumpPressed);

  let target = 0.0;
  if (state._engineRunning) target = GEARBOX_PRESSURE;
  else if (isPriming) target = GEARBOX_PRIMING_PRESSURE;

  // Насос прокачки набирает давление медленно, но падает оно всегда штатно
  const rate = !state._engineRunning && isPriming ? GEARBOX_PRIMING_RATE : GEARBOX_RATE;
  const pressure = state._approach(state.sensors.oil_pressure_gearbox, target, rate, ctx.dt);

  return state._setSensor("oil_pressure_gearbox", pressure, { min: 0, max: 15 });
}

export { updateEngineOil, updateGearboxOil };
