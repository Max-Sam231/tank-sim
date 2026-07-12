function getPreparationToStart20CScenario() {
  return {
    id: "prestart-preparation@20",
    title: "Подготовка к пуску: +20°C, дизель",
    steps: [
      {
        id: "control-inspection",
        title: "Произвести контрольный осмотр машины",
        auto: true,
        completeWhen: () => true,
      },
      {
        id: "air-cylinders-open",
        title: "Открыть вентили воздушных баллонов и проверить давление не ниже 75 кгс/см²",
        gateKeys: ["leftTank", "rightTank"],
        completeWhen: (s) => Boolean(s.leftTank) && Boolean(s.rightTank) && s.air_left_cylinder >= 75 && s.air_right_cylinder >= 75,
      },
      {
        id: "manual-fuel-zero",
        title: "Убедиться, что рукоятка ручной подачи топлива находится в положении нулевой подачи",
        auto: true,
        completeWhen: (s) => Number(s.fuelManualFeed) === 0,
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
      },
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
        id: "warning-signal",
        title: "Дать предупредительный сигнал",
        gateKeys: ["horn"],
        completeWhen: (s) => Boolean(s.horn),
      },
    ],
  };
}

export { getPreparationToStart20CScenario };
