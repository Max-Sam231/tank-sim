import { getControlOverlayFrame } from "./controlOverlayFrame.js";
import { GaugeArrows } from "./GaugeArrows.js";
import { hitboxMetrics, framePercent, applyFrame, viewBoxSize } from "./overlayGeometry.js";

/**
 * Спрайты органов управления поверх фона.
 *
 * Для каждого хитбокса с известным описанием создаётся картинка,
 * которая меняется вслед за состоянием: положение тумблера, рычага,
 * крана. Спрайты живут в двух местах — в кабине и на щитке КИП, —
 * и строятся одинаково, отличаются только слоем разметки.
 */
const DEFAULT_Z = 50;

class OverlayRenderer {
  /**
   * @param {object} deps
   * @param {Element} deps.rootEl корень сцены
   * @param {object} deps.defs описания органов управления
   * @param {boolean} [deps.isDebug]
   */
  constructor({ rootEl, defs, isDebug = false }) {
    this.rootEl = rootEl;
    this.defs = defs;

    /** Спрайты по имени действия. */
    this.elements = new Map();
    /** Опорная геометрия хитбокса — нужна при каждой перерисовке. */
    this.metrics = new Map();

    this.gaugeArrows = new GaugeArrows(defs, isDebug);

    /** Статические оверлеи из разметки, переключаемые по состоянию. */
    this.staticOverlayEls = Array.from(
      rootEl.querySelectorAll(".overlay[data-action][data-when]"),
    );
  }

  getElement(action) {
    return this.elements.get(action);
  }

  /** Контейнер спрайтов внутри слоя оверлеев; создаётся при первом обращении. */
  _ensureContainer(overlayLayerEl) {
    let container = overlayLayerEl.querySelector(".overlay-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "overlay-container";
      overlayLayerEl.appendChild(container);
    }
    return container;
  }

  /**
   * Создаёт спрайты по хитбоксам слоя.
   * @param {object} options
   * @param {Element} options.overlayLayerEl куда складывать спрайты
   * @param {SVGElement} options.svgEl слой хитбоксов
   * @param {boolean} [options.skipGauges] приборы рисуются стрелками, а не спрайтами
   */
  _buildFrom({ overlayLayerEl, svgEl, skipGauges = false }) {
    const container = this._ensureContainer(overlayLayerEl);
    const { vbW, vbH } = viewBoxSize(svgEl);

    for (const hitbox of svgEl.querySelectorAll(".hitbox[data-action]")) {
      const action = hitbox.dataset.action;
      const def = action ? this.defs[action] : null;
      if (!def) continue;
      if (skipGauges && def.kind === "gauge") continue;

      const metrics = hitboxMetrics(hitbox);
      if (!metrics) continue;

      const meta = { ...metrics, vbW, vbH };

      const img = document.createElement("img");
      img.className = "overlay overlay-control is-visible";
      img.setAttribute("data-action", action);
      img.setAttribute("alt", "");
      img.setAttribute("draggable", "false");

      applyFrame(img, framePercent(meta, def));
      img.style.setProperty("--rot", "0");
      img.style.setProperty("--z", String(def.z ?? DEFAULT_Z));

      container.appendChild(img);
      this.elements.set(action, img);
      this.metrics.set(action, meta);
    }

    return container;
  }

  /** Спрайты органов управления в кабине механика-водителя. */
  buildCabinOverlays() {
    const overlayLayerEl = this.rootEl.querySelector(".overlay-layer");
    const svgEl = this.rootEl.querySelector("svg.hitbox-layer");
    if (!overlayLayerEl || !svgEl) return;

    this.elements.forEach((el) => el.remove());
    this.elements.clear();
    this.metrics.clear();

    this._buildFrom({
      overlayLayerEl,
      svgEl: this.rootEl.querySelector("svg.cabin-hitbox-layer") || svgEl,
    });
  }

  /** Спрайты и стрелки на щитке контрольно-измерительных приборов. */
  buildInstrumentPanelOverlays() {
    const panelStageEl = this.rootEl.querySelector(".instrument-panel-stage");
    if (!panelStageEl) return;

    const overlayLayerEl = Array.from(panelStageEl.children).find((el) =>
      el.classList?.contains("overlay-layer"),
    );
    const svgEl = panelStageEl.querySelector("svg.instrument-panel-hitbox-layer");
    if (!overlayLayerEl || !svgEl) return;

    // Спрайты кабины не трогаем — убираем только те, что уже лежат на щитке
    for (const [action, el] of this.elements) {
      if (!el.closest(".instrument-panel-stage")) continue;
      el.remove();
      this.elements.delete(action);
      this.metrics.delete(action);
    }

    const container = this._buildFrom({ overlayLayerEl, svgEl, skipGauges: true });
    const { vbW, vbH } = viewBoxSize(svgEl);
    this.gaugeArrows.build(container, vbW, vbH);
  }

  /** Перерисовывает спрайты и стрелки по текущему состоянию. */
  render(snapshot) {
    this._renderStaticOverlays(snapshot);

    for (const [action, el] of this.elements) {
      const frame = getControlOverlayFrame(this.defs[action], snapshot);
      if (!frame) continue;

      if (el.getAttribute("src") !== frame.src) el.setAttribute("src", frame.src);
      el.classList.add("is-visible");

      const meta = this.metrics.get(action);
      if (!meta) continue;

      applyFrame(el, framePercent(meta, frame));
      if (Number.isFinite(frame.z)) el.style.setProperty("--z", String(frame.z));
    }

    this.gaugeArrows.update(snapshot);
  }

  /** Оверлеи, заданные прямо в разметке через data-when. */
  _renderStaticOverlays(snapshot) {
    for (const el of this.staticOverlayEls) {
      const when = el.dataset.when;
      const isOn = Boolean(snapshot.isBatteryOn);

      const shouldShow =
        el.dataset.action === "battery-toggle" && (isOn ? when === "on" : when === "off");

      el.classList.toggle("is-visible", shouldShow);
    }
  }
}

export { OverlayRenderer };
