/**
 * Таблица действий органов управления кабины и приборной панели.
 *
 * Ключ — значение data-action у хитбокса или спрайта в разметке.
 * Раньше это был switch на сорок с лишним ветвей внутри _wireEvents;
 * теперь новый орган управления добавляется одной строкой здесь.
 *
 * Поля описания:
 *   call   — имя метода TankState, вызываемого без аргументов
 *   modal  — имя модального окна вместо изменения состояния
 *   run    — произвольный обработчик ({ state, modals, ui }) для сложных случаев
 *   notify — сообщать ли о действии через ActionNotifier (по умолчанию да)
 *
 * Действия только для наведения (манометр, приборы) в таблице не нужны.
 */
const CONTROL_ACTIONS = {
  // --- Кабина механика-водителя -------------------------------------------
  "battery-toggle": { call: "toggleBattery" },
  "left-tank": { call: "toggleLeftTank" },
  "right-tank": { call: "toggleRightTank" },
  "fuel-primer-lever": { call: "pumpFuelPrimerLever" },
  "air-bleed-valve": { call: "toggleAirBleedValve" },
  "cabin-light": { call: "toggleCabinLight" },

  // Механизм остановки двигателя: глушить снятием массы нельзя
  "engine-stop": { run: ({ state }) => state.stopEngine() },

  // Противопожарное оборудование
  "ppo-mode": { call: "togglePpoMode" },
  "ppo-discharge": { run: ({ state }) => state.dischargePpo() },

  // Фильтровентиляционная установка и защита от ОМП
  "blower": { call: "toggleBlower" },
  "filter-mode": { call: "toggleFilterMode" },
  "paz-mode": { call: "togglePazMode" },

  // Оборудование подводного вождения
  "opvt-seal": { call: "toggleOpvtSealed" },
  "opvt-pipe": { call: "toggleOpvtPipe" },
  "opvt-exhaust-seal": { call: "toggleOpvtExhaustSeal" },
  "opvt-pump-check": { call: "toggleOpvtPumpCheck" },
  "opvt-pump": { call: "toggleOpvtPump" },

  "instrument-panel": {
    run: ({ state, ui }) => {
      ui.showInstrumentPanel();
      state.setInstrumentPanelOpen(true);
    },
  },

  // --- Органы с выбором положения (открывают модальное окно) --------------
  bcn: { modal: "bcn", notify: false },
  shutters: { modal: "shutters", notify: false },
  "gear-lever": { modal: "gear", notify: false },
  "fuel-manual-feed": { modal: "fuelFeed" },

  // --- Приборная панель ----------------------------------------------------
  azr: { call: "cycleAzr" },
  epk: { call: "toggleEpk" },
  horn: { call: "toggleHorn" },
  "mzn-engine": { call: "toggleMznEngine" },
  "ammeter-button": { call: "toggleAmmeterButton" },
  "left-right-tanks": { call: "cycleLeftRightTanks" },
  "spark-plug": { call: "cycleSparkPlug" },
  "engine-start": { call: "cycleEngineStart" },
  "emergency-hatch-rotation": { call: "toggleEmergencyHatchRotation" },
  "oil-pump-gearbox": { call: "toggleOilPumpGearbox" },
  heating: { call: "toggleHeating" },
  combined: { call: "toggleCombined" },
  "water-antifreeze": { call: "toggleWaterAntifreeze" },
  gpk: { call: "toggleGpk" },
  "bca-tca": { call: "cycleBcaTca" },
  "mzn-tow": { call: "cycleMznTow" },
  starter: { call: "cycleStarter" },
  "signal-lamps": { call: "cycleSignalLamps" },

  // --- Свет ----------------------------------------------------------------
  "left-lights": { call: "toggleLeftLights" },
  "right-lights": { call: "toggleRightLights" },
  "gabrate-lights": { call: "toggleGabrateLights" },
  "lights-all": { call: "toggleLightsAll" },
};

/**
 * Педали: работают на удержание, а не на клик.
 * Отпускаются вместе, когда курсор уходит со сцены или отпускается кнопка.
 */
const PEDAL_ACTIONS = {
  "brake-pedal": "setBrakePressed",
  "gas-pedal": "setGasPedal",
};

/**
 * Выполняет действие по его data-action.
 * @returns {boolean} было ли действие найдено в таблице
 */
function runControlAction(action, ctx) {
  const def = CONTROL_ACTIONS[action];
  if (!def) return false;

  if (def.call) ctx.state[def.call]();
  if (def.modal) ctx.modals.open(def.modal);
  if (def.run) def.run(ctx);

  if (def.notify !== false) ctx.notify(action);
  return true;
}

export { CONTROL_ACTIONS, PEDAL_ACTIONS, runControlAction };
