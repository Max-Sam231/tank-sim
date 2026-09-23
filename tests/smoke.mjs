/**
 * Дымовой тест: поднимает index.html в jsdom, инициализирует UIController
 * поверх настоящей разметки и проверяет, что ключевые элементы интерфейса живы.
 *
 * Запуск: npm run smoke
 */
import { readFileSync } from "node:fs";
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

  for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "getComputedStyle"]) {
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
