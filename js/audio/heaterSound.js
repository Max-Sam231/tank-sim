/**
 * Звук предпускового подогревателя.
 *
 * При воспламенении — короткий хлопок (`heaterIgnite`).
 * Пока `_heaterBurning` — зацикленный гул (`heaterBurn`).
 */

const BURN_VOLUME = 0.45;
const BURN_PITCH = 0.85;

/**
 * Синхронизирует дорожку горения с флагом `heaterBurning`.
 * @param {HTMLAudioElement | undefined} burnTrack
 * @param {boolean} isBurning
 */
function updateHeaterBurnSound(burnTrack, isBurning) {
  if (!burnTrack) return;

  if (!isBurning) {
    if (!burnTrack.paused) {
      burnTrack.pause();
      burnTrack.currentTime = 0;
    }
    return;
  }

  burnTrack.volume = BURN_VOLUME;
  burnTrack.playbackRate = BURN_PITCH;
  if (burnTrack.paused) burnTrack.play().catch(() => {});
}

export { updateHeaterBurnSound, BURN_VOLUME, BURN_PITCH };
