const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

module.exports = {
  config: {
    name: "top",
    aliases: ["leaderboard", "rich"],
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 5,
    role: 0,
    shortDescription: "Top 10 richest users leaderboard image",
    category: "economy",
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

    try {
      const topUsers = await BankUser.find().sort({ balance: -1 }).limit(10);
      if (!topUsers || topUsers.length === 0) {
        return sendMsg("❌ No registered users found in bank!");
      }

      const canvas = createCanvas(800, 750);
      const ctx = canvas.getContext("2d");

      // Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 750);
      gradient.addColorStop(0, "#0a0a16");
      gradient.addColorStop(0.5, "#161836");
      gradient.addColorStop(1, "#0a0a16");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 750);

      // Border Glow
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 720);

      // Header Title
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 32px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏆 DI-ABLO BANK TOP 10 LEADERBOARD 🏆", 400, 65);

      ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Render Top Users List
      let startY = 135;
      ctx.textAlign = "left";

      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        let rawName = "Unknown";
        try {
          rawName = await usersData.getName(u.userID);
        } catch (e) {
          rawName = `User ${u.userID.slice(-4)}`;
        }

        const uName = rawName.length > 20 ? rawName.slice(0, 18) + ".." : rawName;
        const rank = i + 1;

        // Rank Row Background Highlight
        ctx.fillStyle = i === 0 ? "rgba(255, 215, 0, 0.15)" : i === 1 ? "rgba(192, 192, 192, 0.12)" : i === 2 ? "rgba(205, 127, 50, 0.12)" : "rgba(255, 255, 255, 0.04)";
        ctx.fillRect(40, startY - 30, 720, 48);

        // Medals / Badges Colors
        let rankColor = "#ffffff";
        let medal = `#${rank}`;
        if (rank === 1) { rankColor = "#ffd700"; medal = "🥇 #1"; }
        else if (rank === 2) { rankColor = "#c0c0c0"; medal = "🥈 #2"; }
        else if (rank === 3) { rankColor = "#cd7f32"; medal = "🥉 #3"; }

        // Draw Rank
        ctx.fillStyle = rankColor;
        ctx.font = "bold 22px Sans-serif";
        ctx.fillText(medal, 55, startY + 2);

        // Draw User Name
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Sans-serif";
        ctx.fillText(uName, 180, startY + 2);

        // Draw Balance
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 22px Sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`$${this.formatMoney(u.balance)}`, 740, startY + 2);
        ctx.textAlign = "left";

        startY += 58;
      }

      // Footer
      ctx.fillStyle = "#777777";
      ctx.font = "italic 16px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DI-ABLO BANKING SYSTEM • OFFICIAL RICHEST LIST", 400, 715);

      // Save and Output
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `top_leaderboard.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🏆 **[ DI-ABLO BANK TOP 10 ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to load leaderboard image!");
    }
  }
};
