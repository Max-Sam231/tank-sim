import { parsePolygonPoints, polygonCentroid } from "./polygonGeometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Рисует отладочные подписи в центре каждого хитбокса.
 * Вызывается только в режиме отладки; предыдущая группа подписей заменяется.
 *
 * @param {Element} rootEl корень сцены, внутри которого ищутся слои хитбоксов
 */
function renderHitboxLabels(rootEl) {
  if (!rootEl) return;

  rootEl.querySelectorAll("svg.hitbox-layer").forEach((svgEl) => {
    svgEl.querySelector("g.hitbox-labels")?.remove();

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "hitbox-labels");

    svgEl.querySelectorAll(".hitbox").forEach((hitbox) => {
      const label = (hitbox.dataset.label || hitbox.dataset.action || "hitbox").trim() || "hitbox";

      const points = parsePolygonPoints(hitbox.getAttribute("points"));
      if (points.length < 3) return;

      const center = polygonCentroid(points);
      if (!center) return;

      const textEl = document.createElementNS(SVG_NS, "text");
      textEl.setAttribute("class", "hitbox-label");
      textEl.setAttribute("x", String(center.x));
      textEl.setAttribute("y", String(center.y));
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("dominant-baseline", "middle");
      textEl.textContent = label;
      group.appendChild(textEl);
    });

    svgEl.appendChild(group);
  });
}

export { renderHitboxLabels };
