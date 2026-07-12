# ControlOverlayDefs — Справочник оверлеев и приборов

**Файл:** `js/ControlOverlayDefs.js`

## Назначение

Содержит статические конфигурации для всех графических наложений элементов управления и стрелок приборов КИП. Он определяет поведение оверлея в зависимости от значения соответствующего поля в `TankState`.

## Типы элементов управления

### 1. Boolean — Двухпозиционные переключатели
Переключаются между двумя картинками (`on` и `off`) на основе булевого значения:
```javascript
"battery-toggle": {
  kind: "boolean",
  stateKey: "isBatteryOn",
  inflate: 1.0,           // Коэффициент размера относительно хитбокса
  offsetX: 22,            // Смещение по X (в пикселях viewBox 1920x1080)
  offsetY: 5,             // Смещение по Y (в пикселях viewBox 1920x1080)
  z: 60,                  // Слои наложения (z-index)
  off: "./img/11/11_0001_Слой-2.png",
  on: "./img/11/11_0000_Слой-289-копия.png",
}
```

### 2. Enum — Многопозиционные переключатели
Мапят дискретные состояния (числа или строки) на конкретные оверлеи:
```javascript
"gear-lever": {
  kind: "enum",
  stateKey: "gearLever",
  inflate: 1.2,
  offsetX: -12,
  offsetY: -25,
  z: 80,
  frames: {
    neutral: { src: "./img/1/1_0000s_0000_Слой-57-копия-8.png", offsetX: -10, offsetY: -25 },
    "1": { src: "./img/1/1_0000s_0001_Слой-57-копия-7.png", offsetX: -10, offsetY: -20 },
    //...
  }
}
```
*Примечание:* Отдельные кадры могут переопределять глобальные параметры смещения и масштаба.

### 3. Range — Плавные регуляторы
Выбирают наиболее подходящий кадр на основе приближенности к ключевым точкам `at`:
```javascript
"fuel-manual-feed": {
  kind: "range",
  stateKey: "fuelManualFeed",
  inflate: 2.6,
  offsetX: -34,
  offsetY: 80,
  z: 58,
  frames: [
    { at: 0, src: "./img/7/7_0000_Слой-306-копия-3.png", offsetX: -34, offsetY: 80 },
    { at: 33, src: "./img/7/7_0001_Слой-306-копия-2.png", offsetX: -38, offsetY: 60 },
    { at: 66, src: "./img/7/7_0002_Слой-306-копия.png", offsetX: -36, offsetY: 38 },
    { at: 100, src: "./img/7/7_0003_Слой-2.png", offsetX: -36, offsetY: 38 }
  ]
}
```

### 4. Gauge — Стрелочные индикаторы приборов
Используются для отображения физических значений на шкалах с помощью вращения стрелки:
```javascript
"gauge-coolant-temp": {
  kind: "gauge",
  sensorKey: "coolant_temp", // Ключ сенсора в TankState
  min: 0,                    // Минимальное значение на шкале
  max: 120,                  // Максимальное значение на шкале
  cx: 485,                   // Центр вращения по X во viewBox
  cy: 290,                   // Центр вращения по Y во viewBox
  arrowW: 151,               // Ширина спрайта стрелки
  arrowH: 115,               // Высота спрайта стрелки
  pivotX: 58,                // Точка вращения по X на спрайте стрелки (%)
  pivotY: 70,                // Точка вращения по Y на спрайте стрелки (%)
  startAngle: -92,           // Угол в градусах для значения min
  endAngle: 68,              // Угол в градусах для значения max
  z: 75,
  arrowImage: "./img/12/14_0001_Фигура-1-копия-2.png" // Спрайт стрелки
}
```

## Полный список приборов КИП (Gauges)

| Идентификатор прибора | Ключ датчика | Диапазон шкалы | Углы (мин/макс) | Особенности |
| --- | --- | --- | --- | --- |
| `gauge-coolant-temp` | `coolant_temp` | 0 .. 120 °C | -92° .. +68° | Температура ОЖ двигателя |
| `gauge-oil-temp` | `oil_temp` | 0 .. 120 °C | -92° .. +68° | Температура масла двигателя |
| `gauge-voltammeter` | `amperage` / `voltage` | -100..500 А / 0..30 В | -55° .. +55° | Вольтамперметр ВА-540. Асимметричная шкала. При зажатой кнопке `ammeterButton` отображает напряжение (0-30 В). |
| `gauge-oil-pressure-engine` | `oil_pressure_engine` | 0 .. 15 кгс/см² | -62° .. +62° | Давление масла двигателя |
| `gauge-oil-pressure-gearbox`| `oil_pressure_gearbox`| 0 .. 15 кгс/см² | -62° .. +62° | Давление смазки в КПП |
| `gauge-fuel` | `fuel_level_internal` / `_external` | 0..190 л / 100..400 л | -55° .. +55° | Топливомер. При переключателе `leftRightTanks === 0` переключается на внешний бак. |
| `gauge-speed` | `speed_kmh` | 0 .. 100 км/ч | -100° .. +100° | Спидометр (большая стрелка) |
| `gauge-rpm` | `engine_rpm` | 0 .. 4000 об/мин | -115° .. +115° | Тахометр |

## Классификация переключателей

### Кабина водителя
- `battery-toggle` (boolean): Масса.
- `gear-lever` (enum): Рычаг КПП (neutral, 1-7, R).
- `shutters` (enum): Жалюзи радиатора (0, 1, 2, 3, 4).
- `right-tank` / `left-tank` (boolean): Воздушные баллоны.
- `gas-pedal` / `brake-pedal` (boolean): Педали.
- `fuel-manual-feed` (range): Ручной газ.
- `bcn` (enum): Кран БЦН (off, on, pump).
- `air-bleed-valve` (boolean): Спуск воздуха.
- `fuel-primer-lever` (boolean): Ручной насос подкачки.
- `cabin-light` (boolean): Тумблер плафона кабины.

### Приборная панель КИП
- `azr` (enum): Автомат защиты сети (0/1/2).
- `epk` / `horn` / `mzn-engine` / `emergency-hatch-rotation` (boolean): Кнопки удержания.
- `ammeter-button` (boolean): Переключение шкалы ВА-540.
- `left-right-tanks` (enum): Переключатель баков топливомера.
- `spark-plug` / `engine-start` (enum): Трехпозиционные тумблеры (0/1/2).
- `oil-pump-gearbox` (boolean): Откачка масла КП.
- `commander-call` / `air-intake` (boolean): Сигнальные лампы (работают как оверлеи индикаторов).
- `heating` / `combined` / `left-lights` / `right-lights` / `gabrate-lights` / `lights-all` / `water-antifreeze` / `gpk` (boolean): Тумблеры КИП.
- `bca-tca` (enum): Трехпозиционный переключатель БЦН/off/ТДА.
- `mzn-tow` / `starter` / `signal-lamps` (enum): Переключатели под защитными крышками (0/1/2).
