function getStarterGenerator15CScenario() {
  return {
    id: "starter-generator@15",
    title: "Запуск: Стартер-генератор, +15°C",
    steps: [
      {
        id: "gear-neutral",
        title: "Рычаг переключения передач — Нейтраль",
        auto: true,
        completeWhen: (s) => s.gearLever === "neutral",
      },
      {
        id: "parking-brake",
        title: "Педаль тормоза — выжать и зафиксировать (стояночный тормоз)",
        arm: [{ action: "brake-pedal", phase: "hold" }],
        gateKeys: ["parkingBrakeLatched"],
        completeWhen: (s) => Boolean(s.parkingBrakeLatched),
      },
      {
        id: "shutters-open",
        title: "Рычаг для жалюзи — Открыто",
        arm: [{ action: "shutters", phase: "click" }],
        gateKeys: ["shutters"],
        completeWhen: (s) => Number(s.shutters) === 4,
      },
      {
        id: "battery-on",
        title: "Кнопка массы — включить (22–26 В)",
        arm: [{ action: "battery-toggle", phase: "click" }],
        gateKeys: ["isBatteryOn"],
        completeWhen: (s) => Boolean(s.isBatteryOn) && s.voltage >= 22 && s.voltage <= 26,
      },
      {
        id: "open-instrument-panel",
        title: "Открыть приборную панель",
        arm: [{ action: "instrument-panel", phase: "click" }],
        gateKeys: ["instrumentPanel"],
        completeWhen: (s) => Boolean(s.instrumentPanel),
      },
      {
        id: "azr-on",
        title: "АЗР — включить",
        arm: [{ action: "azr", phase: "click" }],
        gateKeys: ["azr"],
        completeWhen: (s) => Number(s.azr) === 2,
      },
      {
        id: "signal-lamps-open",
        title: "Контроль сигнальных ламп — открыть крышку",
        arm: [{ action: "signal-lamps", phase: "click" }],
        gateKeys: ["signalLamps"],
        completeWhen: (s) => Number(s.signalLamps) === 1,
      },
      {
        id: "signal-lamps-test",
        title: "Контроль сигнальных ламп — нажать кнопку",
        arm: [{ action: "signal-lamps", phase: "click" }],
        gateKeys: ["signalLamps"],
        completeWhen: (s) => Number(s.signalLamps) === 2,
      },
      {
        id: "fuel-primer-lever-on",
        title: "Рычаг ручного подачи топлива — ВКЛ",
        arm: [{ action: "fuel-primer-lever", phase: "click" }],
        gateKeys: ["fuelPrimerLever"],
        completeWhen: (s) => Boolean(s.fuelPrimerLever),
      },
      {
        id: "manual-fuel-30-50",
        title: "Ручная подача топлива — 30–50%",
        arm: [{ action: "fuel-manual-feed", phase: "click" }],
        gateKeys: ["fuelManualFeed"],
        completeWhen: (s) => Number(s.fuelManualFeed) >= 30 && Number(s.fuelManualFeed) <= 50,
      },
      {
        id: "bcn-on-pressure",
        title: "БЦН ТЦА — включить (1.2–2.5 кгс/см²)",
        arm: [{ action: "bcn", phase: "click" }],
        gateKeys: ["bcn"],
        completeWhen: (s) => (s.bcn === 'on' || s.bcn === 'pump') && s.fuel_pressure >= 1.2 && s.fuel_pressure <= 2.5,
      },
      {
        id: "mzn-to-oil",
        title: "МЗН двигат. — удерживать до 2.0–5.0 кгс/см²",
        arm: [{ action: "mzn-engine", phase: "press" }],
        gateKeys: ["mznEngine"],
        completeWhen: (s) => Boolean(s.mznEngine) && s.oil_pressure_engine >= 2.0 && s.oil_pressure_engine <= 5.0,
      },
      {
        id: "starter-start-engine",
        title: "Стартер — удерживать (не отпуская МЗН) до запуска",
        arm: [{ action: "starter", phase: "press" }],
        gateKeys: ["starter"],
        completeWhen: (s) => Boolean(s.engineRunning) && Number(s.engine_rpm) >= 800,
      },
      {
        id: "release-and-bcn-off",
        title: "После запуска — отпустить Стартер/МЗН, выключить БЦН",
        arm: [
          { action: "starter", phase: "release" },
          { action: "mzn-engine", phase: "release" },
          { action: "bcn", phase: "click" },
        ],
        gateKeys: ["mznEngine", "bcn"],
        completeWhen: (s) => Boolean(s.engineRunning) && !Boolean(s.mznEngine) && Number(s.starter) === 1 && s.bcn === 'off',
      },
      {
        id: "manual-fuel-idle",
        title: "Ручная подача топлива — 20–25% (800–1000 об/мин)",
        arm: [{ action: "fuel-manual-feed", phase: "click" }],
        gateKeys: ["fuelManualFeed"],
        completeWhen: (s) => {
          const f = Number(s.fuelManualFeed);
          const rpm = Number(s.engine_rpm);
          return Boolean(s.engineRunning) && f >= 20 && f <= 25 && rpm >= 800 && rpm <= 1000;
        },
      },
      {
        id: "voltage-charge",
        title: "Контроль — вольтаж 27–28.5 В",
        auto: true,
        completeWhen: (s) => Boolean(s.engineRunning) && s.voltage >= 27 && s.voltage <= 28.5,
      },
    ],
  };
}

function getScenarioDefinition({ startMethod, ambientTempC }) {
  const method = String(startMethod || "");
  const t = Math.round(Number(ambientTempC));
  if (method === "starter-generator" && t === 15) return getStarterGenerator15CScenario();
  return null;
}

export { getScenarioDefinition };
