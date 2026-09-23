/**
 * Пометки изученных органов управления на сцене.
 *
 * Изученный орган гасится и больше не открывает карточку. Помечать
 * приходится по-разному: у органа со спрайтом подсвечивается картинка,
 * у чистого SVG-хитбокса (манометр, освещение кабины) — сам многоугольник.
 */
const CLASS_INACTIVE = "fam-item-inactive";
const CLASS_TESTED = "fam-item-tested";
const CLASS_TESTED_HITBOX = "fam-item-tested-hitbox";

const ALL_MARKS = [CLASS_INACTIVE, CLASS_TESTED, CLASS_TESTED_HITBOX];

/** Элемент помечается и по data-action, и по data-gauge — приборы идут вторым. */
function byKey(prefix, key) {
  return `${prefix}[data-action="${key}"], ${prefix}[data-gauge="${key}"]`;
}

/**
 * Помечает орган как изученный.
 * @param {string} key data-action или data-gauge органа
 * @param {Element|null} clickedEl элемент, по которому кликнули
 */
function markStudied(key, clickedEl = null) {
  const hitboxes = `${byKey(".hitbox", key)}, ${byKey(".overlay-control", key)}`;
  document.querySelectorAll(hitboxes).forEach((el) => el.classList.add(CLASS_INACTIVE));

  const sprites = document.querySelectorAll(`${byKey(".overlay-control", key)}, ${byKey("img", key)}`);
  const hasSprite = sprites.length > 0;

  if (hasSprite) {
    sprites.forEach((el) => el.classList.add(CLASS_TESTED));
  } else {
    document
      .querySelectorAll(byKey(".hitbox", key))
      .forEach((el) => el.classList.add(CLASS_TESTED_HITBOX));
  }

  if (!clickedEl) return;

  const isSprite = clickedEl.tagName === "IMG" || clickedEl.classList?.contains("overlay-control");
  if (isSprite) {
    clickedEl.classList.add(CLASS_TESTED);
  } else if (clickedEl.classList?.contains("hitbox") && !hasSprite) {
    clickedEl.classList.add(CLASS_TESTED_HITBOX);
  }
}

/** Возвращает пометки после перестроения сцены — спрайты создаются заново. */
function restoreMarks(studiedKeys) {
  studiedKeys.forEach((key) => markStudied(key, null));
}

/** Снимает все пометки — при входе в режим и при выходе из него. */
function clearMarks() {
  for (const className of ALL_MARKS) {
    document.querySelectorAll(`.${className}`).forEach((el) => el.classList.remove(className));
  }
}

export { markStudied, restoreMarks, clearMarks };
