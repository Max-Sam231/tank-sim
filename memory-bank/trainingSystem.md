# Система тренировки

## TrainingEngine

**Файл:** `js/TrainingEngine.js`

Движок отслеживания выполнения чеклиста тренировки.

### Конструктор

```javascript
new TrainingEngine({ state }); // state — экземпляр TankState
```

### Принцип работы

1. При `setGoal()` загружается сценарий с шагами
2. При каждом изменении TankState проверяются условия текущего шага
3. Шаг выполняется только если:
   - `completeWhen(snapshot)` возвращает `true`
   - Шаг "взведён" (armed) — пользователь взаимодействовал с нужным элементом
4. После выполнения переходим к следующему шагу

### Важная особенность: Strict Checklist

**Шаги, выполненные раньше времени, НЕ засчитываются!**

Пример: если пользователь включил батарею до выполнения предыдущих шагов, это не засчитается. Нужно будет включить батарею снова, когда придёт её очередь.

### Механизм взведения (Arming)

Для предотвращения автоматического засчитывания шагов используется механизм "взведения":

```javascript
// gateKeys — ключи состояния, которые должны измениться
{ gateKeys: ["isBatteryOn"], ... }

// Шаг становится "armed" когда:
// - Значение gateKeys изменилось относительно baseline
// - Это значит, что пользователь взаимодействовал с элементом
```

**Исключение:** Шаги с `auto: true` засчитываются автоматически без взведения.

### API

```javascript
// Установить цель тренировки
training.setGoal({
  startMethod: "starter-generator",
  ambientTempC: 15,
});

// Получить текущий отчёт
const report = training.getReport();
// {
//   scenarioId: "starter-generator@15",
//   scenarioTitle: "Запуск: Стартер-генератор, +15°C",
//   items: [
//     { id: "gear-neutral", title: "...", done: true, index: 0 },
//     { id: "parking-brake", title: "...", done: false, index: 1 },
//     ...
//   ]
// }

// Получить название сценария
training.getScenarioTitle();
```

### Внутренние методы

```javascript
_onSnapshot(snapshot); // Вызывается при каждом изменении состояния
_primeActiveGateBaseline(snap); // Сохранить baseline для текущего шага
_hasGateChanged(step, snap); // Проверить изменение gateKeys
_isArmed(step); // Проверить взведён ли шаг
_arm(step); // Взвести шаг
_isStepDone(stepId); // Проверить выполнен ли шаг
_markDone(stepId); // Отметить шаг выполненным
```

---

## TrainingScenarios

**Файл:** `js/TrainingScenarios.js`

Определения сценариев тренировки.

### Структура сценария

```javascript
{
  id: "starter-generator@15",
  title: "Запуск: Стартер-генератор, +15°C",
  steps: [
    {
      id: "step-id",
      title: "Описание шага на русском",
      auto: false,  // true = автоматическое засчитывание
      gateKeys: ["stateKey1", "stateKey2"],  // Ключи для взведения
      completeWhen: (snapshot) => Boolean    // Условие выполнения
    },
    // ...
  ]
}
```

### Текущий сценарий: Стартер-генератор +15°C

16 шагов:

| #   | ID                    | Описание                 | Условие                                               |
| --- | --------------------- | ------------------------ | ----------------------------------------------------- |
| 1   | gear-neutral          | Нейтраль                 | `gearLever === "neutral"` (auto)                      |
| 2   | parking-brake         | Стояночный тормоз        | `parkingBrakeLatched === true`                        |
| 3   | shutters-open         | Жалюзи открыть           | `shutters === true`                                   |
| 4   | battery-on            | Масса вкл (22-26В)       | `isBatteryOn && voltage 22-26`                        |
| 5   | open-instrument-panel | Открыть панель           | `instrumentPanel === true`                            |
| 6   | azr-on                | АЗР включить             | `azr === 2`                                           |
| 7   | signal-lamps-open     | Открыть крышку ламп      | `signalLamps === 1`                                   |
| 8   | signal-lamps-test     | Нажать кнопку            | `signalLamps === 2`                                   |
| 9   | fuel-primer-lever-on  | Рычаг подкачки           | `fuelPrimerLever === true`                            |
| 10  | manual-fuel-30-50     | Ручная подача 30-50%     | `fuelManualFeed 30-50`                                |
| 11  | bcn-on-pressure       | БЦН вкл (1.2-2.5)        | `bcn on/pump && fuel_pressure 1.2-2.5`                |
| 12  | mzn-to-oil            | МЗН до 2.0-5.0           | `mznEngine && oil_pressure 2.0-5.0`                   |
| 13  | starter-start-engine  | Стартер до запуска       | `engineRunning && rpm >= 800`                         |
| 14  | release-and-bcn-off   | Отпустить, БЦН выкл      | `engineRunning && !mznEngine && starter=1 && bcn=off` |
| 15  | manual-fuel-idle      | Подача 20-25% (800-1000) | `fuelManualFeed 20-25 && rpm 800-1000`                |
| 16  | voltage-charge        | Напряжение 27-28.5В      | `engineRunning && voltage 27-28.5` (auto)             |

### Получение сценария

```javascript
import { getScenarioDefinition } from "./TrainingScenarios.js";

const def = getScenarioDefinition({
  startMethod: "starter-generator",
  ambientTempC: 15,
});
// Возвращает null если сценарий не найден
```

---

## FinishReportModal

**Файл:** `js/FinishReportModal.js`

Модальное окно результатов тренировки.

### Конструктор

```javascript
new FinishReportModal({
  onContinue: () => {
    /* продолжить тренировку */
  },
  onMenu: () => {
    /* вернуться в меню */
  },
});
```

### API

```javascript
reportModal.show(report); // Показать с данными из training.getReport()
reportModal.hide(); // Скрыть
```

### Отображение

- Заголовок — название сценария
- Список шагов с чекбоксами (выполненные перечёркнуты)
- Кнопки "Продолжить" и "В меню"
