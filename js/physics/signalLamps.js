/**
 * Сигнальные лампы приборной панели.
 *
 * Кнопка контроля ламп зажигает все сразу — так проверяют их исправность
 * перед пуском, поэтому проверка стоит в каждом условии первой.
 */
const OIL_ALARM_CRANKING = 2.0;
const OIL_ALARM_RUNNING = 3.0;
const OVERHEAT_C = 112.0;
const FUEL_RESERVE_L = 15.0;

function updateLamps(state, ctx) {
  const lampTest = state.signalLamps === 2;

  const lamps = {
    battery_charge: ctx.isMassOn && !state._engineRunning,
    oil_pressure_alarm:
      (ctx.rpm > 0 && ctx.oilEngine < OIL_ALARM_CRANKING) ||
      (state._engineRunning && ctx.oilEngine < OIL_ALARM_RUNNING),
    overheat: ctx.coolantTemp >= OVERHEAT_C || ctx.oilTemp >= OVERHEAT_C,
    fuel_reserve: ctx.fuelLevelInternal <= FUEL_RESERVE_L,
    gear_engaged: state.gearLever !== "neutral",
    commander_call: false,
    air_intake: false,
  };

  let changed = false;
  for (const [key, isLit] of Object.entries(lamps)) {
    changed = state._setLamp(key, lampTest || isLit) || changed;
  }

  return changed;
}

export { updateLamps };
