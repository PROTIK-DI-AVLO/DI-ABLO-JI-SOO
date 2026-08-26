const mongoose = require("mongoose");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);

module.exports = {
  config: {
    name: "top",
    aliases: ["topbal", "leaderboard", "lb"],
    version: "2.5.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Top Richest Users Leaderboard",
    category: "banking",
    guide: { en: "{p}top" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID } = event;

    try {
      const topUsers = await BankUser.find().sort({ balance: -1 }).limit(5);
      if (!topUsers || topUsers.length === 0) return sendMsg("❌ No banking data found!");

      const canvas = createCanvas(800, 520);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#0b1329";
      ctx.fillRect(0, 0, 800, 520);

      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 490);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK • TOP RICHEST LEADERBOARD", 40, 55);

      // Top 1 User Avatar
      const top1ID = topUsers[0].userID;
      try {
        const avatarUrl = `https://graph.facebook.com/${top1ID}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(710, 60, 35, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 675, 25, 70, 70);
        ctx.restore();

        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(710, 60, 36, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {}

      // Render Ranks List
      let startY = 110;
      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        let name = u.userID;
        if (usersData && typeof usersData.getName === "function") {
          try { name = await usersData.getName(u.userID); } catch (e) {}
        }

        ctx.fillStyle = i === 0 ? "rgba(241, 196, 15, 0.15)" : "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(40, startY, 720, 65);

        ctx.strokeStyle = i === 0 ? "#f1c40f" : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, startY, 720, 65);

        // Rank Badge
        ctx.fillStyle = i === 0 ? "#f1c40f" : i === 1 ? "#cbd5e1" : i === 2 ? "#b45309" : "#64748b";
        ctx.font = "bold 22px Sans-serif";
        ctx.fillText(`#${i + 1}`, 65, startY + 40);

        // Name
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Sans-serif";
        const displayName = name.length > 22 ? name.substring(0, 22) + "..." : name;
        ctx.fillText(displayName, 130, startY + 39);

        // Balance
        ctx.textAlign = "right";
        ctx.fillStyle = i === 0 ? "#4ade80" : "#38bdf8";
        ctx.font = "bold 20px Sans-serif";
        ctx.fillText(`$${this.formatMoney(u.balance)}`, 730, startY + 39);
        ctx.textAlign = "left";

        startY += 75;
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`REQUESTED BY USER ID: ${senderID}`, 40, 485);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `top_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🏆 [ DI-ABLO BANK LEADERBOARD ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (err) {
      console.error(err);
      return sendMsg("❌ Leaderboard Error!");
    }
  }
};
