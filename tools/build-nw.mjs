import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist', 'nwjs-linux-x64');

console.log('=== Сборка бинарника через NW.js ===');

// 1. Поиск runtime архива NW.js в кэше
const nwCacheDir = path.join(process.env.HOME || '', '.cache', 'nwjs');
let nwTarball = null;

if (fs.existsSync(nwCacheDir)) {
  const files = fs.readdirSync(nwCacheDir);
  const match = files.find(f => f.includes('nwjs') && f.includes('linux-x64') && f.endsWith('.tar.gz'));
  if (match) {
    nwTarball = path.join(nwCacheDir, match);
  }
}

if (!nwTarball || !fs.existsSync(nwTarball)) {
  console.error('Ошибка: не найден архив NW.js linux-x64 в ~/.cache/nwjs/.');
  process.exit(1);
}

console.log(`Используется NW.js runtime: ${nwTarball}`);

// 2. Подготовка целевой директории
if (fs.existsSync(outDir)) {
  console.log(`Очистка предыдущей сборки в ${outDir}...`);
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 3. Распаковка NW.js runtime (со снятием верхнего уровня каталога)
console.log('Распаковка NW.js runtime...');
execSync(`tar -xzf "${nwTarball}" -C "${outDir}" --strip-components=1`, { stdio: 'inherit' });

// 4. Подготовка архива приложения package.nw
const stageDir = path.join(outDir, '__stage_nw');
fs.mkdirSync(stageDir, { recursive: true });

console.log('Подготовка файлов симулятора для NW.js...');

const copyList = [
  'index.html',
  'main.js',
  'styles.css',
  'live-reload.js',
  'js',
  'img',
  'sounds'
];

for (const item of copyList) {
  const src = path.join(rootDir, item);
  const dest = path.join(stageDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// 5. Создание NW.js package.json манифеста
const nwManifest = {
  name: 'tank-driver-sim',
  version: '0.1.0',
  description: 'Driver Sim (Tank Simulator) - NW.js standalone binary',
  main: 'index.html',
  window: {
    title: 'Driver Sim (Симулятор механика-водителя танка)',
    width: 1440,
    height: 900,
    min_width: 1024,
    min_height: 720,
    position: 'center',
    resizable: true,
    fullscreen: false,
    frame: true
  },
  'chromium-args': '--autoplay-policy=no-user-gesture-required --ignore-gpu-blocklist --enable-gpu-rasterization'
};

fs.writeFileSync(
  path.join(stageDir, 'package.json'),
  JSON.stringify(nwManifest, null, 2),
  'utf-8'
);

// 6. Упаковка в zip-архив package.nw
console.log('Упаковка ресурсов в package.nw...');
const packageNwZip = path.join(outDir, 'package.nw');
execSync(`cd "${stageDir}" && zip -rq "${packageNwZip}" .`, { stdio: 'inherit' });
fs.rmSync(stageDir, { recursive: true, force: true });

// 7. Создание объединённого исполняемого бинарника через cat nw package.nw > tank-sim
console.log('Создание единого исполняемого файла tank-sim...');
const nwBinary = path.join(outDir, 'nw');
const combinedBinary = path.join(outDir, 'tank-sim');

// cat nw package.nw > tank-sim
execSync(`cat "${nwBinary}" "${packageNwZip}" > "${combinedBinary}"`, { stdio: 'inherit' });
fs.chmodSync(combinedBinary, 0o755);

// 8. Создание удобного скрипта-запускателя
const launcherScript = path.join(outDir, 'start.sh');
fs.writeFileSync(
  launcherScript,
  `#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
exec "\$SCRIPT_DIR/tank-sim" "\$@"
`,
  { mode: 0o755 }
);

console.log('✅ Сборка NW.js успешно завершена!');
console.log(`Исполняемый бинарник: ${combinedBinary}`);
