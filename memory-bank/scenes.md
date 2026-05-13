# Система сцен

## SceneManager

**Файл:** `js/SceneManager.js`

Менеджер управляет переключением между сценами.

### API

```javascript
const sceneManager = new SceneManager();

sceneManager.change(sceneInstance, sceneId);
// sceneInstance — объект сцены (HangarScene, DriverScene, etc.)
// sceneId — ID HTML-элемента ("scene-hangar", "scene-driver", etc.)

sceneManager.update(dt);
// Вызывает update() на текущей сцене
```

### Логика переключения

1. Вызвать `dispose()` на текущей сцене
2. Скрыть все `.game-scene` элементы (добавить `.hidden`)
3. Показать элемент с указанным `sceneId` (убрать `.hidden`)
4. Вызвать `init()` на новой сцене
5. Сохранить новую сцену как `currentScene`

---

## HangarScene

**Файл:** `js/HangarScene.js`

Начальная сцена — вид на танк в ангаре.

### HTML-структура

```html
<section id="scene-hangar" class="game-scene">
  <div class="hangar-bg-wrapper">
    <img class="hangar-bg" src="./img/hangar/background.jpg" />
    <img class="tank-layer" src="./img/hangar/tank.png" />
  </div>
  <svg class="hitbox-layer scene-hitbox-layer">
    <polygon data-action="enter_driver_seat" points="..." />
    <polygon data-action="enter_commander_seat" points="..." />
    <polygon data-action="enter_gunner_seat" points="..." />
  </svg>
</section>
```

### Интерактивные зоны

| Action                 | Описание              | Реализация                 |
| ---------------------- | --------------------- | -------------------------- |
| `enter_driver_seat`    | Люк механика-водителя | → переход к DriverScene    |
| `enter_commander_seat` | Люк командира         | → переход к CommanderScene |
| `enter_gunner_seat`    | Люк наводчика         | (не реализовано)           |

### Методы

```javascript
init(); // Включить обработчики кликов
dispose(); // Убрать обработчики
onHatchClick(event); // Обработать клик по люку
enterDriverCabin(); // changeScene("driver", "scene-driver")
enterCommanderCabin(); // changeScene("commander", "scene-commander")
update(dt); // Пусто
```

---

## DriverScene

**Файл:** `js/DriverScene.js`

Основная сцена — кабина механика-водителя.

### HTML-структура

```html
<section id="scene-driver" class="game-scene">
  <div class="scene-content" id="scene">
    <img class="cabin-bg" src="./img/фон.jpg" />
    <div class="overlay-layer"></div>
    <svg class="hitbox-layer cabin-hitbox-layer">
      <!-- Множество хитбоксов элементов управления -->
    </svg>

    <!-- BCN модалка -->
    <div class="bcn-modal hidden" id="bcnModal">...</div>

    <!-- Приборная панель модалка -->
    <div class="instrument-panel-modal hidden" id="instrumentPanelModal">
      <svg class="instrument-panel-hitbox-layer">...</svg>
      <div class="overlay-layer"></div>
    </div>
  </div>
</section>
```

### Хитбоксы кабины

- `battery-toggle` — выключатель массы
- `manometer` — манометр (показывает давление при наведении)
- `instrument-panel` — открывает приборную панель
- `left-tank`, `right-tank` — воздушные баллоны
- `bcn` — открывает модалку БЦН
- `shutters` — жалюзи
- `fuel-primer-lever` — рычаг подкачки
- `fuel-manual-feed` — ручная подача топлива
- `gear-lever` — рычаг КПП
- `brake-pedal`, `gas-pedal` — педали
- `air-bleed-valve` — клапан спуска воздуха

### Методы

```javascript
init(); // Показать кнопку "Закончить", включить обработчики
dispose(); // Скрыть кнопку, убрать обработчики
handleExit(event); // Обработать клик "выход в ангар"
update(dt); // Пусто
```

---

## CommanderScene

**Файл:** `js/CommanderScene.js`

Сцена командира — вид из башни.

### HTML-структура

```html
<section id="scene-commander" class="game-scene">
  <div class="scene-content" id="scene-commander-content">
    <img class="cmd-bg cmd-bg-straight" src="./img/commander/straight.png" />
    <img class="cmd-bg cmd-bg-tilted" src="./img/commander/tilted.png" />
    <div class="overlay-layer"></div>
    <svg class="hitbox-layer commander-hitbox-layer">
      <polygon data-action="exit_to_hangar" points="..." />
      <polygon data-action="toggle_commander_view" points="..." />
      <polygon data-action="enter_driver_seat" points="..." />
    </svg>
  </div>
</section>
```

### Переключение вида

Два фоновых изображения с плавным переключением через CSS:

```css
.cmd-bg-straight {
  opacity: 1;
}
.cmd-bg-tilted {
  opacity: 0;
}

.commander-view-tilted .cmd-bg-straight {
  opacity: 0;
}
.commander-view-tilted .cmd-bg-tilted {
  opacity: 1;
}
```

Дополнительно применяется 3D-трансформация:

```css
.commander-view-tilted #scene-commander-content {
  transform: translateY(60px) rotateX(10deg) scale(1.05);
}
```

### Actions

| Action                  | Описание                            |
| ----------------------- | ----------------------------------- |
| `exit_to_hangar`        | Выход в ангар                       |
| `toggle_commander_view` | Переключить вид (straight ↔ tilted) |
| `enter_driver_seat`     | Переход к водителю                  |

### Методы

```javascript
init(); // Показать кнопку "Закончить", включить обработчики
dispose(); // Скрыть кнопку, убрать обработчики
handleAction(event); // Обработать клики по хитбоксам
update(dt); // Пусто
```

---

## Переключение сцен

```javascript
// В main.js
const changeScene = (name, sceneId) => {
  switch (name) {
    case "hangar":
      sceneManager.change(hangarScene, sceneId || "scene-hangar");
      break;
    case "driver":
      sceneManager.change(driverScene, sceneId || "scene-driver");
      break;
    case "commander":
      sceneManager.change(commanderScene, sceneId || "scene-commander");
      break;
  }
};

// Доступно через app.changeScene("driver")
```
