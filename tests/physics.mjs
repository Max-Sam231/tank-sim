/**
 * Характеризационные тесты физики TankState.
 *
 * Физика детерминирована (ни Math.random, ни таймеров), поэтому поведение
 * фиксируется эталоном: сценарий прогоняется с постоянным шагом, показания
 * снимаются через равные промежутки и сравниваются с сохранённым слепком.
 *
 * Эти тесты НЕ утверждают, что физика правильная. Они утверждают, что она
 * не изменилась — страховка на время разбора tick() на подсистемы.
 *
 * Запуск:   npm run test:physics
 * Обновить: npm run test:physics -- --update   (только при осознанном
 *           изменении физики, разницу обязательно смотреть в диффе)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TankState } from "../js/TankState.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN_PATH = resolve(ROOT, "tests/fixtures/tick-golden.json");

const DT = 1 / 60;
const SAMPLE_EVERY_SEC = 1;
const UPDATE = process.argv.includes("--update");

/** Показания, которые снимаем. Округление гасит дрожь последнего разряда. */
const TRACKED_SENSORS = [
  "air_left_cylinder",
  "air_right_cylinder",
  "air_start_pressure",
  "engine_rpm",
  "oil_pressure_engine",
  "oil_pressure_gearbox",
  "fuel_pressure",
  "coolant_temp",
  "oil_temp",
  "voltage",
  "amperage",
  "speed_kmh",
  "fuel_level_internal",
  "fuel_level_external",
  "gyro_spin_up",
  "cooldown_progress",
  "fire_level",
  "air_filter_vacuum",
  "compartment_pressure",
  "night_vision_range",
  "heading_deg",
  "yaw_rate_deg",
  "water_level",
];

const TRACKED_FLAGS = ["engineRunning", "parkingBrakeLatched"];

function sample(state) {
  // Через снимок, а не через поля: часть состояния приватная (_engineRunning)
  const snapshot = state.getSnapshot();
  const row = {};

  for (const key of TRACKED_SENSORS) {
    const value = snapshot.sensors?.[key] ?? snapshot[key];
    row[key] = typeof value === "number" ? Number(value.toFixed(3)) : value ?? null;
  }
  for (const key of TRACKED_FLAGS) {
    row[key] = Boolean(snapshot[key]);
  }
  row.lamps = Object.fromEntries(
    Object.entries(snapshot.lamps || {}).map(([k, v]) => [k, Boolean(v)]),
  );

  return row;
}

/**
 * Прогоняет сценарий и возвращает показания по секундам плюс свёртку.
 *
 * Посекундных снимков мало: они видят установившиеся значения и пропускают
 * переходные процессы — скорость нарастания оборотов, темп прогрева.
 * Поэтому дополнительно копится интеграл каждого показания по всем тикам:
 * любое изменение траектории сдвигает сумму, даже если конечная точка та же.
 *
 * @param {{durationSec: number, setup?: Function, at?: Record<number, Function>}} scenario
 */
function run(scenario) {
  const state = new TankState();
  scenario.setup?.(state);

  const steps = Math.round(scenario.durationSec / DT);
  const sampleEvery = Math.round(SAMPLE_EVERY_SEC / DT);
  const timeline = {};
  const integral = Object.fromEntries(TRACKED_SENSORS.map((key) => [key, 0]));
  const pending = new Map(
    Object.entries(scenario.at || {}).map(([sec, fn]) => [Math.round(Number(sec) / DT), fn]),
  );

  for (let step = 0; step <= steps; step += 1) {
    pending.get(step)?.(state);
    if (step % sampleEvery === 0) timeline[(step * DT).toFixed(0)] = sample(state);

    for (const key of TRACKED_SENSORS) {
      const value = state.sensors?.[key];
      if (typeof value === "number") integral[key] += value * DT;
    }

    state.tick(DT);
  }

  const digest = Object.fromEntries(
    Object.entries(integral).map(([key, value]) => [key, Number(value.toFixed(2))]),
  );

  return { timeline, digest };
}

/**
 * Подготовка к пуску, общая для всех способов: нейтраль, баллоны, БЦН,
 * масса и прокачка топлива ручным насосом (нужно не меньше трёх качков).
 */
function prime(state, startMethod) {
  state.setScenario({ startMethod, ambientTempC: 20, fuelType: "diesel" });
  state.setGearLever("neutral");
  state.toggleLeftTank();
  state.toggleRightTank();
  state.setBcnMode("on");
  state.toggleBattery();
  state.toggleAirBleedValve();
  for (let i = 0; i < 4; i += 1) state.pumpFuelPrimerLever();
}

