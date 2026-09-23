import { steeringSpeedFactor, isBrakingWithLevers } from "./steering.js";

/**
 * Ходовая часть: скорость по оборотам, передаче и подаче топлива.
 * Модель условная — задача тренажёра не в точной динамике движения.
 */
const SPEED_FACTOR = 55.0;
const ACCEL_RUNNING = 6.0;
const ACCEL_COASTING = 10.0;
const DECEL = 12.0;

function updateSpeed(state, ctx) {
  let target = 0.0;
  if (state._engineRunning && ctx.gearRatio !== 0 && !isBrakingWithLevers(state)) {
    target = Math.abs(ctx.gearRatio) * (ctx.rpm / 1000) * SPEED_FACTOR * ctx.throttle;
    // Поворот подтормаживанием гусеницы срезает скорость
    target *= steeringSpeedFactor(state);
    if (ctx.gearRatio < 0) target *= -1;
  }

  const current = state.sensors.speed_kmh;
  const accelerating = Math.abs(target) > Math.abs(current);
  const rate = accelerating ? (state._engineRunning ? ACCEL_RUNNING : ACCEL_COASTING) : DECEL;

  const speed = state._approach(current, target, rate, ctx.dt);

  return state._setSensor("speed_kmh", speed, { min: 0, max: 100 });
}

export { updateSpeed };
