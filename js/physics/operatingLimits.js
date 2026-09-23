import { overheatLimit } from "./thermalSystem.js";

/**
 * Контроль эксплуатационных режимов.
 *
 * Приборы показывают значения, но курсант должен знать пределы и следить
 * за ними сам. Эта подсистема сверяет показания с нормой и записывает
 * выход за неё в журнал нарушений — для разбора после занятия.
 *
 * Нарушение фиксируется не мгновенно: короткий заброс при переходных
 * режимах — это норма, а вот удержание вне предела — уже ошибка.
 *
 * ВНИМАНИЕ: все пределы требуют сверки с РЭ Т-72.
 */
const TOLERANCE_SEC = 3.0; // сколько терпим выход за предел

const MIN_OIL_PRESSURE_RUNNING = 2.0; // кгс/см² на работающем двигателе
const MAX_RPM = 2200;
const MIN_COOLANT_FOR_LOAD_C = 55; // нагружать холодный двигатель нельзя
const LOAD_FUEL_FEED = 50; // подача, выше которой считается нагрузкой
const MIN_GEARBOX_PRESSURE = 1.0; // без давления в КП трогаться нельзя

/**
 * Правила контроля. Каждое проверяется только когда применимо:
 * давление масла — на работающем двигателе, давление в КП — при движении.
 */
const LIMIT_RULES = [
  {
    id: "oil-pressure-low",
    applies: (state) => state._engineRunning,
    violated: (state) => state.sensors.oil_pressure_engine < MIN_OIL_PRESSURE_RUNNING,
    message: () =>
      `Работа с давлением масла ниже ${MIN_OIL_PRESSURE_RUNNING} кгс/см²`,
  },
  {
    id: "overheat",
    applies: (state) => state._engineRunning,
    violated: (state) =>
      state.sensors.coolant_temp >= overheatLimit(state) ||
      state.sensors.oil_temp >= overheatLimit(state),
    message: (state) => `Перегрев: превышено ${overheatLimit(state)} °C`,
  },
  {
    id: "overspeed",
    applies: (state) => state._engineRunning,
    violated: (state) => state.sensors.engine_rpm > MAX_RPM,
    message: () => `Превышены максимальные обороты ${MAX_RPM} об/мин`,
  },
  {
    id: "cold-load",
    // Газовать на холодном двигателе — ошибка сразу, а не после выдержки
    toleranceSec: 1.0,
    applies: (state) => state._engineRunning,
    violated: (state) =>
      state.sensors.coolant_temp < MIN_COOLANT_FOR_LOAD_C &&
      (state.gasPedal || state.fuelManualFeed >= LOAD_FUEL_FEED),
    message: () => `Нагрузка на непрогретом двигателе (ниже ${MIN_COOLANT_FOR_LOAD_C} °C)`,
  },
  {
    id: "move-without-gearbox-oil",
    applies: (state) => state.sensors.speed_kmh > 0.5,
    violated: (state) => state.sensors.oil_pressure_gearbox < MIN_GEARBOX_PRESSURE,
    message: () => "Движение без давления смазки в коробке передач",
  },
];

/**
 * Сверяет показания с нормой и копит время выхода за предел.
 * Показаний не меняет, поэтому подписчиков сам по себе не будит.
 */
function updateOperatingLimits(state, ctx) {
  for (const rule of LIMIT_RULES) {
    const isOut = rule.applies(state) && rule.violated(state);

    const held = (state._limitBreachTime[rule.id] || 0) + (isOut ? ctx.dt : 0);
    state._limitBreachTime[rule.id] = isOut ? held : 0;

    if (isOut && held >= (rule.toleranceSec ?? TOLERANCE_SEC)) {
      state.recordViolation?.(rule.message(state));
    }
  }

  return false;
}

export { updateOperatingLimits, LIMIT_RULES, TOLERANCE_SEC };
