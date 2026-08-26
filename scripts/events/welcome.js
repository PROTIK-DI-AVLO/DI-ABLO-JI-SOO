const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "welcome",
    version: "4.0.0",
    author: "Pratik Shah",
    category: "events",
    description: "Ultra Next-Gen Neon Welcome Card"
  },

  onStart: async function ({ api, event }) {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, logMessageData } = event;
    const addedParticipants = logMessageData.addedParticipants;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const threadName = threadInfo.threadName || "Diablo Realm";
      const memberCount = threadInfo.participantIDs.length;

      for (const user of addedParticipants) {
        const userID = user.userFbId;
        const userName = user.fullName;
        const timeNow = moment().tz("Asia/Dhaka").format("dddd, MM/DD/YYYY, hh:mm:ss A");

        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext("2d");

        // High Quality Cyber/Anime Backgrounds
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
          ctx.fillStyle = "#0a0a16";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Futuristic Gradient Overlay
        const overlay = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        overlay.addColorStop(0, "rgba(10, 15, 30, 0.85)");
        overlay.addColorStop(0.5, "rgba(20, 10, 40, 0.75)");
        overlay.addColorStop(1, "rgba(5, 5, 15, 0.9)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center Cyber Box with Neon Border
        ctx.save();
        ctx.fillStyle = "rgba(16, 24, 48, 0.75)";
        ctx.shadowColor = "#00f2fe";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(40, 30, 920, 440, 30);
        ctx.fill();
        ctx.restore();

        // Dual Border Frame
        ctx.strokeStyle = "#00f2fe";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(40, 30, 920, 440, 30);
        ctx.stroke();

        ctx.strokeStyle = "#4facfe";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(48, 38, 904, 424, 24);
        ctx.stroke();

        // Profile Picture with Multi-Layer Glow
        const avatarUrl = `https://graph.facebook.com/${userID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

        try {
          const avatarImg = await loadImage(avatarUrl);

          // Outer Ring Glow
          ctx.save();
          ctx.shadowColor = "#00f2fe";
          ctx.shadowBlur = 35;
          ctx.strokeStyle = "#00f2fe";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(500, 150, 80, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Clip Avatar
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

        // Typography Section
        ctx.textAlign = "center";

        // VIP Tag Header
        ctx.fillStyle = "#00f2fe";
        ctx.font = "bold 22px 'Segoe UI', Sans-serif";
        ctx.fillText("⚡ WELCOME TO THE SERVER ⚡", 500, 270);

        // User Name with Dynamic Glow Gradient
        const nameGrad = ctx.createLinearGradient(300, 0, 700, 0);
        nameGrad.addColorStop(0, "#ffe259");
        nameGrad.addColorStop(1, "#ffa751");
        ctx.fillStyle = nameGrad;
        ctx.font = "black 42px 'Segoe UI', Sans-serif";
        ctx.fillText(userName, 500, 325);

        // Group Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 24px 'Segoe UI', Sans-serif";
        ctx.fillText(`Group: ${threadName}`, 500, 370);

        // Cyber Pill Badge for Member Count
        ctx.save();
        ctx.fillStyle = "#ff007f";
        ctx.shadowColor = "#ff007f";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(380, 400, 240, 42, 21);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Segoe UI', Sans-serif";
        ctx.fillText(`MEMBER #${memberCount}`, 500, 427);

        const cardPath = path.join(__dirname, `cache_welcome_${userID}.png`);
        fs.writeFileSync(cardPath, canvas.toBuffer("image/png"));

        const welcomeText = 
          `🏛️ ─── [ ᴠɪᴘ ᴡᴇʟᴄᴏᴍᴇ ] ─── 🏛️\n\n` +
          `👤 ʜᴇʏ: ${userName}\n` +
          `✨ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ: ${threadName}\n` +
          `🎯 ʏᴏᴜ ᴀʀᴇ ᴛʜᴇ #${memberCount}ᴛʜ ᴍᴇᴍʙᴇʀ!\n` +
          `───────────────────\n` +
          `📅 ${timeNow}`;

        api.sendMessage(
          {
            body: welcomeText,
            attachment: fs.createReadStream(cardPath)
          },
          threadID,
          () => {
            if (fs.existsSync(cardPath)) fs.unlinkSync(cardPath);
          }
        );
      }
    } catch (err) {
      console.error("Welcome Error:", err);
    }
  }
};
