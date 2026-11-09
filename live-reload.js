// Live reload script
(function() {
  // Skip live reload in desktop runtimes (Electron / NW.js) or direct file:// access
  if (typeof window !== 'undefined') {
    const isDesktop = window.location.protocol === 'file:' ||
      (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)) ||
      (typeof nw !== 'undefined');
    if (isDesktop) return;
  }

  let ws;
  let reconnectTimer;
  
  function connect() {
    ws = new WebSocket('ws://localhost:8001');
    
    ws.onopen = function() {
      console.log('Live reload connected');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
    
    ws.onmessage = function(event) {
      if (event.data === 'reload') {
        console.log('Reloading page...');
        window.location.reload();
      }
    };
    
    ws.onclose = function() {
      console.log('Live reload disconnected');
      // Try to reconnect every 2 seconds
      reconnectTimer = setTimeout(connect, 2000);
    };
    
    ws.onerror = function(error) {
      console.error('Live reload error:', error);
    };
  }
  
  connect();
})();
