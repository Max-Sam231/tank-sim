function getHeaterWarmupScenario(ambientTemp = -20) {
  return {
    id: "heater-warmup",
    title: `Разогрев подогревателем: ${ambientTemp}°C, дизель`,
    stages: [
      {
        id: "stage-preparation-non-strict",
        title: "Подготовительные действия в кабине",
        strict: false,
        steps: [
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
            id: "battery-on",
            title: "Включить выключатель аккумуляторных батарей",
            gateKeys: ["isBatteryOn"],
            completeWhen: (s) => Boolean(s.isBatteryOn) && s.voltage >= 22 && s.voltage <= 26,
          }
        ]
      },
      {
        id: "stage-heater-hull-preparation",
        title: "Подготовка подогревателя снаружи машины",
        strict: true,
        steps: [
          {
            id: "latch-open",
            title: "Открыть три шпингалета лючка подогревателя",
            gateKeys: ["hingeLatch1", "hingeLatch2", "hingeLatch3"],
            completeWhen: (s) => Boolean(s.hingeLatch1) && Boolean(s.hingeLatch2) && Boolean(s.hingeLatch3),
          },
          {
            id: "panel-open",
            title: "Открыть борт лючка подогревателя",
            gateKeys: ["sidePanelOpen"],
            completeWhen: (s) => Boolean(s.sidePanelOpen),
          },
          {
            id: "unscrew-bolts",
            title: "Выкрутить два болта крышки выхлопа подогревателя",
            gateKeys: ["exhaustBolt1", "exhaustBolt2"],
            completeWhen: (s) => Boolean(s.exhaustBolt1) && Boolean(s.exhaustBolt2),
          },
          {
            id: "cover-remove",
            title: "Снять крышку выхлопа",
            gateKeys: ["exhaustCoverRemoved"],
            completeWhen: (s) => Boolean(s.exhaustCoverRemoved),
          },
          {
            id: "cap-install",
            title: "Установить козырек выхлопа",
            gateKeys: ["exhaustCapInstalled"],
            completeWhen: (s) => Boolean(s.exhaustCapInstalled),
          }
        ]
      },
      {
        id: "stage-heater-startup",
        title: "Запуск подогревателя",
        strict: true,
        steps: [
          {
            id: "valve-open",
            title: "В кабине командира открыть топливный кран подогревателя",
            gateKeys: ["heaterFuelValve"],
            completeWhen: (s) => Boolean(s.heaterFuelValve),
          },
          {
            id: "heating-on",
            title: "В кабине водителя установить переключатель ПОДОГРЕВАТЕЛЬ в положение ВКЛ",
            gateKeys: ["heating"],
            completeWhen: (s) => Boolean(s.heating),
          },
          {
            id: "spark-plug-on",
            title: "Установить переключатель СВЕЧА в положение СВЕЧА (влево)",
            gateKeys: ["sparkPlug"],
            completeWhen: (s) => Boolean(s.heating) && s.sparkPlug === 2,
          },
          {
            id: "heater-burning",
            title: "Дождаться воспламенения топлива в подогревателе",
            auto: true,
            completeWhen: (s) => Boolean(s.heaterBurning),
          },
          {
            id: "spark-plug-release",
            title: "Отпустить переключатель СВЕЧА (вернуть в среднее положение)",
            gateKeys: ["sparkPlug"],
            completeWhen: (s) => Boolean(s.heaterBurning) && s.sparkPlug === 1,
          }
        ]
      },
      {
        id: "stage-warmup-and-stop",
        title: "Разогрев и остановка",
        strict: true,
        steps: [
          {
            id: "engine-warmup",
            title: "Дождаться прогрева двигателя (жидкость ≥ 40 °C, масло ≥ 30 °C)",
            auto: true,
            completeWhen: (s) => s.coolant_temp >= 40 && s.oil_temp >= 30,
          },
          {
            id: "heating-off",
            title: "Выключить подогреватель (переключатель ПОДОГРЕВАТЕЛЬ в положение ВЫКЛ)",
            gateKeys: ["heating"],
            completeWhen: (s) => !Boolean(s.heating),
          },
          {
            id: "valve-close",
            title: "В кабине командира закрыть топливный кран подогревателя",
            gateKeys: ["heaterFuelValve"],
            completeWhen: (s) => !Boolean(s.heaterFuelValve),
          },
          {
            id: "cap-remove",
            title: "Снять козырек выхлопа подогревателя",
            gateKeys: ["exhaustCapInstalled"],
            completeWhen: (s) => !Boolean(s.exhaustCapInstalled),
          },
          {
            id: "cover-screw",
            title: "Закрутить крышку выхлопа подогревателя",
            gateKeys: ["exhaustCoverRemoved", "exhaustBolt1", "exhaustBolt2"],
            completeWhen: (s) => !Boolean(s.exhaustCoverRemoved) && !Boolean(s.exhaustBolt1) && !Boolean(s.exhaustBolt2),
          },
          {
            id: "panel-close",
            title: "Закрыть борт лючка подогревателя",
            gateKeys: ["sidePanelOpen", "hingeLatch1", "hingeLatch2", "hingeLatch3"],
            completeWhen: (s) => !Boolean(s.sidePanelOpen) && !Boolean(s.hingeLatch1) && !Boolean(s.hingeLatch2) && !Boolean(s.hingeLatch3),
          }
        ]
      }
    ]
  };
}

export { getHeaterWarmupScenario };
