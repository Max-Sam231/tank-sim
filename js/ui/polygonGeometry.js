/**
 * Геометрия SVG-полигонов хитбоксов.
 *
 * Чистые функции без зависимости от DOM: по строке атрибута points
 * считают центр тяжести (для подписи) и габаритный прямоугольник
 * (для позиционирования спрайта поверх хитбокса).
 */

/** Разбирает атрибут points вида "x1,y1 x2,y2 ..." в массив точек. */
function parsePolygonPoints(pointsAttr) {
  return String(pointsAttr || "")
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(","))
    .map(([x, y]) => ({ x: Number(x), y: Number(y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/**
 * Центр тяжести простого многоугольника (формула через площадь).
 * @returns {{x: number, y: number}|null} null для вырожденного полигона
 */
function polygonCentroid(points) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    const cross = p0.x * p1.y - p1.x * p0.y;
    area2 += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }

  if (area2 === 0) return null;

  const area = area2 / 2;
  return { x: Math.round(cx / (6 * area)), y: Math.round(cy / (6 * area)) };
}

/**
 * Габаритный прямоугольник набора точек.
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}|null}
 */
function polygonBBox(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const isDegenerate =
    !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY);

  return isDegenerate ? null : { minX, minY, maxX, maxY };
}

export { parsePolygonPoints, polygonCentroid, polygonBBox };
