/**
 * Стояночный тормоз.
 *
 * Отдельной кнопки нет: тормоз ставится и снимается удержанием педали.
 * Срабатывает один раз за нажатие — пока педаль не отпустят, повторно
 * состояние не переключится.
 */
function updateParkingBrake(state, ctx) {
  if (!state.isBrakePressed) {
    state._brakeHoldTime = 0;
    state._brakeHoldTriggered = false;
    return false;
  }

  state._brakeHoldTime += ctx.dt;

  const holdComplete = state._brakeHoldTime >= state._parkingBrakeHoldThresholdSec;
  if (state._brakeHoldTriggered || !holdComplete) return false;

  state.parkingBrakeLatched = !state.parkingBrakeLatched;
  state._brakeHoldTriggered = true;

  return true;
}

export { updateParkingBrake };
