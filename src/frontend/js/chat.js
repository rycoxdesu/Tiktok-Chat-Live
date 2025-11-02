const chat = document.getElementById("chat");
const usernameModal = document.getElementById("usernameModal");
const usernameInput = document.getElementById("usernameInput");
const startBtn = document.getElementById("startBtn");
const giftWrapper = document.getElementById("giftWrapper");
const chatWrapper = document.getElementById("chatWrapper");
const chatHandle = document.getElementById("chatHandle");
const giftHandle = document.getElementById("giftHandle");

const queue = [];
let showing = false;
let ws;

// Function to sanitize text from problematic Unicode characters for frontend display
function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  
  // Replace problematic Unicode characters with safe alternatives
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[\u2000-\u200F\u2028-\u2029\u202A-\u202E\u2060-\u206F]/g, '') // Remove invisible formatting characters
    .replace(/[^\x20-\x7E\u00A0-\uD7FF\uE000-\uFFFD]/g, '?'); // Replace any remaining non-printable Unicode with '?'
}

function trimMessages() {
  const allMessages = chat.querySelectorAll(
    ".message, .message-follow, .message-share"
  );
  if (allMessages.length > 4) {
    for (let i = allMessages.length - 1; i >= 4; i--) allMessages[i].remove();
  }
}

function makeDraggable(handleEl, targetEl) {
  let offsetX = 0,
    offsetY = 0,
    dragging = false;
  handleEl.style.cursor = "grab";
  handleEl.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - targetEl.offsetLeft;
    offsetY = e.clientY - targetEl.offsetTop;
    handleEl.style.cursor = "grabbing";
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    targetEl.style.left = e.clientX - offsetX + "px";
    targetEl.style.top = e.clientY - offsetY + "px";
  });
  document.addEventListener("mouseup", () => {
    dragging = false;
    handleEl.style.cursor = "grab";
  });
}

// Chat & Gift Draggable
makeDraggable(chatHandle, chatWrapper);
makeDraggable(giftHandle, giftWrapper);

// Modal drag
let offsetX = 0,
  offsetY = 0,
  dragging = false;
usernameModal.addEventListener("mousedown", (e) => {
  dragging = true;
  offsetX = e.clientX - usernameModal.offsetLeft;
  offsetY = e.clientY - usernameModal.offsetTop;
  usernameModal.style.cursor = "grabbing";
});
document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  usernameModal.style.left = e.clientX - offsetX + "px";
  usernameModal.style.top = e.clientY - offsetY + "px";
});
document.addEventListener("mouseup", () => {
  dragging = false;
  usernameModal.style.cursor = "grab";
});
usernameModal.style.cursor = "grab";



// Messages Queue
function addMessage(username, text, role = "user", sticker = null) {
  // Sanitize inputs to prevent display issues
  username = sanitizeText(username);
  text = sanitizeText(text);
  
  role = (role || "user").toLowerCase();
  let roleBadge = "";
  switch (role) {
    case "moderator":
    case "mod":
      roleBadge = '<span class="role-badge role-moderator">MOD</span>';
      break;
    case "subscriber":
    case "sub":
      roleBadge = '<span class="role-badge role-subscriber">SUB</span>';
      break;
    case "friend":
      roleBadge = '<span class="role-badge role-friend">FRIEND</span>';
      break;
    case "follower":
      roleBadge = '<span class="role-badge role-follower">FOLL</span>';
      break;
    case "vip":
      roleBadge =
        '<span class="role-badge" style="background:#ffd700;color:#000">VIP</span>';
      break;
    case "verified":
      roleBadge =
        '<span class="role-badge" style="background:#00ffea;color:#000">VERIFIED</span>';
      break;
    default:
      roleBadge = '<span class="role-badge role-user">USER</span>';
  }

  const emojiHTML = (text) =>
    text.replace(
      /([\u231A-\uD83E\uDDFF]|\p{Emoji_Presentation})/gu,
      (match) => `<span class="tiktok-emoji">${match}</span>`
    );
  queue.push({ username, text: emojiHTML(text), roleBadge, sticker });
  if (!processQueue.running) processQueue();
}

processQueue.running = false;
async function processQueue() {
  processQueue.running = true;
  while (queue.length > 0) {
    const { username, text, roleBadge, sticker } = queue.shift();
    const msg = document.createElement("div");
    msg.className = "message";
    let stickerHTML = sticker
      ? `<div class="message-sticker">${sticker}</div>`
      : "";
    msg.innerHTML = `<div class="message-header">${roleBadge}<span class="username">🐾 ${username} <span class="arrow">➜</span></span></div><div class="message-body">${text}${stickerHTML}</div>`;
    chat.prepend(msg);
    setTimeout(() => msg.classList.add("show"), 10);
    trimMessages();
    await new Promise((r) => setTimeout(r, 300));
  }
  processQueue.running = false;
}

