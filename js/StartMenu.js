class StartMenu {
  constructor({ rootEl, onTrainingStart, onInstruction, onFamiliarization }) {
    this.rootEl = rootEl;
    this.onTrainingStart = onTrainingStart;
    this.onInstruction = onInstruction;
    this.onFamiliarization = onFamiliarization;
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
        <button class="start-nav-item" data-action="familiarization">Ознакомление</button>
        <button class="start-nav-item" data-action="instruction">Инструкция</button>
        <button class="start-nav-item" data-action="authors">Авторы</button>
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
                <option value="air-start">Запуск сжатым воздухом</option>
                <option value="electric-start">Запуск стартером</option>
                <option value="combined-start">Комбинированный запуск</option>
                <option value="heater-warmup">Разогрев подогревателем</option>
              </select>
            </label>
            <label class="scenario-menu-field">
              <span class="scenario-menu-label">Температура, °C</span>
              <select id="scenarioAmbientTemp" class="scenario-menu-input">
                <option value="20" selected>+20</option>
                <option value="-20">-20</option>
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

    // Instruction screen (with tabbed layout)
    const instructionScreen = document.createElement('div');
    instructionScreen.className = 'start-screen start-screen-instruction';
    instructionScreen.setAttribute('data-screen', 'instruction');
    instructionScreen.innerHTML = `
      <div class="instruction-header">
        <button class="instruction-back" data-action="back">← Назад</button>
        <h1 class="instruction-title">Инструкция</h1>
      </div>
      <div class="instruction-content">
        <div class="instruction-tabs">
          <button class="instruction-tab-btn active" data-tab="inst-prep">Подготовка к пуску</button>
          <button class="instruction-tab-btn" data-tab="inst-air">Сжатым воздухом</button>
          <button class="instruction-tab-btn" data-tab="inst-electric">Стартером</button>
          <button class="instruction-tab-btn" data-tab="inst-combined">Комбинированный</button>
          <button class="instruction-tab-btn" data-tab="inst-winter">Зимний запуск</button>
          <button class="instruction-tab-btn" data-tab="inst-warmup">Разогрев подогревателем</button>
          <button class="instruction-tab-btn" data-tab="inst-heater">Обогреватель БО</button>
        </div>
        <div class="instruction-tabs-content">
          <div class="instruction-tab-pane active" id="inst-prep">
            <h3>Подготовка к пуску (+20°C, дизель)</h3>
            <ol>
              <li>Произведите контрольный осмотр машины (люки, уровни жидкостей, внешнее состояние).</li>
              <li>Убедитесь, что рычаг избирателя КПП находится в положении <strong>нейтрали</strong>.</li>
              <li>Затормозите машину <strong>остановочным тормозом</strong> (защелкните педаль тормоза).</li>
              <li>Убедитесь, что рукоятка ручной подачи топлива находится в положении <strong>нулевой подачи</strong>.</li>
              <li>Откройте вентили левого и правого воздушных баллонов (давление не ниже <strong>75 кгс/см²</strong>).</li>
              <li>Установите топливораспределительный кран в положение <strong>«БАКИ ВКЛЮЧЕНЫ»</strong>.</li>
              <li>Включите выключатель аккумуляторных батарей (<strong>Массу</strong>). Напряжение бортовой сети должно быть <strong>22–26 В</strong>.</li>
              <li>Откройте <strong>клапан выпуска воздуха</strong>.</li>
              <li>Прокачайте систему питания топливом насосом <strong>БЦН-1</strong> (не менее 3 качков, давление >= 1.2 кгс/см²).</li>
              <li>Перед пуском обязательно <strong>закройте клапан выпуска воздуха</strong>.</li>
              <li>Дайте предупредительный <strong>звуковой сигнал</strong>.</li>
            </ol>
          </div>
          <div class="instruction-tab-pane" id="inst-air">
            <h3>Запуск двигателя сжатым воздухом (+20°C)</h3>
            <ol>
              <li>Произведите контрольный осмотр машины (люки, уровни жидкостей, внешнее состояние).</li>
              <li>Убедитесь, что рычаг избирателя КПП находится в <strong>нейтрали</strong>, а машина заторможена <strong>остановочным тормозом</strong>.</li>
              <li>Убедитесь, что рукоятка ручной подачи топлива находится в положении <strong>нулевой подачи</strong>.</li>
              <li>Откройте вентили левого и правого воздушных баллонов (давление не ниже <strong>75 кгс/см²</strong>).</li>
              <li>Установите топливораспределительный кран в положение <strong>«БАКИ ВКЛЮЧЕНЫ»</strong>.</li>
              <li>Включите выключатель аккумуляторных батарей (<strong>Массу</strong>). Проверьте напряжение (<strong>22–26 В</strong>).</li>
              <li>Откройте <strong>клапан выпуска воздуха</strong>.</li>
              <li>Прокачайте систему питания топливом насосом <strong>БЦН-1</strong> (не менее 3 качков, давление >= 1.2 кгс/см²).</li>
              <li>Перед пуском обязательно <strong>закройте клапан выпуска воздуха</strong>.</li>
              <li>Убедитесь, что переключатель <strong>«КОМБИНИР.»</strong> установлен в положение <strong>«ОТКЛ»</strong>.</li>
              <li>Дайте предупредительный <strong>звуковой сигнал</strong>.</li>
              <li>Нажмите кнопку маслозакачивающего насоса <strong>МЗН-2</strong> и удерживайте ее для создания давления масла не ниже <strong>2 кгс/см²</strong>.</li>
              <li><strong>Не отпуская МЗН-2</strong>, нажмите кнопку <strong>ЭПК-48</strong> для прокрутки вала воздухом без подачи топлива (не более 5 секунд).</li>
              <li>Не отпуская ЭПК-48, нажмите педаль подачи топлива (<strong>газ</strong>) примерно на 1/3 хода до запуска двигателя.</li>
              <li>Как только двигатель запустился, <strong>отпустите кнопку ЭПК-48 и кнопку насоса МЗН-2</strong>.</li>
              <li>Установите минимальную частоту вращения холостого хода двигателя (<strong>800 об/мин</strong>).</li>
            </ol>
          </div>
          <div class="instruction-tab-pane" id="inst-electric">
            <h3>Запуск двигателя электростартером (+20°C)</h3>
            <ol>
              <li>Произведите контрольный осмотр машины (люки, уровни жидкостей, внешнее состояние).</li>
              <li>Убедитесь, что рычаг избирателя КПП находится в <strong>нейтрали</strong>, а машина заторможена <strong>остановочным тормозом</strong>.</li>
              <li>Убедитесь, что рукоятка ручной подачи топлива находится в положении <strong>нулевой подачи</strong>.</li>
              <li>Откройте вентили левого и правого воздушных баллонов (давление не ниже <strong>75 кгс/см²</strong>).</li>
              <li>Установите топливораспределительный кран в положение <strong>«БАКИ ВКЛЮЧЕНЫ»</strong>.</li>
              <li>Включите выключатель аккумуляторных батарей (<strong>Массу</strong>). Проверьте напряжение (<strong>22–26 В</strong>).</li>
              <li>Откройте <strong>клапан выпуска воздуха</strong>.</li>
              <li>Прокачайте систему питания топливом насосом <strong>БЦН-1</strong> (не менее 3 качков, давление >= 1.2 кгс/см²).</li>
              <li>Перед пуском обязательно <strong>закройте клапан выпуска воздуха</strong>.</li>
              <li>Дайте предупредительный <strong>звуковой сигнал</strong>.</li>
              <li>Убедитесь, что тумблер <strong>«КОМБИНИР.»</strong> находится в положении <strong>«ОТКЛ»</strong>.</li>
              <li>Нажмите и удерживайте кнопку маслозакачивающего насоса <strong>МЗН-2</strong> до тех пор, пока давление масла не станет не ниже <strong>2.0 кгс/см²</strong>.</li>
              <li><strong>После создания давления масла отпустите кнопку МЗН-2</strong>.</li>
              <li>Установите рукоятку ручной подачи топлива в положение не менее <strong>10%</strong>.</li>
              <li>Нажмите кнопку <strong>СТАРТЕР</strong> (откройте крышку кликом и зажмите переключатель) для пуска двигателя. Удерживайте ее не более 8 секунд.</li>
              <li>Дождитесь запуска двигателя и <strong>сразу отпустите кнопку СТАРТЕР</strong>.</li>
              <li>Установите стабильные обороты холостого хода двигателя (<strong>800–900 об/мин</strong>).</li>
            </ol>
          </div>
          <div class="instruction-tab-pane" id="inst-combined">
            <h3>Комбинированный запуск двигателя (+20°C)</h3>
            <ol>
              <li>Произведите контрольный осмотр машины (люки, уровни жидкостей, внешнее состояние).</li>
              <li>Убедитесь, что рычаг избирателя КПП находится в <strong>нейтрали</strong>, а машина заторможена <strong>остановочным тормозом</strong>.</li>
              <li>Убедитесь, что рукоятка ручной подачи топлива находится в положении <strong>нулевой подачи</strong>.</li>
              <li>Откройте вентили левого и правого воздушных баллонов (давление не ниже <strong>75 кгс/см²</strong>).</li>
              <li>Установите топливораспределительный кран в положение <strong>«БАКИ ВКЛЮЧЕНЫ»</strong>.</li>
              <li>Включите выключатель аккумуляторных батарей (<strong>Массу</strong>). Проверьте напряжение (<strong>22–26 В</strong>).</li>
              <li>Откройте <strong>клапан выпуска воздуха</strong>.</li>
              <li>Прокачайте систему питания топливом насосом <strong>БЦН-1</strong> (не менее 3 качков, давление >= 1.2 кгс/см²).</li>
              <li>Перед пуском обязательно <strong>закройте клапан выпуска воздуха</strong>.</li>
              <li>Дайте предупредительный <strong>звуковой сигнал</strong>.</li>
              <li>Установите переключатель <strong>«КОМБИНИР.»</strong> в положение <strong>«ВКЛ»</strong>.</li>
              <li>Нажмите и удерживайте кнопку маслозакачивающего насоса <strong>МЗН-2</strong> до создания давления масла не ниже <strong>2.0 кгс/см²</strong>.</li>
              <li><strong>После создания давления масла отпустите кнопку МЗН-2</strong>.</li>
              <li>Нажмите кнопку <strong>СТАРТЕР</strong> (откройте крышку кликом и зажмите переключатель).</li>
              <li><strong>Не отпуская СТАРТЕР</strong>, нажмите кнопку <strong>ЭПК-48</strong> (подача воздуха).</li>
              <li><strong>Через 2–3 секунды</strong> после включения воздухопуска выжмите педаль подачи топлива (<strong>газ</strong>) примерно на 1/3 хода.</li>
              <li><strong>Сразу после пуска двигателя отпустите кнопку СТАРТЕР и кнопку ЭПК-48</strong>.</li>
              <li>Установите устойчивые обороты холостого хода двигателя (<strong>800–900 об/мин</strong>).</li>
            </ol>
          </div>
          <div class="instruction-tab-pane" id="inst-winter">
            <h3>Разогрев и зимний запуск двигателя (-15°C)</h3>
            <p>При температуре ниже +5°C запуск двигателя без предварительного подогрева запрещен. Требуется провести цикл разогрева с помощью подогревателя:</p>
            <ol>
              <li>В ангаре перейдите на вид сбоку слева и откройте лючок подогревателя (откройте 3 шпингалета и откиньте панель).</li>
              <li>Войдите в крупный план выхлопа подогревателя. Возьмите гаечный ключ из ЗИП, открутите 2 болта и снимите защитную крышку.</li>
              <li>Возьмите защитный козырек из ЗИП и установите его на выхлопной патрубок подогревателя.</li>
              <li>В кабине командира наклоните взгляд вниз и откройте топливный клапан подогревателя (ручка вверх).</li>
              <li>В кабине водителя включите выключатель батарей (<strong>Массу</strong>), установите переключатель <strong>СВЕЧА</strong> в положение СВЕЧА (влево) и дождитесь воспламенения топлива в подогревателе.</li>
              <li>Дождитесь разогрева охлаждающей жидкости по прибору до температуры не ниже <strong>30°C</strong> (оптимально 70-80°C).</li>
              <li>В кабине командира закройте топливный клапан подогревателя для остановки горения и продуйте котел.</li>
              <li>Выполните пуск двигателя выбранным методом (обычно воздухом или комбинированным).</li>
            </ol>
          </div>
          <div class="instruction-tab-pane" id="inst-warmup">
            <h3>Разогрев подогревателем</h3>
            <p>Процедура подготовки, запуска, контроля разогрева и остановки подогревателя перед пуском двигателя:</p>
            <ol>
              <li>Затормозите машину остановочным тормозом и убедитесь, что избиратель передач в нейтрали.</li>
              <li>Включите аккумуляторные батареи (Массу).</li>
              <li>В ангаре перейдите на вид сбоку слева, откройте три шпингалета лючка подогревателя и откиньте панель.</li>
              <li>Перейдите в крупный план выхлопа подогревателя, возьмите гаечный ключ из ЗИП, открутите два болта, снимите крышку и установите козырек выхлопа подогревателя.</li>
              <li>В кабине командира откройте топливный клапан подогревателя (поднимите рычаг вверх).</li>
              <li>В кабине водителя установите переключатель <strong>СВЕЧА</strong> в положение СВЕЧА (влево) и удерживайте до воспламенения топлива (появления пламени/гула).</li>
              <li>После пуска подогревателя отпустите переключатель <strong>СВЕЧА</strong> (в среднее положение).</li>
              <li>Следите за температурой охлаждающей жидкости и масла на приборной панели. Дождитесь, пока охлаждающая жидкость нагреется минимум до <strong>40°C</strong>, а масло до <strong>30°C</strong>.</li>
              <li>В кабине командира закройте топливный клапан подогревателя для остановки горения и продуйте котел перед закрытием лючков снаружи.</li>
            </ol>
            <p style="margin-top: 15px; padding: 10px 14px; background: rgba(88, 166, 255, 0.1); border-left: 3px solid #58a6ff; border-radius: 4px; font-size: 13px;">
              <strong>Примечание:</strong> Не путайте предпусковой подогреватель двигателя с тумблером <strong>«ОБОГРЕВ БО»</strong>! Предпусковой подогреватель управляется переключателями «СВЕЧА – МОТОР» и «ПУСК МОТОРА». Тумблер «ОБОГРЕВ БО» включает вентилятор отопителя боевого отделения для экипажа и используется при необходимости на ходу или при прогреве.
            </p>
          </div>
          <div class="instruction-tab-pane" id="inst-heater">
            <h3>Обогреватель боевого отделения (ОБОГРЕВ БО)</h3>
            <p>Обогреватель боевого отделения (отопитель калориферного типа) предназначен для обогрева обитаемого отделения танка и создания нормальных условий для экипажа в холодное время года:</p>
            <ol>
              <li><strong>Орган управления:</strong> Двухпозиционный тумблер <strong>«ОБОГРЕВ БО»</strong> (расположен в верхнем левом углу щитка контрольных приборов механика-водителя).</li>
              <li><strong>Принцип действия:</strong> Тумблер включает только <strong>электродвигатель вентилятора</strong> обдува калорифера. В калорифере нет электрических ТЭНов — тепло передается воздуху от горячей охлаждающей жидкости, циркулирующей через его радиатор.</li>
              <li><strong>Включение на ходу:</strong> Включается экипажем <strong>во время движения танка</strong> при низких температурах («едем-едем, экипажу стало холодно — включили тумблер»). Горячая жидкость через радиатор прокачивается штатной водяной помпой работающего двигателя.</li>
              <li><strong>Работа при стоянке:</strong> Может также работать при предпусковом прогреве машины, когда насос нагнетателя работающего подогревателя прокачивает нагретую жидкость через радиатор обогревателя БО.</li>
              <li><strong>Важное правило:</strong> Включение тумблера «ОБОГРЕВ БО» <strong>НЕ запускает</strong> предпусковой подогреватель двигателя! На холодном неработающем двигателе включение тумблера приведет лишь к обдуву холодным воздухом.</li>
            </ol>
          </div>
        </div>
      </div>
    `;

    // Authors screen
    const authorsScreen = document.createElement('div');
    authorsScreen.className = 'start-screen start-screen-authors';
    authorsScreen.setAttribute('data-screen', 'authors');
    authorsScreen.innerHTML = `
      <div class="instruction-header">
        <button class="instruction-back" data-action="back">← Назад</button>
        <h1 class="instruction-title">Авторы</h1>
      </div>
      <div class="instruction-content">
        <div class="authors-card">
          <h2>Симулятор кабины танка Т-72</h2>
          <p class="authors-lead">Обучающий тренажер для подготовки студентов</p>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
          <div class="authors-list">
            <div class="author-item">
              <span class="author-role">Разработка проекта:</span>
              <span class="author-name">Команда проекта Т-72</span>
            </div>
            <div class="author-item">
              <span class="author-role">Ассистенты графики:</span>
              <span class="author-name">Марютин Максим Александрович</span>
              <span class="author-name">Шкурин Михаил Максивович</span>
            </div>
            <div class="author-item">
              <span class="author-role">Методическая поддержка:</span>
              <span class="author-name">Щербаченко А.Н.</span>
              <span class="author-name">Пепеляев А.В.</span>
              <span class="author-name">Вишняков А.А.</span>
            </div>
          </div>
          <p class="authors-footer">2026 г. Все права защищены.</p>
        </div>
      </div>
    `;

    this.rootEl.appendChild(mainScreen);
    this.rootEl.appendChild(trainingScreen);
    this.rootEl.appendChild(instructionScreen);
    this.rootEl.appendChild(authorsScreen);

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
        case 'familiarization':
          if (this.onFamiliarization) this.onFamiliarization();
          break;
        case 'instruction':
          this.showScreen('instruction');
          if (this.onInstruction) this.onInstruction();
          break;
        case 'authors':
          this.showScreen('authors');
          break;
        case 'back':
          this.showScreen('main');
          break;
      }
    });

    // Tab switching for instructions
    const tabBtns = this.rootEl.querySelectorAll('.instruction-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        if (!targetTab) return;

        // Deactivate all tab buttons and panes
        tabBtns.forEach(b => b.classList.remove('active'));
        this.rootEl.querySelectorAll('.instruction-tab-pane').forEach(pane => pane.classList.remove('active'));

        // Activate selected tab and pane
        e.target.classList.add('active');
        const activePane = this.rootEl.querySelector(`#${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });


    // Apply scenario button
    const applyBtn = this.rootEl.querySelector('#scenarioApply');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const startMethod = this.rootEl.querySelector('#scenarioStartMethod')?.value || 'prestart-preparation';
        const rawTemp = Number(this.rootEl.querySelector('#scenarioAmbientTemp')?.value);
        const ambientTemp = Number.isFinite(rawTemp) ? rawTemp : 20;
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
