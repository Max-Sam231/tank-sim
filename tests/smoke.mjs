/**
 * Дымовой тест: поднимает index.html в jsdom, инициализирует UIController
 * поверх настоящей разметки и проверяет, что ключевые элементы интерфейса живы.
 *
 * Запуск: npm run smoke
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const checks = [];
let failed = 0;

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Поднимает DOM из index.html и отдаёт готовое окно. */
function bootDom() {
  const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: pathToFileURL(resolve(ROOT, "index.html")).href,
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // jsdom не реализует эти API, а код интерфейса на них опирается
  window.HTMLElement.prototype.setPointerCapture = () => {};
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};

  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "getComputedStyle",
    "MutationObserver",
  ]) {
    const value = key === "window" ? window : window[key];
    if (value === undefined) continue;
    // navigator в Node 24 — геттер без сеттера, обходим через defineProperty
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  return window;
}

// Общее окно для тестов, которым не важна изоляция разметки
let window = bootDom();

/**
 * Свежий DOM из index.html для теста, который вешает обработчики.
 * Контроллеры помечают разметку data-bound="1", поэтому повторная привязка
 * в том же документе молча не сработала бы, а слушатели прошлого теста
 * продолжили бы работать со своим состоянием.
 */
function freshDom() {
  window = bootDom();
  return window;
}

const { TankState } = await import("../js/TankState.js");
const { UIController } = await import("../js/UIController.js");
const { ActionModals } = await import("../js/ui/ActionModals.js");
const { parsePolygonPoints, polygonCentroid, polygonBBox } = await import("../js/ui/polygonGeometry.js");
const { renderHitboxLabels } = await import("../js/ui/hitboxLabels.js");
const { Tooltip } = await import("../js/ui/Tooltip.js");
const { HangarScene } = await import("../js/scenes/HangarScene.js");
const { HeaterController } = await import("../js/scenes/hangar/HeaterController.js");
const { ZipBoxController } = await import("../js/scenes/hangar/ZipBoxController.js");
const { CONTROL_ACTIONS, PEDAL_ACTIONS } = await import("../js/ui/controlActions.js");
const { renderStatusConsole } = await import("../js/ui/statusConsole.js");
const { OverlayRenderer } = await import("../js/ui/OverlayRenderer.js");
const { GaugeArrows } = await import("../js/ui/GaugeArrows.js");
const { getControlOverlayFrame } = await import("../js/ui/controlOverlayFrame.js");
const { CONTROL_OVERLAY_DEFS } = await import("../js/ControlOverlayDefs.js");
const { SOUND_DEFS } = await import("../js/audio/soundDefs.js");
const { STATE_SOUNDS, WATCHED_KEYS, INITIAL_SOUND_STATE, playStateSounds } = await import(
  "../js/audio/stateSounds.js"
);
const { throttleOf } = await import("../js/audio/engineSound.js");
const { StartMenu } = await import("../js/StartMenu.js");
const { MENU_SCREENS } = await import("../js/menu/menuScreens.js");
const { buildCard, renderedOptions, isAnswerCorrect, totalElements, shuffle } = await import(
  "../js/familiarization/quiz.js"
);
const { FamiliarizationController } = await import(
  "../js/familiarization/FamiliarizationController.js"
);
const { FAMILIARIZATION_DATA } = await import("../js/familiarization/familiarizationData.js");
const { getStudyEntry } = await import("../js/familiarization/studyCard.js");
const { overheatLimit } = await import("../js/physics/thermalSystem.js");
const { isTcaEngaged, MIN_COOLANT_C, MIN_RPM } = await import("../js/physics/smokeScreen.js");
const { CYLINDER_COUNT, CRITICAL_LEVEL } = await import("../js/physics/fireSuppression.js");
const { LIMIT_RULES, TOLERANCE_SEC } = await import("../js/physics/operatingLimits.js");
const { SERVICE_LIMIT } = await import("../js/physics/airFilter.js");
const { SPIN_UP_SEC: BLOWER_SPIN_UP_SEC } = await import("../js/physics/nbcProtection.js");
const { isPrepared, missingSteps, PREPARATION_STEPS, PIPE_HEIGHT_M } = await import(
  "../js/physics/underwaterDriving.js"
);
const { getScenarioDefinition } = await import("../js/scenarios/index.js");
const { SystemsTestPanel, GROUPS, SCENARIO_INPUTS } = await import("../js/ui/SystemsTestPanel.js");
const { AlarmOverlay, ALARMS, activeAlarms } = await import("../js/ui/AlarmOverlay.js");
const { SmokeEmitter, SMOKE_STYLES } = await import("../js/smoke/SmokeEmitter.js");

/** Предсказуемый источник случайности: всегда берёт первый элемент. */
const firstAlways = () => 0;

/** Подставной проигрыватель: записывает, что и когда просили сыграть. */
function makeAudioSpy() {
  const played = [];
  const stopped = [];
  return {
    played,
    stopped,
    play: (name) => played.push(name),
    stop: (name) => stopped.push(name),
  };
}

/** Минимальное приложение: то, чего достаточно сценам ангара. */
function makeApp(state) {
  const scenes = [];
  return { state, scenes, changeScene: (name) => scenes.push(name) };
}

/** Кликает по хитбоксу указанной зоны внутри секции. */
function clickZone(sectionId, zone) {
  const el = window.document.querySelector(`#${sectionId} [data-zone="${zone}"]`);
  assert(el, `не найден хитбокс зоны ${zone} в #${sectionId}`);
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  return el;
}

check("TankState создаётся и отдаёт снимок", () => {
  const state = new TankState();
  const snap = state.getSnapshot();
  assert(typeof snap === "object", "снимок должен быть объектом");
  assert("bcn" in snap, "в снимке нет ключа bcn");
  assert("shutters" in snap, "в снимке нет ключа shutters");
  assert("gearLever" in snap, "в снимке нет ключа gearLever");
  assert("fuelManualFeed" in snap, "в снимке нет ключа fuelManualFeed");
});

check("TankState.tick не падает на длинном прогоне", () => {
  const state = new TankState();
  state.toggleBattery();
  for (let i = 0; i < 600; i += 1) state.tick(1 / 60);
  assert(Number.isFinite(state.sensors.engine_rpm), "engine_rpm стал не числом");
  assert(Number.isFinite(state.sensors.voltage), "voltage стал не числом");
});

check("UIController поднимается на реальной разметке", () => {
  freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();
  const ui = new UIController({ rootEl, consoleEl: null, state, isDebug: false });
  assert(ui._actionModals instanceof ActionModals, "ActionModals не создан");
});

check("Модалки органов управления находят свою разметку", () => {
  freshDom();
  const state = new TankState();
  const opened = [];
  const modals = new ActionModals({ state, onAction: (a) => opened.push(a) });

  for (const name of ["bcn", "shutters", "gear", "fuelFeed"]) {
    modals.open(name);
    assert(modals.isAnyOpen, `модалка ${name} не открылась`);
    modals.hideAll();
    assert(!modals.isAnyOpen, `модалка ${name} не закрылась`);
  }

  modals.dispose();
});

check("Выбор в модалке БЦН меняет состояние и подсвечивает кнопку", () => {
  freshDom();
  const state = new TankState();
  const actions = [];
  const modals = new ActionModals({ state, onAction: (a) => actions.push(a) });

  modals.open("bcn");
  const btn = window.document.querySelector('#bcnModal .bcn-modal-btn[data-bcn-mode="pump"]');
  assert(btn, "не найдена кнопка режима pump");
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert(state.bcn === "pump", `ожидался режим pump, получен ${state.bcn}`);
  assert(btn.classList.contains("is-active"), "кнопка не подсветилась");
  assert(actions.includes("bcn"), "не пришло уведомление о действии bcn");

  modals.dispose();
});

check("Выбор передачи меняет состояние", () => {
  freshDom();
  const state = new TankState();
  const modals = new ActionModals({ state, onAction: () => {} });

  modals.open("gear");
  const btn = window.document.querySelector('#gearModal .bcn-modal-btn[data-gear-mode="3"]');
  assert(btn, "не найдена кнопка 3-й передачи");
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert(String(state.gearLever) === "3", `ожидалась передача 3, получена ${state.gearLever}`);

  modals.dispose();
});

check("Геометрия полигонов считает центр и габариты квадрата", () => {
  const points = parsePolygonPoints("0,0 10,0 10,10 0,10");
  assert(points.length === 4, `ожидалось 4 точки, получено ${points.length}`);

  const center = polygonCentroid(points);
  assert(center.x === 5 && center.y === 5, `центр квадрата должен быть (5,5), получен (${center.x},${center.y})`);

  const bbox = polygonBBox(points);
  assert(bbox.minX === 0 && bbox.minY === 0 && bbox.maxX === 10 && bbox.maxY === 10, "габариты квадрата неверны");
});

check("Геометрия отбрасывает вырожденные полигоны", () => {
  assert(parsePolygonPoints("").length === 0, "пустая строка должна дать 0 точек");
  assert(parsePolygonPoints("a,b 1,2").length === 1, "нечисловые точки должны отсеиваться");
  assert(polygonCentroid(parsePolygonPoints("0,0 1,1 2,2")) === null, "полигон нулевой площади должен дать null");
  assert(polygonBBox([]) === null, "пустой набор точек должен дать null");
});

