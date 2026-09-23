/**
 * Текстовая панель состояния сбоку от сцены.
 *
 * Два режима. Курсанту показываются только показания приборов по-русски.
 * В отладочном режиме — полный дамп состояния, включая органы управления,
 * лампы и координаты последнего клика в системе координат SVG.
 */

/** Число с заданной точностью; прочерк вместо NaN. */
function safeFixed(value, digits) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

/** Целое число; прочерк вместо NaN. */
function safeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : "-";
}

/** Показания приборов для курсанта. */
function studentLines(snapshot) {
  return [
      "ПРИБОРЫ",
      `Давление воздуха (лев.):  ${safeFixed(snapshot.air_left_cylinder, 1)} кгс/см²`,
      `Давление воздуха (прав.): ${safeFixed(snapshot.air_right_cylinder, 1)} кгс/см²`,
      `Давление пуска (воздух): ${safeFixed(snapshot.air_start_pressure, 1)} кгс/см²`,
      `Обороты двигателя:        ${safeInt(snapshot.engine_rpm)} об/мин`,
      `Давление масла (двиг.):   ${safeFixed(snapshot.oil_pressure_engine, 1)} кгс/см²`,
      `Давление масла (КПП):     ${safeFixed(snapshot.oil_pressure_gearbox, 1)} кгс/см²`,
      `Давление топлива:         ${safeFixed(snapshot.fuel_pressure, 1)} кгс/см²`,
      `Температура ОЖ:           ${safeInt(snapshot.coolant_temp)} °C`,
      `Температура масла:        ${safeInt(snapshot.oil_temp)} °C`,
      `Напряжение бортсети:      ${safeFixed(snapshot.voltage, 1)} В`,
      `Скорость:                ${safeFixed(snapshot.speed_kmh, 1)} км/ч`,
      `Топливо (внутр.):         ${safeFixed(snapshot.fuel_level_internal, 0)} л`,
      `Топливо (наруж.):         ${safeFixed(snapshot.fuel_level_external, 0)} л`,
  ];
}

