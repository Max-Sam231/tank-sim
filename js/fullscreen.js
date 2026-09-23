/**
 * Полноэкранный режим.
 *
 * Тренажёр рассчитан на полный экран: хитбоксы позиционируются в долях
 * от фона 1920×1080, и в окне произвольного размера они разъезжаются.
 * Поэтому при выходе из полного экрана показывается модальное окно.
 *
 * Префиксы вендоров нужны: в учебных классах стоят старые браузеры.
 */
const REQUEST_METHODS = [
  "requestFullscreen",
  "webkitRequestFullscreen",
  "mozRequestFullScreen",
  "msRequestFullscreen",
];

const CHANGE_EVENTS = ["fullscreenchange", "webkitfullscreenchange", "msfullscreenchange"];

/** Просит браузер развернуть страницу на весь экран. */
function requestFullscreen() {
  const doc = document.documentElement;

  for (const method of REQUEST_METHODS) {
    if (typeof doc[method] !== "function") continue;
    return Promise.resolve(doc[method]()).catch(() => {});
  }

  return Promise.reject(new Error("Полноэкранный режим не поддерживается"));
}

/** Развёрнута ли страница на весь экран прямо сейчас. */
function isFullscreen() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement,
  );
}

/** Подписывает обработчик на вход и выход из полноэкранного режима. */
function onFullscreenChange(handler) {
  for (const event of CHANGE_EVENTS) {
    document.addEventListener(event, handler);
  }
}

export { requestFullscreen, isFullscreen, onFullscreenChange };
