/**
 * Источник дыма на сцене.
 *
 * Частицы всплывают из заданного контейнера. Вид дыма задаётся стилем:
 * выхлоп тёмный и узкий, дымовая завеса белёсая и широкая, пожар —
 * чёрный, густой и самый широкий.
 *
 * Все три пользуются одним генератором, потому что отличаются только
 * числами: плотностью, разбросом, размером и цветом частиц.
 */
const PARTICLE_LIFETIME_MS = 2200;
const MAX_PARTICLES = 50;

/**
 * Насколько должна измениться пауза, чтобы пересобирать таймер.
 * Порог мелкий: у густого дыма весь диапазон плотности укладывается
 * в полтора десятка миллисекунд.
 */
const DELAY_CHANGE_THRESHOLD_MS = 4;

/**
 * Стили дыма.
 *   delayMs  — пауза между частицами (меньше — гуще)
 *   spread   — разброс по горизонтали, px
 *   size     — базовый размер частицы, px
 *   gray     — яркость, 0 чёрный / 255 белый
 */
const SMOKE_STYLES = {
  exhaust: { delayMs: 150, spread: 40, size: 35, gray: 60 },
  smokeScreen: { delayMs: 50, spread: 120, size: 70, gray: 210 },
  fire: { delayMs: 40, spread: 160, size: 90, gray: 25 },
};

class SmokeEmitter {
  /**
   * @param {string} containerId id контейнера, откуда идёт дым
   * @param {keyof SMOKE_STYLES} [styleName] вид дыма по умолчанию
   */
  constructor(containerId, styleName = "exhaust") {
    this.containerId = containerId;
    this.container = null;
    this.isRunning = false;
    this.spawnTimer = null;

    this.styleName = styleName;
    this.intensity = 0; // 0..1, влияет на плотность и темноту выхлопа

    this._findContainer();
  }

  _findContainer() {
    this.container = document.getElementById(this.containerId);
  }

  get style() {
    return SMOKE_STYLES[this.styleName] || SMOKE_STYLES.exhaust;
  }

  /**
   * @param {boolean} isActive идёт ли дым
   * @param {object} [options]
   * @param {number} [options.intensity] 0..1 — насколько густо и темно
   * @param {string} [options.style] сменить вид дыма
   */
  update(isActive, { intensity = 0, style } = {}) {
    if (style && style !== this.styleName) {
      this.styleName = style;
      this._restartSpawning();
    }

    this.intensity = Math.max(0, Math.min(1, intensity));

    if (!this.container) {
      this._findContainer();
      return;
    }

    if (isActive && !this.isRunning) this.start();
    else if (!isActive && this.isRunning) this.stop();
    else if (this.isRunning) this._syncDelay();
  }

  /** Плотность растёт вместе с интенсивностью. */
  get _targetDelay() {
    const { delayMs } = this.style;
    return Math.max(25, delayMs - delayMs * 0.75 * this.intensity);
  }

  _syncDelay() {
    if (Math.abs(this._targetDelay - this.currentDelay) <= DELAY_CHANGE_THRESHOLD_MS) return;
    this._restartSpawning();
  }

  _restartSpawning() {
    if (!this.isRunning) return;
    clearInterval(this.spawnTimer);
    this.currentDelay = this._targetDelay;
    this._startSpawning();
  }

  start() {
    if (this.isRunning || !this.container) return;

    this.isRunning = true;
    this.container.classList.remove("invisible");
    this.currentDelay = this._targetDelay;
    this._startSpawning();
  }

  stop() {
    if (!this.container) return;

    this.isRunning = false;
    this.container.classList.add("invisible");
    this.container.innerHTML = "";
    clearInterval(this.spawnTimer);
  }

  _startSpawning() {
    if (!this.container) return;

    this.spawnTimer = setInterval(() => {
      if (!this.isRunning || !this.container) {
        clearInterval(this.spawnTimer);
        return;
      }

      // Держим число частиц в рамках: старые уходят, освобождая место
      if (this.container.children.length >= MAX_PARTICLES) {
        this.container.removeChild(this.container.firstChild);
      }

      this.container.appendChild(this._createParticle());
    }, this.currentDelay);
  }

  _createParticle() {
    const { spread, size, gray } = this.style;

    const particle = document.createElement("div");
    particle.className = "smoke-particle";

    const diameter = size + Math.random() * 25;
    const offsetX = (Math.random() - 0.5) * spread;

    particle.style.width = `${diameter}px`;
    particle.style.height = `${diameter}px`;
    particle.style.left = `calc(50% + ${offsetX}px)`;

    // Тёмный дым темнеет ещё сильнее с интенсивностью, светлый не трогаем
    const shade = gray < 128 ? Math.round(gray * (1 - 0.4 * this.intensity)) : gray;
    particle.style.background =
      `radial-gradient(circle, rgba(${shade},${shade},${shade},0.95) 0%, transparent 75%)`;

    setTimeout(() => particle.remove(), PARTICLE_LIFETIME_MS);

    return particle;
  }
}

export { SmokeEmitter, SMOKE_STYLES };
