# HTML структура

**Файл:** `index.html`

## Общая структура

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Driver Sim</title>
    <link rel="stylesheet" href="./styles.css" />
    <script type="module" src="./main.js"></script>
  </head>
  <body>
    <main class="app">
      <!-- Глобальный UI слой -->
      <div class="ui-layer-global">...</div>

      <!-- Стартовое меню (генерируется JS) -->
      <div class="start-menu-container" id="startMenuContainer"></div>

      <!-- Сцена: Ангар -->
      <section id="scene-hangar" class="game-scene hidden">...</section>

      <!-- Сцена: Кабина водителя -->
      <section id="scene-driver" class="game-scene hidden">...</section>

      <!-- Сцена: Кабина командира -->
      <section id="scene-commander" class="game-scene hidden">...</section>
    </main>
  </body>
</html>
```

## Глобальный UI слой

```html
<div class="ui-layer-global">
  <!-- Кнопка завершения тренировки -->
  <button class="sim-finish-button hidden" id="simFinishButton">Закончить</button>

  <!-- Debug/Production консоль -->
  <div class="debug-console" id="debugConsole"></div>

  <!-- Модалка полноэкранного режима -->
  <div class="fullscreen-modal hidden" id="fullscreenModal">
    <div class="fullscreen-modal-content">
      <h2 id="modalTitle">Нажмите для синхронизации размеров экрана</h2>
      <p id="modalDesc">Программа работает корректно только в полноэкранном режиме</p>
      <button class="fullscreen-modal-button" id="modalButton">
        Перейти в полноэкранный режим
      </button>
    </div>
  </div>
</div>
```

## Сцена: Ангар

```html
<section id="scene-hangar" class="game-scene hidden">
  <div class="hangar-bg-wrapper">
    <img class="hangar-bg" src="./img/hangar/background.jpg" alt="..." />
    <img class="tank-layer" src="./img/hangar/tank.png" alt="Tank" />
  </div>

  <svg class="hitbox-layer scene-hitbox-layer" viewBox="0 0 1920 1080" preserveAspectRatio="none">
    <!-- Люк механика-водителя -->
    <polygon
      class="hitbox interactive"
      data-action="enter_driver_seat"
      points="1050,670 1140,660 1200,700 1070,700"
    />

    <!-- Люк командира -->
    <polygon
      class="hitbox"
      data-action="enter_commander_seat"
      points="720,460 840,460 840,560 720,560"
    />

    <!-- Люк наводчика -->
    <polygon
      class="hitbox"
      data-action="enter_gunner_seat"
      points="980,460 1050,460 1050,560 980,560"
    />
  </svg>
