/**
 * Оборудование подводного вождения танка (ОПВТ).
 *
 * Преодоление водной преграды по дну: машину герметизируют, ставят
 * воздухопитающую трубу, через неё двигатель дышит и через неё же
 * выходит экипаж в случае остановки под водой.
 *
 * Порядок здесь и есть предмет обучения. Вход в воду с невыполненной
 * герметизацией или незакрытыми жалюзи — это затопление, а остановка
 * двигателя под водой означает, что он уже не запустится: вода пойдёт
 * в цилиндры через выпуск.
 *
 * ВНИМАНИЕ: состав и порядок подготовки, глубина и темп поступления
 * воды требуют сверки с РЭ Т-72.
 */

/** Шаги подготовки. Все обязательны перед входом в воду. */
const PREPARATION_STEPS = [
  { key: "opvtSealed", title: "Загерметизировать корпус и башню" },
  { key: "opvtPipeInstalled", title: "Установить воздухопитающую трубу" },
  { key: "opvtExhaustSealed", title: "Загерметизировать выпускные патрубки" },
  { key: "opvtPumpChecked", title: "Проверить водооткачивающий насос" },
];

/** Глубина, выше которой труба перестаёт доставать до воздуха. */
const PIPE_HEIGHT_M = 5.0;

/** Темп поступления воды при нарушенной герметизации, доля в секунду. */
const FLOODING_PER_SEC = 0.05;

/** Производительность водооткачивающего насоса, доля в секунду. */
const PUMP_RATE_PER_SEC = 0.03;

/** Уровень воды, при котором машина считается затопленной. */
const FLOODED_LEVEL = 1.0;

/** Все ли шаги подготовки выполнены. */
function isPrepared(state) {
  return PREPARATION_STEPS.every((step) => Boolean(state[step.key]));
}

/** Невыполненные шаги подготовки — для подсказки и разбора. */
function missingSteps(state) {
  return PREPARATION_STEPS.filter((step) => !state[step.key]).map((step) => step.title);
}

/**
 * Движение под водой: поступление воды, откачка, работа двигателя.
 */
function updateUnderwaterDriving(state, ctx) {
  const depth = Number(state.sensors.water_depth_m) || 0;
  const isUnderwater = depth > 0;

  if (!isUnderwater) {
    return state._setSensorBool("is_flooding", false);
  }

  // Негерметичная машина набирает воду; жалюзи должны быть закрыты
  const leaks = !isPrepared(state) || Number(state.shutters) > 0;
  const pumping = state.opvtPumpOn ? PUMP_RATE_PER_SEC : 0;
  const inflow = leaks ? FLOODING_PER_SEC : 0;

  const level = state._clamp(
    state.sensors.water_level + (inflow - pumping) * ctx.dt,
    0,
    FLOODED_LEVEL,
  );

  // epsilon: 0 обязателен — вода прибывает медленнее порога отсечки,
  // и с порогом по умолчанию уровень не рос бы вовсе
  let changed = state._setSensor("water_level", level, {
    min: 0,
    max: FLOODED_LEVEL,
    epsilon: 0,
  });
  changed = state._setSensorBool("is_flooding", inflow > pumping) || changed;

  if (leaks) {
    for (const title of missingSteps(state)) {
      state.recordViolation?.(`Вход в воду без подготовки: ${title}`);
    }
    if (Number(state.shutters) > 0) {
      state.recordViolation?.("Вход в воду с открытыми жалюзи");
    }
  }

  // Труба перестаёт доставать до поверхности
  if (depth > PIPE_HEIGHT_M) {
    state.recordViolation?.(`Превышена глубина брода: труба рассчитана на ${PIPE_HEIGHT_M} м`);
  }

  // Заглохший под водой двигатель обратно не запустить
  if (!state._engineRunning) {
    state.recordViolation?.("Двигатель остановлен под водой");
  }

  if (level >= FLOODED_LEVEL) {
    state.recordViolation?.("Машина затоплена");
  }

  return changed;
}

export {
  updateUnderwaterDriving,
  isPrepared,
  missingSteps,
  PREPARATION_STEPS,
  PIPE_HEIGHT_M,
  FLOODED_LEVEL,
};
