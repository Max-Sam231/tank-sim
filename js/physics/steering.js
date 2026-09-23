/**
 * Управление поворотом.
 *
 * Т-72 поворачивает подтормаживанием гусеницы: рычаг управления в первом
 * положении отключает бортовой фрикцион и даёт плавный поворот, во втором
 * подтормаживает гусеницу и даёт резкий. Отсюда и падение скорости в
 * повороте, тем большее, чем круче поворот.
 *
 * Оба рычага, взятые разом, работают как остановочный тормоз.
 *
 * ВНИМАНИЕ: радиусы поворота, потеря скорости и предельная скорость
 * поворота требуют сверки с РЭ Т-72.
 */

/** Положения рычага управления. */
const LEVER_RELEASED = 0;
const LEVER_FIRST = 1; // плавный поворот
const LEVER_SECOND = 2; // резкий поворот

/** Угловая скорость поворота, град/с, при скорости 10 км/ч. */
const YAW_FIRST_DEG = 6;
const YAW_SECOND_DEG = 14;

/** Доля скорости, теряемая в повороте. */
const SPEED_LOSS_FIRST = 0.15;
const SPEED_LOSS_SECOND = 0.4;

/** Скорость, выше которой резкий поворот опасен. */
const SHARP_TURN_SPEED_LIMIT = 20;

/** Сторона поворота: -1 влево, +1 вправо, 0 прямо. */
function turnDirection(state) {
  const left = Number(state.leftLever) || LEVER_RELEASED;
  const right = Number(state.rightLever) || LEVER_RELEASED;

  // Оба рычага на себя — это торможение, а не поворот
  if (left > LEVER_RELEASED && right > LEVER_RELEASED) return 0;
  if (left > LEVER_RELEASED) return -1;
  if (right > LEVER_RELEASED) return 1;

  return 0;
}

/** Насколько круто взят поворот: 0 прямо, 1 плавно, 2 резко. */
function turnSeverity(state) {
  if (turnDirection(state) === 0) return LEVER_RELEASED;
  return Math.max(Number(state.leftLever) || 0, Number(state.rightLever) || 0);
}

/** Оба рычага взяты — машина тормозит. */
function isBrakingWithLevers(state) {
  return (
    Number(state.leftLever) > LEVER_RELEASED && Number(state.rightLever) > LEVER_RELEASED
  );
}

/** Во сколько раз поворот срезает скорость, 0..1. */
function steeringSpeedFactor(state) {
  switch (turnSeverity(state)) {
    case LEVER_FIRST:
      return 1 - SPEED_LOSS_FIRST;
    case LEVER_SECOND:
      return 1 - SPEED_LOSS_SECOND;
    default:
      return 1;
  }
}

/**
 * Поворот машины: меняет курс по гирополукомпасу.
 * Стоящая машина рычагами не разворачивается.
 */
function updateSteering(state, ctx) {
  const direction = turnDirection(state);
  const severity = turnSeverity(state);
  const speed = state.sensors.speed_kmh;

  if (direction === 0 || speed < 0.5) {
    return state._setSensor("yaw_rate_deg", 0, { min: -30, max: 30 });
  }

  // Чем быстрее машина, тем больше она доворачивает за то же время
  const baseYaw = severity === LEVER_SECOND ? YAW_SECOND_DEG : YAW_FIRST_DEG;
  const yawRate = direction * baseYaw * (speed / 10);

  let changed = state._setSensor("yaw_rate_deg", yawRate, { min: -30, max: 30 });

  const heading = (state.sensors.heading_deg + yawRate * ctx.dt + 360) % 360;
  changed = state._setSensor("heading_deg", heading, { min: 0, max: 360 }) || changed;

  if (severity === LEVER_SECOND && speed > SHARP_TURN_SPEED_LIMIT) {
    state.recordViolation?.(`Резкий поворот на скорости выше ${SHARP_TURN_SPEED_LIMIT} км/ч`);
  }

  return changed;
}

export {
  updateSteering,
  steeringSpeedFactor,
  isBrakingWithLevers,
  turnDirection,
  turnSeverity,
  LEVER_RELEASED,
  LEVER_FIRST,
  LEVER_SECOND,
  SHARP_TURN_SPEED_LIMIT,
};
