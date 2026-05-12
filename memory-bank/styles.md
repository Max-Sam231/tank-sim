# Стили (CSS)

**Файл:** `styles.css`

## Общая структура

```
styles.css
├── Base styles (html, body, .app)
├── Scene styles (.scene, .game-scene)
├── Overlay system (.overlay-layer, .overlay)
├── Hitbox system (.hitbox-layer, .hitbox)
├── Debug console (.debug-console)
├── Modals (fullscreen, instrument-panel, bcn, finish-report)
├── Start menu (.start-menu-container)
├── Hangar scene (.hangar-bg-wrapper, .tank-layer)
├── Driver cabin (.cabin-bg)
└── Commander scene (.cmd-bg, commander-view-tilted)
```

## Ключевые классы

### Контейнеры

```css
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.hidden,
.is-hidden {
  display: none !important;
}
```

### Система оверлеев

```css
.overlay-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 200;
}

.overlay {
  position: absolute;
  left: calc(var(--x, 0) * 1%);
  top: calc(var(--y, 0) * 1%);
  width: calc(var(--w, 100) * 1%);
  height: calc(var(--h, 100) * 1%);
  transform: rotate(calc(var(--rot, 0) * 1deg));
  object-fit: contain;
  display: none;
  pointer-events: none;
  z-index: var(--z, 1);
}

.overlay.is-visible {
  display: block;
}

.overlay.overlay-control {
  pointer-events: auto;
  cursor: pointer;
}

.overlay.overlay-control:hover,
.overlay.overlay-control.hitbox-hovered {
  filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.6));
}
```

### Система хитбоксов

```css
.hitbox-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}

.hitbox {
  pointer-events: all;
  cursor: pointer;
  fill: rgba(255, 0, 0, 0.25);
  stroke: rgba(255, 0, 0, 0.55);
  stroke-width: 3;
}

.hitbox:hover {
  fill: rgba(0, 255, 0, 0.25);
  stroke: rgba(0, 255, 0, 0.65);
}

.hitbox.transparent {
  fill: transparent;
  stroke: transparent;
}

/* Production mode — хитбоксы невидимы */
body.app-prod .hitbox {
  fill: transparent;
  stroke: transparent;
}

body.app-prod .hitbox:hover {
  fill: transparent;
  stroke: transparent;
}
```

### Debug vs Production режимы

```css
/* Debug mode — подсветка оверлеев */
body.app-debug .overlay.overlay-control {
  outline: 2px solid rgba(0, 170, 255, 0.85);
  outline-offset: -2px;
}

/* Production mode — усиленная подсветка при hover */
body.app-prod .overlay.overlay-control:hover,
body.app-prod .overlay.overlay-control.hitbox-hovered {
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
}

/* Production mode — скрыть метки хитбоксов */
body.app-prod .hitbox-layer.labels-visible .hitbox-label {
  display: none;
}
```

### Метки хитбоксов (debug)

```css
.hitbox-label {
  display: none;
  pointer-events: none;
  font-family: ui-monospace, ...;
  font-size: 18px;
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(0, 0, 0, 0.8);
  stroke-width: 4px;
  paint-order: stroke fill;
}

.hitbox-layer.labels-visible .hitbox-label {
  display: block;
}
```

### Debug консоль

```css
.debug-console {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 1100;
  min-width: 280px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: ui-monospace, ...;
  font-size: 13px;
  white-space: pre;
}
```

### Приборная панель (модалка)

```css
.instrument-panel-modal {
  position: absolute;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  background: #000;
}

.instrument-panel-modal.hidden {
  display: none;
}

/* Блокировка хитбоксов кабины при открытой панели */
.scene.instrument-panel-open .cabin-hitbox-layer .hitbox {
  pointer-events: none;
}

.scene.instrument-panel-open .instrument-panel-hitbox-layer .hitbox {
  pointer-events: all;
}

.instrument-panel-stage {
  flex: 1;
  background-image: url("./img/Прибор фон.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
```

### Сцена командира

```css
.cmd-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

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

/* 3D эффект наклона */
#scene-commander {
  perspective: 1000px;
}

#scene-commander-content {
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.commander-view-tilted #scene-commander-content {
  transform: translateY(60px) rotateX(10deg) scale(1.05);
}
```

### Ангар

```css
.hangar-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.tank-layer {
  position: absolute;
  bottom: 7%;
  left: 50%;
  transform: translateX(-50%);
  height: 55%;
  pointer-events: none;
}

.hitbox.interactive {
  fill: transparent;
}

.hitbox.interactive:hover {
  fill: rgba(255, 255, 255, 0.1);
  stroke: rgba(255, 255, 255, 0.5);
}
```

### Стартовое меню

```css
.start-menu-container {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #000;
}

.start-menu-container.is-hidden {
  display: none;
}

.start-screen {
  display: none;
}

.start-screen.is-active {
  display: block;
}
```

### Модалка результатов

```css
.finish-report-modal {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(0, 0, 0, 0.9);
}

.finish-report-item.is-done {
  text-decoration: line-through;
  opacity: 0.65;
}
```

## z-index слои

| Слой             | z-index | Описание                      |
| ---------------- | ------- | ----------------------------- |
| Фон              | 0       | Изображение кабины            |
| Хитбоксы         | 10-20   | SVG полигоны                  |
| Оверлеи          | 50-80   | Спрайты элементов (--z)       |
| Overlay layer    | 200     | Контейнер оверлеев            |
| Instrument panel | 900     | Модалка приборной панели      |
| BCN modal        | 950     | Модалка БЦН                   |
| Fullscreen modal | 1000    | Модалка полноэкранного режима |
| Debug console    | 1100    | Консоль отладки               |
| Start menu       | 2000    | Стартовое меню                |
| Finish report    | 2500    | Результаты тренировки         |