/** Шаги, общие для запуска стартером: закрыть клапан, прокачать масло, крутить. */
const ELECTRIC_START_STEPS = {
  2: (state) => state.toggleAirBleedValve(),
  3: (state) => state.toggleMznEngine(),
  14: (state) => state.toggleMznEngine(),
  15: (state) => state.setFuelManualFeed(30),
  16: (state) => state.setStarterPressed(true),
  22: (state) => state.setStarterPressed(false),
};

const SCENARIOS = {
  "мёртвый танк": {
    durationSec: 10,
  },

  "включена масса, двигатель не запущен": {
    durationSec: 30,
    setup: (state) => state.toggleBattery(),
  },

  "прокачка топлива БЦН при открытом клапане выпуска воздуха": {
    durationSec: 30,
    setup: (state) => {
      state.toggleBattery();
      state.setBcnMode("on");
      state.toggleAirBleedValve();
    },
    at: {
      5: (state) => state.pumpFuelPrimerLever(),
      6: (state) => state.pumpFuelPrimerLever(),
      7: (state) => state.pumpFuelPrimerLever(),
      15: (state) => state.toggleAirBleedValve(),
    },
  },

  "прокачка масла МЗН": {
    durationSec: 40,
    setup: (state) => {
      state.toggleBattery();
      state.toggleMznEngine();
    },
    at: {
      25: (state) => state.toggleMznEngine(),
    },
  },

  "запуск стартером": {
    durationSec: 60,
    setup: (state) => prime(state, "electric-start"),
    at: ELECTRIC_START_STEPS,
  },

  "работа под нагрузкой после запуска": {
    durationSec: 120,
    setup: (state) => prime(state, "electric-start"),
    at: {
      ...ELECTRIC_START_STEPS,
      40: (state) => state.setFuelManualFeed(80),
      50: (state) => state.setGearLever("2"),
      55: (state) => state.setGasPedal(true),
      95: (state) => state.setGasPedal(false),
    },
  },

  "запуск сжатым воздухом": {
    durationSec: 60,
    setup: (state) => prime(state, "air-start"),
    at: {
      2: (state) => state.toggleAirBleedValve(),
      3: (state) => state.toggleMznEngine(),
      15: (state) => state.setFuelManualFeed(30),
      16: (state) => state.toggleEpk(),
      22: (state) => state.toggleEpk(),
    },
  },

  "комбинированный запуск": {
    durationSec: 60,
    setup: (state) => {
      prime(state, "combined-start");
      state.toggleCombined();
    },
    at: {
      2: (state) => state.toggleAirBleedValve(),
      3: (state) => state.toggleMznEngine(),
      14: (state) => state.toggleMznEngine(),
      15: (state) => state.setFuelManualFeed(30),
      16: (state) => {
        state.setStarterPressed(true);
        state.toggleEpk();
      },
      22: (state) => {
        state.setStarterPressed(false);
        state.toggleEpk();
      },
    },
  },

  "фиксация стояночного тормоза удержанием педали": {
    durationSec: 20,
    setup: (state) => state.setBrakePressed(true),
    at: {
      10: (state) => state.setBrakePressed(false),
    },
  },

  "перегрев под нагрузкой при закрытых жалюзи": {
    durationSec: 180,
    setup: (state) => {
      prime(state, "electric-start");
      state.setShutters("0");
    },
    at: {
      ...ELECTRIC_START_STEPS,
      30: (state) => state.setFuelManualFeed(100),
    },
  },

  "работа под нагрузкой при открытых жалюзи": {
    durationSec: 180,
    setup: (state) => {
      prime(state, "electric-start");
      state.setShutters("4");
    },
    at: {
      ...ELECTRIC_START_STEPS,
      30: (state) => state.setFuelManualFeed(100),
    },
  },

  "освещение сажает батареи на неработающем двигателе": {
    durationSec: 60,
    setup: (state) => state.toggleBattery(),
    at: {
      10: (state) => state.toggleLightsAll(),
      40: (state) => state.toggleLightsAll(),
    },
  },

  "разгон гирополукомпаса": {
    durationSec: 360,
    setup: (state) => {
      state.toggleBattery();
      state.toggleGpk();
    },
  },

  "прокачка масла КП насосом до пуска": {
    durationSec: 40,
    setup: (state) => {
      state.toggleBattery();
      state.toggleOilPumpGearbox();
    },
    at: {
      25: (state) => state.toggleOilPumpGearbox(),
    },
  },

  "штатная остановка после охлаждения на холостом ходу": {
    durationSec: 260,
    setup: (state) => prime(state, "electric-start"),
    at: {
      ...ELECTRIC_START_STEPS,
      40: (state) => state.setFuelManualFeed(90),
      80: (state) => state.setFuelManualFeed(0),
      230: (state) => state.stopEngine(),
    },
  },

  "пожар в МТО тушится автоматически": {
    durationSec: 30,
    setup: (state) => state.toggleBattery(),
    at: {
      5: (state) => state.startFire(0.25),
    },
  },

  "пожар в МТО при открытых жалюзи без тушения": {
    durationSec: 60,
    setup: (state) => {
      state.toggleBattery();
      state.togglePpoMode();
      state.setShutters("4");
    },
    at: {
      5: (state) => state.startFire(0.25),
    },
  },

  "забитый воздухоочиститель душит двигатель": {
    durationSec: 120,
    setup: (state) => {
      prime(state, "electric-start");
      state.setShutters("4");
      state.setAirFilterClogging(0.9);
    },
    at: {
      ...ELECTRIC_START_STEPS,
      30: (state) => state.setFuelManualFeed(100),
    },
  },

  "заражённая местность с автоматической защитой": {
    durationSec: 60,
    setup: (state) => state.toggleBattery(),
    at: {
      10: (state) => state.setContaminated(true),
      50: (state) => state.setContaminated(false),
    },
  },

  "прибор ночного видения и засветка фарами": {
    durationSec: 40,
    setup: (state) => {
      state.toggleBattery();
      state.cycleNightVision();
    },
    at: {
      15: (state) => state.toggleLightsAll(),
      25: (state) => state.toggleLightsAll(),
    },
  },

  "движение с поворотом рычагами": {
    durationSec: 200,
    setup: (state) => {
      prime(state, "electric-start");
      state.setShutters("4");
    },
    at: {
      ...ELECTRIC_START_STEPS,
      60: (state) => {
        state.setGearLever("3");
        state.toggleOilPumpGearbox();
        state.setFuelManualFeed(100);
        state.setGasPedal(true);
      },
      120: (state) => state.setLever("right", 1),
      150: (state) => state.setLever("right", 0),
      170: (state) => {
        state.setLever("left", 2);
        state.setLever("right", 2);
      },
    },
  },

  "вход в воду без подготовки": {
    durationSec: 40,
    setup: (state) => prime(state, "electric-start"),
    at: {
      ...ELECTRIC_START_STEPS,
      30: (state) => state.setWaterDepth(2),
    },
  },

  "вход в воду подготовленной машины": {
    durationSec: 40,
    setup: (state) => {
      prime(state, "electric-start");
      state.toggleOpvtSealed();
      state.toggleOpvtPipe();
      state.toggleOpvtExhaustSeal();
      state.toggleOpvtPumpCheck();
    },
    at: {
      ...ELECTRIC_START_STEPS,
      30: (state) => {
        state.toggleOpvtPump();
        state.setWaterDepth(2);
      },
    },
  },

  "остановка двигателя снятием массы": {
    durationSec: 60,
    setup: (state) => prime(state, "electric-start"),
    at: {
      ...ELECTRIC_START_STEPS,
      40: (state) => state.toggleBattery(),
    },
  },
};


