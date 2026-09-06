class ActionNotifier {
  constructor({ rootEl, displayMs = 2200 } = {}) {
    this.rootEl = rootEl || document.body;
    this.displayMs = displayMs;
    this._timerId = null;
    this._el = document.createElement("div");
    this._el.className = "action-notifier";
    this._el.setAttribute("aria-live", "polite");
    this._el.setAttribute("role", "status");
    this.rootEl.appendChild(this._el);
  }

  notify(action, snapshot = {}, meta = {}) {
    const message = this._getMessage(action, snapshot, meta);
    if (!message) return;

    this._el.textContent = message;
    this._el.classList.add("is-visible");

    window.clearTimeout(this._timerId);
    this._timerId = window.setTimeout(() => {
      this._el.classList.remove("is-visible");
    }, this.displayMs);
  }

  _getMessage(action, snapshot, meta) {
    const boolText = (value, onText, offText) => (value ? onText : offText);
    const enumText = (value, labels) => labels[String(value)] || null;

    const messages = {
      "battery-toggle": () => boolText(snapshot.isBatteryOn, "Включена масса", "Выключена масса"),
      "instrument-panel": () => "Открыта приборная панель",
      "left-tank": () => boolText(snapshot.leftTank, "Открыт левый баллон", "Закрыт левый баллон"),
      "right-tank": () => boolText(snapshot.rightTank, "Открыт правый баллон", "Закрыт правый баллон"),
      bcn: () => enumText(snapshot.bcn, { off: "БЦН выключен", on: "БЦН включен", pump: "БЦН переведен на откачку" }),
      shutters: () => enumText(snapshot.shutters, { 0: "Жалюзи закрыты", 1: "Жалюзи в промежуточном состоянии", 2: "Жалюзи в промежуточном состоянии", 3: "Жалюзи в промежуточном состоянии", 4: "Жалюзи открыты" }),
      "fuel-primer-lever": () => `Рычаг прокачки: ${snapshot.fuelPrimerPumps} качаний`,
      "fuel-manual-feed": () => `Ручная подача топлива: ${snapshot.fuelManualFeed}%`,
      "gear-lever": () => enumText(snapshot.gearLever, { neutral: "Передача: нейтраль", 1: "Включена 1-я передача", 2: "Включена 2-я передача", 3: "Включена 3-я передача", 4: "Включена 4-я передача", 5: "Включена 5-я передача", 6: "Включена 6-я передача", 7: "Включена 7-я передача", R: "Включена задняя передача" }),
      "air-bleed-valve": () => boolText(snapshot.airBleedValve, "Кран выпуска воздуха открыт", "Кран выпуска воздуха закрыт"),
      azr: () => `АЗР переключен в положение ${snapshot.azr}`,
      epk: () => boolText(snapshot.epk, "ЭПК включен", "ЭПК выключен"),
      horn: () => boolText(snapshot.horn, "Звуковой сигнал включен", "Звуковой сигнал выключен"),
      "mzn-engine": () => boolText(snapshot.mznEngine, "МЗН двигателя включен", "МЗН двигателя выключен"),
      "ammeter-button": () => boolText(snapshot.ammeterButton, "Кнопка вольтамперметра нажата", "Кнопка вольтамперметра отпущена"),
      "left-right-tanks": () => enumText(snapshot.leftRightTanks, { 0: "Топливомер: правые баки", 1: "Топливомер: левые баки" }),
      "spark-plug": () => `Свеча накаливания: положение ${snapshot.sparkPlug}`,
      "engine-start": () => `Переключатель запуска двигателя: положение ${snapshot.engineStart}`,
      "emergency-hatch-rotation": () => boolText(snapshot.emergencyHatchRotation, "Поворот аварийного люка включен", "Поворот аварийного люка выключен"),
      "oil-pump-gearbox": () => boolText(snapshot.oilPumpGearbox, "Маслозакачивающий насос КП включен", "Маслозакачивающий насос КП выключен"),
      // Note: commander-call and air-intake are indicator lamps only (non-interactive)
      heating: () => boolText(snapshot.heating, "Обогрев БО включен", "Обогрев БО выключен"),
      combined: () => boolText(snapshot.combined, "Комбинированный режим включен", "Комбинированный режим выключен"),
      "left-lights": () => boolText(snapshot.leftLights, "Левые фары включены", "Левые фары выключены"),
      "right-lights": () => boolText(snapshot.rightLights, "Правые фары включены", "Правые фары выключены"),
      "gabrate-lights": () => boolText(snapshot.gabrateLights, "Габаритные огни включены", "Габаритные огни выключены"),
      "lights-all": () => boolText(snapshot.lightsAll, "Все огни включены", "Все огни выключены"),
      "water-antifreeze": () => boolText(snapshot.waterAntifreeze, "Используется вода", "Используется антифриз"),
      gpk: () => boolText(snapshot.gpk, "ГПК включен", "ГПК выключен"),
      "bca-tca": () => {
        if (snapshot.bcaTca === 0) return "БЦН включен";
        if (snapshot.bcaTca === 1) return "БЦН/ТДА выключено";
        return "ТДА включен";
      },
      "mzn-tow": () => `МЗН буксировки: положение ${snapshot.mznTow}`,
      starter: () => `Стартер: положение ${snapshot.starter}`,
      "signal-lamps": () => `Сигнальные лампы: положение ${snapshot.signalLamps}`,
      "cabin-light": () => boolText(snapshot.cabinLight, "Освещение кабины включено", "Освещение кабины выключено"),
      "brake-pedal": () => meta.released ? "Педаль тормоза отпущена" : "Педаль тормоза нажата",
      "gas-pedal": () => meta.released ? "Педаль газа отпущена" : "Педаль газа нажата",
      "engine-started": () => "Танк завёлся",
    };

    return messages[action]?.() || null;
  }
}

export { ActionNotifier };