</section>
```

## Сцена: Кабина водителя

```html
<section id="scene-driver" class="game-scene hidden">
  <div class="scene-content" id="scene">
    <!-- Фон кабины -->
    <img class="cabin-bg" src="./img/фон.jpg" alt="..." />

    <!-- Слой оверлеев (заполняется UIController) -->
    <div class="overlay-layer"></div>

    <!-- SVG хитбоксы -->
    <svg class="hitbox-layer cabin-hitbox-layer" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <!-- Выход в ангар -->
      <polygon
        class="hitbox interactive exit-btn"
        data-action="Вернуться в ангар"
        points="1800,20 1900,20 1900,60 1800,60"
      />

      <!-- Масса -->
      <polygon class="hitbox" data-action="battery-toggle" points="30,75 85,83 87,195 22,215" />

      <!-- Манометр -->
      <polygon
        class="hitbox"
        data-action="manometer"
        points="1446,336 1533,328 1540,416 1457,426"
      />

      <!-- Приборная панель -->
      <polygon
        class="hitbox"
        data-action="instrument-panel"
        points="95,83 166,86 476,373 510,741 98,994"
      />

      <!-- ... и другие хитбоксы -->
    </svg>

    <!-- Модалка БЦН -->
    <div class="bcn-modal hidden" id="bcnModal">
      <div class="bcn-modal-content">
        <div class="bcn-modal-header">
          <span class="bcn-modal-title">БЦН ТЦА</span>
          <button class="bcn-modal-close" id="bcnModalClose">&times;</button>
        </div>
        <div class="bcn-modal-image-placeholder" id="bcnModalImage"></div>
        <div class="bcn-modal-buttons">
          <button class="bcn-modal-btn" data-bcn-mode="off">Выключено</button>
          <button class="bcn-modal-btn" data-bcn-mode="on">Включено</button>
          <button class="bcn-modal-btn" data-bcn-mode="pump">Откачка</button>
        </div>
      </div>
    </div>

    <!-- Модалка приборной панели -->
    <div class="instrument-panel-modal hidden" id="instrumentPanelModal">
      <div class="instrument-panel-toolbar">
        <button class="instrument-panel-back" id="instrumentPanelBack">Назад в кабину</button>
      </div>
      <div class="instrument-panel-stage">
        <svg class="hitbox-layer instrument-panel-hitbox-layer" viewBox="0 0 1920 1080">
          <!-- Хитбоксы приборной панели -->
          <polygon class="hitbox" data-action="heating" points="..." />
          <polygon class="hitbox" data-action="azr" points="..." />
          <polygon class="hitbox" data-action="starter" points="..." />
          <!-- ... -->
        </svg>
        <div class="overlay-layer"></div>
      </div>
    </div>
  </div>
</section>
```

## Сцена: Кабина командира

```html
<section id="scene-commander" class="game-scene hidden">
  <div class="scene-content" id="scene-commander-content">
    <!-- Два фона для переключения вида -->
    <img class="cmd-bg cmd-bg-straight" src="./img/commander/straight.png" alt="..." />
    <img class="cmd-bg cmd-bg-tilted" src="./img/commander/tilted.png" alt="..." />

    <div class="overlay-layer"></div>

    <svg class="hitbox-layer commander-hitbox-layer" viewBox="0 0 1920 1080">
      <!-- Выход в ангар -->
      <polygon
        class="hitbox interactive exit-btn"
        data-action="exit_to_hangar"
        points="1800,20 1900,20 1900,60 1800,60"
      />

      <!-- Переключение вида -->
      <polygon
        class="hitbox interactive"
        data-action="toggle_commander_view"
        points="700,700 800,700 800,800 700,800"
      />

      <!-- Переход к водителю -->
      <polygon
        class="hitbox interactive"
        data-action="enter_driver_seat"
        points="900,900 1000,900 1000,1000 900,1000"
      />
    </svg>
  </div>
</section>
```

## Важные атрибуты

### data-action

Идентификатор действия для обработчика в UIController.

```html
<polygon data-action="battery-toggle" ... />
```

### data-bcn-mode

Режим БЦН для кнопок в модалке.

```html
<button data-bcn-mode="off">Выключено</button>
<button data-bcn-mode="on">Включено</button>
<button data-bcn-mode="pump">Откачка</button>
```

### viewBox

Координатная система SVG соответствует разрешению фона 1920×1080.

```html
<svg viewBox="0 0 1920 1080" preserveAspectRatio="none"></svg>
```

### Классы состояния

| Класс                    | Описание                                   |
| ------------------------ | ------------------------------------------ |
| `.hidden` / `.is-hidden` | Скрыть элемент                             |
| `.is-visible`            | Показать оверлей                           |
| `.is-active`             | Активный экран в стартовом меню            |
| `.is-done`               | Выполненный шаг в отчёте                   |
| `.instrument-panel-open` | Открыта приборная панель                   |
| `.commander-view-tilted` | Наклонённый вид командира                  |
| `.labels-visible`        | Показать метки хитбоксов                   |
| `.transparent`           | Прозрачный хитбокс                         |
| `.hitbox-hovered`        | Подсветка оверлея при наведении на хитбокс |