// Gift Queue
const activeGift = { msg: null };
const giftQueue = [];
let processingGift = false;
function showGift(user, gift, amount) {
  // Sanitize inputs to prevent display issues
  user = sanitizeText(user);
  gift = sanitizeText(gift);
  
  giftQueue.push({ user, gift, amount });
  if (!processingGift) processGiftQueue();
}
async function processGiftQueue() {
  processingGift = true;
  while (giftQueue.length > 0) {
    if (activeGift.msg) {
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    const { user, gift, amount } = giftQueue.shift();
    const msg = document.createElement("div");
    msg.className = "gift-message";
    msg.dataset.amount = amount;
    msg.innerHTML = `<span class="username">${user}</span> sent <span class="gift-name">${gift}</span> x${amount}!`;
    giftWrapper.appendChild(msg);
    activeGift.msg = msg;
    setTimeout(() => msg.classList.add("show"), 10);
    let t = 0;
    const shakeInterval = setInterval(() => {
      t++;
      msg.style.transform = `translateY(${
        Math.sin(t / 2) * 5
      }px) scale(1) rotateZ(${Math.sin(t / 2) * 3}deg)`;
      if (t > 20) {
        clearInterval(shakeInterval);
        msg.style.transform = "translateY(0) scale(1) rotateZ(0deg)";
      }
    }, 30);
    await new Promise((r) => setTimeout(r, 5000));
    msg.classList.remove("show");
    await new Promise((r) => setTimeout(r, 500));
    msg.remove();
    activeGift.msg = null;
  }
  processingGift = false;
}

// Follow / Share
function addFollowMessage(username, text) {
  // Sanitize inputs to prevent display issues
  username = sanitizeText(username);
  text = sanitizeText(text);
  
  const msg = document.createElement("div");
  msg.className = "message message-follow";
  msg.innerHTML = `<span>✨ ${username} ${text}</span>`;
  chat.prepend(msg);
  setTimeout(() => msg.classList.add("show"), 10);
  trimMessages();
}
function addShareMessage(username, text) {
  // Sanitize inputs to prevent display issues
  username = sanitizeText(username);
  text = sanitizeText(text);
  
  const msg = document.createElement("div");
  msg.className = "message message-share";
  msg.innerHTML = `<span>🔗 ${username} ${text}</span>`;
  chat.prepend(msg);
  setTimeout(() => msg.classList.add("show"), 10);
  trimMessages();
}

// Start Live
startBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Masukkan username TikTok dulu nya~ 💕");
  usernameModal.style.display = "none";
  chatWrapper.style.border = "none";
  chatWrapper.style.background = "transparent";
  giftWrapper.style.border = "none";
  giftWrapper.style.background = "transparent";
  chat.innerHTML = "";
  giftWrapper.querySelectorAll(".gift-message").forEach((g) => g.remove());
  ws = new WebSocket("ws://localhost:8080");
  ws.onopen = () => {
    console.log("✅ Connected to TikTok WebSocket");
    if (window.electronAPI) window.electronAPI.setUsername(username);
    else require("electron").ipcRenderer.send("set-username", username);
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "chat")
        addMessage(data.user, data.comment, data.role || "user");
      else if (data.type === "gift")
        showGift(data.user, data.gift, data.amount);
      else if (data.type === "follow")
        addFollowMessage(data.user, "baru saja mengikuti kamu! 🎉");
      else if (data.type === "share")
        addShareMessage(data.user, "membagikan live-mu! 🔗");
    } catch (e) {
      console.error("Invalid message:", e);
    }
  };
  ws.onerror = (err) => console.error("WebSocket Error:", err);
  ws.onclose = () => console.warn("⚠️ WebSocket Closed");
});

// Edit Gift Overlay
document.getElementById("editGiftBtn").addEventListener("click", () => {
  usernameModal.style.display = "none";
  giftWrapper.style.display = "block";
  giftWrapper.style.border = "2px dashed rgba(255,255,255,0.5)";
  giftWrapper.style.background = "rgba(0,0,0,0.1)";
  const handle = giftWrapper.querySelector("#giftHandle");
  makeDraggable(handle, giftWrapper);
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Overlay";
  saveBtn.style.cssText =
    "position:absolute;top:-45px;left:50%;transform:translateX(-50%);padding:8px 14px;font-size:14px;border-radius:6px;cursor:pointer;background:#00d2ff;color:#000;border:none;font-weight:700;box-shadow:0 0 6px rgba(0,0,0,0.4);";
  giftWrapper.appendChild(saveBtn);
  saveBtn.addEventListener("click", () => {
    const pos = { left: giftWrapper.style.left, top: giftWrapper.style.top };
    localStorage.setItem("giftOverlayPos", JSON.stringify(pos));
    saveBtn.remove();
    giftWrapper.style.border = "none";
    giftWrapper.style.background = "transparent";
    usernameModal.style.display = "flex";
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const savedGiftPos = localStorage.getItem("giftOverlayPos");
  if (savedGiftPos) {
    const { left, top } = JSON.parse(savedGiftPos);
    giftWrapper.style.left = left;
    giftWrapper.style.top = top;
  }
});

// Edit Chat Overlay
document.getElementById("editChatBtn").addEventListener("click", () => {
  usernameModal.style.display = "none";
  chatWrapper.style.display = "block";
  chatWrapper.style.border = "2px dashed rgba(255,255,255,0.5)";
  chatWrapper.style.background = "rgba(0,0,0,0.1)";
  const handle = chatWrapper.querySelector("#chatHandle");
  makeDraggable(handle, chatWrapper);
  let saveBtn = chatWrapper.querySelector(".save-btn");
  if (!saveBtn) {
    saveBtn = document.createElement("button");
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save Overlay";
    saveBtn.style.cssText =
      "position:absolute;top:-45px;left:50%;transform:translateX(-50%);padding:8px 14px;font-size:14px;border-radius:6px;cursor:pointer;background:#ffb400;color:#000;border:none;font-weight:700;box-shadow:0 0 6px rgba(0,0,0,0.4);";
    chatWrapper.appendChild(saveBtn);
    saveBtn.addEventListener("click", () => {
      const pos = { left: chatWrapper.style.left, top: chatWrapper.style.top };
      localStorage.setItem("chatOverlayPos", JSON.stringify(pos));
      chatWrapper.style.border = "none";
      chatWrapper.style.background = "transparent";
      usernameModal.style.display = "flex";
      saveBtn.remove();
    });
  }
});
