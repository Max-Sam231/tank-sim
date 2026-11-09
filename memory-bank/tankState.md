# TankState — Центральное состояние танка

**Файл:** `js/TankState.js`

## Назначение

Единый источник истины для всего состояния танка. Содержит:

- Состояние всех органов управления
- Показания датчиков (сенсоры)
- Состояние сигнальных ламп
- Физическую симуляцию (tick)

## Основные свойства

### Органы управления кабины

| Свойство              | Тип     | Описание                          |
| --------------------- | ------- | --------------------------------- |
| `isBatteryOn`         | boolean | Выключатель массы                 |
| `isBrakePressed`      | boolean | Педаль тормоза нажата             |
| `parkingBrakeLatched` | boolean | Стояночный тормоз зафиксирован    |
| `gasPedal`            | boolean | Педаль газа нажата                |
| `gearLever`           | string  | Передача: "neutral", "1"-"5", "R" |
| `shutters`            | boolean | Жалюзи открыты                    |
| `leftTank`            | boolean | Левый воздушный баллон открыт     |
| `rightTank`           | boolean | Правый воздушный баллон открыт    |
| `airBleedValve`       | boolean | Клапан спуска воздуха открыт      |
| `bcn`                 | string  | БЦН: "off", "on", "pump"          |
| `fuelPrimerLever`     | boolean | Рычаг ручной подкачки топлива     |
| `fuelManualFeed`      | number  | Ручная подача топлива (0-100%)    |

### Органы управления приборной панели

| Свойство         | Тип     | Описание                                   |
| ---------------- | ------- | ------------------------------------------ |
| `azr`            | number  | АЗР: 0=крышка закрыта, 1=открыта, 2=нажата |
| `epk`            | boolean | ЭПК                                        |
| `horn`           | boolean | Звуковой сигнал                            |
| `mznEngine`      | boolean | МЗН двигателя (удержание)                  |
| `starter`        | number  | Стартер: 0=закрыт, 1=открыт, 2=нажат       |
| `signalLamps`    | number  | Контроль ламп: 0/1/2                       |
| `leftRightTanks` | number  | Переключатель баков: 0=прав, 1=сред, 2=лев |
| `sparkPlug`      | number  | Свеча/мотор                                |
| `engineStart`    | number  | Пуск мотора                                |
| `heating`        | boolean | Обогрев боевого отделения (ОБОГРЕВ БО)     |
| `combined`       | boolean | Комбинированный                            |
| И другие...      |         |                                            |

### Сенсоры (sensors)

| Ключ                   | Тип     | Описание                         | Единицы |
| ---------------------- | ------- | -------------------------------- | ------- |
| `air_left_cylinder`    | number  | Давление воздуха (левый баллон)  | кгс/см² |
| `air_right_cylinder`   | number  | Давление воздуха (правый баллон) | кгс/см² |
| `air_start_pressure`   | number  | Давление пуска (воздух)          | кгс/см² |
| `engine_rpm`           | number  | Обороты двигателя                | об/мин  |
| `oil_pressure_engine`  | number  | Давление масла (двигатель)       | кгс/см² |
| `oil_pressure_gearbox` | number  | Давление масла (КПП)             | кгс/см² |
| `fuel_pressure`        | number  | Давление топлива                 | кгс/см² |
| `coolant_temp`         | number  | Температура охлаждающей жидкости | °C      |
| `oil_temp`             | number  | Температура масла                | °C      |
| `voltage`              | number  | Напряжение бортсети              | В       |
| `speed_kmh`            | number  | Скорость                         | км/ч    |
| `fuel_level`           | number  | Уровень топлива                  | %       |
| `is_bcn_active`        | boolean | БЦН активен                      | -       |
| `is_mzn_active`        | boolean | МЗН активен                      | -       |

### Сигнальные лампы (lamps)

