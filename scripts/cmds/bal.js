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
    name: "bal",
    aliases: ["balance", "money"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 2,
    role: 0,
    shortDescription: "Check Bank Card Balance",
    category: "banking",
    guide: { en: "{p}bal" }
  },

  onStart: async function ({ api, event, message, usersData }) {
    const { senderID } = event;

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      const canvas = createCanvas(750, 420);
      const ctx = canvas.getContext("2d");

      // Dark Luxury Card Background
      const gradient = ctx.createLinearGradient(0, 0, 750, 420);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.5, "#1e1b4b");
      gradient.addColorStop(1, "#090d16");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 750, 420);

      ctx.strokeStyle = "#00f2fe";
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, 720, 390);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK CARD", 50, 60);

      // User Avatar Frame
      try {
        const url = `https://graph.facebook.com/${senderID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const img = await loadImage(url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(630, 90, 45, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 585, 45, 90, 90);
        ctx.restore();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(630, 90, 46, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {}

      // Holder Details
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`HOLDER: ${userName.toUpperCase()}`, 50, 130);
      ctx.fillText(`ID: ${senderID}`, 50, 160);

      // Balance Display Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(50, 200, 650, 110);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeRect(50, 200, 650, 110);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("CURRENT BALANCE", 75, 235);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Sans-serif";
      ctx.fillText(`$${user.balance.toLocaleString()}`, 75, 285);

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • OFFICIAL VIP CARD", 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bal_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `💳 **[ DI-ABLO BANK CARD ]**\n👤 **Holder:** ${userName}`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
    }
  }
};