check("Подписи хитбоксов рисуются и переотрисовываются без дублей", () => {
  freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;

  renderHitboxLabels(rootEl);
  const firstPass = rootEl.querySelectorAll("g.hitbox-labels").length;
  assert(firstPass > 0, "не создано ни одной группы подписей");
  assert(rootEl.querySelectorAll("text.hitbox-label").length > 0, "не создано ни одной подписи");

  renderHitboxLabels(rootEl);
  assert(
    rootEl.querySelectorAll("g.hitbox-labels").length === firstPass,
    "повторный вызов размножил группы подписей",
  );
});

check("Подсказка держится в границах окна", () => {
  const tooltip = new Tooltip({ className: "test-tooltip", parentEl: window.document.body });

  tooltip.moveTo(-500, -500);
  assert(parseInt(tooltip.el.style.left, 10) >= 14, "подсказка ушла за левый край");
  assert(parseInt(tooltip.el.style.top, 10) >= 14, "подсказка ушла за верхний край");

  tooltip.moveTo(99999, 99999);
  assert(parseInt(tooltip.el.style.left, 10) <= window.innerWidth, "подсказка ушла за правый край");

  tooltip.setText("тест");
  assert(tooltip.el.textContent === "тест", "текст подсказки не установлен");

  tooltip.show();
  assert(!tooltip.el.classList.contains("hidden"), "подсказка не показалась");
  tooltip.hide();
  assert(tooltip.el.classList.contains("hidden"), "подсказка не скрылась");
});

check("HangarScene поднимается и переключает виды по кругу", () => {
  freshDom();
  const state = new TankState();
  const scene = new HangarScene(makeApp(state));
  scene.init();

  assert(scene.currentMode === "top", `после init ожидался вид top, получен ${scene.currentMode}`);

  scene.toggleView();
  assert(scene.currentMode === "side", `ожидался вид side, получен ${scene.currentMode}`);

  scene.toggleView();
  assert(scene.currentMode === "side-right", `ожидался вид side-right, получен ${scene.currentMode}`);

  scene.toggleView();
  assert(scene.currentMode === "top", "цикл видов не вернулся к top");

  scene.dispose();
});

check("Клик по люку механика-водителя ведёт в кабину", () => {
  const app = makeApp(new TankState());
  const scene = new HangarScene(app);

  scene.enterDriverCabin();
  assert(app.scenes.includes("driver"), "переход к механику-водителю не произошёл");

  scene.enterCommanderCabin();
  assert(app.scenes.includes("commander"), "переход к командиру не произошёл");
});

check("Борт подогревателя не открывается при закрытых шпингалетах", () => {
  freshDom();
  const state = new TankState();
  const heater = new HeaterController(makeApp(state));
  heater.bindUI();

  clickZone("scene-heater", "side-panel-open");
  assert(!state.sidePanelOpen, "борт открылся, хотя шпингалеты закрыты");

  for (const id of ["1", "2", "3"]) state.toggleHingeLatch(id);
  clickZone("scene-heater", "side-panel-open");
  assert(state.sidePanelOpen, "борт не открылся при откинутых шпингалетах");
  assert(!heater.isCloseup, "после открытия борта не должно быть крупного плана");
});

check("Болты выхлопа не откручиваются без ключа из ЗИП", () => {
  freshDom();
  const state = new TankState();
  const heater = new HeaterController(makeApp(state));
  heater.bindUI();

  clickZone("scene-heater", "exhaust-bolt-1");
  assert(!state.exhaustBolt1, "болт открутился без ключа");

  state.takeZipKey();
  clickZone("scene-heater", "exhaust-bolt-1");
  assert(state.exhaustBolt1, "болт не открутился при наличии ключа");
});

check("Крышка выхлопа снимается только после обоих болтов", () => {
  freshDom();
  const state = new TankState();
  const heater = new HeaterController(makeApp(state));
  heater.bindUI();
  state.takeZipKey();

  clickZone("scene-heater", "exhaust-cover");
  assert(!state.exhaustCoverRemoved, "крышка снялась при закрученных болтах");

  state.toggleExhaustBolt("1");
  clickZone("scene-heater", "exhaust-cover");
  assert(!state.exhaustCoverRemoved, "крышка снялась при одном откученном болте");

  state.toggleExhaustBolt("2");
  clickZone("scene-heater", "exhaust-cover");
  assert(state.exhaustCoverRemoved, "крышка не снялась при обоих откученных болтах");
});

check("Ключ и козырёк берутся из ящика ЗИП", () => {
  freshDom();
  const state = new TankState();
  const zip = new ZipBoxController(makeApp(state));
  zip.bindUI();

  const keyEl = clickZone("scene-zip-box", "zip-key");
  assert(state.hasZipKey, "ключ не взят");
  assert(keyEl.classList.contains("hidden"), "хитбокс ключа не скрылся");

  const capEl = clickZone("scene-zip-box", "zip-exhaust-cap");
  assert(state.hasExhaustCap, "козырёк не взят");
  assert(capEl.classList.contains("hidden"), "хитбокс козырька не скрылся");

  // Повторный клик ничего не ломает
  clickZone("scene-zip-box", "zip-key");
  assert(state.hasZipKey, "состояние ключа сбросилось при повторном клике");
});

check("Подсказка ящика ЗИП отражает состояние", () => {
  freshDom();
  const state = new TankState();
  const zip = new ZipBoxController(makeApp(state));
  const hintEl = window.document.querySelector("#scene-zip-box #zipHint");
  assert(hintEl, "не найдена подсказка ящика ЗИП");

  // TankState.canTakeExhaustCap() сейчас не зависит от снятой крышки,
  // поэтому козырёк числится доступным с самого начала
  zip.syncDOM();
  assert(
    hintEl.textContent === "Доступен козырёк выхлопа",
    `неожиданная подсказка: ${hintEl.textContent}`,
  );

  state.takeExhaustCap();
  zip.syncDOM();
  assert(hintEl.textContent === "Козырёк у вас", `неожиданная подсказка: ${hintEl.textContent}`);
});

check("Каждое действие из таблицы имеет рабочий обработчик", () => {
  const state = new TankState();
  const missing = [];

  for (const [action, def] of Object.entries(CONTROL_ACTIONS)) {
    if (def.call && typeof state[def.call] !== "function") {
      missing.push(`${action}: у TankState нет метода ${def.call}`);
    }
    if (!def.call && !def.modal && !def.run) {
      missing.push(`${action}: не задано ни call, ни modal, ни run`);
    }
  }

  assert(missing.length === 0, missing.join("; "));

  for (const setter of Object.values(PEDAL_ACTIONS)) {
    assert(typeof state[setter] === "function", `у TankState нет метода педали ${setter}`);
  }
});

check("Клик по хитбоксу меняет состояние через таблицу действий", () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();
  const notified = [];

  new UIController({
    rootEl,
    consoleEl: window.document.createElement("div"),
    state,
    isDebug: false,
    actionNotifier: { notify: (action) => notified.push(action) },
  });

  const battery = rootEl.querySelector('[data-action="battery-toggle"]');
  assert(battery, "не найден хитбокс массы");

  battery.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert(state.isBatteryOn, "масса не включилась по клику");
  assert(notified.includes("battery-toggle"), "не пришло уведомление о включении массы");

  battery.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert(!state.isBatteryOn, "масса не выключилась повторным кликом");
});

check("Педали работают на удержание и отпускаются вместе", () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();

  new UIController({
    rootEl,
    consoleEl: window.document.createElement("div"),
    state,
    isDebug: false,
  });

  const brake = rootEl.querySelector('[data-action="brake-pedal"]');
  assert(brake, "не найден хитбокс педали тормоза");

  brake.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
  assert(state.isBrakePressed, "педаль тормоза не нажалась");

  window.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
  assert(!state.isBrakePressed, "педаль тормоза не отпустилась");
  assert(!state.gasPedal, "педаль газа должна отпускаться вместе с тормозом");
});

check("Наведение на прибор показывает и двигает подсказку", () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();

  const ui = new UIController({
    rootEl,
    consoleEl: window.document.createElement("div"),
    state,
    isDebug: false,
  });

  const gauge = rootEl.querySelector(`[data-gauge="gauge-rpm"]`);
  assert(gauge, "не найден хитбокс тахометра");

  gauge.dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true, clientX: 100, clientY: 100 }));
  assert(ui._hoveredGauge === "gauge-rpm", "подсказка прибора не появилась");

  // Регрессия: обработчик mousemove звал удалённый метод и падал
  rootEl.dispatchEvent(new window.MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 300 }));
  assert(ui._gaugeTooltip.el.style.left, "подсказка не переместилась за курсором");

  gauge.dispatchEvent(new window.MouseEvent("mouseout", { bubbles: true }));
  assert(ui._hoveredGauge === null, "подсказка прибора не скрылась");
});

check("Панель состояния рисует оба режима и переживает пустые показания", () => {
  const window = freshDom();
  const state = new TankState();
  const el = window.document.createElement("div");

  const options = { isDebug: false, lastAction: null, hitboxVisible: false, lastClick: null };

  renderStatusConsole(el, state.getSnapshot(), options);
  assert(el.textContent.includes("ПРИБОРЫ"), "режим курсанта не отрисовался");
  assert(!el.textContent.includes("TankState"), "курсанту показан отладочный дамп");

  renderStatusConsole(el, state.getSnapshot(), { ...options, isDebug: true, lastAction: "azr" });
  assert(el.textContent.includes("TankState"), "отладочный режим не отрисовался");
  assert(el.textContent.includes("last:    azr"), "не показано последнее действие");

  renderStatusConsole(el, state.getSnapshot(), {
    ...options,
    isDebug: true,
    lastClick: { clientX: 10, clientY: 20, vbX: 30, vbY: 40 },
  });
  assert(el.textContent.includes("viewBox: 30, 40"), "не показаны координаты клика");

  // Показания могут отсутствовать: панель обязана подставить прочерк, а не NaN
  renderStatusConsole(el, { ...state.getSnapshot(), engine_rpm: undefined }, options);
  assert(!el.textContent.includes("NaN"), "в панель просочился NaN");

  // Отсутствие контейнера — не повод падать
  renderStatusConsole(null, state.getSnapshot(), options);
});

