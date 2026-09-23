/**
 * Всплывающая подсказка, следующая за курсором и не вылезающая за край окна.
 *
 * Содержимое задаёт владелец через render-колбэк: подсказка сама не знает,
 * что показывает — давление в манометре или значение прибора.
 */
const CURSOR_OFFSET_PX = 16;
const SCREEN_MARGIN_PX = 14;

class Tooltip {
  /**
   * @param {object} config
   * @param {string} config.className     CSS-класс корневого элемента
   * @param {Element} config.parentEl     куда вставить элемент подсказки
   * @param {number} [config.fallbackWidth]  ширина до первой отрисовки
   * @param {number} [config.fallbackHeight] высота до первой отрисовки
   */
  constructor({ className, parentEl, fallbackWidth = 200, fallbackHeight = 80 }) {
    this.fallbackWidth = fallbackWidth;
    this.fallbackHeight = fallbackHeight;

    const existing = parentEl.querySelector(`.${className}`);
    if (existing) {
      this.el = existing;
      return;
    }

    const el = document.createElement("div");
    el.className = `${className} hidden`;
    el.setAttribute("aria-hidden", "true");
    parentEl.appendChild(el);
    this.el = el;
  }

  /** Ставит подсказку рядом с курсором, удерживая её в границах окна. */
  moveTo(clientX, clientY) {
    if (!this.el) return;

    const width = this.el.offsetWidth || this.fallbackWidth;
    const height = this.el.offsetHeight || this.fallbackHeight;
    const maxX = window.innerWidth - width - SCREEN_MARGIN_PX;
    const maxY = window.innerHeight - height - SCREEN_MARGIN_PX;

    const x = Math.min(
      Math.max(SCREEN_MARGIN_PX, clientX + CURSOR_OFFSET_PX),
      Math.max(SCREEN_MARGIN_PX, maxX),
    );
    const y = Math.min(
      Math.max(SCREEN_MARGIN_PX, clientY + CURSOR_OFFSET_PX),
      Math.max(SCREEN_MARGIN_PX, maxY),
    );

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  setText(text) {
    if (this.el) this.el.textContent = text;
  }

  setHtml(html) {
    if (this.el) this.el.innerHTML = html;
  }

  show() {
    this.el?.classList.remove("hidden");
  }

  hide() {
    this.el?.classList.add("hidden");
  }
}

export { Tooltip };
