// ===== Color codes untuk log =====
const reset = "\x1b[0m";
const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
const magenta = "\x1b[35m";
const cyan = "\x1b[36m";
const white = "\x1b[37m";

// ===== Configuration =====
const reconnectInterval = 10000;
const websocketPort = 8080;

module.exports = {
  colors: {
    reset,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
  },
  reconnectInterval,
  websocketPort,
};
