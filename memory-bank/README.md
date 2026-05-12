# Memory Bank — Документация для AI

Эта папка содержит контекстную документацию по проекту симулятора танка Т-72. Предназначена для использования AI-ассистентами при работе с кодовой базой.

## Порядок чтения

1. **projectOverview.md** — Начни здесь. Общее описание проекта, цели, функционал.
2. **architecture.md** — Архитектура системы, диаграммы, поток данных.
3. **techContext.md** — Технологии, соглашения кода, ограничения.

## Модули (по важности)

4. **tankState.md** — Центральное состояние танка. Все параметры, методы, физика.
5. **uiController.md** — Управление UI, рендеринг, обработка событий.
6. **controlOverlayDefs.md** — Конфигурация визуальных оверлеев элементов управления.
7. **scenes.md** — Система сцен (ангар, водитель, командир).
8. **trainingSystem.md** — Движок тренировки, сценарии, чеклист.

## Вёрстка и стили

9. **htmlStructure.md** — HTML-разметка, атрибуты, классы состояния.
10. **styles.md** — CSS-классы, z-index слои, режимы debug/prod.

## Быстрые ссылки

| Задача                            | Файл                                |
| --------------------------------- | ----------------------------------- |
| Добавить новый элемент управления | controlOverlayDefs.md, tankState.md |
| Добавить шаг в тренировку         | trainingSystem.md                   |
| Изменить позицию/размер оверлея   | controlOverlayDefs.md               |
| Понять систему хитбоксов          | htmlStructure.md, styles.md         |
| Добавить новую сцену              | scenes.md, architecture.md          |
| Добавить новый сенсор             | tankState.md                        |
| Изменить стили режима             | styles.md                           |

## Ключевые файлы кода

| Документ              | Файл кода                                         |
| --------------------- | ------------------------------------------------- |
| tankState.md          | `js/TankState.js`                                 |
| uiController.md       | `js/UIController.js`                              |
| controlOverlayDefs.md | `js/ControlOverlayDefs.js`                        |
| scenes.md             | `js/SceneManager.js`, `js/*Scene.js`              |
| trainingSystem.md     | `js/TrainingEngine.js`, `js/TrainingScenarios.js` |
| htmlStructure.md      | `index.html`                                      |
| styles.md             | `styles.css`                                      |
| architecture.md       | `main.js`                                         |