// --- Прогон и сравнение ----------------------------------------------------

const actual = Object.fromEntries(
  Object.entries(SCENARIOS).map(([name, scenario]) => [name, run(scenario)]),
);

if (UPDATE || !existsSync(GOLDEN_PATH)) {
  mkdirSync(dirname(GOLDEN_PATH), { recursive: true });
  writeFileSync(GOLDEN_PATH, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
  console.log(existsSync(GOLDEN_PATH) && !UPDATE ? "Эталон создан." : "Эталон обновлён.");
  console.log(`  ${GOLDEN_PATH}`);
  console.log("  Разницу обязательно проверить в git diff.");
  process.exit(0);
}

const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));

/** Перечисляет расхождения как пути вида "сценарий / 12с / engine_rpm". */
function diff(expected, got, path = []) {
  const problems = [];

  const keys = new Set([...Object.keys(expected || {}), ...Object.keys(got || {})]);
  for (const key of keys) {
    const a = expected?.[key];
    const b = got?.[key];
    const here = [...path, key];

    if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
      problems.push(...diff(a, b, here));
    } else if (a !== b) {
      problems.push(`${here.join(" / ")}: эталон ${a}, получено ${b}`);
    }
  }

  return problems;
}

let failed = 0;

for (const name of Object.keys(SCENARIOS)) {
  const problems = diff(golden[name], actual[name], []);

  if (problems.length === 0) {
    console.log(`  ok   ${name}`);
    continue;
  }

  failed += 1;
  console.log(`  FAIL ${name}`);
  for (const problem of problems.slice(0, 8)) console.log(`       ${problem}`);
  if (problems.length > 8) console.log(`       ... и ещё ${problems.length - 8} расхождений`);
}

const total = Object.keys(SCENARIOS).length;
console.log(`\n${total - failed}/${total} сценариев совпали с эталоном`);

if (failed > 0) {
  console.log("\nЕсли физика менялась осознанно: npm run test:physics -- --update");
}

process.exit(failed === 0 ? 0 : 1);
