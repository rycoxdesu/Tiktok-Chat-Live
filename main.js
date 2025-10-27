const { app } = require("electron");
const {
  initializeWebSocketServer,
} = require("./src/services/websocket-server");
const { createWindow } = require("./src/windows/overlay-window");

// ===== Start App =====
app.whenReady().then(() => {
  initializeWebSocketServer();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
