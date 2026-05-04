// Live reload script
(function() {
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
