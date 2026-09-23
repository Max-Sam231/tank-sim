/**
 * Гирополукомпас ГПК-59.
 *
 * Прибор не готов сразу: гироскоп раскручивается несколько минут.
 * Это и есть учебный смысл — ГПК включают заранее, на подготовке,
 * а не в момент, когда курс уже понадобился.
 *
 * ВНИМАНИЕ: время разгона и величина ухода требуют сверки с РЭ Т-72.
 */
const SPIN_UP_SEC = 300; // ~5 минут до готовности
const DRIFT_DEG_PER_MIN = 2.0; // уход шкалы у раскрученного гироскопа
const MIN_VOLTAGE = 18.0;

/**
 * Разгон гироскопа и накопление курса.
 * Курс меняется от поворота машины; пока поворотом не управляют,
 * шкала показывает только собственный уход прибора.
 */
function updateGyroCompass(state, ctx) {
  const isPowered = ctx.isMassOn && Boolean(state.gpk) && ctx.voltage >= MIN_VOLTAGE;

  if (!isPowered) {
    // Без питания гироскоп выбегает, и накопленный курс теряется
    state._gyroSpinUpTime = 0;
    let changed = state._setSensor("gyro_spin_up", 0, { min: 0, max: 1 });
    changed = state._setSensorBool("is_gyro_ready", false) || changed;
    return changed;
  }

  state._gyroSpinUpTime = Math.min(state._gyroSpinUpTime + ctx.dt, SPIN_UP_SEC);

  const spinUp = state._gyroSpinUpTime / SPIN_UP_SEC;
  const isReady = spinUp >= 1;

  let changed = state._setSensor("gyro_spin_up", spinUp, { min: 0, max: 1 });
  changed = state._setSensorBool("is_gyro_ready", isReady) || changed;

  if (isReady) {
    const drift = (DRIFT_DEG_PER_MIN / 60) * ctx.dt;
    const heading = (state.sensors.heading_deg + drift + 360) % 360;
    changed = state._setSensor("heading_deg", heading, { min: 0, max: 360 }) || changed;
  }

  return changed;
}

export { updateGyroCompass, SPIN_UP_SEC };
