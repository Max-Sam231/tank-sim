import { pulseHitbox } from "./hitboxStyle.js";

/**
 * Сцена ящика ЗИП (#scene-zip-box): ключ и козырёк выхлопа.
 * Козырёк становится доступен только после снятия крышки выхлопа.
 */
const HINTS = {
  idle: "Ящик ЗИП",
  hasKey: "Ключ у вас",
  capAvailable: "Доступен козырёк выхлопа",
  hasCap: "Козырёк у вас",
};

class ZipBoxController {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  get sectionEl() {
    return document.getElementById("scene-zip-box");
  }

  bindUI() {
    const layer = this.sectionEl?.querySelector(".zip-hitbox-layer");
    if (!layer || layer.dataset.bound === "1") return;

    layer.dataset.bound = "1";
    layer.addEventListener("click", (e) => this.onZoneClick(e));
  }

  onZoneClick(event) {
    const hit = event.target.closest(".hitbox");
    const zone = hit?.dataset.zone;
    if (!zone) return;

    if (zone === "zip-key") return this._onKeyClick(hit);
    if (zone === "zip-exhaust-cap") return this._onCapClick(hit);
    return undefined;
  }

  _onKeyClick(hit) {
    if (this.state?.hasZipKey) return;

    this.state?.takeZipKey?.();
    hit.classList.add("hidden");
    this._setHint(HINTS.hasKey);
    this.updateCapHitbox();
  }

  _onCapClick(hit) {
    if (!this.state?.canTakeExhaustCap?.()) {
      // Сначала нужно снять крышку выхлопа
      pulseHitbox(hit);
      return;
    }

    this.state?.takeExhaustCap?.();
    hit.classList.add("hidden");
    this._setHint(HINTS.hasCap);
  }

  _setHint(text) {
    const hint = this.sectionEl?.querySelector("#zipHint");
    if (hint) hint.textContent = text;
  }

  _hintText() {
    if (this.state?.hasExhaustCap) return HINTS.hasCap;
    if (this.state?.canTakeExhaustCap?.()) return HINTS.capAvailable;
    if (this.state?.hasZipKey) return HINTS.hasKey;
    return HINTS.idle;
  }

  /** Открывает хитбокс козырька, как только он стал доступен. */
  updateCapHitbox() {
    const section = this.sectionEl;
    if (!section) return;

    const canTake = Boolean(this.state?.canTakeExhaustCap?.());
    section.querySelector('[data-zone="zip-exhaust-cap"]')?.classList.toggle("hidden", !canTake);
    if (canTake) this._setHint(HINTS.capAvailable);
  }

  /** Восстанавливает разметку сцены по состоянию — после возврата в сцену. */
  syncDOM() {
    const section = this.sectionEl;
    if (!section) return;

    section
      .querySelector('[data-zone="zip-key"]')
      ?.classList.toggle("hidden", Boolean(this.state?.hasZipKey));
    section
      .querySelector('[data-zone="zip-exhaust-cap"]')
      ?.classList.toggle("hidden", !this.state?.canTakeExhaustCap?.());

    this._setHint(this._hintText());
  }
}

export { ZipBoxController };
