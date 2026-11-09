import { SOUND_DEFS, SOUNDS_PATH } from "./soundDefs.js";
import { WATCHED_KEYS, INITIAL_SOUND_STATE, playStateSounds } from "./stateSounds.js";
import { updateEngineSound, updateStarterSound } from "./engineSound.js";

/**
 * Звуковое сопровождение тренажёра.
 *
 * Браузеры не дают проигрывать звук до первого действия пользователя,
 * поэтому воспроизведение разблокируется по первому клику (`init`),
 * а до этого вызовы `play` откладываются.
 *
 * Звуки органов управления выводятся из сравнения снимков состояния —
 * таблица соответствий лежит в stateSounds.js.
 */
const UNLOCK_RETRY_MS = 100;

export class AudioManager {
  constructor() {
    this.isInitialized = false;
    this.audioContext = null;
    this.prevState = { ...INITIAL_SOUND_STATE };

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.warn("Web Audio API не поддерживается", err);
    }

    this.sounds = {};
    for (const [name, def] of Object.entries(SOUND_DEFS)) {
      const audio = new Audio(`${SOUNDS_PATH}/${def.file}`);
      if (def.loop) audio.loop = true;
      if (def.volume !== undefined) audio.volume = def.volume;
      this.sounds[name] = audio;
    }
  }

  // --- Разблокировка воспроизведения ---------------------------------------

  init() {
    if (this.isInitialized) return;

    if (this.audioContext?.state === "suspended") {
      this.audioContext
        .resume()
        .catch((err) => console.warn("Не удалось разблокировать AudioContext:", err))
        .finally(() => this._unlockPlayback());
      return;
    }

    this._unlockPlayback();
  }

  /** Пробует беззвучно проиграть короткий звук — этого хватает для разблокировки. */
  _unlockPlayback() {
    const probe = this.sounds.click;
    if (!probe) {
      this.isInitialized = true;
      return;
    }

    const previousVolume = probe.volume;
    probe.volume = 0.01;

    probe
      .play()
      .then(() => {
        probe.pause();
        probe.currentTime = 0;
      })
      .catch((err) => console.warn("Звук остался заблокирован:", err.message))
      .finally(() => {
        probe.volume = previousVolume;
        this.isInitialized = true;
      });
  }

  // --- Воспроизведение -----------------------------------------------------

  play(name) {
    if (!this.isInitialized) {
      // Первый звук мог прийти раньше клика — разблокируем и повторим
      this.init();
      setTimeout(() => this.play(name), UNLOCK_RETRY_MS);
      return;
    }

    const sound = this.sounds[name];
    if (!sound) {
      console.warn(`AudioManager: звук [${name}] не найден`);
      return;
    }

    sound.currentTime = 0;
    sound.play().catch((err) => console.error(`Ошибка воспроизведения [${name}]:`, err));
  }

  stop(name) {
    const sound = this.sounds[name];
    if (!sound || sound.paused) return;

    sound.pause();
    sound.currentTime = 0;
  }

  stopAll() {
    for (const sound of Object.values(this.sounds)) {
      if (typeof sound?.pause !== "function") continue;
      sound.pause();
      sound.currentTime = 0;
    }

    // Возвращаем исходные положения: после паузы звуки не должны «доигрывать» переходы
    this.prevState = { ...INITIAL_SOUND_STATE };
  }

  // --- Реакция на состояние танка -----------------------------------------

  onStateChange(state) {
    playStateSounds(this, state, this.prevState);

    // Непрерывные звуки молчат, пока воспроизведение не разблокировано
    if (this.isInitialized) {
      // Стартер приоритетнее: он звучит, пока двигатель не подхватил
      updateStarterSound(this.sounds.starter, state.engine_rpm, state.engineRunning);
      updateEngineSound(
        { idle: this.sounds.engine, load: this.sounds.engineLoad },
        state.engine_rpm,
        state.engineRunning,
        state,
      );
    }

    this.prevState = Object.fromEntries(WATCHED_KEYS.map((key) => [key, state[key]]));
  }
}