/** Строит оверлеи на свежей разметке. */
function buildOverlays(isDebug = false) {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;

  const overlays = new OverlayRenderer({ rootEl, defs: CONTROL_OVERLAY_DEFS, isDebug });
  overlays.buildCabinOverlays();
  overlays.buildInstrumentPanelOverlays();

  return { window, rootEl, overlays };
}

check("Спрайты органов управления создаются по хитбоксам", () => {
  const { overlays } = buildOverlays();

  assert(overlays.elements.size > 0, "не создано ни одного спрайта");
  assert(
    overlays.metrics.size === overlays.elements.size,
    "геометрия посчитана не для всех спрайтов",
  );

  for (const [action, el] of overlays.elements) {
    assert(el.dataset.action === action, `спрайт ${action} помечен чужим действием`);
    assert(el.style.getPropertyValue("--w") !== "", `у спрайта ${action} не задана ширина`);
  }
});

check("Спрайт меняет картинку вслед за состоянием", () => {
  const { overlays } = buildOverlays();
  const state = new TankState();

  const battery = overlays.getElement("battery-toggle");
  assert(battery, "не создан спрайт выключателя массы");

  overlays.render(state.getSnapshot());
  const off = battery.getAttribute("src");

  state.toggleBattery();
  overlays.render(state.getSnapshot());
  const on = battery.getAttribute("src");

  assert(off && on && off !== on, `картинка не сменилась: ${off} → ${on}`);
});

check("Стрелки приборов создаются и поворачиваются по показаниям", () => {
  const { overlays } = buildOverlays();
  const state = new TankState();

  const arrows = overlays.gaugeArrows.arrows;
  assert(arrows.size > 0, "не создано ни одной стрелки прибора");

  const rpmArrow = arrows.get("gauge-rpm");
  assert(rpmArrow, "не создана стрелка тахометра");

  overlays.render(state.getSnapshot());
  const atZero = rpmArrow.style.getPropertyValue("--rot");

  state.sensors.engine_rpm = 2000;
  overlays.render(state.getSnapshot());
  const atSpeed = rpmArrow.style.getPropertyValue("--rot");

  assert(atZero !== atSpeed, `стрелка не повернулась: ${atZero} → ${atSpeed}`);
});

check("Метки осей стрелок рисуются только в режиме отладки", () => {
  const production = buildOverlays(false);
  assert(
    production.rootEl.querySelectorAll(".pivot-indicator").length === 0,
    "отладочные метки осей показаны курсанту",
  );

  const debug = buildOverlays(true);
  assert(
    debug.rootEl.querySelectorAll(".pivot-indicator").length > 0,
    "в режиме отладки метки осей не появились",
  );
});

check("Шкала ВА-540 несимметрична относительно нуля", () => {
  const def = { zeroOffset: 0.2, startAngle: 0, endAngle: 100 };

  assert(GaugeArrows.normalize(def, -100, -100, 500) === 0, "левый предел не даёт 0");
  assert(GaugeArrows.normalize(def, 0, -100, 500) === 0.2, "ноль не попадает в свою отметку");
  assert(GaugeArrows.normalize(def, 500, -100, 500) === 1, "правый предел не даёт 1");

  // Выход за шкалу прижимает стрелку к пределу, а не уводит за него
  assert(GaugeArrows.normalize(def, -500, -100, 500) === 0, "стрелка ушла левее предела");
  assert(GaugeArrows.normalize(def, 9000, -100, 500) === 1, "стрелка ушла правее предела");
});

check("Сдвоенные приборы переключают шкалу", () => {
  assert(GaugeArrows.usesSecondaryScale("gauge-voltammeter", true), "вольтамперметр не дал вольты");
  assert(!GaugeArrows.usesSecondaryScale("gauge-voltammeter", false), "вольтамперметр не дал амперы");
  assert(GaugeArrows.usesSecondaryScale("gauge-fuel", 0), "топливомер не переключился на наружные баки");
  assert(!GaugeArrows.usesSecondaryScale("gauge-fuel", 2), "топливомер не показал внутренние баки");
  assert(!GaugeArrows.usesSecondaryScale("gauge-rpm", 1), "у тахометра не должно быть второй шкалы");
});

check("Кадр спрайта выбирается по виду органа управления", () => {
  const booleanDef = { kind: "boolean", stateKey: "flag", on: "on.png", off: "off.png" };
  assert(getControlOverlayFrame(booleanDef, { flag: true }).src === "on.png", "boolean: не тот кадр");
  assert(getControlOverlayFrame(booleanDef, { flag: false }).src === "off.png", "boolean: не тот кадр");

  const enumDef = { kind: "enum", stateKey: "mode", frames: { a: "a.png", neutral: "n.png" } };
  assert(getControlOverlayFrame(enumDef, { mode: "a" }).src === "a.png", "enum: не тот кадр");
  assert(getControlOverlayFrame(enumDef, { mode: "нет" }).src === "n.png", "enum: нет отката к neutral");

  // range берёт ближайший кадр по значению
  const rangeDef = {
    kind: "range",
    stateKey: "level",
    inflate: 2,
    frames: [
      { at: 0, src: "0.png" },
      { at: 50, src: "50.png", inflate: 3 },
      { at: 100, src: "100.png" },
    ],
  };
  assert(getControlOverlayFrame(rangeDef, { level: 40 }).src === "50.png", "range: не ближайший кадр");
  assert(getControlOverlayFrame(rangeDef, { level: 90 }).src === "100.png", "range: не ближайший кадр");
  assert(getControlOverlayFrame(rangeDef, { level: 40 }).inflate === 3, "кадр не перекрыл размер органа");
  assert(getControlOverlayFrame(rangeDef, { level: 0 }).inflate === 2, "кадр не унаследовал размер органа");

  assert(getControlOverlayFrame(null, {}) === null, "описание отсутствует — должен быть null");
  assert(getControlOverlayFrame({ kind: "gauge" }, {}) === null, "у прибора нет кадра спрайта");
});

check("Все звуки из таблиц существуют и описаны", () => {
  for (const [name, def] of Object.entries(SOUND_DEFS)) {
    assert(def.file, `у звука ${name} не задан файл`);
    assert(
      existsSync(resolve(ROOT, "sounds", def.file)),
      `файл звука ${name} отсутствует: sounds/${def.file}`,
    );
  }

  for (const rule of STATE_SOUNDS) {
    for (const field of ["change", "enter", "exit", "stopOnExit"]) {
      const sound = rule[field];
      if (!sound) continue;
      assert(SOUND_DEFS[sound], `правило ${rule.key}.${field} ссылается на неизвестный звук ${sound}`);
    }
  }
});

check("Наблюдаемые поля звука есть в снимке состояния", () => {
  const snapshot = new TankState().getSnapshot();
  const missing = WATCHED_KEYS.filter((key) => !(key in snapshot));
  assert(missing.length === 0, `звук следит за несуществующими полями: ${missing.join(", ")}`);

  for (const key of Object.keys(INITIAL_SOUND_STATE)) {
    assert(WATCHED_KEYS.includes(key), `в исходном состоянии лишнее поле ${key}`);
  }
});

check("Щелчки и тумблеры звучат на изменение", () => {
  const audio = makeAudioSpy();
  const before = { ...INITIAL_SOUND_STATE };

  playStateSounds(audio, { ...before, isBatteryOn: true }, before);
  assert(audio.played.includes("click"), "масса не щёлкнула");

  audio.played.length = 0;
  playStateSounds(audio, { ...before, gpk: true }, before);
  assert(audio.played.includes("switch"), "тумблер ГПК не щёлкнул");

  audio.played.length = 0;
  playStateSounds(audio, before, before);
  assert(audio.played.length === 0, "звук сыграл без изменения состояния");
});

check("Баллоны звучат открытием и закрытием", () => {
  const audio = makeAudioSpy();
  const closed = { ...INITIAL_SOUND_STATE };
  const open = { ...closed, leftTank: true };

  playStateSounds(audio, open, closed);
  assert(audio.played.includes("valveOpen"), "открытие баллона не озвучено");

  audio.played.length = 0;
  playStateSounds(audio, closed, open);
  assert(audio.played.includes("valveClose"), "закрытие баллона не озвучено");
});

check("Шипение воздуха только при давлении в открытом баллоне", () => {
  const closed = { ...INITIAL_SOUND_STATE };

  const noPressure = makeAudioSpy();
  playStateSounds(noPressure, { ...closed, airBleedValve: true, leftTank: true }, closed);
  assert(noPressure.played.includes("valveOpen"), "кран не озвучен");
  assert(!noPressure.played.includes("airHiss"), "шипение без давления");

  const noTank = makeAudioSpy();
  playStateSounds(noTank, { ...closed, airBleedValve: true, air_start_pressure: 90 }, closed);
  assert(!noTank.played.includes("airHiss"), "шипение при закрытых баллонах");

  const hissing = makeAudioSpy();
  const open = { ...closed, airBleedValve: true, leftTank: true, air_start_pressure: 90 };
  playStateSounds(hissing, open, closed);
  assert(hissing.played.includes("airHiss"), "шипение не пошло при давлении в открытом баллоне");

  const closing = makeAudioSpy();
  playStateSounds(closing, { ...open, airBleedValve: false }, open);
  assert(closing.played.includes("valveClose"), "закрытие крана не озвучено");
  assert(closing.stopped.includes("airHiss"), "шипение не остановлено");
});

