/**
 * Противопожарное оборудование (ППО).
 *
 * Термодатчики в моторно-трансмиссионном отделении замыкаются при пожаре,
 * система разряжает баллон с огнетушащим составом. В автоматическом режиме
 * это происходит само, в ручном — по команде механика-водителя.
 *
 * Перед разрядкой система останавливает двигатель и закрывает жалюзи:
 * иначе состав вытянет наружу, а приток воздуха раздует пламя.
 *
 * Баллонов ограниченное число — это и есть цена промедления.
 *
 * ВНИМАНИЕ: число баллонов, время разрядки и пороги требуют сверки
 * с РЭ Т-72.
 */
const CYLINDER_COUNT = 3;
const DISCHARGE_SEC = 3.0; // сколько длится разрядка одного баллона
const SUPPRESSION_CHANCE_FULL = 0.9; // доля пламени, сбиваемая одним баллоном

/** Скорость роста и спада пожара, доля в секунду. */
const FIRE_GROWTH_PER_SEC = 0.08;
const FIRE_DECAY_PER_SEC = 0.5;

/** Пожар сверх этого уровня считается обнаруженным датчиками. */
const DETECTION_LEVEL = 0.05;

/** Уровень, выше которого двигатель выходит из строя. */
const CRITICAL_LEVEL = 0.95;

/**
 * Разряжает очередной баллон, если он есть.
 * @returns {boolean} удалось ли начать разрядку
 */
function dischargeCylinder(state) {
  if (state.ppoCylindersUsed >= CYLINDER_COUNT) return false;
  if (state._ppoDischargeTime > 0) return false; // разрядка уже идёт

  state.ppoCylindersUsed += 1;
  state._ppoDischargeTime = DISCHARGE_SEC;

  return true;
}

/** Готова ли система тушить: есть баллоны и не идёт разрядка. */
function canDischarge(state) {
  return state.ppoCylindersUsed < CYLINDER_COUNT && state._ppoDischargeTime <= 0;
}

/**
 * Развитие пожара и работа системы пожаротушения.
 *
 * Пожар растёт сам и тем быстрее, чем больше приток воздуха через
 * открытые жалюзи. Разрядка баллона сбивает пламя.
 */
function updateFireSuppression(state, ctx) {
  let level = state.sensors.fire_level;
  const isDischarging = state._ppoDischargeTime > 0;

  if (isDischarging) {
    state._ppoDischargeTime = Math.max(0, state._ppoDischargeTime - ctx.dt);
    level -= FIRE_DECAY_PER_SEC * SUPPRESSION_CHANCE_FULL * ctx.dt;
  } else if (level > 0) {
    // Открытые жалюзи дают приток воздуха и разгоняют пламя
    const draft = 1 + (Number(state.shutters) / 4) * 0.5;
    level += FIRE_GROWTH_PER_SEC * draft * ctx.dt;
  }

  level = state._clamp(level, 0, 1);

  let changed = state._setSensor("fire_level", level, { min: 0, max: 1 });

  const isDetected = level >= DETECTION_LEVEL;
  changed = state._setSensorBool("is_fire_detected", isDetected) || changed;

  if (!isDetected) return changed;

  // Пожар обнаружен: в автоматическом режиме система срабатывает сама
  if (state.ppoAuto && canDischarge(state)) dischargeCylinder(state);

  // Двигатель на горящей машине работать не должен
  if (state._engineRunning) {
    state.recordViolation?.("Двигатель не остановлен при пожаре в МТО");
  }
  if (Number(state.shutters) > 0) {
    state.recordViolation?.("Жалюзи не закрыты при пожаре в МТО");
  }

  if (level >= CRITICAL_LEVEL) {
    state.recordViolation?.("Пожар не потушен: машина выведена из строя");
  }

  return changed;
}

export {
  updateFireSuppression,
  dischargeCylinder,
  canDischarge,
  CYLINDER_COUNT,
  DETECTION_LEVEL,
  CRITICAL_LEVEL,
};
