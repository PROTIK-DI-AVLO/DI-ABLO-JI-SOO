const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
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
    aliases: ["richest", "leaderboard"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 5,
    role: 0,
    shortDescription: "Top 10 Richest Users",
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
    try {
      const topUsers = await BankUser.find().sort({ balance: -1 }).limit(10);

      const canvas = createCanvas(750, 600);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, 750, 600);

      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 720, 570);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK TOP 10 LEADERBOARD", 50, 55);

      let y = 100;
      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        let name = u.userID;
        if (usersData && typeof usersData.getName === "function") {
          try { name = await usersData.getName(u.userID); } catch (e) {}
        }

        ctx.fillStyle = i < 3 ? "rgba(241, 196, 15, 0.1)" : "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(45, y - 22, 660, 40);

        ctx.fillStyle = i === 0 ? "#f1c40f" : (i === 1 ? "#e2e8f0" : (i === 2 ? "#cd7f32" : "#94a3b8"));
        ctx.font = "bold 18px Sans-serif";
        ctx.fillText(`#${i + 1}`, 65, y + 5);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Sans-serif";
        ctx.fillText(name.substring(0, 25), 130, y + 5);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 18px Sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`$${this.formatMoney(u.balance)}`, 680, y + 5);
        ctx.textAlign = "left";

        y += 46;
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • OFFICIAL RICHEST LIST", 50, 560);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `top_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🏆 [ DI-ABLO BANK TOP 10 ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
    }
  }
};