check("БЦН гудит только в режиме откачки", () => {
  const off = { ...INITIAL_SOUND_STATE };

  const toPump = makeAudioSpy();
  playStateSounds(toPump, { ...off, bcn: "pump" }, off);
  assert(toPump.played.includes("fuel_pump"), "насос не загудел");

  // Переход off → on не режим откачки, гудеть не должен
  const toOn = makeAudioSpy();
  playStateSounds(toOn, { ...off, bcn: "on" }, off);
  assert(!toOn.played.includes("fuel_pump"), "насос загудел не в том режиме");

  const fromPump = makeAudioSpy();
  playStateSounds(fromPump, { ...off, bcn: "on" }, { ...off, bcn: "pump" });
  assert(fromPump.stopped.includes("fuel_pump"), "насос не замолк");
});

check("Подача топлива складывается из педали и ручного рычага", () => {
  assert(throttleOf({ engineRunning: false, gasPedal: true, fuelManualFeed: 100 }) === 0,
    "на заглушенном двигателе подачи быть не должно");
  assert(throttleOf({ engineRunning: true, gasPedal: false, fuelManualFeed: 0 }) === 0, "нулевая подача");
  assert(throttleOf({ engineRunning: true, gasPedal: true, fuelManualFeed: 0 }) === 0.7, "только педаль");
  assert(throttleOf({ engineRunning: true, gasPedal: false, fuelManualFeed: 100 }) === 0.5, "только рычаг");
  assert(throttleOf({ engineRunning: true, gasPedal: true, fuelManualFeed: 100 }) === 1.0,
    "суммарная подача должна ограничиваться единицей");
});

/** Строит меню на чистом контейнере и собирает вызовы колбэков. */
function buildMenu() {
  const window = freshDom();
  const rootEl = window.document.createElement("div");
  window.document.body.appendChild(rootEl);

  const calls = { training: [], instruction: 0, familiarization: 0, modes: [] };
  const menu = new StartMenu({
    rootEl,
    onTrainingStart: (scenario) => calls.training.push(scenario),
    onInstruction: () => (calls.instruction += 1),
    onFamiliarization: (mode) => {
      calls.familiarization += 1;
      calls.modes.push(mode);
    },
  });

  const click = (selector) => {
    const el = rootEl.querySelector(selector);
    assert(el, `не найден элемент ${selector}`);
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    return el;
  };

  return { menu, rootEl, calls, click, window };
}

check("Стартовое меню строит все экраны и открывается на главном", () => {
  const { menu, rootEl } = buildMenu();

  for (const screen of MENU_SCREENS) {
    assert(
      rootEl.querySelector(`[data-screen="${screen.name}"]`),
      `экран ${screen.name} не построен`,
    );
  }

  assert(menu.currentScreen === "main", `меню открылось на экране ${menu.currentScreen}`);
  assert(
    rootEl.querySelector('[data-screen="main"]').classList.contains("is-active"),
    "главный экран не активен",
  );
});

check("Кнопки меню переключают экраны и зовут обработчики", () => {
  const { menu, calls, click } = buildMenu();

  click('[data-action="training"]');
  assert(menu.currentScreen === "training", "не открылся экран тренировки");

  click('[data-action="back"]');
  assert(menu.currentScreen === "main", "кнопка «Назад» не вернула в главное меню");

  click('[data-action="instruction"]');
  assert(menu.currentScreen === "instruction", "не открылся экран инструкции");
  assert(calls.instruction === 1, "обработчик инструкции не вызван");

  click('[data-action="authors"]');
  assert(menu.currentScreen === "authors", "не открылся экран авторов");

  // Ознакомление ведёт на выбор режима, а не сразу в режим
  click('[data-action="familiarization"]');
  assert(menu.currentScreen === "familiarization", "не открылся выбор режима ознакомления");
  assert(calls.familiarization === 0, "режим запустился до выбора");

  click('[data-action="familiarization-study"]');
  assert(calls.familiarization === 1, "изучение не запустилось");
});

check("Только один экран меню активен одновременно", () => {
  const { rootEl, click } = buildMenu();

  click('[data-action="training"]');
  const active = rootEl.querySelectorAll(".start-screen.is-active");
  assert(active.length === 1, `активных экранов: ${active.length}`);
  assert(active[0].dataset.screen === "training", "активен не тот экран");
});

check("Условия тренировки собираются с экрана настройки", () => {
  const { rootEl, calls, click } = buildMenu();

  click('[data-action="training"]');
  click("#scenarioApply");

  assert(calls.training.length === 1, "тренировка не запущена");
  const scenario = calls.training[0];
  assert(scenario.startMethod, "не выбран способ пуска");
  assert(Number.isFinite(scenario.ambientTemp), `температура не число: ${scenario.ambientTemp}`);
  assert(scenario.fuelType, "не выбран вид топлива");

  // Меняем выбор — он должен доехать до обработчика
  const tempSelect = rootEl.querySelector("#scenarioAmbientTemp");
  tempSelect.value = "-20";
  click("#scenarioApply");
  assert(calls.training[1].ambientTemp === -20, `температура не подхватилась: ${calls.training[1].ambientTemp}`);
});

check("Вкладки инструкции переключаются по одной", () => {
  const { rootEl, click } = buildMenu();

  click('[data-action="instruction"]');

  const tabs = rootEl.querySelectorAll(".instruction-tab-btn");
  assert(tabs.length > 1, "во вкладках инструкции нечего переключать");

  const last = tabs[tabs.length - 1];
  last.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  const activeTabs = rootEl.querySelectorAll(".instruction-tab-btn.active");
  assert(activeTabs.length === 1, `активных вкладок: ${activeTabs.length}`);
  assert(activeTabs[0] === last, "активна не та вкладка");

  const activePanes = rootEl.querySelectorAll(".instruction-tab-pane.active");
  assert(activePanes.length === 1, `активных страниц: ${activePanes.length}`);
  assert(activePanes[0].id === last.dataset.tab, "открыта страница другой вкладки");
});

check("База ознакомления заполнена и непротиворечива", () => {
  const keys = Object.keys(FAMILIARIZATION_DATA);
  assert(keys.length > 0, "база ознакомления пуста");
  assert(totalElements() === keys.length, "счётчик элементов расходится с базой");

  const problems = [];
  for (const [key, entry] of Object.entries(FAMILIARIZATION_DATA)) {
    if (!entry.title) problems.push(`${key}: нет названия`);
    if (!entry.questions?.length) problems.push(`${key}: нет вопросов`);

    for (const question of entry.questions || []) {
      if (!question.text) problems.push(`${key}/${question.id}: нет текста вопроса`);
      if (!question.explanation) problems.push(`${key}/${question.id}: нет пояснения`);

      if (question.type === "choice") {
        const count = question.options?.length ?? 0;
        if (count < 2) problems.push(`${key}/${question.id}: меньше двух вариантов`);
        if (!(question.correct >= 0 && question.correct < count)) {
          problems.push(`${key}/${question.id}: неверный номер правильного ответа`);
        }
      } else if (question.type === "input") {
        const hasRange = typeof question.min === "number" && typeof question.max === "number";
        const hasExpected = typeof question.expected === "number";
        if (!hasRange && !hasExpected) {
          problems.push(`${key}/${question.id}: не задан ни диапазон, ни ожидаемое значение`);
        }
      } else {
        problems.push(`${key}/${question.id}: неизвестный тип ${question.type}`);
      }
    }
  }

  assert(problems.length === 0, `${problems.length} проблем: ${problems.slice(0, 5).join("; ")}`);
});

check("Карточка берёт не больше двух вопросов", () => {
  for (const key of Object.keys(FAMILIARIZATION_DATA)) {
    const card = buildCard(key, firstAlways);
    const available = FAMILIARIZATION_DATA[key].questions.length;

    assert(card.questions.length > 0, `карточка ${key} пуста`);
    assert(
      card.questions.length <= Math.min(2, available) || available <= 2,
      `карточка ${key}: ${card.questions.length} вопросов при ${available} доступных`,
    );
  }
});

check("Неизвестный орган получает запасную карточку", () => {
  const card = buildCard("такого-органа-нет", firstAlways);
  assert(card.questions.length === 1, "запасная карточка должна содержать один вопрос");
  assert(card.questions[0].type === "choice", "запасной вопрос должен быть с выбором");
  assert(card.title === "такого-органа-нет", "запасная карточка не подписана ключом");
});

check("Варианты ответа перемешиваются, но запоминаются", () => {
  const question = {
    type: "choice",
    options: ["верный", "a", "b", "c"],
    correct: 0,
  };

  const first = renderedOptions(question, firstAlways);
  const again = renderedOptions(question, Math.random);
  assert(first === again, "порядок вариантов не должен меняться при повторном показе");

  const correct = first.filter((item) => item.isCorrect);
  assert(correct.length === 1, `правильных вариантов: ${correct.length}`);
  assert(correct[0].opt === "верный", "пометка правильного ответа уехала на другой вариант");
  assert(first.length === 4, "потерялись варианты ответа");
});

check("Перемешивание сохраняет состав", () => {
  const source = [1, 2, 3, 4, 5];
  const mixed = shuffle([...source], Math.random);
  assert(mixed.length === source.length, "изменилось число элементов");
  assert(source.every((item) => mixed.includes(item)), "элементы потерялись при перемешивании");
});

