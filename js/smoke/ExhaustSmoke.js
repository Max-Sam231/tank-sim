// js/smoke/ExhaustSmoke.js
export class ExhaustSmoke {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.isRunning = false;
    this.rpm = 0;
    this.spawnTimer = null;
    // ✅ УВЕЛИЧИЛИ ЛИМИТ ЧАСТИЦ (было 25)
    this.maxParticles = 50; 
    this.currentDelay = 150; // ✅ УМЕНЬШИЛИ СТАРТОВУЮ ЗАДЕРЖКУ (было 200)
    this._findContainer();
  }

  _findContainer() {
    this.container = document.getElementById(this.containerId);
  }

  update(rpm, isRunning) {
    this.rpm = rpm;
    if (!this.container) {
      this._findContainer();
      return; 
    }

    if (isRunning && !this.isRunning) {
      this.start();
    } else if (!isRunning && this.isRunning) {
      this.stop();
    }

    if (this.isRunning) {
      // ✅ БОЛЕЕ АГРЕССИВНАЯ ФОРМУЛА ЧАСТОТЫ
      // От 150мс (холостые) до 30мс (максимальные обороты)
      const newDelay = Math.max(30, 150 - (rpm / 2500) * 120);
      
      if (Math.abs(newDelay - this.currentDelay) > 15) {
        clearInterval(this.spawnTimer);
        this.currentDelay = newDelay;
        this._startSpawning();
      }
    }
  }

  start() {
    if (this.isRunning || !this.container) return;
    this.isRunning = true;
    this.container.classList.remove('invisible');
    this.currentDelay = 150;
    this._startSpawning();
  }

  stop() {
    if (!this.container) return;
    this.isRunning = false;
    this.container.classList.add('invisible');
    this.container.innerHTML = '';
    clearInterval(this.spawnTimer);
  }

  _startSpawning() {
    if (!this.container) return;

    this.spawnTimer = setInterval(() => {
      if (!this.isRunning || !this.container) {
        clearInterval(this.spawnTimer);
        return;
      }

      if (this.container.children.length >= this.maxParticles) {
        this.container.removeChild(this.container.firstChild);
      }

      const particle = document.createElement('div');
      particle.className = 'smoke-particle';
      
      // ✅ УВЕЛИЧЕННЫЙ РАЗМЕР И ВАРИАТИВНОСТЬ
      const size = 35 + Math.random() * 25; // От 35px до 60px
      const offsetX = (Math.random() - 0.5) * 40; // Шире разброс по горизонтали
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `calc(50% + ${offsetX}px)`;
      
      // ✅ БОЛЕЕ ТЕМНЫЙ ДЫМ ПРИ ВЫСОКИХ ОБОРОТАХ
      const darkness = Math.min(1.0, 0.6 + (this.rpm / 2500) * 0.4);
      const gray = Math.round(60 * darkness); // Темнее база (было 80)
      particle.style.background = `radial-gradient(circle, rgba(${gray},${gray},${gray},0.95) 0%, transparent 75%)`;

      this.container.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) particle.remove();
      }, 2200); // Чуть дольше живет (было 1800)
      
    }, this.currentDelay);
  }
}