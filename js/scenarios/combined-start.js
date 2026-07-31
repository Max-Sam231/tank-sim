function getCombinedStart20CScenario() {
  return {
    id: "combined-start@20",
    title: "Подготовка и комбинированный запуск: +20°C, дизель",
    stages: [
      {
        id: "stage-preparation-non-strict",
        title: "Подготовительные действия",
        strict: false,
        steps: [
          {
            id: "control-inspection",
            title: "Произвести контрольный осмотр машины",
            auto: true,
            completeWhen: () => true,
          },
          {
            id: "gear-neutral",
            title: "Убедиться, что рычаг избирателя находится в нейтральном положении",
            auto: true,
            completeWhen: (s) => s.gearLever === "neutral",
          },
          {
            id: "parking-brake",
            title: "Затормозить машину остановочным тормозом",
            gateKeys: ["parkingBrakeLatched"],
            completeWhen: (s) => Boolean(s.parkingBrakeLatched),
          },
          {
            id: "manual-fuel-zero",
            title: "Убедиться, что рукоятка ручной подачи топлива находится в положении нулевой подачи",
            auto: true,
            completeWhen: (s) => Number(s.fuelManualFeed) === 0,
          },
          {
            id: "air-cylinders-open",
            title: "Открыть вентили воздушных баллонов и проверить давление не ниже 75 кгс/см²",
            gateKeys: ["leftTank", "rightTank"],
            completeWhen: (s) => Boolean(s.leftTank) && Boolean(s.rightTank) && s.air_left_cylinder >= 75 && s.air_right_cylinder >= 75,
          },
          {
            id: "fuel-distributor-tanks-on",
            title: "Установить топливораспределительный кран в положение БАКИ ВКЛЮЧЕНЫ",
            gateKeys: ["bcn"],
            completeWhen: (s) => s.bcn === "on",
          },
          {
            id: "battery-on",
            title: "Включить выключатель аккумуляторных батарей",
            gateKeys: ["isBatteryOn"],
            completeWhen: (s) => Boolean(s.isBatteryOn) && s.voltage >= 22 && s.voltage <= 26,
          }
        ]
      },
      {
        id: "stage-priming-strict",
        title: "Прокачка систем",
        strict: true,
        steps: [
          {
            id: "air-bleed-open",
            title: "Открыть клапан выпуска воздуха",
            gateKeys: ["airBleedValve"],
            completeWhen: (s) => Boolean(s.airBleedValve),
          },
          {
            id: "bcn-prime",
            title: "Прокачать систему питания топливом насосом БЦН-1 (3–5 качаний рычагом)",
            gateKeys: ["fuelPrimerPumps"],
            completeWhen: (s) => Boolean(s.airBleedValve) && s.bcn === "on" && s.fuelPrimerPumps >= 3 && s.fuel_pressure >= 1.2,
          },
          {
            id: "air-bleed-close",
            title: "Перед пуском отпустить клапан выпуска воздуха",
            gateKeys: ["airBleedValve"],
            completeWhen: (s) => !Boolean(s.airBleedValve),
          }
        ]
      },
      {
        id: "stage-start-strict",
        title: "Комбинированный пуск",
        strict: true,
        steps: [
          {
            id: "warning-signal",
            title: "Дать предупредительный звуковой сигнал",
            gateKeys: ["horn"],
            completeWhen: (s) => Boolean(s.horn),
          },
          {
            id: "combined-on",
            title: "Установить переключатель КОМБИНИРОВАННЫЙ в положение ВКЛ",
            gateKeys: ["combined"],
            completeWhen: (s) => Boolean(s.combined),
          },
          {
            id: "mzn-engine-on",
            title: "Нажать и удерживать кнопку маслозакачивающего насоса МЗН-2",
            gateKeys: ["mznEngine"],
            completeWhen: (s) => Boolean(s.mznEngine),
          },
          {
            id: "oil-pressure-ready",
            title: "Дождаться давления масла в системе не ниже 2 кгс/см²",
            auto: true,
            completeWhen: (s) => Boolean(s.mznEngine) && s.oil_pressure_engine >= 2.0,
          },
          {
            id: "mzn-engine-off",
            title: "После создания давления масла отпустить кнопку МЗН-2",
            gateKeys: ["mznEngine"],
            completeWhen: (s) => !Boolean(s.mznEngine),
          },
          {
            id: "starter-pressed",
            title: "Нажать и удерживать кнопку СТАРТЕР",
            gateKeys: ["starter"],
            completeWhen: (s) => s.starter === 2,
          },
          {
            id: "epk-on",
            title: "Не отпуская кнопку СТАРТЕР, нажать кнопку ЭПК-48 (подача сжатого воздуха)",
            gateKeys: ["epk"],
            completeWhen: (s) => s.starter === 2 && Boolean(s.epk),
          },
          {
            id: "gas-pedal-press",
            title: "Через 2–3 секунды нажать и удерживать педаль подачи топлива (примерно 1/3 хода)",
            gateKeys: ["gasPedal", "fuelManualFeed"],
            completeWhen: (s) => (s.starter === 2 && Boolean(s.epk) && (Boolean(s.gasPedal) || s.fuelManualFeed >= 30)) || Boolean(s.engineRunning),
          },
          {
            id: "engine-started",
            title: "Дождаться пуска двигателя",
            auto: true,
            completeWhen: (s) => Boolean(s.engineRunning),
          },
          {
            id: "starter-and-epk-released",
            title: "Сразу после пуска отпустить кнопку СТАРТЕР и кнопку ЭПК-48",
            gateKeys: ["starter", "epk"],
            completeWhen: (s) => s.starter !== 2 && !Boolean(s.epk) && Boolean(s.engineRunning),
          },
          {
            id: "min-rpm-800",
            title: "Установить рукояткой ручной подачи топлива устойчивые обороты холостого хода (не менее 800 об/мин)",
            gateKeys: ["fuelManualFeed"],
            completeWhen: (s) => Boolean(s.engineRunning) && s.engine_rpm >= 800 && s.fuelManualFeed > 0 && !Boolean(s.gasPedal),
          }
        ]
      }
    ]
  };
}

export { getCombinedStart20CScenario };
