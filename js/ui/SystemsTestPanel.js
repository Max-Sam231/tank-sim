import { CONTROL_ACTIONS, runControlAction } from "./controlActions.js";

/**
 * Временная панель для проверки систем, у которых ещё нет хитбоксов.
 *
 * Новые органы управления (механизм остановки, ППО, ФВУ, ТВНЕ, рычаги,
 * ОПВТ) описаны в таблице действий, но полигоны на фоне для них пока не
 * размечены — их должен поставить тот, кто видит картинку. Пока этого нет,
 * панель даёт кнопки на те же действия, чтобы поведение можно было
 * проверить в приложении, а не только в тестах.
 *
 * Управляется флагом SHOW_TEST_PANEL в main.js и не зависит от режима
 * отладки: включать ради неё отрисовку хитбоксов не нужно. Удаляется
 * одной строкой, как только появятся настоящие полигоны.
 */
const GROUPS = [
  {
    title: "Двигатель",
    items: [{ action: "engine-stop", label: "Остановить (МОД)" }],
  },
  {
    title: "ППО",
    items: [
      { action: "ppo-mode", label: "Авто / ручной" },
      { action: "ppo-discharge", label: "Разрядить баллон" },
    ],
  },
  {
    title: "ФВУ и ПАЗ",
    items: [
      { action: "blower", label: "Нагнетатель" },
      { action: "filter-mode", label: "Через фильтр" },
      { action: "paz-mode", label: "ПАЗ авто / ручной" },
    ],
  },
  {
    title: "ОПВТ",
    items: [
      { action: "opvt-seal", label: "Герметизация" },
      { action: "opvt-pipe", label: "Труба" },
      { action: "opvt-exhaust-seal", label: "Выпуск" },
      { action: "opvt-pump-check", label: "Проверка насоса" },
      { action: "opvt-pump", label: "Насос" },
    ],
  },
];

/**
 * Ставит машину в «двигатель работает и прогрет» одним нажатием.
 *
 * Обычный пуск занимает минуты: прокачка масла, топлива, прокрутка.
 * Для проверки систем это лишнее ожидание, поэтому здесь состояние
 * выставляется напрямую. Только для панели отладки — в занятии
 * двигатель запускают по алгоритму.
 */
function quickStartEngine(state) {
  state.setScenario({ startMethod: "electric-start", ambientTempC: 20, fuelType: "diesel" });
  state.setGearLever("neutral");

  if (!state.isBatteryOn) state.toggleBattery();
  if (!state.leftTank) state.toggleLeftTank();
  if (!state.rightTank) state.toggleRightTank();
  state.setBcnMode("on");
  state.setShutters("4");

  for (let i = 0; i < 4; i += 1) state.pumpFuelPrimerLever();
  state.setFuelManualFeed(30);

  // Прогретый двигатель на холостом ходу
  state._engineRunning = true;
  state._engineRunTime = 60;
  state._oilPrimed = true;
  state.sensors.fuel_pressure = 1.8;
  state.sensors.oil_pressure_engine = 5.5;
  state.sensors.coolant_temp = 85;
  state.sensors.oil_temp = 90;

  state._emit();
}

/** Вводные преподавателя — обстановка для отработки аварийных действий. */
const SCENARIO_INPUTS = [
  { label: "Завести и прогреть", apply: quickStartEngine },
  { label: "Пожар в МТО", apply: (state) => state.startFire(0.25) },
  { label: "Забить фильтр", apply: (state) => state.setAirFilterClogging(0.9) },
  { label: "Заражение", apply: (state) => state.setContaminated(true) },
  { label: "В воду (2 м)", apply: (state) => state.setWaterDepth(2) },
  { label: "На берег", apply: (state) => state.setWaterDepth(0) },
  { label: "Сброс обстановки", apply: (state) => state.clearIncidents() },
];

class SystemsTestPanel {
  constructor({ state, ui }) {
    this.state = state;
    this.ui = ui;

    this.rootEl = document.createElement("div");
    // Свёрнута по умолчанию: панель вспомогательная и не должна мешать сцене
    this.rootEl.className = "systems-test-panel is-collapsed";
    this.rootEl.innerHTML = this._buildHtml();
    document.body.appendChild(this.rootEl);

    this._wireEvents();
    this._followStartMenu();
    this.state.subscribe((snapshot) => this._render(snapshot));
    this._render(this.state.getSnapshot());
  }

