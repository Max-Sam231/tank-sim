/**
 * Подготовка к преодолению водной преграды по дну.
 *
 * Порядок здесь важнее скорости: незакрытые жалюзи или неустановленная
 * труба под водой уже не исправляются.
 *
 * ВНИМАНИЕ: состав и последовательность работ требуют сверки
 * с РЭ Т-72 и с программой подготовки.
 */
function getUnderwaterDrivingScenario() {
  return {
    id: "underwater-driving",
    title: "Преодоление водной преграды по дну (ОПВТ)",
    stages: [
      {
        id: "stage-opvt-preparation",
        title: "Подготовка машины",
        strict: false,
        steps: [
          {
            id: "opvt-seal-hull",
            title: "Загерметизировать корпус и башню",
            gateKeys: ["opvtSealed"],
            completeWhen: (s) => Boolean(s.opvtSealed),
          },
          {
            id: "opvt-install-pipe",
            title: "Установить воздухопитающую трубу",
            gateKeys: ["opvtPipeInstalled"],
            completeWhen: (s) => Boolean(s.opvtPipeInstalled),
          },
          {
            id: "opvt-seal-exhaust",
            title: "Загерметизировать выпускные патрубки",
            gateKeys: ["opvtExhaustSealed"],
            completeWhen: (s) => Boolean(s.opvtExhaustSealed),
          },
          {
            id: "opvt-check-pump",
            title: "Проверить работу водооткачивающего насоса",
            gateKeys: ["opvtPumpChecked"],
            completeWhen: (s) => Boolean(s.opvtPumpChecked),
          },
        ],
      },
      {
        id: "stage-opvt-entry-strict",
        title: "Вход в воду",
        strict: true,
        steps: [
          {
            id: "opvt-shutters-closed",
            title: "Закрыть жалюзи",
            gateKeys: ["shutters"],
            completeWhen: (s) => Number(s.shutters) === 0,
          },
          {
            id: "opvt-engine-running",
            title: "Убедиться, что двигатель работает устойчиво",
            auto: true,
            completeWhen: (s) => Boolean(s.engineRunning) && s.engine_rpm >= 800,
          },
          {
            id: "opvt-pump-on",
            title: "Включить водооткачивающий насос",
            gateKeys: ["opvtPumpOn"],
            completeWhen: (s) => Boolean(s.opvtPumpOn),
          },
          {
            id: "opvt-gear-low",
            title: "Включить низшую передачу",
            gateKeys: ["gearLever"],
            completeWhen: (s) => s.gearLever === "1" || s.gearLever === "2",
          },
        ],
      },
      {
        id: "stage-opvt-crossing-strict",
        title: "Движение по дну",
        strict: true,
        steps: [
          {
            id: "opvt-underwater",
            title: "Войти в воду и вести машину без остановок",
            auto: true,
            completeWhen: (s) => Number(s.water_depth_m) > 0 && Boolean(s.engineRunning),
          },
          {
            id: "opvt-no-flooding",
            title: "Следить за отсутствием поступления воды",
            auto: true,
            completeWhen: (s) => !s.is_flooding,
          },
          {
            id: "opvt-exit",
            title: "Выйти на берег",
            auto: true,
            completeWhen: (s) => Number(s.water_depth_m) === 0 && Boolean(s.engineRunning),
          },
        ],
      },
    ],
  };
}

export { getUnderwaterDrivingScenario };
