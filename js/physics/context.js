/**
 * Общий контекст одного шага симуляции.
 *
 * Подсистемы считаются по очереди и передают друг другу промежуточные
 * величины через этот объект: подача топлива зависит от массы, пуск — от
 * напряжения, обороты — от факта работы двигателя и так далее. Явный
 * контекст делает эти зависимости видимыми вместо десятков локальных
 * переменных в одной длинной функции.
 */

/** Передаточные отношения по положениям рычага (условные, для скорости). */
const GEAR_RATIOS = {
  neutral: 0,
  R: -0.04,
  1: 0.03,
  2: 0.05,
  3: 0.07,
  4: 0.09,
  5: 0.11,
};

const DEFAULT_AMBIENT_C = 20.0;

/**
 * Собирает исходные данные шага: всё, что читается из органов управления
 * и сценария до того, как хоть одна подсистема что-то посчитает.
 */
function createContext(state, dt) {
  const startMethod = state.scenario.startMethod;
  const isMassOn = Boolean(state.isBatteryOn);

  return {
    dt,

    // Положение органов управления
    isMassOn,
    starterPressed: state.starter === 2,
    epkPressed: Boolean(state.epk),
    gearRatio: GEAR_RATIOS[state.gearLever] ?? 0,

    // Способ пуска по сценарию
    requiresAirStart: startMethod === "air-start",
    requiresElectricStart: startMethod === "electric-start",
    requiresCombinedStart: startMethod === "combined-start",

    ambient: Number.isFinite(state.scenario.ambientTempC)
      ? state.scenario.ambientTempC
      : DEFAULT_AMBIENT_C,

    // Заполняется подсистемами по ходу шага
    isBcnActive: false,
    isMznActive: false,
    fuelPressure: 0,
    voltage: 0,
    canCrank: false,
    airStartPressure: 0,
    isCranking: false,
    throttle: 0,
    rpm: 0,
    oilEngine: 0,
    rpmFactor: 0,
    coolantTemp: 0,
    oilTemp: 0,
    fuelLevelInternal: 0,
  };
}

export { createContext, GEAR_RATIOS };
