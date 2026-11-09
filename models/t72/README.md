# T-72 — 3D для ангара

Локальный файл (в git **не** коммитится):

- **`tank.glb`** — экспорт для браузера

## Экспорт из `t-72-outdated/source/072SHALL.blend`

Нужен Blender CLI (в проекте можно держать portable в `tools/blender-portable/`, тоже в `.gitignore`):

```powershell
.\tools\blender-portable\blender-4.2.8-windows-x64\blender.exe -b .\t-72-outdated\source\072SHALL.blend --python .\tools\export_tank_glb.py
```

Скрипт пишет `models/t72/tank.glb`.

## В симе

1. Запусти `npm run serve` / `npm run dev`
2. Старт тренировки → ангар
3. Кнопка смены вида: сверху → сбоку → справа → **3D**
4. ЛКМ — вращать, колёсико — зум, ПКМ — сдвиг

Привязка люков — следующим шагом.
