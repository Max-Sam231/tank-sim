/**
 * Модальное окно выбора одного значения из набора кнопок.
 *
 * Общая механика для БЦН, жалюзи и рычага передач: список кнопок,
 * подсветка активной и картинка-схема, отражающая текущее положение.
 * Отличия между ними вынесены в конфигурацию (actionModalDefs.js).
 */
class ChoiceModal {
  /**
   * @param {object} config
   * @param {string} config.modalId      id корневого элемента модалки
   * @param {string} config.imageId      id контейнера под картинку-схему
   * @param {string} config.closeId      id кнопки закрытия
   * @param {string} config.datasetKey   имя data-атрибута кнопки с выбранным значением
   * @param {string} [config.btnSelector] селектор кнопок выбора
   * @param {(value: string) => string} config.renderImage разметка картинки для значения
   * @param {(value: string) => void} [onSelect] вызывается при выборе значения
   */
  constructor({ modalId, imageId, closeId, datasetKey, btnSelector = ".bcn-modal-btn", renderImage }, onSelect) {
    this.modalEl = document.getElementById(modalId);
    this.imageEl = document.getElementById(imageId);
    this.datasetKey = datasetKey;
    this.btnSelector = btnSelector;
    this.renderImage = renderImage;
    this.onSelect = typeof onSelect === "function" ? onSelect : null;

    const closeBtn = closeId ? document.getElementById(closeId) : null;
    if (closeBtn) closeBtn.addEventListener("click", () => this.hide());

    if (this.modalEl) {
      this.modalEl.addEventListener("click", (event) => {
        const btn = event.target.closest(this.btnSelector);
        if (!btn) return;

        const value = btn.dataset[this.datasetKey];
        if (value === undefined) return;

        if (this.onSelect) this.onSelect(value);
        this.setValue(value);
      });
    }
  }

  show(value) {
    if (!this.modalEl) return;
    this.modalEl.classList.remove("hidden");
    this.setValue(value);
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.add("hidden");
  }

  get isOpen() {
    return Boolean(this.modalEl) && !this.modalEl.classList.contains("hidden");
  }

  /** Синхронизирует подсветку кнопок и картинку с переданным значением. */
  setValue(value) {
    const current = String(value);

    if (this.modalEl) {
      this.modalEl.querySelectorAll(this.btnSelector).forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset[this.datasetKey] === current);
      });
    }

    if (this.imageEl && this.renderImage) {
      this.imageEl.innerHTML = this.renderImage(current);
    }
  }
}

export { ChoiceModal };