  _buildHtml() {
    const groups = GROUPS.map(
      (group, groupIdx) => `
        <div class="stp-group">
          <div class="stp-group-title">${group.title}</div>
          ${group.items
            .map(
              (item, itemIdx) =>
                `<button class="stp-btn" data-test-item="${groupIdx}:${itemIdx}">${item.label}</button>`,
            )
            .join("")}
        </div>
      `,
    ).join("");

    const inputs = SCENARIO_INPUTS.map(
      (input, idx) => `<button class="stp-btn ${/^(Сброс|Завести)/.test(input.label) ? "stp-reset" : "stp-input"}" data-test-input="${idx}">${input.label}</button>`,
    ).join("");

    return `
      <div class="stp-header">
        <span>Проверка систем</span>
        <button class="stp-toggle" data-test-toggle type="button">–</button>
      </div>
      <div class="stp-body">
        ${groups}
        <div class="stp-group">
          <div class="stp-group-title">Вводные</div>
          ${inputs}
        </div>
        <div class="stp-readout" data-test-readout></div>
      </div>
    `;
  }

  /**
   * Прячет панель, пока открыто стартовое меню: там свои кнопки, и
   * перекрывать их нечем. Слежение за классом, а не вызовы из main.js —
   * меню показывают и скрывают из полудюжины мест.
   */
  _followStartMenu() {
    const menuEl = document.getElementById("startMenuContainer");
    if (!menuEl) return;

    const sync = () => {
      const isMenuOpen = !menuEl.classList.contains("is-hidden");
      this.rootEl.hidden = isMenuOpen;
    };

    new MutationObserver(sync).observe(menuEl, {
      attributes: true,
      attributeFilter: ["class"],
    });

    sync();
  }

  _wireEvents() {
    this.rootEl.addEventListener("click", (event) => {
      const target = event.target;

      if (target.dataset.testToggle !== undefined) {
        this.rootEl.classList.toggle("is-collapsed");
        return;
      }

      const itemRef = target.dataset.testItem;
      if (itemRef) {
        const [groupIdx, itemIdx] = itemRef.split(":").map(Number);
        const item = GROUPS[groupIdx].items[itemIdx];

        if (item.run) item.run(this.state);
        else runControlAction(item.action, this.ui._actionContext());
        return;
      }

      const inputIdx = target.dataset.testInput;
      if (inputIdx !== undefined) SCENARIO_INPUTS[Number(inputIdx)].apply(this.state);
    });
  }

  /** Короткая сводка по системам плюс журнал нарушений. */
  _render(snapshot) {
    const readout = this.rootEl.querySelector("[data-test-readout]");
    if (!readout) return;

    const engine = snapshot.engineRunning
      ? `работает ${snapshot.engine_rpm.toFixed(0)} об/мин`
      : "не работает";

    const lines = [
      `Двигатель: ${engine}  ОЖ ${snapshot.coolant_temp.toFixed(0)} °C  скорость ${snapshot.speed_kmh.toFixed(0)} км/ч`,
      `Пожар: ${(snapshot.fire_level * 100).toFixed(0)}%  баллонов: ${3 - snapshot.ppoCylindersUsed}`,
      `Наддув: ${snapshot.compartment_pressure.toFixed(0)} мм`,
      `Фильтр: ${(snapshot.airFilterClogging * 100).toFixed(0)}%  разрежение ${snapshot.air_filter_vacuum.toFixed(0)}`,
      `Вода: глубина ${snapshot.water_depth_m} м  уровень ${(snapshot.water_level * 100).toFixed(0)}%`,
      `Охлаждение перед остановкой: ${(snapshot.cooldown_progress * 100).toFixed(0)}%`,
    ];

    const noCylinders = snapshot.ppoCylindersUsed >= 3 && snapshot.fire_level > 0;
    const warning = noCylinders
      ? `<div class="stp-violations">Баллоны израсходованы — пожар не потушить. «Сброс обстановки».</div>`
      : "";

    const violations = snapshot.violations.length
      ? `<div class="stp-violations"><b>Нарушения (${snapshot.violations.length}):</b><br>${snapshot.violations.join("<br>")}</div>`
      : "";

    readout.innerHTML = `${lines.join("<br>")}${warning}${violations}`;
  }
}

export { SystemsTestPanel, GROUPS, SCENARIO_INPUTS };
