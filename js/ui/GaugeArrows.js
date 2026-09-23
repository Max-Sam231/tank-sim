import { applyFrame } from "./overlayGeometry.js";

/**
 * Стрелки приборов на щитке КИП.
 *
 * У стрелок нет хитбоксов: их положение и ось вращения заданы прямо
 * в описании прибора. Значение датчика переводится в угол поворота.
 */
const DEFAULT_ARROW_IMAGE = "./img/12/14_0003_Фигура-1.png";
const DEFAULT_ARROW_SIZE = 70;
const DEFAULT_Z = 75;
const DEFAULT_PIVOT_X = 50;
const DEFAULT_PIVOT_Y = 100;

class GaugeArrows {
  /**
   * @param {object} defs описания органов управления и приборов
   * @param {boolean} isDebug рисовать ли метки осей вращения
   */
  constructor(defs, isDebug = false) {
    this.defs = defs;
    this.isDebug = isDebug;
    this.arrows = new Map();
  }

  /** Создаёт стрелки всех приборов заново. */
  build(containerEl, vbW, vbH) {
    this.arrows.forEach((el) => el.remove());
    this.arrows.clear();
    containerEl.querySelectorAll(".pivot-indicator").forEach((el) => el.remove());

    for (const [action, def] of Object.entries(this.defs)) {
      if (def.kind !== "gauge") continue;
      this._createArrow(action, def, containerEl, vbW, vbH);
    }
  }

  _createArrow(action, def, containerEl, vbW, vbH) {
    const arrowW = def.arrowW || DEFAULT_ARROW_SIZE;
    const arrowH = def.arrowH || DEFAULT_ARROW_SIZE;

    // Картинка стрелки центрируется по оси прибора
    const left = def.cx - arrowW / 2;
    const top = def.cy - arrowH / 2;

    const img = document.createElement("img");
    img.className = "overlay gauge-arrow is-visible";
    img.setAttribute("data-action", action);
    img.setAttribute("alt", "");
    img.setAttribute("draggable", "false");
    img.src = def.arrowImage || DEFAULT_ARROW_IMAGE;

    applyFrame(img, {
      x: (left / vbW) * 100,
      y: (top / vbH) * 100,
      w: (arrowW / vbW) * 100,
      h: (arrowH / vbH) * 100,
    });
    img.style.setProperty("--rot", String(def.startAngle));
    img.style.setProperty("--z", String(def.z ?? DEFAULT_Z));
    img.style.setProperty("--pivot-x", `${def.pivotX ?? DEFAULT_PIVOT_X}%`);
    img.style.setProperty("--pivot-y", `${def.pivotY ?? DEFAULT_PIVOT_Y}%`);

    containerEl.appendChild(img);
    this.arrows.set(action, img);

    if (this.isDebug) {
      this._addPivotMarker(containerEl, def, { left, top, arrowW, arrowH, vbW, vbH });
    }
  }

  /** Жёлтая точка в оси вращения — помогает выставлять стрелки по фону. */
  _addPivotMarker(containerEl, def, { left, top, arrowW, arrowH, vbW, vbH }) {
    const pivotAbsX = left + ((def.pivotX ?? DEFAULT_PIVOT_X) / 100) * arrowW;
    const pivotAbsY = top + ((def.pivotY ?? DEFAULT_PIVOT_Y) / 100) * arrowH;

    const dot = document.createElement("div");
    dot.className = "pivot-indicator";
    Object.assign(dot.style, {
      position: "absolute",
      left: `${(pivotAbsX / vbW) * 100}%`,
      top: `${(pivotAbsY / vbH) * 100}%`,
      width: "8px",
      height: "8px",
      backgroundColor: "yellow",
      borderRadius: "50%",
      border: "1px solid black",
      zIndex: "100",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
    });

    containerEl.appendChild(dot);
  }

  /**
   * Какую из двух шкал показывает сдвоенный прибор.
   * Вольтамперметр переключается кнопкой, топливомер — переключателем баков.
   */
  static usesSecondaryScale(action, switchValue) {
    if (action === "gauge-voltammeter") return Boolean(switchValue); // кнопка нажата — вольты
    if (action === "gauge-fuel") return switchValue === 0; // 0 = наружные баки
    return false;
  }

  /** Значение датчика и границы шкалы с учётом сдвоенных приборов. */
  static readValue(def, action, snapshot) {
    const read = (key) => Number(snapshot.sensors?.[key] ?? snapshot[key]) || 0;

    if (def.switchKey && def.secondarySensorKey) {
      if (GaugeArrows.usesSecondaryScale(action, snapshot[def.switchKey])) {
        return { value: read(def.secondarySensorKey), min: def.secondaryMin, max: def.secondaryMax };
      }
    }

    return { value: read(def.sensorKey), min: def.min, max: def.max };
  }

  /**
   * Доля отклонения стрелки от начала шкалы, 0..1.
   *
   * У ВА-540 шкала несимметричная (100-0-500 А): ноль стоит не посередине,
   * поэтому половины шкалы отображаются раздельно.
   */
  static normalize(def, value, min, max) {
    if (typeof def.zeroOffset !== "number") {
      return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    const normalized =
      value < 0
        ? def.zeroOffset * (1 - Math.abs(value) / (0 - min))
        : def.zeroOffset + (1 - def.zeroOffset) * (value / max);

    return Math.max(0, Math.min(1, normalized));
  }

  /** Поворачивает стрелки по текущим показаниям. */
  update(snapshot) {
    for (const [action, img] of this.arrows) {
      const def = this.defs[action];
      if (!def || def.kind !== "gauge") continue;

      const { value, min, max } = GaugeArrows.readValue(def, action, snapshot);
      const normalized = GaugeArrows.normalize(def, value, min, max);
      const angle = def.startAngle + normalized * (def.endAngle - def.startAngle);

      img.style.setProperty("--rot", String(angle));
    }
  }
}

export { GaugeArrows };
