import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'dist', 'electron-win-x64');

console.log('=== Сборка бинарника под Windows (7 - 11) через Electron ===');

// 1. Поиск runtime архива Electron 22 (финальная ветка с официальной поддержкой Windows 7 / 8 / 10 / 11)
const cacheDir = path.join(process.env.HOME || '', '.cache', 'electron-win');
const zipName = 'electron-v22.3.27-win32-x64.zip';
const electronZip = path.join(cacheDir, zipName);

if (!fs.existsSync(electronZip)) {
  console.error(`Ошибка: архив ${electronZip} не найден.`);
  process.exit(1);
}

console.log(`Используется Electron Windows runtime: ${electronZip}`);

// 2. Подготовка целевой директории
if (fs.existsSync(outDir)) {
  console.log(`Очистка предыдущей сборки в ${outDir}...`);
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 3. Распаковка Electron Windows runtime
console.log('Распаковка Electron runtime для Windows...');
execSync(`unzip -q "${electronZip}" -d "${outDir}"`, { stdio: 'inherit' });

// 4. Переименование исполняемого файла в tank-sim.exe
const origExe = path.join(outDir, 'electron.exe');
const targetExe = path.join(outDir, 'tank-sim.exe');
if (fs.existsSync(origExe)) {
  fs.renameSync(origExe, targetExe);
}

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
  description: 'Driver Sim (Tank Simulator) - Electron standalone Windows binary (Win 7-11)',
  main: 'electron/main.cjs'
};

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify(runtimePackageJson, null, 2),
  'utf-8'
);

// 7. Создание батника start.bat
const batFile = path.join(outDir, 'start.bat');
fs.writeFileSync(
  batFile,
  `@echo off\r\nstart "" "%~dp0tank-sim.exe" %*\r\n`,
  'utf-8'
);

// 8. Упаковка папки в готовый zip-дистрибутив
const distZip = path.resolve(rootDir, 'dist', 'tank-sim-electron-win7-11-x64.zip');
console.log(`Создание архива дистрибутива: ${distZip}...`);
execSync(`cd "${path.dirname(outDir)}" && zip -rq "${distZip}" "${path.basename(outDir)}"`, { stdio: 'inherit' });

console.log('✅ Сборка Electron для Windows (7-11) успешно завершена!');
console.log(`Исполняемый exe-файл: ${targetExe}`);
console.log(`Готовый ZIP-архив: ${distZip}`);
