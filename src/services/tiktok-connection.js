const { WebcastPushConnection } = require("tiktok-live-connector");
const { colors, reconnectInterval } = require("../config/constants");
const { broadcastToClients } = require("./websocket-server");

let tiktokUsername = null;
let liveConnection = null;
let reconnectTimer = null;
let isConnecting = false;

// Function to sanitize text from problematic Unicode characters
function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  
  // Replace problematic Unicode characters with safe alternatives
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[\u2000-\u200F\u2028-\u2029\u202A-\u202E\u2060-\u206F]/g, '') // Remove invisible formatting characters
    .replace(/[^\x20-\x7E\u00A0-\uD7FF\uE000-\uFFFD]/g, '?'); // Replace any remaining non-printable Unicode with '?'
}

function connectTikTok() {
  if (!tiktokUsername) return;
  if (isConnecting) return;

  isConnecting = true;

  try {
    if (liveConnection) {
      if (typeof liveConnection.removeAllListeners === "function")
        liveConnection.removeAllListeners();
      if (typeof liveConnection.disconnect === "function")
        liveConnection.disconnect();
      if (typeof liveConnection.close === "function") liveConnection.close();
      liveConnection = null;
    }
  } catch (e) {
    console.error(
      `${colors.red}Error cleaning previous connection:${colors.reset}`,
      e
    );
  }

  liveConnection = new WebcastPushConnection(tiktokUsername);

  liveConnection
    .connect()
    .then(() => {
      console.log(
        `${colors.green}[TikTok] Connected to Live: ${tiktokUsername} [TikTok]${colors.reset}`
      );
      isConnecting = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    })
    .catch((err) => {
      console.log(
        `${colors.yellow}[WARNING] Failed to connect... retry in 10s${colors.reset}`
      );
      isConnecting = false;
      if (!reconnectTimer)
        reconnectTimer = setTimeout(connectTikTok, reconnectInterval);
    });

  // ===== Chat Event =====
  liveConnection.on("chat", (data) => {
    let role = "user";

    try {
      if (data.isModerator || data.userIdentity?.isModeratorOfAnchor)
        role = "moderator";
      else if (data.userIdentity?.isFollowerOfAnchor) role = "follower";
      else if (
        data.isSubscriber ||
        data.userIdentity?.isSubscriberOfAnchor ||
        (data.subscribingMonths && data.subscribingMonths > 0)
      )
        role = "subscriber";
      else if (
        (data.userBadges && data.userBadges.length > 0) ||
        data.topGifterRank
      ) {
        const modBadge = data.userBadges?.find(
          (b) => b.type === "moderator" || b.name === "Moderator"
        );
        role = modBadge ? "moderator" : "friend";
      }
    } catch (e) {
      console.warn("⚠️ Failed to detect role, fallback to user");
    }

    let color = colors.white;
    if (role === "moderator") color = colors.magenta;
    else if (role === "subscriber") color = colors.blue;
    else if (role === "follower") color = colors.green;
    else if (role === "friend") color = colors.cyan;

    const sanitizedUser = sanitizeText(data.nickname || data.uniqueId);
    const sanitizedComment = sanitizeText(data.comment);
    
    const msg = {
      type: "chat",
      user: sanitizedUser,
      comment: sanitizedComment,
      role: role,
    };

    console.log(
      `${color}[CHAT] [${role.toUpperCase()}] ${msg.user}: ${msg.comment}${
        colors.reset
      }`
    );
    console.log(`${colors.yellow}[WS] Sending payload:${colors.reset}`, msg);

    broadcastToClients(msg);
  });

  // ===== Gift Event =====
  liveConnection.on("gift", (data) => {
    const sanitizedUser = sanitizeText(data.nickname || data.uniqueId);
    const sanitizedGift = sanitizeText(data.giftName);
    
    const msg = {
      type: "gift",
      user: sanitizedUser,
      gift: sanitizedGift,
      amount: data.repeatCount || 1,
    };
    console.log(
      `${colors.cyan}[GIFT] Gift from ${msg.user}: ${msg.gift} x${msg.amount}${colors.reset}`
    );
    broadcastToClients(msg);
  });

  // ===== Follower Event =====
  liveConnection.on("follow", (data) => {
    const user = sanitizeText(data.uniqueId) || "unknown";
    console.log(`[FOLLOW] ${user} baru saja mengikuti host!`);

    const msg = { type: "follow", user };
    broadcastToClients(msg);
  });

  // ===== Share Event =====
  liveConnection.on("share", (data) => {
    const user = sanitizeText(data.uniqueId) || "unknown";
    console.log(`[SHARE] ${user} membagikan live-mu!`);

    const msg = { type: "share", user };
    broadcastToClients(msg);
  });

  // ===== Reconnect jika disconnect/error =====
  const handleDisconnect = (err) => {
    if (err && err.message)
      console.warn(
        `${colors.yellow}[TikTok] Connection error:${colors.reset}`,
        err.message
      );
    else
      console.log(
        `${colors.yellow}[TikTok] Disconnected or error... retry in 10s${colors.reset}`
      );
    isConnecting = false;
    if (!reconnectTimer)
      reconnectTimer = setTimeout(connectTikTok, reconnectInterval);
  };

  liveConnection.on("close", handleDisconnect);
  liveConnection.on("error", handleDisconnect);
}

function setTikTokUsername(username) {
  tiktokUsername = sanitizeText(username);
  console.log(
    `${colors.blue}[TikTok] Username set: ${tiktokUsername}${colors.reset}`
  );
  connectTikTok();
}

function getTikTokUsername() {
  return tiktokUsername;
}

module.exports = {
  connectTikTok,
  setTikTokUsername,
  getTikTokUsername,
};
