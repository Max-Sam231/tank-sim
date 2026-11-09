/**
 * Выбор кадра спрайта органа управления по текущему состоянию.
 *
 * Три вида органов:
 *   boolean — два положения, включено и выключено
 *   enum    — именованные положения (передачи, режимы БЦН)
 *   range   — числовая величина, берётся ближайший по значению кадр
 *
 * Кадр может переопределять размер, смещение и слой, заданные
 * у органа целиком, — так подгоняются отдельные положения.
 */

/** Берёт значение из кадра, иначе из описания органа. */
function inherit(frame, def, key) {
  return Number.isFinite(frame?.[key]) ? frame[key] : def[key];
}

/** Кадр как объект: в описании он может быть просто строкой пути к картинке. */
function normalize(frame, def) {
  const src = typeof frame === "string" ? frame : frame?.src;
  if (!src) return null;

  return {
    src,
    inflate: inherit(frame, def, "inflate"),
    offsetX: inherit(frame, def, "offsetX"),
    offsetY: inherit(frame, def, "offsetY"),
    z: inherit(frame, def, "z"),
  };
}

/** Кадр, ближайший по значению к текущему. */
function nearestFrame(frames, value) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  if (!Number.isFinite(value)) return frames[0];

  let best = frames[0];
  let bestDistance = Infinity;

  for (const frame of frames) {
    const distance = Math.abs(value - frame.at);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = frame;
    }
  }

  return best;
}

/**
 * @returns {{src: string, inflate?: number, offsetX?: number, offsetY?: number, z?: number}|null}
 */
function getControlOverlayFrame(def, snapshot) {
  if (!def) return null;

  switch (def.kind) {
    case "boolean": {
      const src = snapshot[def.stateKey] ? def.on : def.off;
      return src ? { src, inflate: def.inflate, offsetX: def.offsetX, offsetY: def.offsetY, z: def.z } : null;
    }

    case "enum":
      return normalize(def.frames?.[snapshot[def.stateKey]] ?? def.frames?.neutral, def);

    case "range":
      return normalize(nearestFrame(def.frames, Number(snapshot[def.stateKey])), def);

    default:
      return null;
  }
}

export { getControlOverlayFrame };