check("Ответ с выбором засчитывается по помеченному варианту", () => {
  const question = { type: "choice", options: ["a", "b"], correct: 1 };
  renderedOptions(question, firstAlways);

  const correctIdx = question._renderedOptions.findIndex((item) => item.isCorrect);
  const wrongIdx = question._renderedOptions.findIndex((item) => !item.isCorrect);

  assert(isAnswerCorrect(question, { choice: correctIdx }), "правильный ответ не засчитан");
  assert(!isAnswerCorrect(question, { choice: wrongIdx }), "неправильный ответ засчитан");
  assert(!isAnswerCorrect(question, {}), "пустой ответ засчитан");
});

check("Числовой ответ проверяется по диапазону и по допуску", () => {
  const byRange = { type: "input", min: 20, max: 26 };
  assert(isAnswerCorrect(byRange, { value: 24 }), "значение внутри диапазона не засчитано");
  assert(isAnswerCorrect(byRange, { value: 20 }), "нижняя граница не засчитана");
  assert(isAnswerCorrect(byRange, { value: 26 }), "верхняя граница не засчитана");
  assert(!isAnswerCorrect(byRange, { value: 19.9 }), "значение ниже диапазона засчитано");

  const byTolerance = { type: "input", expected: 5.5, tolerance: 0.5 };
  assert(isAnswerCorrect(byTolerance, { value: 5.9 }), "значение в пределах допуска не засчитано");
  assert(!isAnswerCorrect(byTolerance, { value: 6.1 }), "значение вне допуска засчитано");

  assert(!isAnswerCorrect(byRange, { value: NaN }), "NaN засчитан");
  assert(!isAnswerCorrect(byRange, {}), "пустой ответ засчитан");
});

check("Режим ознакомления включается и показывает объём материала", () => {
  const window = freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });

  controller.start();
  assert(
    window.document.body.classList.contains("familiarization-mode-active"),
    "режим не включился",
  );
  assert(!controller.topBarEl.classList.contains("hidden"), "панель прогресса не показалась");

  const total = window.document.getElementById("famTotalCount").textContent;
  assert(Number(total) === totalElements(), `всего элементов показано ${total}`);
  assert(window.document.getElementById("famProgressCount").textContent === "0", "прогресс не с нуля");

  controller.stop();
  assert(
    !window.document.body.classList.contains("familiarization-mode-active"),
    "режим не выключился",
  );
});

check("Карточка проходится до конца и засчитывает орган", () => {
  const window = freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });
  controller.start("quiz");

  const key = Object.keys(FAMILIARIZATION_DATA)[0];
  controller.openCard(key, null);
  assert(!controller.modalEl.classList.contains("hidden"), "карточка не открылась");

  const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const questionCount = controller.currentCard.questions.length;

  for (let i = 0; i < questionCount; i += 1) {
    assert(controller.submitBtn.disabled, "кнопка проверки активна до ввода ответа");

    // В карточку попадают вопросы обоих типов — отвечаем по месту
    const option = controller.modalEl.querySelector(".fam-option-card");
    const numberInput = window.document.getElementById("famNumberInput");

    if (option) {
      click(option);
    } else {
      assert(numberInput, `у вопроса ${i + 1} нет ни вариантов, ни поля ввода`);
      numberInput.value = "42";
      numberInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    }

    assert(!controller.submitBtn.disabled, "кнопка проверки не разблокировалась после ответа");
    click(controller.submitBtn);

    const feedback = window.document.getElementById("famFeedbackCard");
    assert(!feedback.classList.contains("hidden"), "не показан отзыв на ответ");

    if (option) {
      assert(
        controller.modalEl.querySelector(".fam-option-card.is-correct"),
        "не подсвечен правильный вариант",
      );
    } else {
      assert(numberInput.disabled, "поле ввода осталось доступным после ответа");
    }

    click(controller.nextBtn);
  }

  assert(controller.studiedKeys.has(key), `орган ${key} не засчитан как изученный`);
  assert(controller.modalEl.classList.contains("hidden"), "карточка не закрылась после последнего вопроса");
  assert(
    window.document.getElementById("famProgressCount").textContent === "1",
    "прогресс не увеличился",
  );

  controller.stop();
});

check("Изученный орган не открывает карточку повторно", () => {
  freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });
  controller.start();

  const key = Object.keys(FAMILIARIZATION_DATA)[0];
  controller.studiedKeys.add(key);

  const el = window.document.querySelector(`[data-action="${key}"], [data-gauge="${key}"]`);
  if (el) {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    assert(controller.modalEl.classList.contains("hidden"), "карточка открылась для изученного органа");
  }

  controller.stop();
});

check("Предел перегрева зависит от охлаждающей жидкости", () => {
  const state = new TankState();

  const onWater = overheatLimit(state);
  state.toggleWaterAntifreeze();
  const onAntifreeze = overheatLimit(state);

  assert(onAntifreeze > onWater, "низкозамерзающая должна терпеть больший нагрев");
});

check("Освещение видно по вольтамперметру", () => {
  const run = (setup) => {
    const state = new TankState();
    state.toggleBattery();
    setup(state);
    for (let i = 0; i < 600; i += 1) state.tick(1 / 60);
    return state.sensors.amperage;
  };

  const idle = run(() => {});
  const withLights = run((state) => state.toggleLightsAll());

  // Ток разряда отрицательный, поэтому со светом он дальше от нуля
  assert(withLights < idle, `со светом ток ${withLights}, без света ${idle}`);
});

check("Насос прокачки даёт давление в КП до пуска двигателя", () => {
  const state = new TankState();
  state.toggleBattery();

  for (let i = 0; i < 600; i += 1) state.tick(1 / 60);
  assert(state.sensors.oil_pressure_gearbox === 0, "давление в КП взялось само");

  state.toggleOilPumpGearbox();
  for (let i = 0; i < 600; i += 1) state.tick(1 / 60);
  assert(state.sensors.oil_pressure_gearbox > 1, "насос прокачки не создал давление");

  state.toggleOilPumpGearbox();
  for (let i = 0; i < 600; i += 1) state.tick(1 / 60);
  assert(state.sensors.oil_pressure_gearbox < 0.1, "давление не упало после выключения насоса");
});

/** Заводит двигатель стартером и возвращает прогретое состояние. */
function startedEngine() {
  const state = new TankState();
  state.setScenario({ startMethod: "electric-start", ambientTempC: 20, fuelType: "diesel" });
  state.setGearLever("neutral");
  state.toggleLeftTank();
  state.toggleRightTank();
  state.setBcnMode("on");
  state.toggleBattery();
  state.toggleAirBleedValve();
  for (let i = 0; i < 4; i += 1) state.pumpFuelPrimerLever();

  const run = (seconds) => {
    for (let i = 0; i < seconds * 60; i += 1) state.tick(1 / 60);
  };

  state.toggleAirBleedValve();
  state.toggleMznEngine();
  run(12);
  state.toggleMznEngine();
  state.setFuelManualFeed(30);
  state.setStarterPressed(true);
  run(6);
  state.setStarterPressed(false);
  run(10);

  assert(state.getSnapshot().engineRunning, "двигатель не запустился в подготовке теста");
  return { state, run };
}

check("Двигатель не глушится сразу после нагрузки", () => {
  const { state, run } = startedEngine();

  state.setFuelManualFeed(90);
  run(40);
  assert(!state.canStopEngine(), "прогретый двигатель разрешено глушить без охлаждения");

  state.setFuelManualFeed(0);
  run(10);
  assert(!state.canStopEngine(), "охлаждение засчитано слишком рано");

  assert(state.stopEngine(), "двигатель не остановился");
  assert(!state.getSnapshot().engineRunning, "двигатель продолжил работать");
  assert(
    state.violations.some((v) => v.includes("охлаждения")),
    `нарушение не записано: ${JSON.stringify(state.violations)}`,
  );
});

check("После выдержки на холостом ходу остановка штатная", () => {
  const { state, run } = startedEngine();

  // Полный цикл без ошибок: прогрев на холостом ходу, работа, охлаждение
  state.setShutters("4");
  run(60);
  assert(state.sensors.coolant_temp >= 55, "двигатель не прогрелся на холостом ходу");

  state.setFuelManualFeed(90);
  run(30);
  state.setFuelManualFeed(0);
  run(150);

  assert(state.canStopEngine(), "выдержка на холостом ходу не засчитана");
  assert(state.stopEngine(), "двигатель не остановился");
  assert(
    state.violations.length === 0,
    `записаны лишние нарушения: ${JSON.stringify(state.violations)}`,
  );
});

check("Газ в середине выдержки сбрасывает отсчёт охлаждения", () => {
  const { state, run } = startedEngine();

  state.setFuelManualFeed(90);
  run(30);
  state.setFuelManualFeed(0);
  run(100);

  const before = state.sensors.cooldown_progress;
  assert(before > 0.5, `отсчёт не набрался: ${before}`);

  state.setGasPedal(true);
  run(2);
  state.setGasPedal(false);

  assert(state.sensors.cooldown_progress < before, "отсчёт охлаждения не сбросился после газа");
});

check("Остановка снятием массы засчитывается нарушением", () => {
  const { state, run } = startedEngine();

  state.toggleBattery();
  run(5);

  assert(!state.getSnapshot().engineRunning, "двигатель не заглох после снятия массы");
  assert(
    state.violations.some((v) => v.includes("снятием массы")),
    `нарушение не записано: ${JSON.stringify(state.violations)}`,
  );
});

