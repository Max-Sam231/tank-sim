/**
 * Термодымовая аппаратура (ТДА).
 *
 * Топливо подаётся на выпускной коллектор работающего двигателя и
 * испаряется, давая дымовую завесу. Поэтому завеса ставится только на
 * прогретом двигателе и при достаточных оборотах: на холодном коллекторе
 * топливо не испарится, а натечёт.
 *
 * Переключатель БЦА/ТДА: 0 = БЦН, 1 = выключено, 2 = ТДА.
 *
 * ВНИМАНИЕ: пороги температуры и оборотов, а также расход топлива
 * требуют сверки с РЭ Т-72.
 */
const TCA_SWITCH_POSITION = 2;

const MIN_COOLANT_C = 70; // на холодном коллекторе завесы не будет
const MIN_RPM = 1200; // ниже расход выхлопа недостаточен
const FUEL_BURN_L_PER_SEC = 0.15; // дополнительный расход на завесу

/** Включена ли подача топлива на выпуск. */
function isTcaEngaged(state) {
  return state.bcaTca === TCA_SWITCH_POSITION;
}

/**
 * Состояние дымовой завесы.
 * Пишет признак работы и лишний расход топлива из внутренних баков.
 */
function updateSmokeScreen(state, ctx) {
  const isEngaged = isTcaEngaged(state);

  const isProducing =
    isEngaged &&
    state._engineRunning &&
    ctx.coolantTemp >= MIN_COOLANT_C &&
    ctx.rpm >= MIN_RPM;

  let changed = state._setSensorBool("is_smoke_screen_active", isProducing);

  // Попытка поставить завесу на холодном двигателе — типичная ошибка
  if (isEngaged && state._engineRunning && ctx.coolantTemp < MIN_COOLANT_C) {
    state.recordViolation?.("ТДА включена на непрогретом двигателе");
  }

  if (!isProducing) return changed;

  const burn = FUEL_BURN_L_PER_SEC * ctx.dt;
  const level = state._clamp(state.sensors.fuel_level_internal - burn, 0, 190);
  changed = state._setSensor("fuel_level_internal", level, { min: 0, max: 190 }) || changed;

  return changed;
}

export { updateSmokeScreen, isTcaEngaged, MIN_COOLANT_C, MIN_RPM };
