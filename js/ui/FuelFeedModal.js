/**
 * Модальное окно рычага ручной подачи топлива.
 *
 * В отличие от ChoiceModal здесь не набор дискретных кнопок,
 * а вертикальный слайдер 0–100% с перетаскиванием.
 */
const THUMB_HEIGHT_PX = 16;

class FuelFeedModal {
  /**
   * @param {(percentage: number) => void} onChange вызывается при каждом изменении подачи
   */
  constructor(onChange) {
    this.onChange = typeof onChange === "function" ? onChange : null;

    this.modalEl = document.getElementById("fuelFeedModal");
    this.percentageEl = document.getElementById("fuelFeedPercentage");
    this.trackEl = document.getElementById("fuelFeedSliderTrack");
    this.fillEl = document.getElementById("fuelFeedSliderFill");
    this.thumbEl = document.getElementById("fuelFeedSliderThumb");

    this._dragging = false;

    const closeBtn = document.getElementById("fuelFeedModalClose");
    if (closeBtn) closeBtn.addEventListener("click", () => this.hide());

    if (this.trackEl) this._wireSlider();
  }

  _wireSlider() {
    const updateFromPosition = (clientY) => {
      const rect = this.trackEl.getBoundingClientRect();
      const relativeY = rect.bottom - clientY;
      const percentage = Math.max(0, Math.min(100, Math.round((relativeY / rect.height) * 100)));

      if (this.onChange) this.onChange(percentage);
      this.setValue(percentage);
    };

    this.trackEl.addEventListener("pointerdown", (event) => {
      this._dragging = true;
      this.trackEl.setPointerCapture(event.pointerId);
      updateFromPosition(event.clientY);
    });

    this.trackEl.addEventListener("pointermove", (event) => {
      if (!this._dragging) return;
      event.preventDefault();
      updateFromPosition(event.clientY);
    });

    this.trackEl.addEventListener("pointerup", (event) => {
      if (!this._dragging) return;
      this._dragging = false;
      this.trackEl.releasePointerCapture(event.pointerId);
    });

    this.trackEl.addEventListener("pointercancel", (event) => {
      this._dragging = false;
      this.trackEl.releasePointerCapture(event.pointerId);
    });
  }

  show(percentage) {
    if (!this.modalEl) return;
    this.modalEl.classList.remove("hidden");
    this.setValue(percentage);
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.add("hidden");
  }

  get isOpen() {
    return Boolean(this.modalEl) && !this.modalEl.classList.contains("hidden");
  }

  setValue(percentage) {
    if (!this.percentageEl || !this.fillEl || !this.thumbEl) return;

    this.percentageEl.textContent = `${percentage}%`;
    this.fillEl.style.height = `${percentage}%`;
    // Ползунок удерживается в границах дорожки с учётом собственной высоты
    this.thumbEl.style.bottom = `calc(${percentage}% - ${(percentage * THUMB_HEIGHT_PX) / 100}px)`;
  }
}

export { FuelFeedModal };
