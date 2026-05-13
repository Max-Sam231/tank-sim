# Технический контекст

## Технологический стек

| Категория   | Технология              | Версия         |
| ----------- | ----------------------- | -------------- |
| Язык        | Vanilla JavaScript      | ES6+ (modules) |
| Разметка    | HTML5                   | -              |
| Стили       | CSS3                    | -              |
| Сборка      | Нет (native ES modules) | -              |
| Зависимости | Нет                     | -              |

**Принцип:** NO frameworks, NO external libraries. Финальный билд должен быть лёгким и работать на legacy Windows машинах.

## Браузерные API

### Используемые

- **ES Modules** — `import`/`export` для модульности
- **requestAnimationFrame** — игровой цикл
- **Fullscreen API** — полноэкранный режим
- **DOM Events** — click, mousedown/up, touchstart/end, keydown
- **SVG** — хитбоксы через `<polygon>`
- **CSS Custom Properties** — позиционирование оверлеев (`--x`, `--y`, etc.)
- **CSS Transitions** — анимации переключения

### Не используемые (намеренно)

- Canvas API
- WebGL
- Web Audio
- Service Workers
- IndexedDB

## Файловая структура

```
tank/
├── index.html              # Единственный HTML файл
├── main.js                 # Точка входа (ES module)
├── styles.css              # Все стили в одном файле
├── js/                     # JavaScript модули
│   ├── TankState.js
│   ├── UIController.js
│   ├── ControlOverlayDefs.js
│   ├── SceneManager.js
│   ├── HangarScene.js
│   ├── DriverScene.js
│   ├── CommanderScene.js
│   ├── TrainingEngine.js
│   ├── TrainingScenarios.js
│   ├── StartMenu.js
│   ├── FullscreenManager.js
│   └── FinishReportModal.js
├── img/                    # Спрайты и фоны
│   ├── 1/ - 12/           # Спрайты элементов управления
│   ├── hangar/            # Фоны ангара
│   ├── commander/         # Фоны командира
│   ├── фон.jpg            # Фон кабины водителя
│   └── Прибор фон.png     # Фон приборной панели
└── memory-bank/            # Документация для AI
```

## Соглашения кода

### Именование

- **Классы** — PascalCase (`TankState`, `UIController`)
- **Методы/функции** — camelCase (`toggleBattery`, `_emit`)
- **Приватные** — underscore prefix (`_listeners`, `_render`)
- **Константы** — UPPER_SNAKE_CASE (`APP_MODE`, `CONTROL_OVERLAY_DEFS`)
- **CSS классы** — kebab-case (`hitbox-layer`, `overlay-control`)
- **data-атрибуты** — kebab-case (`data-action`, `data-bcn-mode`)

### Модули

Каждый файл экспортирует один основной класс/объект:

```javascript
// TankState.js
class TankState { ... }
export { TankState };

// main.js
import { TankState } from './js/TankState.js';
```

## Режимы работы

### Debug mode

```javascript
const APP_MODE = "debug";
const IS_DEBUG = true;
document.body.classList.add("app-debug");
```

Особенности:

- Видимые хитбоксы (красная заливка)
- Подсветка оверлеев (голубой outline)
- Текстовые метки на хитбоксах
- Полный дамп состояния в консоли
- Клавиша H — toggle хитбоксов

### Production mode

```javascript
const APP_MODE = "prod";
const IS_DEBUG = false;
document.body.classList.add("app-prod");
```

Особенности:

- Невидимые хитбоксы
- Усиленная подсветка при hover (glow)
- Телеметрия на русском в консоли
- Без отладочной информации

## Координатная система

- **viewBox**: 1920×1080 (соответствует разрешению фонов)
- **Позиция оверлеев**: проценты от размера контейнера (0-100)
- **Смещения в ControlOverlayDefs**: пиксели viewBox

```javascript
// Преобразование viewBox → проценты
const x = (left / 1920) * 100;
const y = (top / 1080) * 100;
```

## Ограничения и требования

1. **Legacy support** — должно работать на старых Windows машинах
2. **Offline** — не требует сервера для работы (кроме dev)
3. **Fullscreen** — оптимизировано под полноэкранный режим
4. **Touch support** — поддержка тач-устройств
5. **No build step** — нативные ES modules без бандлера
