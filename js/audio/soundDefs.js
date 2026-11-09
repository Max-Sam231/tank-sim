/**
 * Звуковая библиотека тренажёра.
 *
 * Зацикленные звуки (`loop`) играют непрерывно, пока идёт процесс:
 * работа двигателя, прокрутка стартером, подкачка топлива.
 * Остальные — короткие, на однократное воспроизведение.
 */
const SOUND_DEFS = {
  // Короткие звуки органов управления
  click: { file: "click.mp3" },
  switch: { file: "switch.mp3", volume: 0.7 },
  horn: { file: "horn.mp3" },
  hatch: { file: "hatch_move.mp3" },
  panel: { file: "panel_open.mp3" },
  valveOpen: { file: "valve_open.mp3" },
  valveClose: { file: "valve_close.mp3" },
  airHiss: { file: "air_hiss.mp3", volume: 0.5 },

  // Непрерывные процессы
  starter: { file: "starter_crank.mp3", loop: true, volume: 0.8 },
  engine: { file: "engine_idle.mp3", loop: true, volume: 0.4 },
  engineLoad: { file: "engine_load.mp3", loop: true, volume: 0.0 },
  fuel_pump: { file: "fuel_pump.mp3", loop: true, volume: 0.6 },
};

const SOUNDS_PATH = "/sounds";

export { SOUND_DEFS, SOUNDS_PATH };
