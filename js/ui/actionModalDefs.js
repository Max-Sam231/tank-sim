/**
 * Конфигурация модальных окон выбора положения органа управления.
 * Каждое описание полностью задаёт поведение экземпляра ChoiceModal.
 */

/**
 * Картинка-схема с красным маркером текущего положения.
 * Используется для рычагов, у которых положение — точка на вертикальной шкале.
 */
function renderMarkerImage({ src, alt, topPercent, markerOffsetPx, corners = null, hiddenLabel = "" }) {
  const cornersHtml = corners
    ? `
        <div style="position: absolute; top: 12px; right: 12px; color: rgba(255,255,255,0.9); font-size: 13px;">${corners.top}</div>
        <div style="position: absolute; bottom: 12px; right: 12px; color: rgba(255,255,255,0.9); font-size: 13px;">${corners.bottom}</div>`
    : "";

  const hiddenLabelHtml = hiddenLabel
    ? `<div style="position: absolute; left: -9999px;">${hiddenLabel}</div>`
    : "";

  return `
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <img src="${src}" alt="${alt}" style="width: 100%; height: 100%; object-fit: contain;" />
        <div style="position: absolute; top: ${topPercent}%; left: calc(50% - ${markerOffsetPx}px); width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 100, 100, 0.95); box-shadow: 0 0 8px rgba(255, 100, 100, 0.65); transform: translateY(-50%);"></div>${cornersHtml}
      </div>${hiddenLabelHtml}
    `;
}

const BCN_IMAGES = {
  off: "./img/8/кран-выкл.png",
  on: "./img/8/кран-вкл.png",
  pump: "./img/8/кран-откач.png",
};

const SHUTTERS_LABELS = {
  0: "ЗАКРЫТО",
  1: "ПОЛУЗАКРЫТО",
  2: "ПОСЕРЕДИНЕ",
  3: "ПОЛУОТКРЫТО",
  4: "ОТКРЫТО",
};

const SHUTTERS_MARKER_TOP = { 0: 72, 1: 60, 2: 48, 3: 36, 4: 24 };

const GEAR_MARKER_TOP = {
  neutral: 73,
  1: 62,
  2: 51,
  3: 41,
  4: 31,
  5: 22,
  6: 15,
  7: 7,
  R: 85,
};

const ACTION_MODAL_DEFS = {
  bcn: {
    modalId: "bcnModal",
    imageId: "bcnModalImage",
    closeId: "bcnModalClose",
    datasetKey: "bcnMode",
    stateKey: "bcn",
    notifyAction: "bcn",
    apply: (state, value) => state.setBcnMode(value),
    renderImage: (mode) => `<img src="${BCN_IMAGES[mode] || ""}" alt="БЦН" />`,
  },

  shutters: {
    modalId: "shuttersModal",
    imageId: "shuttersModalImage",
    closeId: "shuttersModalClose",
    datasetKey: "shuttersPosition",
    stateKey: "shutters",
    notifyAction: "shutters",
    apply: (state, value) => state.setShutters(value),
    renderImage: (position) =>
      renderMarkerImage({
        src: "./img/2/жалюзи.png",
        alt: "Жалюзи",
        topPercent: SHUTTERS_MARKER_TOP[position] || 50,
        markerOffsetPx: 14,
        corners: { top: "ОТКРЫТО", bottom: "ЗАКРЫТО" },
        hiddenLabel: SHUTTERS_LABELS[position] || "—",
      }),
  },

  gear: {
    modalId: "gearModal",
    imageId: "gearModalImage",
    closeId: "gearModalClose",
    datasetKey: "gearMode",
    stateKey: "gearLever",
    notifyAction: "gear-lever",
    apply: (state, value) => state.setGearLever(value),
    renderImage: (gear) =>
      renderMarkerImage({
        src: "./img/1/привод.png",
        alt: "Привод",
        topPercent: GEAR_MARKER_TOP[gear] || 50,
        markerOffsetPx: 8,
      }),
  },
};

export { ACTION_MODAL_DEFS };
