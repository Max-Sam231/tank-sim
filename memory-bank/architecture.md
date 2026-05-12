# Архитектура системы

## Принципы архитектуры

1. **Separation of Concerns** — UI-логика отделена от бизнес-логики (состояния)
2. **Centralized State** — единый источник истины (`TankState`)
3. **Reactive Updates** — UI обновляется по подписке на изменения состояния
4. **Data-driven** — поведение определяется конфигурацией, не хардкодом

## Диаграмма компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.js (bootstrap)                      │
│  - Создаёт экземпляры всех компонентов                          │
│  - Запускает игровой цикл (requestAnimationFrame)               │
│  - Связывает компоненты между собой                             │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   TankState   │◄────►│  UIController │      │ TrainingEngine│
│   (Model)     │      │    (View)     │      │  (Controller) │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        │   subscribe()         │                       │
        │◄──────────────────────┤                       │
        │                       │                       │
        │   subscribe()         │                       │
        │◄──────────────────────┼───────────────────────┤
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────────────────────────────────────────────────────┐
│                        SceneManager                            │
│  - Переключает активную сцену (hangar/driver/commander)       │
│  - Вызывает init()/dispose()/update() на сценах               │
└───────────────────────────────────────────────────────────────┘
```

## Поток данных

```
User Input (click/touch/keypress)
         │
         ▼
    UIController
    (обрабатывает событие, определяет action)
         │
         ▼
    TankState
    (изменяет своё состояние, вызывает _emit())
         │
         ├──────────────────┐
         ▼                  ▼
    UIController       TrainingEngine
    (_render())        (_onSnapshot())
         │                  │
         ▼                  ▼
    DOM Updates        Проверка шагов
    (overlays, console) (mark done)
```

## Игровой цикл

```javascript
const loop = (ts) => {
  const dt = (ts - lastTs) / 1000; // delta time в секундах
  lastTs = ts;

  state.tick(dt); // Обновление физики танка
  sceneManager.update(dt); // Обновление текущей сцены

  requestAnimationFrame(loop);
};
```

- **tick(dt)** — обновляет сенсоры, симулирует физику (давление, температура, обороты)
- **update(dt)** — опционально обновляет логику текущей сцены

## Система сцен

```
SceneManager
    │
    ├── HangarScene (scene-hangar)
    │       └── Клик по люку → changeScene("driver")
    │
    ├── DriverScene (scene-driver)
    │       └── Основная симуляция кабины
    │       └── Клик "выход" → changeScene("hangar")
    │
    └── CommanderScene (scene-commander)
            └── Переключение вида (straight/tilted)
            └── Переход к водителю или в ангар
```

**Жизненный цикл сцены:**

1. `init()` — вызывается при входе в сцену
2. `update(dt)` — вызывается каждый кадр
3. `dispose()` — вызывается при выходе из сцены

## Система хитбоксов

```html
<svg class="hitbox-layer" viewBox="0 0 1920 1080">
  <polygon class="hitbox" data-action="battery-toggle" points="30,75 85,83 87,195 22,215" />
</svg>
```

- **viewBox="0 0 1920 1080"** — координаты соответствуют разрешению фона
- **preserveAspectRatio="none"** — SVG растягивается на весь контейнер
- **data-action** — идентификатор действия для обработчика
- **pointer-events: all** — хитбокс кликабелен

## Система оверлеев

Визуальные элементы (спрайты переключателей) накладываются поверх фона:

```javascript
// ControlOverlayDefs.js
{
  "battery-toggle": {
    kind: "boolean",        // Тип: boolean | enum | range
    stateKey: "isBatteryOn", // Ключ в TankState
    inflate: 1.0,           // Масштаб относительно хитбокса
    offsetX: 22,            // Смещение по X
    offsetY: 5,             // Смещение по Y
    z: 60,                  // z-index
    off: "./img/11/...",    // Спрайт для выключенного состояния
    on: "./img/11/...",     // Спрайт для включённого состояния
  }
}
```

**Типы оверлеев:**

- **boolean** — два состояния (on/off)
- **enum** — несколько дискретных состояний (neutral/1/2/3/4/5/R для рычага КПП)
- **range** — диапазон значений (fuelManualFeed: 0-100)

## Система подписок (Pub/Sub)

```javascript
// TankState.js
subscribe(listener) {
  this._listeners.add(listener);
  return () => this._listeners.delete(listener);  // unsubscribe
}

_emit() {
  const snapshot = this.getSnapshot();
  for (const listener of this._listeners) listener(snapshot);
}
```

**Snapshot** — immutable объект с текущим состоянием всех параметров танка.
