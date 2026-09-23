import { createContext } from "./context.js";
import { updateParkingBrake } from "./parkingBrake.js";
import { updateFuelSupply, updateFuelLevels } from "./fuelSystem.js";
import { updateBusVoltage, updateAmmeter } from "./electricalSystem.js";
import { updateAirPressure, updateAirConsumption } from "./airSystem.js";
import { computeCrankingMode, updateEngineState, updateRpm } from "./engine.js";
import { updateEngineOil, updateGearboxOil } from "./lubrication.js";
import { updateHeater, updateTemperatures } from "./thermalSystem.js";
import { updateSpeed } from "./driveline.js";
import { updateCooldown } from "./engineShutdown.js";
import { updateSmokeScreen } from "./smokeScreen.js";
import { updateFireSuppression } from "./fireSuppression.js";
import { updateOperatingLimits } from "./operatingLimits.js";
import { updateGyroCompass } from "./navigation.js";
import { updateLamps } from "./signalLamps.js";

const MAX_STEP_SEC = 0.25;

/**
 * Один шаг симуляции танка.
 *
 * Порядок вызовов — не произвольный, подсистемы питают друг друга:
 * топливо и напряжение нужны до решения о пуске, факт работы двигателя —
 * до оборотов, обороты — до скорости, температур и ламп.
 *
 * @param {import("../TankState.js").TankState} state
 * @param {number} dt шаг в секундах
 * @returns {boolean} изменилось ли что-нибудь, о чём стоит сообщить подписчикам
 */
function updatePhysics(state, dt) {
  const ctx = createContext(state, Math.min(dt, MAX_STEP_SEC));
  let changed = false;

  changed = updateParkingBrake(state, ctx) || changed;

  // Условия пуска: топливо под давлением и живая бортовая сеть
  changed = updateFuelSupply(state, ctx) || changed;
  changed = updateBusVoltage(state, ctx) || changed;

  // Воздухопуск: сначала давление, затем режим прокрутки, затем расход
  changed = updateAirPressure(state, ctx) || changed;
  computeCrankingMode(state, ctx);
  changed = updateAirConsumption(state, ctx) || changed;

  changed = updateEngineState(state, ctx) || changed;
  changed = updateRpm(state, ctx) || changed;

  changed = updateEngineOil(state, ctx) || changed;
  changed = updateGearboxOil(state, ctx) || changed;

  changed = updateHeater(state, ctx) || changed;
  changed = updateTemperatures(state, ctx) || changed;

  changed = updateSpeed(state, ctx) || changed;
  changed = updateAmmeter(state, ctx) || changed;
  changed = updateFuelLevels(state, ctx) || changed;

  changed = updateSmokeScreen(state, ctx) || changed;
  changed = updateFireSuppression(state, ctx) || changed;
  changed = updateCooldown(state, ctx) || changed;
  changed = updateGyroCompass(state, ctx) || changed;
  changed = updateLamps(state, ctx) || changed;

  // Контроль режимов — последним: сверяет уже посчитанные показания
  updateOperatingLimits(state, ctx);

  return changed;
}

export { updatePhysics };
