class StartMenu {
  constructor({ rootEl, onTrainingStart, onInstruction }) {
    this.rootEl = rootEl;
    this.onTrainingStart = onTrainingStart;
    this.onInstruction = onInstruction;
    this.currentScreen = 'main';
    this._build();
  }

  _build() {
    // Main start screen
    const mainScreen = document.createElement('div');
    mainScreen.className = 'start-screen start-screen-main';
    mainScreen.setAttribute('data-screen', 'main');
    mainScreen.innerHTML = `
      <nav class="start-nav">
        <button class="start-nav-item" data-action="training">Тренировка</button>
        <button class="start-nav-item" data-action="instruction">Инструкция</button>
      </nav>
    `;

    // Training screen (scenario selection)
    const trainingScreen = document.createElement('div');
    trainingScreen.className = 'start-screen start-screen-training';
    trainingScreen.setAttribute('data-screen', 'training');
    trainingScreen.innerHTML = `
      <div class="training-header">
        <button class="training-back" data-action="back">← Назад</button>
        <h1 class="training-title">Тренировка</h1>
      </div>
      <div class="training-content">
        <div class="scenario-menu-full">
          <div class="scenario-menu-content-full">
            <div class="scenario-menu-title">Условия тренировки</div>
            <label class="scenario-menu-field">
              <span class="scenario-menu-label">Сценарий</span>
              <select id="scenarioStartMethod" class="scenario-menu-input">
                <option value="prestart-preparation">Подготовка к пуску</option>
              </select>
            </label>
            <label class="scenario-menu-field">
              <span class="scenario-menu-label">Температура, °C</span>
              <select id="scenarioAmbientTemp" class="scenario-menu-input">
                <option value="20" selected>+20</option>
              </select>
            </label>
            <label class="scenario-menu-field">
              <span class="scenario-menu-label">Вид топлива</span>
              <select id="scenarioFuelType" class="scenario-menu-input">
                <option value="diesel" selected>Дизель</option>
                <option value="gasoline">Бензин</option>
              </select>
            </label>
            <button class="scenario-menu-apply-full" id="scenarioApply">Начать тренировку</button>
          </div>
        </div>
      </div>
    `;

    // Instruction screen (placeholder)
    const instructionScreen = document.createElement('div');
    instructionScreen.className = 'start-screen start-screen-instruction';
    instructionScreen.setAttribute('data-screen', 'instruction');
    instructionScreen.innerHTML = `
      <div class="instruction-header">
        <button class="instruction-back" data-action="back">← Назад</button>
        <h1 class="instruction-title">Инструкция</h1>
      </div>
      <div class="instruction-content">
        <p class="instruction-placeholder">Здесь будет инструкция...</p>
      </div>
    `;

    this.rootEl.appendChild(mainScreen);
    this.rootEl.appendChild(trainingScreen);
    this.rootEl.appendChild(instructionScreen);

    // Add fullscreen modal
    const fullscreenModal = document.createElement('div');
    fullscreenModal.className = 'start-fullscreen-modal';
    fullscreenModal.innerHTML = `
      <div class="start-fullscreen-modal-content">
        <h2>Нажмите для синхронизации размеров экрана</h2>
        <p>Программа работает корректно только в полноэкранном режиме</p>
        <button class="start-fullscreen-modal-button" id="startFullscreenButton">Перейти в полноэкранный режим</button>
      </div>
    `;
    this.rootEl.appendChild(fullscreenModal);

    this._wireEvents();
    this.showScreen('main');
    this._showFullscreenModal();
  }

  _wireEvents() {
    this.rootEl.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      switch (action) {
        case 'training':
          this.showScreen('training');
          break;
        case 'instruction':
          this.showScreen('instruction');
          if (this.onInstruction) this.onInstruction();
          break;
        case 'back':
          this.showScreen('main');
          break;
      }
    });

    // Apply scenario button
    const applyBtn = this.rootEl.querySelector('#scenarioApply');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const startMethod = this.rootEl.querySelector('#scenarioStartMethod')?.value || 'prestart-preparation';
        const ambientTemp = Number(this.rootEl.querySelector('#scenarioAmbientTemp')?.value) || 20;
        const fuelType = this.rootEl.querySelector('#scenarioFuelType')?.value || 'diesel';
        if (this.onTrainingStart) {
          this.onTrainingStart({ startMethod, ambientTemp, fuelType });
        }
      });
    }

    // Fullscreen modal button
    const fullscreenBtn = this.rootEl.querySelector('#startFullscreenButton');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
          document.documentElement.msRequestFullscreen();
        }
        this._hideFullscreenModal();
      });
    }
  }

  _showFullscreenModal() {
    const modal = this.rootEl.querySelector('.start-fullscreen-modal');
    if (modal) modal.style.display = 'flex';
  }

  _hideFullscreenModal() {
    const modal = this.rootEl.querySelector('.start-fullscreen-modal');
    if (modal) modal.style.display = 'none';
  }

  showScreen(name) {
    const screens = this.rootEl.querySelectorAll('.start-screen');
    screens.forEach(screen => {
      if (screen.getAttribute('data-screen') === name) {
        screen.classList.add('is-active');
      } else {
        screen.classList.remove('is-active');
      }
    });
    this.currentScreen = name;
  }

  hide() {
    this.rootEl.classList.add('is-hidden');
  }

  show() {
    this.rootEl.classList.remove('is-hidden');
    this.showScreen('main');
  }
}

export { StartMenu };
