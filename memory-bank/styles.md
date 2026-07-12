# Стили (CSS)

**Файл:** `styles.css`

## Общая структура стилей

```
styles.css
├── Базовые стили (html, body, .app)
├── Сетка сцен (.game-scene, .scene-content)
├── Слой оверлеев (.overlay-layer, .overlay, .overlay-container)
├── Слой хитбоксов (.hitbox-layer, .hitbox)
├── Индикаторы вращения стрелок (.overlay.gauge-arrow)
├── Модальные окна (БЦН, Жалюзи, КПП, Слайдер ручного газа)
├── Сцена: Ангар (.hangar-bg-wrapper, .tank-layer-top, .xray-btn)
├── Сцена: Обогреватель (выравнивание шпингалетов, анимации пульсации)
├── Сцена: Командир (.cmd-bg, наклон перспективы)
├── Частицы дыма (.smoke-particle, ключевые кадры анимации)
└── Отладка vs Продакшн (смена отображения рамок и консоли)
```

---

## Ключевые стили и классы

### Масштабирование с сохранением пропорций (16:9)
Для предотвращения расползания хитбоксов и оверлеев при разных разрешениях экрана используется контейнер `.overlay-container`. Он рассчитывает свои размеры так, чтобы всегда вписываться в экран с соотношением 16:9:
```css
.overlay-container {
  position: relative;
  width: min(100%, calc(100vh * 16 / 9));
  height: min(calc(100vw * 9 / 16), 100%);
  pointer-events: none;
}
```

### Позиционирование оверлеев
Оверлеи элементов управления позиционируются абсолютно на основе CSS-переменных, передаваемых из JS:
```css
.overlay {
  position: absolute;
  left: calc(var(--x, 0) * 1%);
  top: calc(var(--y, 0) * 1%);
  width: calc(var(--w, 100) * 1%);
  height: calc(var(--h, 100) * 1%);
  transform: rotate(calc(var(--rot, 0) * 1deg));
  transform-origin: center;
  z-index: var(--z, 1);
  display: none;
}
.overlay.is-visible {
  display: block;
}
```

### Стрелочные приборы
Стрелки приборов вращаются вокруг своей индивидуальной оси за счет переопределения `transform-origin` (оси вращения):
```css
.overlay.gauge-arrow {
  transform-origin: var(--pivot-x, 50%) var(--pivot-y, 100%);
  transform: rotate(calc(var(--rot, 0) * 1deg));
  transition: transform 0.1s ease-out;
  pointer-events: none;
  will-change: transform;
}
```

### Двойные фоновые изображения и освещение
1. **Кабина водителя**:
   Используются два наложенных друг на друга изображения фона. По умолчанию включено темное изображение, а светлое имеет нулевую прозрачность. При добавлении класса `.cabin-lights-on` светлый фон становится видимым:
   ```css
   .cabin-bg {
     position: absolute;
     inset: 0;
     width: 100%;
     height: 100%;
     object-fit: contain;
     transition: opacity 0.3s ease;
   }
   .cabin-bg-light { opacity: 0; }
   .cabin-bg-dark { opacity: 1; }
   
   .cabin-lights-on .cabin-bg-light { opacity: 1; }
   .cabin-lights-on .cabin-bg-dark { opacity: 0; }
   ```
2. **Кабина командира**:
   Аналогично управляется наклон обзора. Класс `.commander-view-tilted` переключает видимость между `straight.png` и `tilted.png`, а также применяет 3D-наклон к контейнеру сцены:
   ```css
   #scene-commander-content {
     transform-style: preserve-3d;
     transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
   }
   .commander-view-tilted #scene-commander-content {
     transform: translateY(60px) rotateX(10deg) scale(1.05);
   }
   ```
   Дополнительно, при открытии клапана подачи топлива, вешается класс `.valve-up`, который перекрывает видимость текстурой `fuel_valve_up.png`.

---

## Стили эффектов (VFX)

### Анимация рентгена (Hangar)
Текстура танка имеет класс переходов для сглаживания эффекта переключения рентгена:
```css
.tank-layer-top.xray-transition {
  transition: filter 0.5s ease;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}
```

### Выхлопной дым (ExhaustSmoke)
Частицы дыма `.smoke-particle` создаются динамически в контейнере выхлопа. Они плавно поднимаются, увеличиваются в размерах и растворяются за счет CSS-анимаций:
```css
.smoke-particle {
  position: absolute;
  bottom: 10%;
  border-radius: 50%;
  transform: translate(-50%, 0);
  animation: smoke-rise 2.2s ease-out forwards;
  pointer-events: none;
}

@keyframes smoke-rise {
  0% {
    transform: translate(-50%, 0) scale(0.3);
    opacity: 0.8;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: translate(calc(-50% + var(--wind-x, 120px)), -250px) scale(2.2);
    opacity: 0;
  }
}
```

---

## Слои наложения (z-index)

Для упорядочивания элементов по высоте используются следующие уровни `z-index`:

| Уровень (z-index) | CSS Класс / Селектор | Описание |
| --- | --- | --- |
| **0** | `.cabin-bg`, `.hangar-bg`, `.cmd-bg` | Фоновые изображения сцен. |
| **10–20** | `.hitbox-layer` | Интерактивные SVG-полигоны. |
| **50–80** | `.overlay` | Визуальные спрайты элементов управления. |
| **200** | `.overlay-layer` | Контейнер для наложений. |
| **900** | `.instrument-panel-modal` | Детальный щиток КИП. |
| **950** | `.bcn-modal`, `.bcn-modal-content` | Модальные окна БЦН, КПП, жалюзи, подачи топлива. |
| **1000** | `.fullscreen-modal` | Окно требования полноэкранного режима. |
| **1100** | `.debug-console` | Консоль отладки / телеметрии. |
| **1200** | `#testSensorsButton` | Кнопка тестирования датчиков. |
| **2000** | `.start-menu-container` | Стартовое меню симулятора. |
| **2500** | `.finish-report-modal` | Отчет о прохождении тренировки. |
| **3000** | `.action-notifier` | Плавающие уведомления о совершенных действиях. |
