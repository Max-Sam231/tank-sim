/**
 * Звук двигателя и стартера.
 *
 * Двигатель озвучен двумя дорожками: холостой ход и работа под нагрузкой.
 * Подача топлива перекрёстно смешивает их, обороты задают тональность —
 * так один короткий сэмпл звучит по-разному на всём диапазоне.
 */
const IDLE_VOLUME = 0.2;
const IDLE_DUCKING = 0.8; // насколько холостой ход приглушается под нагрузкой
const LOAD_VOLUME = 0.9;
const SILENCE_THRESHOLD = 0.01;

const ENGINE_BASE_RPM = 900;
const ENGINE_RPM_SPAN = 1600;
const ENGINE_PITCH_SPAN = 0.6;
const ENGINE_PITCH_MIN = 0.8;
const ENGINE_PITCH_MAX = 1.8;

const STARTER_BASE_RPM = 100;
const STARTER_RPM_SPAN = 200;
const STARTER_PITCH_SPAN = 0.3;
const STARTER_PITCH_MIN = 0.8;
const STARTER_PITCH_MAX = 1.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Суммарная подача топлива, 0..1: педаль газа плюс ручная подача. */
function throttleOf(state) {
  if (!state.engineRunning) return 0;

  const gasPull = state.gasPedal ? 0.7 : 0.0;
  const manualPull = (state.fuelManualFeed / 100) * 0.5;

  return Math.min(1.0, gasPull + manualPull);
}

/** Запускает или останавливает дорожку по её громкости — тишину не крутим зря. */
function syncPlayback(track) {
  if (!track) return;

  if (track.paused && track.volume > SILENCE_THRESHOLD) {
    track.play().catch(() => {});
  } else if (!track.paused && track.volume <= SILENCE_THRESHOLD) {
    track.pause();
    track.currentTime = 0;
  }
}

/**
 * Звук прокрутки стартером.
 * Звучит, только пока обороты есть, а двигатель ещё не подхватил.
 */
function updateStarterSound(starter, rpm, isRunning) {
  if (!starter) return;

  const isCranking = rpm > 0 && !isRunning;

  if (!isCranking) {
    if (!starter.paused) {
      starter.pause();
      starter.currentTime = 0;
    }
    return;
  }

  if (starter.paused) starter.play().catch(() => {});

  const rate = 1.0 + ((rpm - STARTER_BASE_RPM) / STARTER_RPM_SPAN) * STARTER_PITCH_SPAN;
  starter.playbackRate = clamp(rate, STARTER_PITCH_MIN, STARTER_PITCH_MAX);
}

/** Звук работающего двигателя: смешивание дорожек и тональность по оборотам. */
function updateEngineSound({ idle, load }, rpm, isRunning, state) {
  if (!isRunning) {
    idle?.pause();
    load?.pause();
    return;
  }

  const throttle = throttleOf(state);

  if (idle) idle.volume = IDLE_VOLUME * (1.0 - throttle * IDLE_DUCKING);
  if (load) load.volume = LOAD_VOLUME * throttle;

  syncPlayback(idle);
  syncPlayback(load);

  // Тональность зависит только от оборотов — одинаково для обеих дорожек
  const rate = 1.0 + ((rpm - ENGINE_BASE_RPM) / ENGINE_RPM_SPAN) * ENGINE_PITCH_SPAN;
  const pitch = clamp(rate, ENGINE_PITCH_MIN, ENGINE_PITCH_MAX);

  if (idle) idle.playbackRate = pitch;
  if (load) load.playbackRate = pitch;
}

export { updateStarterSound, updateEngineSound, throttleOf };