/** Полный дамп состояния для разработки. */
function debugLines(snapshot, { lastAction, hitboxVisible, lastClick }) {
  const lines = [
    "TankState",
    `battery: ${snapshot.isBatteryOn ? "ON" : "OFF"}`,
    `brake:   ${snapshot.isBrakePressed ? "PRESSED" : "RELEASED"}`,
    `gas:     ${snapshot.gasPedal ? "PRESSED" : "RELEASED"}`,
    `last:    ${lastAction || "-"}`,
    "",
    "Controls:",
    `manometer: ${snapshot.manometer > 0 ? snapshot.manometer + " kg/cm²" : "0 kg/cm²"}`,
    `left tank: ${snapshot.leftTank ? "ON" : "OFF"}`,
    `right tank: ${snapshot.rightTank ? "ON" : "OFF"}`,
    `BCN: ${snapshot.bcn.toUpperCase()}`,
    `shutters: ${snapshot.shutters}/4`,
    `fuel primer pumps: ${snapshot.fuelPrimerPumps}`,
    `fuel feed: ${snapshot.fuelManualFeed}%`,
    `gear: ${snapshot.gearLever}`,
    `air bleed: ${snapshot.airBleedValve ? "OPEN" : "CLOSED"}`,
    `AZR: ${snapshot.azr}`,
    `EPK: ${snapshot.epk ? "ON" : "OFF"}`,
    `HORN: ${snapshot.horn ? "ON" : "OFF"}`,
    `MZN engine: ${snapshot.mznEngine ? "ON" : "OFF"}`,
    `ammeter button: ${snapshot.ammeterButton ? "ON" : "OFF"}`,
    `left-right-tanks: ${snapshot.leftRightTanks}`,
    `spark-plug: ${snapshot.sparkPlug}`,
    `engine-start: ${snapshot.engineStart}`,
    `emergency-hatch-rotation: ${snapshot.emergencyHatchRotation ? "ON" : "OFF"}`,
    `oil-pump-gearbox: ${snapshot.oilPumpGearbox ? "ON" : "OFF"}`,
    // Note: commander-call and air-intake are now in lamps section
    `heating: ${snapshot.heating ? "ON" : "OFF"}`,
    `combined: ${snapshot.combined ? "ON" : "OFF"}`,
    `left-lights: ${snapshot.leftLights ? "ON" : "OFF"}`,
    `right-lights: ${snapshot.rightLights ? "ON" : "OFF"}`,
    `gabrate-lights: ${snapshot.gabrateLights ? "ON" : "OFF"}`,
    `lights-all: ${snapshot.lightsAll ? "ON" : "OFF"}`,
    `water-antifreeze: ${snapshot.waterAntifreeze ? "ON" : "OFF"}`,
    `gpk: ${snapshot.gpk ? "ON" : "OFF"}`,
    `bca-tca: ${snapshot.bcaTca === 0 ? "БЦН" : snapshot.bcaTca === 1 ? "OFF" : "ТДА"}`,
    `mzn-tow: ${snapshot.mznTow}`,
    `starter: ${snapshot.starter}`,
    `signal-lamps: ${snapshot.signalLamps}`,
    "",
    "Sensors:",
    `air L: ${snapshot.air_left_cylinder.toFixed(1)} kg/cm²`,
    `air R: ${snapshot.air_right_cylinder.toFixed(1)} kg/cm²`,
    `air start: ${snapshot.air_start_pressure.toFixed(1)} kg/cm²`,
    `rpm: ${snapshot.engine_rpm}`,
    `oil eng: ${snapshot.oil_pressure_engine.toFixed(1)} kg/cm²`,
    `oil kpp: ${snapshot.oil_pressure_gearbox.toFixed(1)} kg/cm²`,
    `fuel p: ${snapshot.fuel_pressure.toFixed(1)} kg/cm²`,
    `coolant: ${snapshot.coolant_temp.toFixed(0)}°C`,
    `oil t: ${snapshot.oil_temp.toFixed(0)}°C`,
    `voltage: ${snapshot.voltage.toFixed(1)} V`,
    `speed: ${snapshot.speed_kmh.toFixed(1)} km/h`,
    "",
    "Lamps:",
    `charge: ${snapshot.lamp_battery_charge ? "ON" : "OFF"}`,
    `oil alarm: ${snapshot.lamp_oil_pressure_alarm ? "ON" : "OFF"}`,
    `overheat: ${snapshot.lamp_overheat ? "ON" : "OFF"}`,
    `fuel reserve: ${snapshot.lamp_fuel_reserve ? "ON" : "OFF"}`,
    `gear: ${snapshot.lamp_gear_engaged ? "ON" : "OFF"}`,
    `cmdr call: ${snapshot.lamp_commander_call ? "ON" : "OFF"}`,
    `air intake: ${snapshot.lamp_air_intake ? "ON" : "OFF"}`,
    "",
    `hitbox:  ${hitboxVisible ? "VISIBLE" : "HIDDEN"}`,
    "[H] toggle",
  ];

  if (lastClick) {
    lines.push("");
    lines.push("Pointer (SVG coords)");
    lines.push(`client: ${lastClick.clientX}, ${lastClick.clientY}`);
    lines.push(`viewBox: ${lastClick.vbX}, ${lastClick.vbY}`);
  }

  return lines;
}

/**
 * Перерисовывает панель состояния.
 * @param {Element|null} consoleEl контейнер панели; без него ничего не делает
 * @param {object} snapshot снимок TankState
 * @param {{isDebug: boolean, lastAction: string|null, hitboxVisible: boolean, lastClick: object|null}} options
 */
function renderStatusConsole(consoleEl, snapshot, options) {
  if (!consoleEl) return;

  const lines = options.isDebug ? debugLines(snapshot, options) : studentLines(snapshot);
  consoleEl.textContent = lines.join("\n");
}

export { renderStatusConsole };
