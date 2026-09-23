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
 * Показывается только в отладочном режиме. Удаляется одной строкой в
 * main.js, как только появятся настоящие хитбоксы.
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
    title: "ТВНЕ",
    items: [{ action: "night-vision", label: "Режим прибора" }],
  },
  {
    title: "Рычаги",
    items: [
      { action: "left-lever", label: "Левый" },
      { action: "right-lever", label: "Правый" },
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

/** Вводные преподавателя — обстановка для отработки аварийных действий. */
const SCENARIO_INPUTS = [
  { label: "Пожар в МТО", apply: (state) => state.startFire(0.25) },
  { label: "Забить фильтр", apply: (state) => state.setAirFilterClogging(0.9) },
  { label: "Заражение", apply: (state) => state.setContaminated(true) },
  { label: "В воду (2 м)", apply: (state) => state.setWaterDepth(2) },
  { label: "На берег", apply: (state) => state.setWaterDepth(0) },
];

class SystemsTestPanel {
  constructor({ state, ui }) {
    this.state = state;
    this.ui = ui;

    this.rootEl = document.createElement("div");
    this.rootEl.className = "systems-test-panel";
    this.rootEl.innerHTML = this._buildHtml();
    document.body.appendChild(this.rootEl);

    this._wireEvents();
    this.state.subscribe((snapshot) => this._render(snapshot));
    this._render(this.state.getSnapshot());
  }

  _buildHtml() {
    const groups = GROUPS.map(
      (group) => `
        <div class="stp-group">
          <div class="stp-group-title">${group.title}</div>
          ${group.items
            .map(
              (item) =>
                `<button class="stp-btn" data-test-action="${item.action}">${item.label}</button>`,
            )
            .join("")}
        </div>
      `,
    ).join("");

    const inputs = SCENARIO_INPUTS.map(
      (input, idx) => `<button class="stp-btn stp-input" data-test-input="${idx}">${input.label}</button>`,
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

  _wireEvents() {
    this.rootEl.addEventListener("click", (event) => {
      const target = event.target;

      if (target.dataset.testToggle !== undefined) {
        this.rootEl.classList.toggle("is-collapsed");
        return;
      }

      const action = target.dataset.testAction;
      if (action) {
        runControlAction(action, this.ui._actionContext());
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

    const tvne = ["выкл", "пассивный", "активный"][snapshot.tvneMode] || "?";
    const lines = [
      `Пожар: ${(snapshot.fire_level * 100).toFixed(0)}%  баллонов: ${3 - snapshot.ppoCylindersUsed}`,
      `Наддув: ${snapshot.compartment_pressure.toFixed(0)} мм  ТВНЕ: ${tvne} ${snapshot.night_vision_range.toFixed(0)} м`,
      `Фильтр: ${(snapshot.airFilterClogging * 100).toFixed(0)}%  разрежение ${snapshot.air_filter_vacuum.toFixed(0)}`,
      `Курс: ${snapshot.heading_deg.toFixed(0)}°  ГПК: ${snapshot.gyro_heading_deg.toFixed(0)}°`,
      `Вода: глубина ${snapshot.water_depth_m} м  уровень ${(snapshot.water_level * 100).toFixed(0)}%`,
      `Охлаждение перед остановкой: ${(snapshot.cooldown_progress * 100).toFixed(0)}%`,
    ];

    const violations = snapshot.violations.length
      ? `<div class="stp-violations"><b>Нарушения (${snapshot.violations.length}):</b><br>${snapshot.violations.join("<br>")}</div>`
      : "";

    readout.innerHTML = `${lines.join("<br>")}${violations}`;
  }
}

export { SystemsTestPanel, GROUPS, SCENARIO_INPUTS };
