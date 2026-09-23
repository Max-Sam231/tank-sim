/**
 * Электрооборудование: бортовая сеть и вольтамперметр ВА-540.
 *
 * Считается в два приёма. Напряжение нужно до пуска — от него зависит,
 * способен ли стартер провернуть двигатель. Ток нужен после, потому что
 * зависит от того, крутится стартер или уже работает генератор.
 */
const BATTERY_FULL_V = 25.0;
const BATTERY_MIN_V = 15.0;
const BATTERY_MAX_V = 26.0;
const GENERATOR_V = 27.8;
const IDLE_DRAIN_RATE = 0.0002;

const CRANK_MIN_V = 18.0;
const STARTER_SAG_V = 5.0;
const VOLTAGE_INERTIA_RATE = 5.0;

/** Потребление по узлам, А. Значения перекрывают друг друга по старшинству. */
const LOAD_BASE_A = 5.0; // КИП и цепи управления
const LOAD_BCN_A = 20.0; // добавка на топливный насос
const LOAD_MZN_A = 80.0; // маслозакачивающий насос — пиковая нагрузка
const LOAD_CRANKING_A = 100.0; // прокрутка: стрелка упирается в левый предел

/**
 * Потребление приборов освещения, А.
 * Складывается с базовой нагрузкой: свет виден по стрелке вольтамперметра
 * и сажает батареи на неработающем двигателе.
 *
 * ВНИМАНИЕ: значения оценочные, требуют сверки с РЭ Т-72.
 */
const LIGHT_LOADS_A = {
  leftLights: 3.0,
  rightLights: 3.0,
  gabrateLights: 1.5,
  cabinLight: 0.5,
};

/** Суммарный ток, потребляемый включённым освещением. */
function lightingLoad(state) {
  let total = 0;

  for (const [key, amps] of Object.entries(LIGHT_LOADS_A)) {
    if (state[key]) total += amps;
  }

  // Выключатель «все огни» зажигает обе фары и габариты разом
  if (state.lightsAll) {
    total += LIGHT_LOADS_A.leftLights + LIGHT_LOADS_A.rightLights + LIGHT_LOADS_A.gabrateLights;
  }

  return total;
}

const AMMETER_INERTIA_RATE = 12.0;

/**
 * Напряжение бортовой сети.
 * Заодно определяет, хватает ли его для прокрутки двигателя.
 */
function updateBusVoltage(state, ctx) {
  if (!ctx.isMassOn) {
    state._batteryVoltage = BATTERY_FULL_V;
  } else if (!state._engineRunning) {
    state._batteryVoltage = state._clamp(
      state._batteryVoltage - IDLE_DRAIN_RATE * ctx.dt,
      BATTERY_MIN_V,
      BATTERY_MAX_V,
    );
  }

  let baseVoltage = 0.0;
  if (ctx.isMassOn) {
    baseVoltage = state._engineRunning ? GENERATOR_V : state._batteryVoltage;
  }

  ctx.canCrank = ctx.isMassOn && baseVoltage >= CRANK_MIN_V;

  // Просадка от стартера — только у способов пуска, где он задействован
  const usesStarter = ctx.requiresElectricStart || ctx.requiresCombinedStart;
  const sag = usesStarter && ctx.starterPressed && ctx.canCrank ? STARTER_SAG_V : 0.0;
  const target = state._clamp(baseVoltage - sag, 0.0, 30.0);

  // Вверх стрелка идёт сразу, вниз — с механической инерцией
  ctx.voltage =
    target > state.sensors.voltage
      ? target
      : state._approach(state.sensors.voltage, target, VOLTAGE_INERTIA_RATE, ctx.dt);

  return state._setSensor("voltage", ctx.voltage, { min: 0, max: 30 });
}

/**
 * Ток в бортовой сети: шкала ВА-540 несимметричная, 100-0-500 А.
 * Отрицательные значения — разряд (левее нуля), положительные — заряд.
 */
function updateAmmeter(state, ctx) {
  let target = 0.0;

  if (ctx.isMassOn) {
    let dischargeCurrent = LOAD_BASE_A + lightingLoad(state);
    if (ctx.isBcnActive) dischargeCurrent += LOAD_BCN_A;
    if (ctx.isMznActive) dischargeCurrent = LOAD_MZN_A;

    // При прокрутке основной ток идёт мимо шунта, прибор видит только
    // вспомогательные цепи: реле стартера, «импульс», пусковой клапан, МЗН
    if (ctx.isCranking) dischargeCurrent = LOAD_CRANKING_A;

    target = state._engineRunning
      ? state._calculateChargeCurrent(state._engineRunTime || 0, dischargeCurrent)
      : -dischargeCurrent;
  }

  const amperage = state._approach(
    state.sensors.amperage,
    target,
    AMMETER_INERTIA_RATE,
    ctx.dt,
  );

  return state._setSensor("amperage", amperage, { min: -100, max: 500 });
}

export { updateBusVoltage, updateAmmeter };
