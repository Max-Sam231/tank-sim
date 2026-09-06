# ControlOverlayDefs — Определения визуальных оверлеев

**Файл:** `js/ControlOverlayDefs.js`

## Назначение

Конфигурация для визуального отображения каждого элемента управления. Определяет:

- Тип поведения (boolean/enum/range)
- Привязку к ключу состояния
- Пути к спрайтам
- Параметры позиционирования

## Структура определения

```javascript
const CONTROL_OVERLAY_DEFS = {
  "action-name": {
    kind: "boolean" | "enum" | "range",
    stateKey: "keyInTankState",
    inflate: 1.0, // Масштаб относительно хитбокса
    offsetX: 0, // Смещение по X (пиксели viewBox)
    offsetY: 0, // Смещение по Y (пиксели viewBox)
    z: 50, // z-index слоя
    // ... специфичные поля по типу
  },
};
```

## Типы оверлеев

### boolean — Два состояния

```javascript
"battery-toggle": {
  kind: "boolean",
  stateKey: "isBatteryOn",
  inflate: 1.0,
  offsetX: 22,
  offsetY: 5,
  z: 60,
  off: "./img/11/11_0001_Слой-2.png",      // Выключено
  on: "./img/11/11_0000_Слой-289-копия.png" // Включено
}
```

### enum — Несколько дискретных состояний

```javascript
"gear-lever": {
  kind: "enum",
  stateKey: "gearLever",
  inflate: 1.2,
  offsetX: -12,
  offsetY: -25,
  z: 80,
  frames: {
    neutral: { src: "./img/1/...", offsetX: -10, offsetY: -25 },
    "1": { src: "./img/1/...", offsetX: -10, offsetY: -20 },
    "2": { src: "./img/1/...", offsetX: -10, offsetY: -14 },
    "3": { src: "./img/1/...", offsetX: -10, offsetY: -14 },
    "4": { src: "./img/1/...", offsetX: -8, offsetY: -8 },
    "5": { src: "./img/1/...", offsetX: -10, offsetY: -6 },
    R: { src: "./img/1/...", offsetX: -10, offsetY: -6 }
  }
}
```

**Особенность:** Каждый кадр может переопределять `inflate`, `offsetX`, `offsetY`, `z`.

### range — Диапазон значений

```javascript
"fuel-manual-feed": {
  kind: "range",
  stateKey: "fuelManualFeed",
  inflate: 2.6,
  offsetX: -34,
  offsetY: 80,
  z: 58,
  frames: [
    { at: 0, src: "./img/7/...", offsetX: -34, offsetY: 80 },
    { at: 33, src: "./img/7/...", offsetX: -38, offsetY: 60 },
    { at: 66, src: "./img/7/...", offsetX: -36, offsetY: 38 },
    { at: 100, src: "./img/7/...", offsetX: -36, offsetY: 38 }
  ]
}
```

**Логика:** Выбирается кадр с ближайшим значением `at` к текущему `stateKey`.

## Полный список элементов управления

### Кабина водителя

| Action              | Kind    | StateKey        | Описание                   |
| ------------------- | ------- | --------------- | -------------------------- |
| `battery-toggle`    | boolean | isBatteryOn     | Выключатель массы          |
| `gear-lever`        | enum    | gearLever       | Рычаг переключения передач |
| `shutters`          | boolean | shutters        | Жалюзи                     |
| `right-tank`        | boolean | rightTank       | Правый воздушный баллон    |
| `left-tank`         | boolean | leftTank        | Левый воздушный баллон     |
| `gas-pedal`         | boolean | gasPedal        | Педаль газа                |
| `brake-pedal`       | boolean | brakeEffective  | Педаль тормоза             |
| `fuel-manual-feed`  | range   | fuelManualFeed  | Ручная подача топлива      |
| `bcn`               | enum    | bcn             | БЦН ТЦА                    |
| `air-bleed-valve`   | boolean | airBleedValve   | Клапан спуска воздуха      |
| `fuel-primer-lever` | boolean | fuelPrimerLever | Рычаг ручной подкачки      |

### Приборная панель

| Action                     | Kind    | StateKey               | Описание                  |
| -------------------------- | ------- | ---------------------- | ------------------------- |
| `azr`                      | enum    | azr                    | АЗР (0/1/2)               |
| `epk`                      | boolean | epk                    | ЭПК                       |
| `horn`                     | boolean | horn                   | Звуковой сигнал           |
| `mzn-engine`               | boolean | mznEngine              | МЗН двигателя             |
| `ammeter-button`           | boolean | ammeterButton          | Кнопка амперметра         |
| `left-right-tanks`         | enum    | leftRightTanks         | Переключатель баков       |
| `spark-plug`               | enum    | sparkPlug              | Свеча/мотор               |
| `engine-start`             | enum    | engineStart            | Пуск мотора               |
| `emergency-hatch-rotation` | boolean | emergencyHatchRotation | Аварийный поворот колпака |
| `oil-pump-gearbox`         | boolean | oilPumpGearbox         | Откачка масла КП          |
| `commander-call`           | boolean | commanderCall          | Вызов командира           |
| `air-intake`               | boolean | airIntake              | ВО                        |
| `heating`                  | boolean | heating                | Обогрев боевого отделения (ОБОГРЕВ БО) |
| `combined`                 | boolean | combined               | Комбинированный           |
| `left-lights`              | boolean | leftLights             | Левые фары                |
| `right-lights`             | boolean | rightLights            | Правые фары               |
| `gabrate-lights`           | boolean | gabrateLights          | Габаритные огни           |
| `lights-all`               | boolean | lightsAll              | Все/задние фонари         |
| `water-antifreeze`         | boolean | waterAntifreeze        | Вода/антифриз             |
| `gpk`                      | boolean | gpk                    | ГПК                       |
| `bca-tca`                  | boolean | bcaTca                 | БЦА/ТЦА                   |
| `mzn-tow`                  | enum    | mznTow                 | МЗН буксир (0/1/2)        |
| `starter`                  | enum    | starter                | Стартер (0/1/2)           |
| `signal-lamps`             | enum    | signalLamps            | Контроль ламп (0/1/2)     |

## Типичные спрайты

Спрайты хранятся в `img/` с нумерованными папками:

```
img/
├── 1/  → gear-lever (7 кадров для передач)
├── 2/  → shutters
├── 3/  → right-tank
├── 4/  → left-tank
├── 5/  → gas-pedal
├── 6/  → brake-pedal
├── 7/  → fuel-manual-feed (4 кадра)
├── 8/  → bcn
├── 9/  → air-bleed-valve
├── 10/ → fuel-primer-lever
├── 11/ → battery-toggle
├── 12/ → приборная панель (множество спрайтов)
```

## Позиционирование

1. **Базовая позиция** — центр bounding box хитбокса
2. **inflate** — масштабирует размер оверлея относительно хитбокса
3. **offsetX/offsetY** — смещение в пикселях viewBox (1920×1080)
4. **z** — z-index для порядка наложения

Итоговые CSS-переменные:

```javascript
const x = ((cx - targetW / 2 + offsetX) / vbW) * 100; // % от ширины
const y = ((cy - targetH / 2 + offsetY) / vbH) * 100; // % от высоты
const w = (targetW / vbW) * 100;
const h = (targetH / vbH) * 100;
```