check("Нарушения не дублируются и попадают в снимок", () => {
  const state = new TankState();

  assert(state.recordViolation("перегрев"), "нарушение не записалось");
  assert(!state.recordViolation("перегрев"), "нарушение записалось повторно");
  assert(state.violations.length === 1, `нарушений в списке: ${state.violations.length}`);
  assert(state.getSnapshot().violations.includes("перегрев"), "нарушения не видны в снимке");

  state.reset();
  assert(state.violations.length === 0, "нарушения пережили сброс состояния");
});

check("Дымовая завеса ставится только на прогретом двигателе", () => {
  const { state, run } = startedEngine();

  // ТДА — третье положение переключателя БЦА/ТДА
  while (!isTcaEngaged(state)) state.cycleBcaTca();

  state.setFuelManualFeed(100);
  run(5);
  assert(!state.sensors.is_smoke_screen_active, "завеса пошла на непрогретом двигателе");
  assert(
    state.violations.some((v) => v.includes("непрогретом")),
    "не записано нарушение о включении ТДА на холодную",
  );

  run(120);
  assert(state.sensors.coolant_temp >= MIN_COOLANT_C, "двигатель не прогрелся за отведённое время");
  assert(state.sensors.engine_rpm >= MIN_RPM, "оборотов не хватает для завесы");
  assert(state.sensors.is_smoke_screen_active, "завеса не пошла на прогретом двигателе");
});

check("Завеса гаснет на малых оборотах и тратит топливо", () => {
  const { state, run } = startedEngine();
  while (!isTcaEngaged(state)) state.cycleBcaTca();

  state.setFuelManualFeed(100);
  run(150);
  assert(state.sensors.is_smoke_screen_active, "завеса не запустилась");

  const before = state.sensors.fuel_level_internal;
  run(30);
  const spent = before - state.sensors.fuel_level_internal;
  assert(spent > 0, "завеса не расходует топливо");

  state.setFuelManualFeed(0);
  run(10);
  assert(!state.sensors.is_smoke_screen_active, "завеса осталась на холостом ходу");
});

check("Автоматическое ППО тушит пожар само", () => {
  const state = new TankState();
  const run = (sec) => { for (let i = 0; i < sec * 60; i += 1) state.tick(1 / 60); };

  assert(state.ppoAuto, "ППО должно быть в автоматическом режиме по умолчанию");
  state.startFire(0.2);
  run(10);

  assert(state.ppoCylindersUsed > 0, "баллон не сработал");
  assert(state.sensors.fire_level < 0.2, "пожар не убавился");
});

check("В ручном режиме пожар разгорается без команды", () => {
  const state = new TankState();
  const run = (sec) => { for (let i = 0; i < sec * 60; i += 1) state.tick(1 / 60); };

  state.togglePpoMode();
  assert(!state.ppoAuto, "ППО не переключилось в ручной режим");

  state.startFire(0.2);
  run(10);
  assert(state.ppoCylindersUsed === 0, "баллон сработал без команды");
  assert(state.sensors.fire_level > 0.2, "пожар не разгорается");

  assert(state.dischargePpo(), "баллон не разрядился по команде");
  run(5);
  assert(state.ppoCylindersUsed === 1, "израсходован не один баллон");
});

check("Баллоны ППО кончаются", () => {
  const state = new TankState();
  const run = (sec) => { for (let i = 0; i < sec * 60; i += 1) state.tick(1 / 60); };
  state.togglePpoMode();

  for (let i = 0; i < CYLINDER_COUNT; i += 1) {
    assert(state.dischargePpo(), `баллон ${i + 1} не разрядился`);
    run(4);
  }

  assert(state.ppoCylindersUsed === CYLINDER_COUNT, "израсходовано не всё");
  assert(!state.dischargePpo(), "разрядился баллон сверх имеющихся");
});

check("Открытые жалюзи раздувают пожар", () => {
  const burn = (shutters) => {
    const state = new TankState();
    state.togglePpoMode();
    state.setShutters(shutters);
    state.startFire(0.2);
    for (let i = 0; i < 10 * 60; i += 1) state.tick(1 / 60);
    return state.sensors.fire_level;
  };

  assert(burn("4") > burn("0"), "приток воздуха через жалюзи не ускоряет пожар");
});

check("Пожар при работающем двигателе и открытых жалюзи — нарушения", () => {
  const { state, run } = startedEngine();
  state.togglePpoMode();
  state.setShutters("4");
  state.startFire(0.2);
  run(3);

  assert(
    state.violations.some((v) => v.includes("Двигатель не остановлен при пожаре")),
    `не записано нарушение по двигателю: ${JSON.stringify(state.violations)}`,
  );
  assert(
    state.violations.some((v) => v.includes("Жалюзи не закрыты")),
    "не записано нарушение по жалюзи",
  );
});

check("Непотушенный пожар выводит машину из строя", () => {
  const state = new TankState();
  state.togglePpoMode();
  state.setShutters("4");
  state.startFire(0.3);
  for (let i = 0; i < 120 * 60; i += 1) state.tick(1 / 60);

  assert(state.sensors.fire_level >= CRITICAL_LEVEL, `пожар не дорос: ${state.sensors.fire_level}`);
  assert(
    state.violations.some((v) => v.includes("выведена из строя")),
    "не записан итог непотушенного пожара",
  );
});

check("Каждое правило контроля режимов описано полностью", () => {
  assert(LIMIT_RULES.length > 0, "правил контроля нет");

  const ids = new Set();
  for (const rule of LIMIT_RULES) {
    assert(rule.id, "у правила нет идентификатора");
    assert(!ids.has(rule.id), `повторяющийся идентификатор ${rule.id}`);
    ids.add(rule.id);

    assert(typeof rule.applies === "function", `${rule.id}: нет условия применимости`);
    assert(typeof rule.violated === "function", `${rule.id}: нет проверки`);
    assert(rule.message(new TankState()), `${rule.id}: пустое сообщение`);
  }
});

check("Короткий заброс за предел не считается нарушением", () => {
  const { state, run } = startedEngine();

  // Прогреваем, чтобы не поймать нарушение о нагрузке на холодную
  state.setFuelManualFeed(40);
  run(200);
  const before = state.violations.length;

  state.sensors.oil_pressure_engine = 0.5;
  run(TOLERANCE_SEC / 2);

  assert(
    state.violations.length === before,
    `кратковременный заброс записан как нарушение: ${JSON.stringify(state.violations)}`,
  );
});

check("Удержание вне предела записывается в журнал", () => {
  const { state, run } = startedEngine();

  // Закрытые жалюзи под нагрузкой — штатный путь к перегреву
  state.setShutters("0");
  state.setFuelManualFeed(100);
  run(240);

  assert(state.lamps.overheat, `лампа перегрева не загорелась при ${state.sensors.coolant_temp} °C`);
  assert(
    state.violations.some((v) => v.includes("Перегрев")),
    `перегрев не записан: ${JSON.stringify(state.violations)}`,
  );
});

check("Открытые жалюзи удерживают температуру в норме", () => {
  const { state, run } = startedEngine();

  state.setShutters("4");
  state.setFuelManualFeed(100);
  run(240);

  assert(!state.lamps.overheat, `перегрев при открытых жалюзи: ${state.sensors.coolant_temp} °C`);
  assert(
    !state.violations.some((v) => v.includes("Перегрев")),
    "записан перегрев при открытых жалюзи",
  );
});

check("Нагрузка на непрогретом двигателе записывается", () => {
  const { state, run } = startedEngine();

  assert(state.sensors.coolant_temp < 55, "двигатель уже прогрет, случай не проверить");
  state.setFuelManualFeed(90);
  run(TOLERANCE_SEC + 1);

  assert(
    state.violations.some((v) => v.includes("непрогретом")),
    `нагрузка на холодную не записана: ${JSON.stringify(state.violations)}`,
  );
});

check("Забитый воздухоочиститель виден по разрежению и срезает обороты", () => {
  const rpmWith = (clogging) => {
    const { state, run } = startedEngine();
    state.setShutters("4");
    state.setAirFilterClogging(clogging);
    state.setFuelManualFeed(100);
    run(40);
    return { rpm: state.sensors.engine_rpm, vacuum: state.sensors.air_filter_vacuum, state };
  };

  const clean = rpmWith(0);
  const clogged = rpmWith(0.9);

  assert(clogged.rpm < clean.rpm, `забитый фильтр не срезал обороты: ${clogged.rpm} против ${clean.rpm}`);
  assert(clogged.vacuum > clean.vacuum, "разрежение не выросло на забитом фильтре");
  assert(clogged.state.sensors.is_air_filter_clogged, "фильтр не помечен требующим обслуживания");
  assert(
    clogged.state.violations.some((v) => v.includes("воздухоочистителем")),
    "работа с забитым фильтром не записана",
  );
});

check("Кассеты фильтра промываются одним действием", () => {
  const state = new TankState();
  state.setAirFilterClogging(0.9);

  assert(state.serviceAirFilter(), "фильтр не обслужен");
  assert(state.airFilterClogging === 0, "загрязнение не сброшено");

  state.tick(1 / 60);
  assert(!state.sensors.is_air_filter_clogged, "фильтр всё ещё помечен забитым");
});

check("Порог обслуживания фильтра отражается в признаке", () => {
  const state = new TankState();
  const tick = () => state.tick(1 / 60);

  state.setAirFilterClogging(SERVICE_LIMIT - 0.01);
  tick();
  assert(!state.sensors.is_air_filter_clogged, "фильтр помечен забитым до порога");

  state.setAirFilterClogging(SERVICE_LIMIT);
  tick();
  assert(state.sensors.is_air_filter_clogged, "фильтр не помечен забитым на пороге");
});

/** Танк с включённой массой и удобным прогоном времени. */
function poweredTank() {
  const state = new TankState();
  state.toggleBattery();
  const run = (sec) => { for (let i = 0; i < sec * 60; i += 1) state.tick(1 / 60); };
  run(1);
  return { state, run };
}