| Ключ                 | Описание                                          |
| -------------------- | ------------------------------------------------- |
| `battery_charge`     | Заряд батареи (горит когда двигатель не работает) |
| `oil_pressure_alarm` | Аварийное давление масла                          |
| `overheat`           | Перегрев                                          |
| `fuel_reserve`       | Резерв топлива                                    |
| `gear_engaged`       | Передача включена                                 |

## Ключевые методы

### Управление состоянием

```javascript
toggleBattery(); // Переключить массу
setBrakePressed(bool); // Установить состояние педали тормоза
setGasPedal(bool); // Установить состояние педали газа
cycleGearLever(); // Переключить передачу (по кругу)
toggleLeftTank(); // Открыть/закрыть левый баллон
toggleRightTank(); // Открыть/закрыть правый баллон
setBcnMode(mode); // Установить режим БЦН ("off"/"on"/"pump")
setFuelManualFeed(value); // Установить ручную подачу топлива (0-100)
adjustFuelManualFeed(delta); // Изменить подачу топлива на delta
cycleStarter(); // Переключить стартер (0→1→2→1→2...)
setStarterPressed(bool); // Напрямую установить нажатие стартера
setMznEnginePressed(bool); // Напрямую установить нажатие МЗН
```

### Подписка на изменения

```javascript
const unsubscribe = state.subscribe((snapshot) => {
  console.log(snapshot.isBatteryOn);
});

// Позже:
unsubscribe();
```

### Получение текущего состояния

```javascript
const snapshot = state.getSnapshot();
// snapshot — плоский объект со всеми параметрами
```

### Сценарий

```javascript
state.setScenario({
  startMethod: "starter-generator", // или "air-start"
  ambientTempC: 15, // температура окружающей среды
});

state.reset(); // Сброс всех параметров к начальным
```

## Физическая симуляция (tick)

Метод `tick(dt)` вызывается каждый кадр и симулирует:

1. **Стояночный тормоз** — фиксируется при удержании педали тормоза ~1.2 сек
2. **Напряжение** — зависит от батареи, работы двигателя, нагрузки стартера
3. **Давление воздуха** — расходуется при кранкинге (air-start) и спуске
4. **Давление топлива** — растёт при включении БЦН или работе двигателя
5. **Обороты двигателя** — зависят от условий запуска и газа
6. **Давление масла** — зависит от оборотов и работы МЗН
7. **Температуры** — медленно приближаются к целевым значениям
8. **Скорость** — зависит от передачи, оборотов и газа
9. **Сигнальные лампы** — обновляются по условиям

### Условия запуска двигателя

```javascript
// Двигатель заводится при:
// 1. fuelPressure >= 0.8
// 2. airOk (для air-start: airStartPressure >= 10)
// 3. fuelManualFeed >= 10
// 4. fuelPrimerLever === true
// 5. Удержание стартера ~1.5 сек
```

## Вспомогательные методы

```javascript
_clamp(value, min, max); // Ограничить значение диапазоном
_approach(current, target, rate, dt); // Плавное приближение к цели
_setSensor(key, value, options); // Установить сенсор с проверкой
_setLamp(key, value); // Установить состояние лампы
_emit(); // Уведомить подписчиков
```

## Пример snapshot

```javascript
{
  isBatteryOn: true,
  isBrakePressed: false,
  parkingBrakeLatched: true,
  brakeEffective: true,  // isBrakePressed || parkingBrakeLatched
  engineRunning: false,
  gearLever: "neutral",
  bcn: "on",
  fuelManualFeed: 40,

  // Сенсоры (дублируются для удобства)
  voltage: 24.5,
  engine_rpm: 0,
  fuel_pressure: 1.8,
  sensors: { ... },

  // Лампы (дублируются для удобства)
  lamp_battery_charge: true,
  lamps: { ... },

  // Сценарий
  scenario: { startMethod: "starter-generator", ambientTempC: 15 },
  scenario_start_method: "starter-generator",
  scenario_ambient_temp_c: 15,
}
```
