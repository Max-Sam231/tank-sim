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

const window = bootDom();

const { TankState } = await import("../js/TankState.js");
const { UIController } = await import("../js/UIController.js");
const { ActionModals } = await import("../js/ui/ActionModals.js");

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
  const rootEl = window.document.querySelector(".stage") || window.document.body;
  const state = new TankState();
  const ui = new UIController({ rootEl, consoleEl: null, state, isDebug: false });
  assert(ui._actionModals instanceof ActionModals, "ActionModals не создан");
});

check("Модалки органов управления находят свою разметку", () => {
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
  const state = new TankState();
  const modals = new ActionModals({ state, onAction: () => {} });

  modals.open("gear");
  const btn = window.document.querySelector('#gearModal .bcn-modal-btn[data-gear-mode="3"]');
  assert(btn, "не найдена кнопка 3-й передачи");
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert(String(state.gearLever) === "3", `ожидалась передача 3, получена ${state.gearLever}`);

  modals.dispose();
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