check("Нагнетатель выходит на режим не мгновенно", () => {
  const { state, run } = poweredTank();

  state.toggleBlower();
  run(BLOWER_SPIN_UP_SEC / 2);
  const half = state.sensors.compartment_pressure;
  assert(half > 0, "наддув не начался");

  run(BLOWER_SPIN_UP_SEC);
  assert(state.sensors.compartment_pressure > half, "наддув не вырос до режима");

  state.toggleBlower();
  run(BLOWER_SPIN_UP_SEC);
  assert(
    state.sensors.compartment_pressure < 0.01,
    `наддув не спал после выключения: ${state.sensors.compartment_pressure}`,
  );
});

check("Отделение защищено только при наддуве через фильтр", () => {
  const { state, run } = poweredTank();

  state.toggleBlower();
  run(BLOWER_SPIN_UP_SEC + 1);
  assert(!state.sensors.is_compartment_sealed, "отделение защищено без фильтра");

  state.toggleFilterMode();
  run(1);
  assert(state.sensors.is_compartment_sealed, "отделение не защищено при наддуве через фильтр");
});

check("ПАЗ в автоматическом режиме закрывает отделение сам", () => {
  const { state, run } = poweredTank();

  assert(state.pazAuto, "ПАЗ должен быть автоматическим по умолчанию");
  state.setContaminated(true);
  run(BLOWER_SPIN_UP_SEC + 2);

  assert(state.blowerOn, "нагнетатель не включился по заражению");
  assert(state.filterMode, "воздух не пущен через фильтр");
  assert(state.sensors.is_compartment_sealed, "отделение не защищено");
});

check("Заражение без защиты записывается нарушением", () => {
  const { state, run } = poweredTank();

  state.togglePazMode();
  state.setContaminated(true);
  run(3);

  assert(!state.blowerOn, "нагнетатель включился в ручном режиме сам");
  assert(
    state.violations.some((v) => v.includes("без защиты")),
    `нарушение не записано: ${JSON.stringify(state.violations)}`,
  );
});

check("Ресурс фильтра расходуется только при работе через него", () => {
  const { state, run } = poweredTank();

  state.toggleBlower();
  run(60);
  assert(state.sensors.filter_life_left === 1, "ресурс тратится без фильтра");

  state.toggleFilterMode();
  run(60);
  assert(state.sensors.filter_life_left < 1, "ресурс фильтра не расходуется");
});

/** Полностью подготовленная к воде машина. */
function preparedForWater() {
  const { state, run } = startedEngine();
  state.toggleOpvtSealed();
  state.toggleOpvtPipe();
  state.toggleOpvtExhaustSeal();
  state.toggleOpvtPumpCheck();
  state.setShutters("0");
  return { state, run };
}

check("Подготовка к воде требует всех шагов", () => {
  const state = new TankState();

  assert(!isPrepared(state), "неподготовленная машина считается готовой");
  assert(
    missingSteps(state).length === PREPARATION_STEPS.length,
    "перечислены не все невыполненные шаги",
  );

  state.toggleOpvtSealed();
  state.toggleOpvtPipe();
  state.toggleOpvtExhaustSeal();
  assert(!isPrepared(state), "машина готова без проверки насоса");

  state.toggleOpvtPumpCheck();
  assert(isPrepared(state), "все шаги выполнены, а машина не готова");
  assert(missingSteps(state).length === 0, "остались невыполненные шаги");
});

check("Неподготовленная машина набирает воду", () => {
  const { state, run } = startedEngine();

  state.setWaterDepth(2);
  run(5);

  assert(state.sensors.is_flooding, "вода не поступает в негерметичную машину");
  assert(state.sensors.water_level > 0, "уровень воды не растёт");
  assert(
    state.violations.some((v) => v.includes("без подготовки")),
    `нарушения подготовки не записаны: ${JSON.stringify(state.violations)}`,
  );
});

check("Подготовленная машина воду не набирает", () => {
  const { state, run } = preparedForWater();

  state.setWaterDepth(2);
  run(10);

  assert(!state.sensors.is_flooding, "подготовленная машина течёт");
  assert(state.sensors.water_level === 0, "уровень воды вырос в герметичной машине");
});

check("Открытые жалюзи топят машину даже подготовленную", () => {
  const { state, run } = preparedForWater();

  state.setShutters("4");
  state.setWaterDepth(2);
  run(5);

  assert(state.sensors.is_flooding, "вода не пошла через открытые жалюзи");
  assert(
    state.violations.some((v) => v.includes("открытыми жалюзи")),
    "не записан вход в воду с открытыми жалюзи",
  );
});

check("Насос откачивает воду медленнее, чем она поступает", () => {
  const { state, run } = startedEngine();

  state.setWaterDepth(2);
  state.toggleOpvtPump();
  run(10);

  assert(state.sensors.water_level > 0, "вода не поступает при работающем насосе");
  assert(state.sensors.is_flooding, "насос перекрыл течь полностью");
});

check("Превышение глубины и остановка под водой записываются", () => {
  const { state, run } = preparedForWater();

  state.setWaterDepth(PIPE_HEIGHT_M + 1);
  run(3);
  assert(
    state.violations.some((v) => v.includes("глубина брода")),
    "превышение глубины не записано",
  );

  state.stopEngine();
  run(3);
  assert(
    state.violations.some((v) => v.includes("остановлен под водой")),
    "остановка под водой не записана",
  );
});

check("Сценарий ОПВТ собирается и описан полностью", () => {
  const scenario = getScenarioDefinition({ startMethod: "underwater-driving" });

  assert(scenario, "сценарий ОПВТ не найден");
  assert(scenario.stages.length > 0, "в сценарии нет этапов");

  const ids = new Set();
  for (const stage of scenario.stages) {
    assert(stage.title, `этап ${stage.id} без названия`);
    assert(stage.steps.length > 0, `этап ${stage.id} без шагов`);

    for (const step of stage.steps) {
      assert(step.title, `шаг ${step.id} без названия`);
      assert(typeof step.completeWhen === "function", `шаг ${step.id} без условия`);
      assert(!ids.has(step.id), `повторяющийся шаг ${step.id}`);
      ids.add(step.id);

      // Шаг засчитывается либо автоматически, либо по взведению
      assert(step.auto || step.gateKeys?.length, `шаг ${step.id} нельзя ни взвести, ни засчитать`);
    }
  }
});

check("Панель проверки систем ссылается только на существующие действия", () => {
  for (const group of GROUPS) {
    assert(group.title, "у группы нет названия");
    for (const item of group.items) {
      assert(item.label, "у кнопки панели нет подписи");
      assert(
        item.run || CONTROL_ACTIONS[item.action],
        `кнопка «${item.label}» ссылается на неизвестное действие ${item.action}`,
      );
    }
  }

  const state = new TankState();
  for (const input of SCENARIO_INPUTS) {
    assert(input.label, "у вводной нет подписи");
    input.apply(state); // не должно падать
  }
});

check("Кнопки панели меняют состояние танка", () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();

  const ui = new UIController({
    rootEl,
    consoleEl: window.document.createElement("div"),
    state,
    isDebug: false,
  });
  const panel = new SystemsTestPanel({ state, ui });

  const click = (label) => {
    const btn = [...panel.rootEl.querySelectorAll("[data-test-item]")].find(
      (el) => el.textContent === label,
    );
    assert(btn, `не найдена кнопка «${label}»`);
    btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  };

  click("Нагнетатель");
  assert(state.blowerOn, "нагнетатель не включился с панели");

  click("Труба");
  assert(state.opvtPipeInstalled, "труба не установлена с панели");

  // Сводка обновляется по состоянию
  assert(
    panel.rootEl.querySelector("[data-test-readout]").innerHTML.includes("Наддув"),
    "сводка не отрисовалась",
  );
});

check("Сброс обстановки возвращает машину в исходное", () => {
  const state = new TankState();

  state.startFire(0.3);
  state.setAirFilterClogging(0.9);
  state.setContaminated(true);
  state.setWaterDepth(3);
  state.dischargePpo();
  for (let i = 0; i < 300; i += 1) state.tick(1 / 60);

  assert(state.violations.length > 0, "нарушения не накопились");
  assert(state.ppoCylindersUsed > 0, "баллоны не израсходованы");

  state.clearIncidents();

  assert(state.sensors.fire_level === 0, "пожар не потушен сбросом");
  assert(state.sensors.water_depth_m === 0, "машина осталась в воде");
  assert(state.sensors.water_level === 0, "вода осталась внутри");
  assert(!state.sensors.is_contaminated, "заражение не снято");
  assert(state.airFilterClogging === 0, "фильтр остался забитым");
  assert(state.ppoCylindersUsed === 0, "баллоны не восстановлены");
  assert(state.violations.length === 0, "журнал нарушений не очищен");

  // Двигатель сбросом не трогаем: обстановка и машина — разные вещи
  state.clearIncidents();
  assert(state.violations.length === 0, "повторный сброс что-то сломал");
});

check("Панель не перекрывает стартовое меню", async () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();

  const ui = new UIController({
    rootEl,
    consoleEl: window.document.createElement("div"),
    state,
    isDebug: false,
  });

  const menuEl = window.document.getElementById("startMenuContainer");
  assert(menuEl, "не найден контейнер стартового меню");

  menuEl.classList.remove("is-hidden");
  const panel = new SystemsTestPanel({ state, ui });

  assert(panel.rootEl.hidden, "панель показана поверх открытого меню");
  assert(panel.rootEl.classList.contains("is-collapsed"), "панель развёрнута по умолчанию");

  // MutationObserver срабатывает асинхронно — ждём микрозадачу
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  menuEl.classList.add("is-hidden");
  await settle();
  assert(!panel.rootEl.hidden, "панель не вернулась после закрытия меню");

  menuEl.classList.remove("is-hidden");
  await settle();
  assert(panel.rootEl.hidden, "панель не спряталась при повторном открытии меню");
});

