const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const wss = new WebSocket.Server({ port: 8001 });
const clients = new Set();

console.log('Live reload server running on ws://localhost:8001');

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected. Total clients: ${clients.size}`);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// Watch for file changes
const watchDirs = ['.', './img'];
const watchExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg'];

function shouldWatchFile(filePath) {
  const ext = path.extname(filePath);
  return watchExtensions.includes(ext);
}

watchDirs.forEach(dir => {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    
    const filePath = path.join(dir, filename);
    if (shouldWatchFile(filePath)) {
      console.log(`File changed: ${filePath}`);
      
      // Notify all connected clients to reload
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('reload');
        }
      });
    }
  });
});

console.log(`Watching for changes in: ${watchDirs.join(', ')}`);
console.log(`File extensions: ${watchExtensions.join(', ')}`);
