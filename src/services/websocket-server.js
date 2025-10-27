const { WebSocketServer } = require("ws");
const { colors, websocketPort } = require("../config/constants");

let wss;

function initializeWebSocketServer() {
  wss = new WebSocketServer({ port: websocketPort });

  wss.on("connection", () =>
    console.log(
      `${colors.cyan}🖥️  Overlay connected! Ready to show chat & gifts~${colors.reset}`
    )
  );

  return wss;
}

function broadcastToClients(message) {
  if (!wss) return;

  const messageStr =
    typeof message === "string" ? message : JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(messageStr);
  });
}

function getWebSocketServer() {
  return wss;
}

module.exports = {
  initializeWebSocketServer,
  broadcastToClients,
  getWebSocketServer,
};
