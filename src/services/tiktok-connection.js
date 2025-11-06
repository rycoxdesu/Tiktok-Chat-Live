const { WebcastPushConnection } = require("tiktok-live-connector");
const { colors, reconnectInterval } = require("../config/constants");
const { broadcastToClients } = require("./websocket-server");
const { advancedSanitizeText } = require("../utils/text-sanitizer");

let tiktokUsername = null;
let liveConnection = null;
let reconnectTimer = null;
let isConnecting = false;

// Function to sanitize text using the advanced sanitizer
function sanitizeText(text) {
  return advancedSanitizeText(text);
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
    // Log raw data for debugging
    console.log(`${colors.blue}[DEBUG] Raw chat data:${colors.reset}`, {
      nickname: data.nickname,
      uniqueId: data.uniqueId,
      comment: data.comment,
      isModerator: data.isModerator,
      userIdentity: data.userIdentity,
      isSubscriber: data.isSubscriber,
      userBadges: data.userBadges
    });

    // Check if data is valid
    if (!data || typeof data !== 'object') {
      console.warn(`${colors.yellow}[WARNING] Invalid chat data received${colors.reset}`);
      return;
    }

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

    // Sanitize user and comment data
    const sanitizedUser = sanitizeText(data.nickname || data.uniqueId || 'Unknown User');
    const sanitizedComment = sanitizeText(data.comment || '');
    
    // Check if sanitized comment is empty
    if (!sanitizedComment || sanitizedComment.trim() === '') {
      console.log(`${colors.yellow}[INFO] Empty comment after sanitization from user: ${sanitizedUser}${colors.reset}`);
      return; // Skip empty comments
    }
    
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
    // Log raw data for debugging
    console.log(`${colors.blue}[DEBUG] Raw gift data:${colors.reset}`, {
      nickname: data.nickname,
      uniqueId: data.uniqueId,
      giftName: data.giftName,
      repeatCount: data.repeatCount
    });

    if (!data || typeof data !== 'object') {
      console.warn(`${colors.yellow}[WARNING] Invalid gift data received${colors.reset}`);
      return;
    }

    const sanitizedUser = sanitizeText(data.nickname || data.uniqueId || 'Unknown User');
    const sanitizedGift = sanitizeText(data.giftName || 'Unknown Gift');
    
    // Check if essential data is available after sanitization
    if (!sanitizedUser || !sanitizedGift) {
      console.warn(`${colors.yellow}[WARNING] Missing user or gift info after sanitization${colors.reset}`);
      return;
    }
    
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
    // Log raw data for debugging
    console.log(`${colors.blue}[DEBUG] Raw follow data:${colors.reset}`, {
      uniqueId: data.uniqueId
    });

    if (!data || typeof data !== 'object') {
      console.warn(`${colors.yellow}[WARNING] Invalid follow data received${colors.reset}`);
      return;
    }

    const user = sanitizeText(data.uniqueId) || "unknown";
    console.log(`[FOLLOW] ${user} baru saja mengikuti host!`);

    const msg = { type: "follow", user };
    broadcastToClients(msg);
  });

  // ===== Share Event =====
  liveConnection.on("share", (data) => {
    // Log raw data for debugging
    console.log(`${colors.blue}[DEBUG] Raw share data:${colors.reset}`, {
      uniqueId: data.uniqueId
    });

    if (!data || typeof data !== 'object') {
      console.warn(`${colors.yellow}[WARNING] Invalid share data received${colors.reset}`);
      return;
    }

    const user = sanitizeText(data.uniqueId) || "unknown";
    console.log(`[SHARE] ${user} membagikan live-mu!`);

    const msg = { type: "share", user };
    broadcastToClients(msg);
  });

  // ===== Reconnect jika disconnect/error =====
  const handleDisconnect = (err) => {
    if (err && err.message) {
      console.warn(
        `${colors.yellow}[TikTok] Connection error:${colors.reset}`,
        err.message
      );
    } else {
      console.log(
        `${colors.yellow}[TikTok] Disconnected or error... retry in 10s${colors.reset}`
      );
    }
    
    // Clear any existing reconnect timer to prevent multiple timers
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    isConnecting = false;
    
    // Attempt to reconnect after the specified interval
    console.log(
      `${colors.yellow}[TikTok] Scheduling reconnect in ${reconnectInterval}ms${colors.reset}`
    );
    reconnectTimer = setTimeout(connectTikTok, reconnectInterval);
  };

  // Add more specific event handlers for better diagnostics
  liveConnection.on("close", handleDisconnect);
  liveConnection.on("error", handleDisconnect);
  
  // Add listeners for connection state changes
  liveConnection.on("connect", () => {
    console.log(`${colors.green}[TikTok] Connection established!${colors.reset}`);
  });
  
  liveConnection.on("roomUser", (data) => {
    // Log room user data without necessarily broadcasting it
    console.log(`${colors.blue}[DEBUG] Room user update:${colors.reset}`, {
      id: data.userId,
      nickname: data.nickname,
      level: data.level
    });
  });
}

function setTikTokUsername(username) {
  if (!username || typeof username !== 'string' || username.trim() === '') {
    console.error(`${colors.red}[ERROR] Invalid TikTok username provided${colors.reset}`);
    return;
  }
  
  tiktokUsername = sanitizeText(username);
  console.log(
    `${colors.blue}[TikTok] Username set: ${tiktokUsername}${colors.reset}`
  );
  
  // Ensure we're not already connecting before starting a new connection
  if (isConnecting) {
    console.log(`${colors.yellow}[INFO] Connection already in progress, skipping duplicate connection attempt${colors.reset}`);
    return;
  }
  
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
