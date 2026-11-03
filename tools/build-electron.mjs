import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist', 'electron-linux-x64');

console.log('=== Сборка бинарника через Electron ===');

// 1. Поиск runtime архива или системного Electron
const cachedZipCandidates = [
  path.join(process.env.HOME || '', '.cache/electron/85f2b7422cd2141b6caa99bac0fc0658b0f22b533b571f6a2ec9a49f2ac23c0a/electron-v43.3.0-linux-x64.zip'),
  path.join(process.env.HOME || '', '.cache/electron/electron-v43.3.0-linux-x64.zip')
];

let electronZip = cachedZipCandidates.find(p => fs.existsSync(p));

if (!electronZip) {
  // Попробуем найти любой linux-x64 zip в кэше electron
  const electronCacheDir = path.join(process.env.HOME || '', '.cache/electron');
  if (fs.existsSync(electronCacheDir)) {
    const findZip = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findZip(fullPath);
          if (found) return found;
        } else if (entry.isFile() && entry.name.includes('linux-x64') && entry.name.endsWith('.zip')) {
          return fullPath;
        }
      }
      return null;
    };
    electronZip = findZip(electronCacheDir);
  }
}

if (!electronZip) {
  console.error('Ошибка: не найден архив Electron linux-x64 в кэше.');
  process.exit(1);
}

console.log(`Используется Electron runtime: ${electronZip}`);

// 2. Подготовка целевой директории
if (fs.existsSync(outDir)) {
  console.log(`Очистка предыдущей сборки в ${outDir}...`);
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 3. Распаковка Electron runtime
console.log('Распаковка Electron runtime...');
execSync(`unzip -q "${electronZip}" -d "${outDir}"`, { stdio: 'inherit' });

// 4. Переименование исполняемого файла в tank-sim
const origBinary = path.join(outDir, 'electron');
const targetBinary = path.join(outDir, 'tank-sim');
if (fs.existsSync(origBinary)) {
  fs.renameSync(origBinary, targetBinary);
}
fs.chmodSync(targetBinary, 0o755);

// 5. Создание resources/app и копирование ресурсов симулятора
const appDir = path.join(outDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

console.log('Копирование файлов проекта в resources/app...');

const copyList = [
  'index.html',
  'main.js',
  'styles.css',
  'live-reload.js',
  'js',
  'img',
  'sounds',
  'electron'
];

for (const item of copyList) {
  const src = path.join(rootDir, item);
  const dest = path.join(appDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// 6. Создание runtime package.json для Electron
const runtimePackageJson = {
  name: 'tank-driver-sim',
  version: '0.1.0',
  description: 'Driver Sim (Tank Simulator) - Electron standalone binary',
  main: 'electron/main.cjs'
};

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify(runtimePackageJson, null, 2),
  'utf-8'
);

// 7. Создание удобного скрипта-запускателя
const launcherScript = path.join(outDir, 'start.sh');
fs.writeFileSync(
  launcherScript,
  `#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
exec "\$SCRIPT_DIR/tank-sim" "\$@"
`,
  { mode: 0o755 }
);

console.log('✅ Сборка Electron успешно завершена!');
console.log(`Исполняемый бинарник: ${targetBinary}`);
