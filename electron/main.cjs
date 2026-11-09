const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Разрешаем автовоспроизведение звуков без обязательного жеста пользователя
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Оптимизация аппаратного ускорения
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'Driver Sim (Симулятор механика-водителя танка)',
    backgroundColor: '#0a0d12',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Разрешает загрузку локальных модулей и медиаресурсов
    }
  });

  // Определяем путь к index.html (в разработке или в пакете resources/app)
  const candidatePaths = [
    path.join(__dirname, '..', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(app.getAppPath(), 'index.html')
  ];

  const htmlPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  mainWindow.loadFile(htmlPath);

  // Клавиши управления в режиме симулятора:
  // F11 — полноэкранный режим
  // F12 / Ctrl+Shift+I — открытие/закрытие DevTools для отладки
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F11') {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        event.preventDefault();
      } else if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
