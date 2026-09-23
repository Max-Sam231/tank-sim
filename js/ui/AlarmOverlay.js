/**
 * Аварийная сигнализация в кабине.
 *
 * Сигнальные лампы приборной панели пока не размечены на фоне, поэтому
 * пожар, перегрев и падение давления масла были видны только в отладочной
 * консоли — то есть курсанту никак. Эта накладка показывает аварии поверх
 * сцены, не завися от разметки.
 *
 * Когда лампы появятся на приборной панели, накладку можно оставить как
 * дублирующую или убрать — она подписана на состояние и ничего больше
 * не трогает.
 */

/** Аварии в порядке важности: первой показывается самая тяжёлая. */
const ALARMS = [
  {
    id: "fire",
    text: "ПОЖАР В МТО",
    isActive: (s) => Boolean(s.is_fire_detected),
    detail: (s) => `очаг ${(s.fire_level * 100).toFixed(0)}%, баллонов ${3 - s.ppoCylindersUsed}`,
  },
  {
    id: "flooding",
    text: "ПОСТУПЛЕНИЕ ВОДЫ",
    isActive: (s) => Boolean(s.is_flooding),
    detail: (s) => `уровень ${(s.water_level * 100).toFixed(0)}%`,
  },
  {
    id: "oil",
    text: "АВАРИЙНОЕ ДАВЛЕНИЕ МАСЛА",
    isActive: (s) => Boolean(s.lamp_oil_pressure_alarm) && Boolean(s.engineRunning),
    detail: (s) => `${s.oil_pressure_engine.toFixed(1)} кгс/см²`,
  },
  {
    id: "overheat",
    text: "ПЕРЕГРЕВ",
    isActive: (s) => Boolean(s.lamp_overheat),
    detail: (s) => `ОЖ ${s.coolant_temp.toFixed(0)} °C, масло ${s.oil_temp.toFixed(0)} °C`,
  },
  {
    id: "fuel",
    text: "РЕЗЕРВ ТОПЛИВА",
    isActive: (s) => Boolean(s.lamp_fuel_reserve),
    detail: (s) => `${s.fuel_level_internal.toFixed(0)} л во внутренних баках`,
  },
];

/** Какие аварии активны прямо сейчас. */
function activeAlarms(snapshot) {
  // Проверка ламп зажигает всё разом — это не аварии, а исправность
  if (Number(snapshot.signalLamps) === 2) return [];

  return ALARMS.filter((alarm) => alarm.isActive(snapshot));
}

class AlarmOverlay {
  constructor({ state, rootEl = document.body }) {
    this.state = state;

    this.rootEl = document.createElement("div");
    this.rootEl.className = "alarm-overlay";
    this.rootEl.setAttribute("role", "status");
    this.rootEl.hidden = true;
    rootEl.appendChild(this.rootEl);

    this.state.subscribe((snapshot) => this.render(snapshot));
    this.render(this.state.getSnapshot());
  }

  render(snapshot) {
    const alarms = activeAlarms(snapshot);

    this.rootEl.hidden = alarms.length === 0;
    if (alarms.length === 0) return;

    this.rootEl.innerHTML = alarms
      .map(
        (alarm) => `
          <div class="alarm-item alarm-${alarm.id}">
            <span class="alarm-text">${alarm.text}</span>
            <span class="alarm-detail">${alarm.detail(snapshot)}</span>
          </div>
        `,
      )
      .join("");
  }
}

export { AlarmOverlay, ALARMS, activeAlarms };
