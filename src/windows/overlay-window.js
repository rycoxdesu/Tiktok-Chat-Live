const { BrowserWindow, screen, ipcMain } = require("electron");
const { colors } = require("../config/constants");
const { setTikTokUsername } = require("../services/tiktok-connection");

let win;

function createWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  win.loadFile("src/frontend/html/index.html");

  console.log(
    `${colors.magenta}🎨 Overlay window created! Ready to start chat stream~${colors.reset}`
  );

  setupIpcHandlers();
}

function setupIpcHandlers() {
  // ===== IPC =====
  ipcMain.on("set-username", (event, username) => {
    setTikTokUsername(username);

    // overlay click-through setelah input username
    win.setIgnoreMouseEvents(true, { forward: true });
    console.log(
      `${colors.green}✅ Overlay is now click-through!${colors.reset}`
    );
  });

  // optional: buat handler untuk drag handle tetap bisa di-drag
  ipcMain.handle("enable-drag", () => {
    win.setIgnoreMouseEvents(false); // sementara bisa drag
  });

  // Handler untuk close aplikasi
  ipcMain.on("close-app", () => {
    const { app } = require("electron");
    app.exit(0); // Force exit dengan code 0
  });
}

function getWindow() {
  return win;
}

module.exports = {
  createWindow,
  getWindow,
};
