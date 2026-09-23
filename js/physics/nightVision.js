/**
 * Прибор ночного видения механика-водителя ТВНЕ-4Б.
 *
 * Два режима: пассивный работает на естественной подсветке ночного неба,
 * активный — с инфракрасным прожектором, который виден противнику.
 *
 * Прибору нужно время на выход на режим, а яркая засветка — фары, пожар,
 * дневной свет — временно ослепляет его.
 *
 * ВНИМАНИЕ: время выхода на режим, дальность и время восстановления
 * после засветки требуют сверки с РЭ Т-72.
 */
const WARM_UP_SEC = 3.0;
const MIN_VOLTAGE = 18.0;

/** Дальность видения, м. */
const RANGE_PASSIVE_M = 60;
const RANGE_ACTIVE_M = 100;

/** Засветка: насколько быстро прибор слепнет и восстанавливается. */
const BLOOM_RATE = 2.0;
const RECOVERY_RATE = 0.5;

/** Режимы прибора. */
const MODE_OFF = 0;
const MODE_PASSIVE = 1;
const MODE_ACTIVE = 2;

/** Что засвечивает прибор: собственные фары и пожар в МТО. */
function glareSources(state) {
  const fromLights = state.lightsAll || state.leftLights || state.rightLights ? 1 : 0;
  const fromFire = state.sensors.fire_level > 0.3 ? 1 : 0;

  return Math.max(fromLights, fromFire);
}

/**
 * Готовность прибора, дальность и степень засветки.
 */
function updateNightVision(state, ctx) {
  const isPowered = ctx.isMassOn && ctx.voltage >= MIN_VOLTAGE;
  const isOn = isPowered && state.tvneMode !== MODE_OFF;

  state._tvneWarmUpTime = isOn
    ? Math.min(state._tvneWarmUpTime + ctx.dt, WARM_UP_SEC)
    : 0;

  const isReady = state._tvneWarmUpTime >= WARM_UP_SEC;

  // Засветка нарастает быстро, а спадает медленно — как у реального прибора
  const glare = glareSources(state);
  const delta = glare > 0 ? BLOOM_RATE * ctx.dt : -RECOVERY_RATE * ctx.dt;
  state._tvneGlare = state._clamp(state._tvneGlare + delta, 0, 1);

  const baseRange = state.tvneMode === MODE_ACTIVE ? RANGE_ACTIVE_M : RANGE_PASSIVE_M;
  const range = isReady ? baseRange * (1 - state._tvneGlare) : 0;

  let changed = state._setSensor("night_vision_range", range, { min: 0, max: RANGE_ACTIVE_M });
  changed = state._setSensorBool("is_night_vision_ready", isReady) || changed;
  changed = state._setSensor("night_vision_glare", state._tvneGlare, { min: 0, max: 1 }) || changed;

  // Инфракрасный прожектор демаскирует машину
  if (isOn && state.tvneMode === MODE_ACTIVE) {
    state.recordViolation?.("Работа с инфракрасным прожектором демаскирует машину");
  }

  return changed;
}

export {
  updateNightVision,
  MODE_OFF,
  MODE_PASSIVE,
  MODE_ACTIVE,
  WARM_UP_SEC,
  RANGE_PASSIVE_M,
  RANGE_ACTIVE_M,
};
