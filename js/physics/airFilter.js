/**
 * Воздухоочиститель двигателя.
 *
 * Фильтр забивается пылью тем быстрее, чем выше нагрузка. Загрязнение
 * растёт незаметно, но душит двигатель: падает мощность, растёт
 * температура, двигатель дымит. Контролируется по разрежению на входе.
 *
 * Обслуживание — промывка кассет.
 *
 * ВНИМАНИЕ: темп загрязнения и пороги требуют сверки с РЭ Т-72.
 */

/**
 * Доля загрязнения в секунду на полной нагрузке.
 * Фильтр забивается за часы работы, а не за занятие: заметное загрязнение
 * для разбора задаёт преподаватель через setAirFilterClogging.
 */
const CLOGGING_PER_SEC = 0.00005;

/** Разрежение на чистом и полностью забитом фильтре, мм вод. ст. */
const VACUUM_CLEAN_MM = 100;
const VACUUM_CLOGGED_MM = 700;

/** Предел, выше которого фильтр требует обслуживания. */
const SERVICE_LIMIT = 0.7;

/** Насколько забитый фильтр срезает мощность. */
const MAX_POWER_LOSS = 0.35;

/**
 * Накопление загрязнения и разрежение на входе.
 * Возвращаемая доля потери мощности используется расчётом оборотов.
 */
function updateAirFilter(state, ctx) {
  let clogging = state.airFilterClogging;

  if (state._engineRunning) {
    // Пыли тем больше, чем выше обороты и подача
    clogging = state._clamp(
      clogging + CLOGGING_PER_SEC * (0.3 + ctx.rpmFactor) * ctx.dt,
      0,
      1,
    );
    state.airFilterClogging = clogging;
  }

  const vacuum = VACUUM_CLEAN_MM + (VACUUM_CLOGGED_MM - VACUUM_CLEAN_MM) * clogging;

  let changed = state._setSensor("air_filter_vacuum", vacuum, {
    min: VACUUM_CLEAN_MM,
    max: VACUUM_CLOGGED_MM,
  });
  changed = state._setSensorBool("is_air_filter_clogged", clogging >= SERVICE_LIMIT) || changed;

  if (state._engineRunning && clogging >= SERVICE_LIMIT) {
    state.recordViolation?.("Работа с забитым воздухоочистителем");
  }

  return changed;
}

/** Во сколько раз забитый фильтр срезает подачу воздуха, 0..1. */
function airFilterPowerFactor(state) {
  return 1 - MAX_POWER_LOSS * state.airFilterClogging;
}

/**
 * Промывка кассет воздухоочистителя.
 *
 * Пока это одно действие без обвязки: осмотра машины в ангаре ещё нет,
 * и требовать под него ключ из ЗИП рано. Когда осмотр появится,
 * промывка встанет в него и получит условия.
 */
function serviceAirFilter(state) {
  state.airFilterClogging = 0;
  return true;
}

export {
  updateAirFilter,
  airFilterPowerFactor,
  serviceAirFilter,
  SERVICE_LIMIT,
  VACUUM_CLEAN_MM,
  VACUUM_CLOGGED_MM,
};
