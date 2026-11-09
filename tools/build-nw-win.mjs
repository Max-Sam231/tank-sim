import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist', 'nwjs-win-x64');

console.log('=== Сборка бинарника под Windows (7 - 11) через NW.js ===');

// 1. Поиск runtime архива NW.js v0.72.0 (финальная ветка на Chromium 109 с поддержкой Windows 7 / 8 / 10 / 11)
const cacheDir = path.join(process.env.HOME || '', '.cache', 'nwjs-win');
const zipName = 'nwjs-v0.72.0-win-x64.zip';
const nwZip = path.join(cacheDir, zipName);

if (!fs.existsSync(nwZip)) {
  console.error(`Ошибка: архив ${nwZip} не найден.`);
  process.exit(1);
}

console.log(`Используется NW.js Windows runtime: ${nwZip}`);

// 2. Подготовка целевой директории
if (fs.existsSync(outDir)) {
  console.log(`Очистка предыдущей сборки в ${outDir}...`);
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 3. Распаковка NW.js Windows runtime во временную папку
const tempExtract = path.join(outDir, '__temp_nw');
fs.mkdirSync(tempExtract, { recursive: true });

console.log('Распаковка NW.js runtime для Windows...');
execSync(`unzip -q "${nwZip}" -d "${tempExtract}"`, { stdio: 'inherit' });

// Перемещение содержимого из подпапки (например nwjs-v0.72.0-win-x64) в outDir
const extractedEntries = fs.readdirSync(tempExtract);
const subDir = extractedEntries.find(e => fs.statSync(path.join(tempExtract, e)).isDirectory() && e.includes('nwjs'));
const sourceDir = subDir ? path.join(tempExtract, subDir) : tempExtract;

for (const item of fs.readdirSync(sourceDir)) {
  fs.renameSync(path.join(sourceDir, item), path.join(outDir, item));
}
fs.rmSync(tempExtract, { recursive: true, force: true });

// 4. Подготовка файлов симулятора для NW.js в отдельной временной папке
const stageDir = path.join(outDir, '__stage_nw');
fs.mkdirSync(stageDir, { recursive: true });

console.log('Подготовка файлов симулятора для NW.js Windows...');

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
  description: 'Driver Sim (Tank Simulator) - NW.js standalone Windows binary (Win 7-11)',
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

// 6. Упаковка в package.nw
console.log('Упаковка ресурсов в package.nw...');
const packageNwZip = path.join(outDir, 'package.nw');
execSync(`cd "${stageDir}" && zip -rq "${packageNwZip}" .`, { stdio: 'inherit' });
fs.rmSync(stageDir, { recursive: true, force: true });

// 7. Создание объединённого исполняемого бинарника tank-sim.exe
console.log('Создание объединённого исполняемого файла tank-sim.exe...');
const nwExe = path.join(outDir, 'nw.exe');
const targetExe = path.join(outDir, 'tank-sim.exe');

// cat nw.exe package.nw > tank-sim.exe
execSync(`cat "${nwExe}" "${packageNwZip}" > "${targetExe}"`, { stdio: 'inherit' });

// 8. Создание батника start.bat
const batFile = path.join(outDir, 'start.bat');
fs.writeFileSync(
  batFile,
  `@echo off\r\nstart "" "%~dp0tank-sim.exe" %*\r\n`,
  'utf-8'
);

// 9. Упаковка папки в готовый zip-дистрибутив
const distZip = path.resolve(rootDir, 'dist', 'tank-sim-nwjs-win7-11-x64.zip');
console.log(`Создание архива дистрибутива: ${distZip}...`);
execSync(`cd "${path.dirname(outDir)}" && zip -rq "${distZip}" "${path.basename(outDir)}"`, { stdio: 'inherit' });

console.log('✅ Сборка NW.js для Windows (7-11) успешно завершена!');
console.log(`Исполняемый exe-файл: ${targetExe}`);
console.log(`Готовый ZIP-архив: ${distZip}`);
