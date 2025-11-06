const { WebSocketServer } = require("ws");
const { colors, websocketPort } = require("../config/constants");

let wss;

function initializeWebSocketServer() {
  wss = new WebSocketServer({ port: websocketPort });

  wss.on("connection", (ws) => {
    console.log(
      `${colors.cyan}[WS] Overlay connected! Ready to show chat & gifts~${colors.reset}`
    );
    
    // Add logging when a client disconnects
    ws.on('close', (code, reason) => {
      console.log(
        `${colors.yellow}[WS] Client disconnected. Code: ${code}, Reason: ${reason?.toString() || 'Unknown'}${colors.reset}`
      );
    });
    
    // Add error handling for individual WebSocket connections
    ws.on('error', (err) => {
      console.error(`${colors.red}[WS] Client connection error:${colors.reset}`, err);
    });
  });

  // Add error handling for WebSocket server
  wss.on("error", (err) => {
    console.error(`${colors.red}[WS] WebSocket Server Error:${colors.reset}`, err);
  });

  // Log when server starts listening
  wss.on('listening', () => {
    console.log(`${colors.green}[WS] WebSocket server listening on port ${websocketPort}${colors.reset}`);
  });

  return wss;
}

function broadcastToClients(message) {
  if (!wss) {
    console.error(`${colors.red}[WS] WebSocket server not initialized${colors.reset}`);
    return;
  }

  const messageStr =
    typeof message === "string" ? message : JSON.stringify(message);

  // Log message being sent for debugging
  console.log(`${colors.yellow}[WS] Broadcasting message:${colors.reset}`, message);

  const clientCount = wss.clients.size;
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
      sentCount++;
    }
  });

  console.log(`${colors.cyan}[WS] Message sent to ${sentCount}/${clientCount} clients${colors.reset}`);
}

function getWebSocketServer() {
  return wss;
}

module.exports = {
  initializeWebSocketServer,
  broadcastToClients,
  getWebSocketServer,
};
