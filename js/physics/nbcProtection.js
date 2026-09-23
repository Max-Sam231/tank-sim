/**
 * Фильтровентиляционная установка и защита от оружия массового поражения.
 *
 * Нагнетатель создаёт в обитаемом отделении избыточное давление, чтобы
 * заражённый воздух не подсасывался через неплотности. Воздух при этом
 * идёт либо напрямую, либо через фильтр-поглотитель — в зависимости от
 * того, какая обстановка.
 *
 * Система ПАЗ срабатывает по датчику и закрывает отделение автоматически.
 * Ручной режим оставляет решение за экипажем.
 *
 * ВНИМАНИЕ: время выхода на режим, избыточное давление и ресурс фильтра
 * требуют сверки с РЭ Т-72.
 */
const SPIN_UP_SEC = 8.0; // выход нагнетателя на обороты
const OVERPRESSURE_MM = 25; // избыточное давление в отделении, мм вод. ст.
const MIN_VOLTAGE = 18.0;

/** Ресурс фильтра-поглотителя расходуется только при работе через него. */
const FILTER_LIFE_SEC = 1800;

/**
 * Работа нагнетателя и защита отделения.
 *
 * @returns {boolean} менялись ли показания
 */
function updateNbcProtection(state, ctx) {
  const isPowered = ctx.isMassOn && ctx.voltage >= MIN_VOLTAGE;
  const isContaminated = Boolean(state.sensors.is_contaminated);

  // В автоматическом режиме заражение само включает нагнетатель и фильтр
  if (state.pazAuto && isContaminated && isPowered) {
    state.blowerOn = true;
    state.filterMode = true;
  }

  const isRunning = isPowered && Boolean(state.blowerOn);

  state._blowerSpinUpTime = isRunning
    ? Math.min(state._blowerSpinUpTime + ctx.dt, SPIN_UP_SEC)
    : Math.max(state._blowerSpinUpTime - ctx.dt * 2, 0);

  const spinUp = state._blowerSpinUpTime / SPIN_UP_SEC;
  const pressure = OVERPRESSURE_MM * spinUp;

  let changed = state._setSensor("compartment_pressure", pressure, {
    min: 0,
    max: OVERPRESSURE_MM,
  });

  // Ресурс фильтра-поглотителя тратится, только когда воздух идёт через него
  if (isRunning && state.filterMode) {
    state.filterLifeUsed = state._clamp(state.filterLifeUsed + ctx.dt / FILTER_LIFE_SEC, 0, 1);
  }

  changed = state._setSensor("filter_life_left", 1 - state.filterLifeUsed, { min: 0, max: 1 }) || changed;

  // Защищено отделение только при полном наддуве через фильтр
  const isProtected = spinUp >= 1 && state.filterMode && state.filterLifeUsed < 1;
  changed = state._setSensorBool("is_compartment_sealed", isProtected) || changed;

  if (!isContaminated) return changed;

  if (!isProtected) {
    state.recordViolation?.("Заражённая местность пройдена без защиты обитаемого отделения");
  }
  if (Number(state.shutters) > 0 && !state.filterMode) {
    state.recordViolation?.("Нагнетатель работает без фильтра на заражённой местности");
  }

  return changed;
}

export { updateNbcProtection, SPIN_UP_SEC, OVERPRESSURE_MM, FILTER_LIFE_SEC };
