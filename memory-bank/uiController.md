# UIController — Управление пользовательским интерфейсом

**Файл:** `js/UIController.js`

## Назначение

Связывает DOM с состоянием танка:

- Обрабатывает пользовательский ввод (клики, касания, клавиатура)
- Рендерит визуальные оверлеи элементов управления
- Отображает отладочную/production консоль
- Управляет видимостью хитбоксов

## Конструктор

```javascript
new UIController({
  rootEl, // HTMLElement — корневой элемент сцены (#scene)
  consoleEl, // HTMLElement — элемент консоли (#debugConsole)
  state, // TankState — экземпляр состояния
  isDebug, // boolean — режим отладки
});
```

## Основные свойства

| Свойство              | Тип         | Описание                           |
| --------------------- | ----------- | ---------------------------------- |
| `_overlayLayerEl`     | HTMLElement | Слой для оверлеев (.overlay-layer) |
| `_svgEl`              | SVGElement  | SVG-слой хитбоксов                 |
| `_controlOverlayEls`  | Map         | action → HTMLImageElement          |
| `_controlOverlayMeta` | Map         | action → метаданные позиции        |
| `_controlOverlayDefs` | Object      | Импорт из ControlOverlayDefs.js    |
| `_hitboxVisible`      | boolean     | Видимость хитбоксов (только debug) |
| `_lastAction`         | string      | Последний клик по action           |
| `_lastClick`          | Object      | Координаты последнего клика        |

## Инициализация

При создании UIController:

1. **\_wireEvents()** — привязка обработчиков событий
2. **\_ensureCabinControlOverlays()** — создание оверлеев для кабины
3. **\_ensureInstrumentPanelControlOverlays()** — создание оверлеев для приборной панели
4. **\_ensureHitboxLabels()** (только debug) — создание текстовых меток на хитбоксах
5. **\_syncHitboxVisibility()** — установка начальной видимости
6. **subscribe()** — подписка на изменения TankState

## Обработка событий

### Click events

```javascript
// Маппинг action → метод TankState
switch (action) {
  case "battery-toggle":
    this.state.toggleBattery();
    break;
  case "instrument-panel":
    this._showInstrumentPanel();
    this.state.setInstrumentPanelOpen(true);
    break;
  case "bcn":
    this._showBcnModal();
    break;
  case "fuel-manual-feed":
    // Click: +10%, Shift+Click: -10%
    this.state.adjustFuelManualFeed(event.shiftKey ? -10 : 10);
    break;
  case "gear-lever":
    this.state.cycleGearLever();
    break;
  // ... и т.д.
}
```

### Mousedown/Mouseup (педали)

```javascript
// Педали работают по удержанию
case "brake-pedal":
  this.state.setBrakePressed(true);  // mousedown
  // mouseup → this.state.setBrakePressed(false)
  break;
case "gas-pedal":
  this.state.setGasPedal(true);
  break;
```

### Touch events

Аналогичная логика для тач-устройств с `touchstart`/`touchend`.

### Hover sync

При наведении на хитбокс добавляется класс `hitbox-hovered` на соответствующий оверлей для подсветки.

### Keyboard (только debug)

- **H** — переключить видимость хитбоксов

## Рендеринг оверлеев

### \_getControlOverlayFrame(action, snapshot)

Возвращает данные текущего кадра оверлея:

```javascript
{
  src: "./img/...",     // путь к изображению
  inflate: 1.0,         // масштаб
  offsetX: 0,           // смещение X
  offsetY: 0,           // смещение Y
  z: 50                 // z-index
}
```

**Логика по типу:**

- **boolean** — возвращает `on` или `off` в зависимости от `snapshot[stateKey]`
- **enum** — возвращает `frames[snapshot[stateKey]]`
- **range** — находит ближайший кадр по значению `at`

### \_renderOverlays(snapshot)

Для каждого оверлея:

1. Получить текущий кадр через `_getControlOverlayFrame`
2. Обновить `src` изображения если изменился
3. Пересчитать CSS-переменные позиции (`--x`, `--y`, `--w`, `--h`)

## Рендеринг консоли (\_render)

### Production mode (isDebug = false)

```
ПРИБОРЫ
Давление воздуха (лев.):  80.0 кгс/см²
Давление воздуха (прав.): 80.0 кгс/см²
Давление пуска (воздух): 0.0 кгс/см²
Обороты двигателя:        0 об/мин
Давление масла (двиг.):   0.0 кгс/см²
Давление масла (КПП):     0.0 кгс/см²
Давление топлива:         0.0 кгс/см²
Температура ОЖ:           15 °C
Температура масла:        15 °C
Напряжение бортсети:      0.0 В
Скорость:                0.0 км/ч
Уровень топлива:          100 %
```

### Debug mode (isDebug = true)

Полный дамп состояния:

- Все переключатели (ON/OFF)
- Все сенсоры с единицами измерения
- Состояние ламп
- Координаты последнего клика в viewBox
- Статус видимости хитбоксов

## Модальные окна

### Приборная панель

```javascript
_showInstrumentPanel() {
  // Показать #instrumentPanelModal
  // Добавить класс instrument-panel-open на rootEl
}
```

При открытии:

- Хитбоксы кабины блокируются (`pointer-events: none`)
- Активируются хитбоксы приборной панели

### БЦН модалка

```javascript
_showBcnModal(); // Показать модалку выбора режима БЦН
_hideBcnModal(); // Скрыть модалку
_updateBcnModalButtons(mode); // Подсветить активную кнопку
_updateBcnModalImage(mode); // Обновить картинку состояния
```

## Вспомогательные методы

### \_parsePolygonPoints(pointsAttr)

Парсит атрибут `points` SVG-полигона в массив `{x, y}`.

### \_polygonCentroid(points)

Вычисляет центроид полигона для размещения метки.

### \_polygonBBox(points)

Вычисляет bounding box полигона для позиционирования оверлея.

### \_capturePointer(event)

Захватывает координаты клика и переводит в координаты viewBox SVG.

### \_toggleHitboxVisibility()

Переключает видимость хитбоксов (только debug mode).

### \_syncHitboxVisibility()

Синхронизирует классы `.transparent` и `.labels-visible` с текущим состоянием.

## CSS-переменные оверлеев

Оверлеи позиционируются через CSS-переменные:

```css
.overlay {
  left: calc(var(--x, 0) * 1%);
  top: calc(var(--y, 0) * 1%);
  width: calc(var(--w, 100) * 1%);
  height: calc(var(--h, 100) * 1%);
  z-index: var(--z, 1);
}
```

Значения — проценты от размера контейнера (0-100).