check("Ярлык «Завести и прогреть» даёт устойчиво работающий двигатель", () => {
  const state = new TankState();
  const quickStart = SCENARIO_INPUTS.find((input) => input.label.startsWith("Завести"));
  assert(quickStart, "в панели нет ярлыка быстрого пуска");

  quickStart.apply(state);
  for (let i = 0; i < 10 * 60; i += 1) state.tick(1 / 60);

  const snapshot = state.getSnapshot();
  assert(snapshot.engineRunning, "двигатель заглох после быстрого пуска");
  assert(snapshot.engine_rpm > 700, `обороты не держатся: ${snapshot.engine_rpm}`);
  assert(snapshot.coolant_temp > 70, `двигатель не прогрет: ${snapshot.coolant_temp}`);
  assert(state.violations.length === 0, `быстрый пуск дал нарушения: ${state.violations}`);
});

check("Аварийная сигнализация показывает пожар", () => {
  const window = freshDom();
  const state = new TankState();
  const overlay = new AlarmOverlay({ state, rootEl: window.document.body });

  assert(overlay.rootEl.hidden, "сигнализация горит на исправной машине");

  state.startFire(0.25);
  state.tick(1 / 60);

  assert(!overlay.rootEl.hidden, "пожар не показан");
  assert(overlay.rootEl.textContent.includes("ПОЖАР"), "нет надписи о пожаре");
  assert(overlay.rootEl.textContent.includes("баллонов"), "не показан остаток баллонов");

  state.clearIncidents();
  state.tick(1 / 60);
  assert(overlay.rootEl.hidden, "сигнализация осталась после сброса");
});

check("Сигнализация показывает перегрев и поступление воды", () => {
  const { state, run } = startedEngine();

  state.setShutters("0");
  state.setFuelManualFeed(100);
  run(240);
  assert(
    activeAlarms(state.getSnapshot()).some((a) => a.id === "overheat"),
    `перегрев не в списке аварий: ${state.sensors.coolant_temp} °C`,
  );

  state.setWaterDepth(2);
  run(2);
  assert(
    activeAlarms(state.getSnapshot()).some((a) => a.id === "flooding"),
    "поступление воды не в списке аварий",
  );
});

check("Проверка ламп не выдаётся за аварию", () => {
  const state = new TankState();

  // Кнопка контроля зажигает все лампы — это исправность, а не пожар
  state.cycleSignalLamps();
  state.cycleSignalLamps();
  state.tick(1 / 60);

  assert(Number(state.signalLamps) === 2, "кнопка контроля ламп не нажата");
  assert(
    activeAlarms(state.getSnapshot()).length === 0,
    "проверка ламп показана как авария",
  );
});

check("Каждая авария описана полностью", () => {
  const state = new TankState();
  state.startFire(0.5);
  state.setWaterDepth(2);
  const snapshot = state.getSnapshot();

  const ids = new Set();
  for (const alarm of ALARMS) {
    assert(alarm.id && !ids.has(alarm.id), `повторяющийся или пустой id: ${alarm.id}`);
    ids.add(alarm.id);
    assert(alarm.text, `у аварии ${alarm.id} нет текста`);
    assert(typeof alarm.isActive(snapshot) === "boolean", `${alarm.id}: условие не булево`);
    assert(alarm.detail(snapshot), `${alarm.id}: пустая расшифровка`);
  }
});

check("Дым пожара идёт над моторным отделением", () => {
  const window = freshDom();
  const container = window.document.getElementById("fire-smoke-container");
  assert(container, "в разметке нет контейнера дыма пожара");
  assert(container.classList.contains("invisible"), "дым пожара виден на исправной машине");

  const smoke = new SmokeEmitter("fire-smoke-container", "fire");

  smoke.update(true, { intensity: 0.5 });
  assert(!container.classList.contains("invisible"), "дым не пошёл при пожаре");
  assert(smoke.isRunning, "генератор не запустился");

  smoke.update(false);
  assert(container.classList.contains("invisible"), "дым не прекратился");
  assert(container.children.length === 0, "частицы остались после остановки");
});

check("Виды дыма отличаются плотностью и цветом", () => {
  const { exhaust, smokeScreen, fire } = SMOKE_STYLES;

  assert(fire.gray < exhaust.gray, "дым пожара должен быть темнее выхлопа");
  assert(smokeScreen.gray > exhaust.gray, "дымовая завеса должна быть светлее выхлопа");
  assert(fire.spread > exhaust.spread, "пожар должен дымить шире выхлопа");
  assert(fire.delayMs < exhaust.delayMs, "пожар должен дымить гуще выхлопа");
});

check("Интенсивность сгущает дым", () => {
  freshDom();
  const smoke = new SmokeEmitter("fire-smoke-container", "fire");

  smoke.update(true, { intensity: 0 });
  const slow = smoke.currentDelay;

  smoke.update(true, { intensity: 1 });
  assert(smoke.currentDelay < slow, `плотность не выросла: ${slow} → ${smoke.currentDelay}`);

  smoke.update(false);
});

check("Сигнальные лампы размечены на щитке и зажигаются", () => {
  const window = freshDom();
  const rootEl = window.document.querySelector(".stage") || window.document.body;

  const LAMPS = [
    ["lamp-fire", "lamp_fire"],
    ["lamp-oil-alarm", "lamp_oil_pressure_alarm"],
    ["lamp-overheat", "lamp_overheat"],
    ["lamp-fuel-reserve", "lamp_fuel_reserve"],
    ["lamp-battery", "lamp_battery_charge"],
  ];

  for (const [action, stateKey] of LAMPS) {
    assert(
      window.document.querySelector(`[data-action="${action}"]`),
      `на щитке нет хитбокса лампы ${action}`,
    );
    const def = CONTROL_OVERLAY_DEFS[action];
    assert(def, `нет описания оверлея ${action}`);
    assert(def.stateKey === stateKey, `${action} смотрит не на то состояние: ${def.stateKey}`);
    assert(def.on && def.off, `${action}: нет картинок включённого и выключенного состояния`);
  }

  const overlays = new OverlayRenderer({ rootEl, defs: CONTROL_OVERLAY_DEFS, isDebug: false });
  overlays.buildCabinOverlays();
  overlays.buildInstrumentPanelOverlays();

  const state = new TankState();
  overlays.render(state.getSnapshot());

  const fireLamp = overlays.getElement("lamp-fire");
  assert(fireLamp, "спрайт лампы пожара не создан");
  const off = fireLamp.getAttribute("src");

  state.startFire(0.3);
  state.tick(1 / 60);
  overlays.render(state.getSnapshot());

  assert(fireLamp.getAttribute("src") !== off, "лампа пожара не загорелась");
});

check("У каждого органа есть название и описание для изучения", () => {
  for (const key of Object.keys(FAMILIARIZATION_DATA)) {
    const entry = getStudyEntry(key);
    assert(entry.title, `${key}: нет названия`);
    assert(entry.description, `${key}: нет описания`);
  }

  // Незнакомый орган не должен ронять режим
  const unknown = getStudyEntry("такого-органа-нет");
  assert(unknown.title && unknown.description, "нет запасного описания");
});

check("Режим изучения показывает описание, а не вопросы", () => {
  const window = freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });

  controller.start("study");
  assert(controller.isStudyMode, "режим изучения не включился");

  const key = Object.keys(FAMILIARIZATION_DATA)[0];
  controller.openCard(key, null);

  const body = window.document.getElementById("famModalBody");
  assert(
    body.querySelector(".fam-study-description"),
    "не показано описание органа",
  );
  assert(!body.querySelector(".fam-option-card"), "в изучении показаны варианты ответа");
  assert(controller.submitBtn.classList.contains("hidden"), "кнопка проверки не скрыта");
  assert(controller.nextBtn.textContent === "Понятно", "не та подпись кнопки");

  const title = window.document.getElementById("famModalTitle").textContent;
  assert(title === FAMILIARIZATION_DATA[key].title, `заголовок не совпал: ${title}`);

  controller.stop();
});

check("Изученный орган засчитывается одной кнопкой", () => {
  const window = freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });
  controller.start("study");

  const key = Object.keys(FAMILIARIZATION_DATA)[0];
  controller.openCard(key, null);
  controller.nextBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert(controller.studiedKeys.has(key), "орган не засчитан");
  assert(controller.modalEl.classList.contains("hidden"), "карточка не закрылась");
  assert(
    window.document.getElementById("famProgressCount").textContent === "1",
    "прогресс не увеличился",
  );

  controller.stop();
});

check("Прогресс изучения и проверки считается раздельно", () => {
  freshDom();
  const controller = new FamiliarizationController({ app: {}, onExit: () => {} });
  const key = Object.keys(FAMILIARIZATION_DATA)[0];

  controller.start("study");
  controller.studiedKeys.add(key);
  assert(controller.studiedKeys.size === 1, "изучение не засчиталось");

  controller.start("quiz");
  assert(controller.studiedKeys.size === 0, "проверка унаследовала прогресс изучения");
  assert(!controller.isStudyMode, "режим проверки не включился");

  controller.stop();
});

for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} проверок пройдено`);
process.exit(failed === 0 ? 0 : 1);
