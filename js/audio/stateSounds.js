/**
 * Какие изменения состояния чем озвучиваются.
 *
 * Раньше это были два десятка почти одинаковых блоков «если поле
 * изменилось — сыграть звук» плюс трижды повторённый список наблюдаемых
 * полей. Теперь наблюдаемые поля выводятся из самой таблицы.
 *
 * Виды записей:
 *   change  — звук на любое изменение значения
 *   enter   — значение стало истинным (или совпало с `is`)
 *   exit    — значение перестало быть истинным
 *   stopOnExit — какой зацикленный звук остановить при выходе
 *   onEnter — произвольное действие, когда звука мало
 */

/** Кнопки: короткий щелчок на любое нажатие. */
const CLICK_KEYS = [
  "isBatteryOn",
  "azr",
  "ammeterButton",
  "emergencyHatchRotation",
  "oilPumpGearbox",
];

/** Тумблеры и рычажки: звук перекидывания. */
const SWITCH_KEYS = [
  "bcaTca",
  "gpk",
  "lightsAll",
  "gabrateLights",
  "leftLights",
  "rightLights",
  "sparkPlug",
  "engineStart",
  "combined",
  "heating",
  "waterAntifreeze",
];

const STATE_SOUNDS = [
  { key: "horn", enter: "horn", stopOnExit: "horn" },
  { key: "commanderView", change: "hatch" },
  { key: "instrumentPanel", change: "panel" },

  // БЦН в режиме откачки гудит, пока включён
  { key: "bcn", is: "pump", enter: "fuel_pump", stopOnExit: "fuel_pump" },

  { key: "leftTank", enter: "valveOpen", exit: "valveClose" },
  { key: "rightTank", enter: "valveOpen", exit: "valveClose" },

  {
    key: "airBleedValve",
    enter: "valveOpen",
    exit: "valveClose",
    stopOnExit: "airHiss",
    // Шипение только если давление есть и баллоны действительно открыты
    onEnter: (audio, state) => {
      const hasPressure = state.air_start_pressure > 5.0;
      const isTankOpen = state.leftTank || state.rightTank;
      if (hasPressure && isTankOpen) audio.play("airHiss");
    },
  },

  ...CLICK_KEYS.map((key) => ({ key, change: "click" })),
  ...SWITCH_KEYS.map((key) => ({ key, change: "switch" })),
];

/** Поля состояния, за которыми следит звук. */
const WATCHED_KEYS = [
  ...new Set([...STATE_SOUNDS.map((rule) => rule.key), "air_start_pressure"]),
];

/**
 * Состояние «по умолчанию» — исходные положения органов управления.
 *
 * С него начинается сравнение и к нему возвращаются после остановки всех
 * звуков. Пустой объект не годится: тогда при следующем снимке каждое
 * ненулевое положение выглядело бы как изменение и сыпались бы щелчки.
 */
const INITIAL_SOUND_STATE = Object.freeze({
  commanderView: "straight",
  bcn: "off",
  azr: 0,
  sparkPlug: 1,
  engineStart: 1,
  air_start_pressure: 0,
  horn: false,
  instrumentPanel: false,
  isBatteryOn: false,
  leftTank: false,
  rightTank: false,
  airBleedValve: false,
  ammeterButton: false,
  emergencyHatchRotation: false,
  oilPumpGearbox: false,
  bcaTca: false,
  gpk: false,
  lightsAll: false,
  gabrateLights: false,
  leftLights: false,
  rightLights: false,
  combined: false,
  heating: false,
  waterAntifreeze: false,
});

/**
 * Проигрывает звуки, соответствующие переходу между двумя состояниями.
 * @param {{play: Function, stop: Function}} audio
 */
function playStateSounds(audio, state, prevState) {
  for (const rule of STATE_SOUNDS) {
    const now = state[rule.key];
    const before = prevState[rule.key];
    if (now === before) continue;

    if (rule.change) {
      audio.play(rule.change);
      continue;
    }

    // Для правил с `is` переходом считается совпадение с заданным значением
    const isNowOn = rule.is === undefined ? Boolean(now) : now === rule.is;
    const wasOn = rule.is === undefined ? Boolean(before) : before === rule.is;
    if (isNowOn === wasOn) continue;

    if (isNowOn) {
      if (rule.enter) audio.play(rule.enter);
      rule.onEnter?.(audio, state);
    } else {
      if (rule.exit) audio.play(rule.exit);
      if (rule.stopOnExit) audio.stop(rule.stopOnExit);
    }
  }
}

export { STATE_SOUNDS, WATCHED_KEYS, INITIAL_SOUND_STATE, playStateSounds };
