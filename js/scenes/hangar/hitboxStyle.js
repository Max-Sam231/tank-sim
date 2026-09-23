/**
 * Подсветка интерактивных хитбоксов в сценах ангара.
 * Сведено в одно место, чтобы цвета не расползались по обработчикам.
 */
const ENGAGED = { fill: "rgba(255, 255, 255, 0.35)", stroke: "rgba(255, 255, 255, 0.8)" };
const IDLE = { fill: "rgba(255, 255, 255, 0.15)", stroke: "rgba(255, 255, 255, 0.4)" };

/**
 * Помечает хитбокс как задействованный (шпингалет откинут, болт откручен).
 * @param {Element|null} el
 * @param {boolean} isEngaged
 */
function setHitboxEngaged(el, isEngaged) {
  if (!el) return;
  const style = isEngaged ? ENGAGED : IDLE;
  el.style.fill = style.fill;
  el.style.stroke = style.stroke;
}

/** Короткая пульсация — действие сейчас недоступно. */
function pulseHitbox(el) {
  if (!el) return;
  el.style.animation = "pulse 0.3s ease 3";
}

export { setHitboxEngaged, pulseHitbox };
