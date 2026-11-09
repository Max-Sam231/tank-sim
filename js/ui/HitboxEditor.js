/**
 * Редактор хитбоксов.
 *
 * Полигоны органов управления заданы в координатах SVG (1920×1080), и
 * подобрать их на глаз по числам нельзя — надо видеть картинку. Этот
 * редактор позволяет обвести орган прямо на сцене и получить готовую
 * строку разметки для вставки в index.html.
 *
 * Работает поверх любого слоя хитбоксов: кабина, приборная панель,
 * ангар. Слой выбирается тем, по какому месту сцены кликнули первый раз.
 *
 * Включается флагом SHOW_HITBOX_EDITOR в main.js.
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Все слои, на которых имеет смысл размечать. */
const LAYER_SELECTOR = "svg.hitbox-layer";

class HitboxEditor {
  constructor() {
    this.points = [];
    this.layerEl = null;
    this.previewEl = null;

    this._onSceneClick = this._handleSceneClick.bind(this);

    this._buildPanel();
    document.addEventListener("click", this._onSceneClick, true);
  }

  // --- Панель --------------------------------------------------------------

  _buildPanel() {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "hitbox-editor";
    this.rootEl.innerHTML = `
      <div class="hbe-header">
        <span>Разметка хитбокса</span>
        <button class="hbe-toggle" data-hbe-toggle type="button">–</button>
      </div>
      <div class="hbe-body">
        <label class="hbe-field">
          <span>data-action</span>
          <input class="hbe-input" data-hbe-action type="text" placeholder="ppo-discharge" />
        </label>
        <div class="hbe-hint">
          Кликай по сцене, обводя орган. Точек нужно не меньше трёх.
        </div>
        <div class="hbe-status" data-hbe-status>точек: 0</div>
        <div class="hbe-actions">
          <button class="hbe-btn" data-hbe-undo type="button">Отменить точку</button>
          <button class="hbe-btn" data-hbe-clear type="button">Сбросить</button>
          <button class="hbe-btn hbe-primary" data-hbe-copy type="button">Копировать</button>
        </div>
        <textarea class="hbe-output" data-hbe-output readonly rows="3"></textarea>
      </div>
    `;
    document.body.appendChild(this.rootEl);

    this.rootEl.addEventListener("click", (event) => {
      const t = event.target;
      if (t.dataset.hbeToggle !== undefined) this.rootEl.classList.toggle("is-collapsed");
      if (t.dataset.hbeUndo !== undefined) this.undo();
      if (t.dataset.hbeClear !== undefined) this.clear();
      if (t.dataset.hbeCopy !== undefined) this.copy();
    });

    this.rootEl
      .querySelector("[data-hbe-action]")
      .addEventListener("input", () => this._render());
  }

  get actionName() {
    return this.rootEl.querySelector("[data-hbe-action]").value.trim() || "имя-действия";
  }

  // --- Сбор точек ----------------------------------------------------------

  _handleSceneClick(event) {
    if (this.rootEl.contains(event.target)) return;

    const layerEl = event.target.closest(LAYER_SELECTOR) || this._layerUnder(event);
    if (!layerEl) return;

    // Клик размечает, а не нажимает орган управления
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (this.layerEl !== layerEl) {
      this.layerEl = layerEl;
      this.points = [];
      this._removePreview();
    }

    this.points.push(this._toViewBox(layerEl, event.clientX, event.clientY));
    this._render();
  }

  /** Слой под курсором: хитбоксы могут не покрывать нужное место. */
  _layerUnder(event) {
    const visible = [...document.querySelectorAll(LAYER_SELECTOR)].filter((el) =>
      el.getBoundingClientRect().width > 0 && !el.closest(".hidden"),
    );

    return visible.find((el) => {
      const r = el.getBoundingClientRect();
      return (
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom
      );
    });
  }

  /**
   * Экранные координаты в систему координат слоя.
   * preserveAspectRatio у слоёв разный, поэтому считаем через отношение
   * сторон: при xMidYMid картинка вписана с полями.
   */
  _toViewBox(layerEl, clientX, clientY) {
    const rect = layerEl.getBoundingClientRect();
    const vb = layerEl.viewBox.baseVal;
    const vbW = vb?.width || 1920;
    const vbH = vb?.height || 1080;

    const stretches = layerEl.getAttribute("preserveAspectRatio") === "none";

    if (stretches) {
      return {
        x: Math.round(((clientX - rect.left) / rect.width) * vbW),
        y: Math.round(((clientY - rect.top) / rect.height) * vbH),
      };
    }

    // Вписано с сохранением пропорций: по одной оси есть поля
    const scale = Math.min(rect.width / vbW, rect.height / vbH);
    const offsetX = (rect.width - vbW * scale) / 2;
    const offsetY = (rect.height - vbH * scale) / 2;

    return {
      x: Math.round((clientX - rect.left - offsetX) / scale),
      y: Math.round((clientY - rect.top - offsetY) / scale),
    };
  }

  // --- Управление ----------------------------------------------------------

  undo() {
    this.points.pop();
    this._render();
  }

  clear() {
    this.points = [];
    this._render();
  }

  copy() {
    const output = this.rootEl.querySelector("[data-hbe-output]");
    output.select();

    navigator.clipboard?.writeText(output.value).catch(() => {
      // Буфер может быть недоступен — строка всё равно выделена
    });
  }

  // --- Отрисовка -----------------------------------------------------------

  get pointsAttr() {
    return this.points.map((p) => `${p.x},${p.y}`).join(" ");
  }

  get markup() {
    if (this.points.length < 3) return "";
    return `<polygon class="hitbox" data-action="${this.actionName}" points="${this.pointsAttr}"></polygon>`;
  }

  _removePreview() {
    this.previewEl?.remove();
    this.previewEl = null;
  }

  _render() {
    const status = this.rootEl.querySelector("[data-hbe-status]");
    const output = this.rootEl.querySelector("[data-hbe-output]");

    status.textContent =
      this.points.length < 3
        ? `точек: ${this.points.length} — нужно не меньше трёх`
        : `точек: ${this.points.length}`;

    output.value = this.markup;

    this._renderPreview();
  }

  /** Показывает обводимый контур прямо на слое. */
  _renderPreview() {
    if (!this.layerEl || this.points.length === 0) {
      this._removePreview();
      return;
    }

    if (!this.previewEl || this.previewEl.ownerSVGElement !== this.layerEl) {
      this._removePreview();
      this.previewEl = document.createElementNS(SVG_NS, "polygon");
      this.previewEl.setAttribute("class", "hbe-preview");
      this.layerEl.appendChild(this.previewEl);
    }

    this.previewEl.setAttribute("points", this.pointsAttr);
  }

  dispose() {
    document.removeEventListener("click", this._onSceneClick, true);
    this._removePreview();
    this.rootEl.remove();
  }
}

export { HitboxEditor };
