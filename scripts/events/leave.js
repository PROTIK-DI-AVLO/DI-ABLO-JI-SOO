const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "leave",
    version: "4.0.0",
    author: "Pratik Shah",
    category: "events",
    description: "Ultra Next-Gen Neon Leave Card"
  },

  onStart: async function ({ api, event }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID, logMessageData } = event;
    const leftParticipantFbId = logMessageData.leftParticipantFbId;

    if (leftParticipantFbId === api.getCurrentUserID()) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const threadName = threadInfo.threadName || "Diablo Realm";
      const memberCount = threadInfo.participantIDs.length;

      const userInfo = await api.getUserInfo(leftParticipantFbId);
      const userName = userInfo[leftParticipantFbId]?.name || "Group Member";
      const timeNow = moment().tz("Asia/Dhaka").format("dddd, MM/DD/YYYY, hh:mm:ss A");

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext("2d");

      const bgList = [
        "https://i.ibb.co/L5k6NvZ/bg2.jpg",
        "https://i.ibb.co/QcW5tZ4/bg3.jpg",
        "https://images4.alphacoders.com/936/936378.png",
        "https://images.wallpapersden.com/image/download/anime-night-landscape_bWlpZmqUmZqaraWkpJRmZ2VlrWlnZQ.jpg"
      ];
      const randomBg = bgList[Math.floor(Math.random() * bgList.length)];

      try {
        const bgImage = await loadImage(randomBg);
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        ctx.fillStyle = "#120508";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Dark Crimson Overlay
      const overlay = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      overlay.addColorStop(0, "rgba(30, 10, 15, 0.9)");
      overlay.addColorStop(0.5, "rgba(20, 5, 10, 0.85)");
      overlay.addColorStop(1, "rgba(10, 2, 5, 0.95)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center Cyber Box with Red Neon Glow
      ctx.save();
      ctx.fillStyle = "rgba(35, 15, 20, 0.8)";
      ctx.shadowColor = "#ff2a2a";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.roundRect(40, 30, 920, 440, 30);
      ctx.fill();
      ctx.restore();

      // Dual Red Border Frame
      ctx.strokeStyle = "#ff2a2a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, 30, 920, 440, 30);
      ctx.stroke();

      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(48, 38, 904, 424, 24);
      ctx.stroke();

      // Profile Picture with Red Neon Glow
      const avatarUrl = `https://graph.facebook.com/${leftParticipantFbId}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      try {
        const avatarImg = await loadImage(avatarUrl);

        ctx.save();
        ctx.shadowColor = "#ff2a2a";
        ctx.shadowBlur = 35;
        ctx.strokeStyle = "#ff2a2a";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(500, 150, 80, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(500, 150, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 425, 75, 150, 150);
        ctx.restore();
      } catch (err) {
        console.log("Avatar loading failed");
      }

      ctx.textAlign = "center";

      // Header Tag
      ctx.fillStyle = "#ff2a2a";
      ctx.font = "bold 22px 'Segoe UI', Sans-serif";
      ctx.fillText("🥀 GOODBYE & FAREWELL 🥀", 500, 270);

      // User Name Gradient
      const nameGrad = ctx.createLinearGradient(300, 0, 700, 0);
      nameGrad.addColorStop(0, "#ff6b6b");
      nameGrad.addColorStop(1, "#ff0055");
      ctx.fillStyle = nameGrad;
      ctx.font = "black 42px 'Segoe UI', Sans-serif";
      ctx.fillText(userName, 500, 325);

      // Group Title
      ctx.fillStyle = "#dddddd";
      ctx.font = "600 24px 'Segoe UI', Sans-serif";
      ctx.fillText(`Left: ${threadName}`, 500, 370);

      // Dark Crimson Pill Badge
      ctx.save();
      ctx.fillStyle = "#8b0000";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(350, 400, 300, 42, 21);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 19px 'Segoe UI', Sans-serif";
      ctx.fillText(`REMAINING: ${memberCount} MEMBERS`, 500, 427);

      const cardPath = path.join(__dirname, `cache_leave_${leftParticipantFbId}.png`);
      fs.writeFileSync(cardPath, canvas.toBuffer("image/png"));

      const leaveText = 
        `💔 ─── [ ɢᴏᴏᴅ ʙʏᴇ ] ─── 💔\n\n` +
        `👤 ɴᴀᴍᴇ: ${userName}\n` +
        `🚪 ʜᴀs ʟᴇғᴛ: ${threadName}\n` +
        `👥 ʀᴇᴍᴀɪɴɪɴɢ ᴍᴇᴍʙᴇʀs: ${memberCount}\n` +
        `───────────────────\n` +
        `📅 ${timeNow}`;

      api.sendMessage(
        {
          body: leaveText,
          attachment: fs.createReadStream(cardPath)
        },
        threadID,
        () => {
          if (fs.existsSync(cardPath)) fs.unlinkSync(cardPath);
        }
      );
    } catch (err) {
      console.error("Leave Error:", err);
    }
  }
};
