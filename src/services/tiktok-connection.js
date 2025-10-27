const { WebcastPushConnection } = require("tiktok-live-connector");
const { colors, reconnectInterval } = require("../config/constants");
const { broadcastToClients } = require("./websocket-server");

let tiktokUsername = null;
let liveConnection = null;
let reconnectTimer = null;
let isConnecting = false;

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
        `${colors.green}🌸 Connected TikTok Live: ${tiktokUsername} 🌸${colors.reset}`
      );
      isConnecting = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    })
    .catch((err) => {
      console.log(
        `${colors.yellow}⚠️ Failed to connect... retry in 10s 💦${colors.reset}`
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

    const msg = {
      type: "chat",
      user: data.nickname || data.uniqueId,
      comment: data.comment,
      role: role,
    };

    console.log(
      `${color}💬 [${role.toUpperCase()}] ${msg.user}: ${msg.comment}${
        colors.reset
      }`
    );
    console.log(`${colors.yellow}➡️ Sending WS payload:${colors.reset}`, msg);

    broadcastToClients(msg);
  });

  // ===== Gift Event =====
  liveConnection.on("gift", (data) => {
    const msg = {
      type: "gift",
      user: data.nickname || data.uniqueId,
      gift: data.giftName,
      amount: data.repeatCount || 1,
    };
    console.log(
      `${colors.cyan}🎁 Gift from ${msg.user}: ${msg.gift} x${msg.amount}${colors.reset}`
    );
    broadcastToClients(msg);
  });

  // ===== Follower Event =====
  liveConnection.on("follow", (data) => {
    const user = data.uniqueId || "unknown";
    console.log(`🎉 ${user} baru saja mengikuti host!`);

    const msg = { type: "follow", user };
    broadcastToClients(msg);
  });

  // ===== Share Event =====
  liveConnection.on("share", (data) => {
    const user = data.uniqueId || "unknown";
    console.log(`🔗 ${user} membagikan live-mu!`);

    const msg = { type: "share", user };
    broadcastToClients(msg);
  });

  // ===== Reconnect jika disconnect/error =====
  const handleDisconnect = (err) => {
    if (err && err.message)
      console.warn(
        `${colors.yellow}TikTok connection error:${colors.reset}`,
        err.message
      );
    else
      console.log(
        `${colors.yellow}⚠️ TikTok disconnected or error... retry in 10s 💨${colors.reset}`
      );
    isConnecting = false;
    if (!reconnectTimer)
      reconnectTimer = setTimeout(connectTikTok, reconnectInterval);
  };

  liveConnection.on("close", handleDisconnect);
  liveConnection.on("error", handleDisconnect);
}

function setTikTokUsername(username) {
  tiktokUsername = username;
  console.log(
    `${colors.blue}🎯 Username set: ${tiktokUsername}${colors.reset}`
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
