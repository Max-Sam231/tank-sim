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
      "battery-toggle": () => boolText(snapshot.isBatteryOn, "Выключатель батарей («Масса»): включен", "Выключатель батарей («Масса»): выключен"),
      "instrument-panel": () => "Щит контрольных приборов водителя",
      "left-tank": () => boolText(snapshot.leftTank, "Вентиль левого воздушного баллона открыт", "Вентиль левого воздушного баллона закрыт"),
      "right-tank": () => boolText(snapshot.rightTank, "Вентиль правого воздушного баллона открыт", "Вентиль правого воздушного баллона закрыт"),
      bcn: () => enumText(snapshot.bcn, { off: "Топливораспределительный кран: БАКИ ПЕРЕКРЫТЫ", on: "Топливораспределительный кран: БАКИ ВКЛЮЧЕНЫ", pump: "Топливораспределительный кран: ОТКАЧКА" }),
      shutters: () => enumText(snapshot.shutters, { 0: "Кулиса привода жалюзи: ЗАКРЫТО", 1: "Кулиса привода жалюзи: положение 1", 2: "Кулиса привода жалюзи: положение 2", 3: "Кулиса привода жалюзи: положение 3", 4: "Кулиса привода жалюзи: ОТКРЫТО" }),
      "fuel-primer-lever": () => `Рычаг ручного насоса РНМ-1: ${snapshot.fuelPrimerPumps} качаний`,
      "fuel-manual-feed": () => `Рукоятка ручной подачи топлива: ${snapshot.fuelManualFeed}%`,
      "gear-lever": () => enumText(snapshot.gearLever, { neutral: "Избиратель передач: нейтраль (Н)", 1: "Избиратель передач: 1-я передача", 2: "Избиратель передач: 2-я передача", 3: "Избиратель передач: 3-я передача", 4: "Избиратель передач: 4-я передача", 5: "Избиратель передач: 5-я передача", 6: "Избиратель передач: 6-я передача", 7: "Избиратель передач: 7-я передача", R: "Избиратель передач: задний ход (ЗХ)" }),
      "air-bleed-valve": () => boolText(snapshot.airBleedValve, "Клапан выпуска воздуха открыт", "Клапан выпуска воздуха закрыт"),
      azr: () => `Автоматы защиты сети (АЗР): положение ${snapshot.azr}`,
      epk: () => boolText(snapshot.epk, "Кнопка ЭПК-48 (пуск воздухом) нажата", "Кнопка ЭПК-48 отпущена"),
      horn: () => boolText(snapshot.horn, "Кнопка звукового сигнала нажата", "Кнопка звукового сигнала отпущена"),
      "mzn-engine": () => boolText(snapshot.mznEngine, "Кнопка «МЗН ДВИГАТЕЛЯ» включена", "Кнопка «МЗН ДВИГАТЕЛЯ» выключена"),
      "ammeter-button": () => boolText(snapshot.ammeterButton, "Кнопка вольтамперметра ВА-540 нажата (напряжение)", "Кнопка вольтамперметра ВА-540 отпущена (ток зарядки)"),
      "left-right-tanks": () => enumText(snapshot.leftRightTanks, { 0: "Переключатель баков ТМУ-23: ПРАВЫЕ БАКИ", 1: "Переключатель баков ТМУ-23: ЛЕВЫЕ БАКИ" }),
      "spark-plug": () => `Переключатель «СВЕЧА – МОТОР»: ${snapshot.sparkPlug === 2 ? "СВЕЧА" : snapshot.sparkPlug === 0 ? "МОТОР" : "ВЫКЛ"}`,
      "engine-start": () => `Выключатель «ПУСК МОТОРА»: ${snapshot.engineStart === 1 ? "ВЫКЛ" : "ВКЛ"}`,
      "emergency-hatch-rotation": () => boolText(snapshot.emergencyHatchRotation, "Аварийный поворот колпака командира включен", "Аварийный поворот колпака командира выключен"),
      "oil-pump-gearbox": () => boolText(snapshot.oilPumpGearbox, "Откачка масла из КП включена", "Откачка масла из КП выключена"),
      // Note: commander-call and air-intake are indicator lamps only (non-interactive)
      heating: () => boolText(snapshot.heating, "Обогрев боевого отделения («ОБОГРЕВ БО») включен", "Обогрев боевого отделения («ОБОГРЕВ БО») выключен"),
      combined: () => boolText(snapshot.combined, "Комбинированный пуск («КОМБИНИР.») включен", "Комбинированный пуск («КОМБИНИР.») выключен"),
      "left-lights": () => boolText(snapshot.leftLights, "Левые фары включены", "Левые фары выключены"),
      "right-lights": () => boolText(snapshot.rightLights, "Правые фары включены", "Правые фары выключены"),
      "gabrate-lights": () => boolText(snapshot.gabrateLights, "Габаритные огни: БОЛЬШОЙ СВЕТ", "Габаритные огни: МАЛЫЙ СВЕТ"),
      "lights-all": () => boolText(snapshot.lightsAll, "Габаритные огни: ВСЕ", "Габаритные огни: ТОЛЬКО ЗАДНИЕ"),
      "water-antifreeze": () => boolText(snapshot.waterAntifreeze, "Шкала термометра ОЖ: ВОДА", "Шкала термометра ОЖ: АНТИФРИЗ"),
      gpk: () => boolText(snapshot.gpk, "Питание гирополукомпаса (ГПК) включено", "Питание гирополукомпаса (ГПК) выключено"),
      "bca-tca": () => {
        if (snapshot.bcaTca === 0) return "Переключатель «ТДА – БЦН»: БЦН (насос подкачки)";
        if (snapshot.bcaTca === 1) return "Переключатель «ТДА – БЦН»: ВЫКЛ (нейтраль)";
        return "Переключатель «ТДА – БЦН»: ТДА (термодымовая аппаратура)";
      },
      "mzn-tow": () => `Кнопка «МЗН БУКСИРА»: положение ${snapshot.mznTow}`,
      starter: () => `Кнопка «СТАРТЕР»: положение ${snapshot.starter}`,
      "signal-lamps": () => `Кнопка «КОНТРОЛЬ СИГНАЛЬНЫХ ЛАМП»: положение ${snapshot.signalLamps}`,
      "cabin-light": () => boolText(snapshot.cabinLight, "Плафон дежурного освещения ПМВ-7 включен", "Плафон дежурного освещения ПМВ-7 выключен"),
      "brake-pedal": () => meta.released ? "Педаль остановочного тормоза отпущена" : "Педаль остановочного тормоза нажата",
      "gas-pedal": () => meta.released ? "Педаль подачи топлива отпущена" : "Педаль подачи топлива нажата",
      "engine-started": () => "Двигатель запущен",
    };

    return messages[action]?.() || null;
  }
}

export { ActionNotifier };
