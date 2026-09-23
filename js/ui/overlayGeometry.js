import { parsePolygonPoints, polygonBBox } from "./polygonGeometry.js";

/**
 * Пересчёт координат спрайтов-оверлеев.
 *
 * Хитбоксы заданы в системе координат SVG (1920×1080), а спрайты
 * позиционируются в процентах от контейнера — так они масштабируются
 * вместе с фоном на любом разрешении.
 */
const DEFAULT_INFLATE = 1.6;

/**
 * Опорные размеры спрайта по многоугольнику хитбокса.
 * @returns {{cx: number, cy: number, bboxW: number, bboxH: number}|null}
 */
function hitboxMetrics(hitbox) {
  const points = parsePolygonPoints(hitbox.getAttribute("points"));
  if (points.length < 3) return null;

  const bbox = polygonBBox(points);
  if (!bbox) return null;

  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;

  return {
    cx: bbox.minX + bboxW / 2,
    cy: bbox.minY + bboxH / 2,
    bboxW,
    bboxH,
  };
}

/**
 * Положение и размер спрайта в процентах от контейнера.
 * Спрайт крупнее хитбокса в `inflate` раз и центрируется по нему.
 *
 * @param {{cx: number, cy: number, bboxW: number, bboxH: number, vbW: number, vbH: number}} meta
 * @param {{inflate?: number, offsetX?: number, offsetY?: number}} frame
 */
function framePercent(meta, frame = {}) {
  const inflate = Number.isFinite(frame.inflate) ? frame.inflate : DEFAULT_INFLATE;
  const offsetX = Number.isFinite(frame.offsetX) ? frame.offsetX : 0;
  const offsetY = Number.isFinite(frame.offsetY) ? frame.offsetY : 0;

  const targetW = Math.max(1, meta.bboxW * inflate);
  const targetH = Math.max(1, meta.bboxH * inflate);

  return {
    x: ((meta.cx - targetW / 2 + offsetX) / meta.vbW) * 100,
    y: ((meta.cy - targetH / 2 + offsetY) / meta.vbH) * 100,
    w: (targetW / meta.vbW) * 100,
    h: (targetH / meta.vbH) * 100,
  };
}

/** Проставляет CSS-переменные положения на элементе спрайта. */
function applyFrame(el, { x, y, w, h }) {
  el.style.setProperty("--x", String(x));
  el.style.setProperty("--y", String(y));
  el.style.setProperty("--w", String(w));
  el.style.setProperty("--h", String(h));
}

/** Размеры системы координат SVG-слоя. */
function viewBoxSize(svgEl) {
  const vb = svgEl?.viewBox?.baseVal;
  return { vbW: vb?.width || 1920, vbH: vb?.height || 1080 };
}

export { hitboxMetrics, framePercent, applyFrame, viewBoxSize, DEFAULT_INFLATE };
