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
