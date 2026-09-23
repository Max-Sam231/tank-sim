/**
 * Остановка двигателя В-46.
 *
 * Заглушить прогретый двигатель сразу после нагрузки нельзя: турбина и
 * поршневая группа остывают неравномерно. Сначала сбрасывают подачу до
 * холостого хода и дают поработать несколько минут, и только потом
 * останавливают.
 *
 * Поэтому остановка здесь — процедура, а не мгновенное действие:
 * подсистема считает, сколько двигатель проработал на холостом ходу
 * после нагрузки, и помечает остановку нарушением, если не выждали.
 *
 * ВНИМАНИЕ: время охлаждения и порог оборотов требуют сверки с РЭ Т-72.
 */
const IDLE_RPM_LIMIT = 900; // выше этого холостым ход не считается
const COOLDOWN_SEC = 120; // сколько держать холостой ход перед остановкой
const HOT_COOLANT_C = 70; // ниже этой температуры охлаждать нечего

/** Нужно ли этому двигателю охлаждение перед остановкой. */
function needsCooldown(state) {
  return state.sensors.coolant_temp >= HOT_COOLANT_C;
}

/**
 * Накопление времени работы на холостом ходу.
 * Любой выход за холостой ход сбрасывает отсчёт: охлаждение начинается заново.
 */
function updateCooldown(state, ctx) {
  if (!state._engineRunning) {
    state._idleCooldownTime = 0;
    return state._setSensor("cooldown_progress", 0, { min: 0, max: 1 });
  }

  const isIdling = ctx.rpm <= IDLE_RPM_LIMIT && !state.gasPedal;
  state._idleCooldownTime = isIdling ? state._idleCooldownTime + ctx.dt : 0;

  const progress = Math.min(state._idleCooldownTime / COOLDOWN_SEC, 1);
  return state._setSensor("cooldown_progress", progress, { min: 0, max: 1 });
}

/** Достаточно ли двигатель остыл, чтобы его можно было штатно заглушить. */
function isReadyToStop(state) {
  if (!needsCooldown(state)) return true;
  return state._idleCooldownTime >= COOLDOWN_SEC;
}

/**
 * Останавливает двигатель по команде механика-водителя.
 *
 * @returns {{stopped: boolean, violation: string|null}} была ли остановка
 *          штатной; при нарушении — его описание для разбора занятия
 */
function stopEngine(state) {
  if (!state._engineRunning) return { stopped: false, violation: null };

  const violation = isReadyToStop(state)
    ? null
    : "Двигатель остановлен без охлаждения на холостом ходу";

  state._engineRunning = false;
  state._engineRunTime = 0;
  state._idleCooldownTime = 0;
  state._oilPrimed = false;

  return { stopped: true, violation };
}

export { updateCooldown, isReadyToStop, needsCooldown, stopEngine, COOLDOWN_SEC, IDLE_RPM_LIMIT };
