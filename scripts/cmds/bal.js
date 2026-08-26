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
    name: "bal",
    aliases: ["balance", "bb"],
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 5,
    role: 0,
    shortDescription: "Check balance image card",
    category: "economy",
    guide: { en: "{p}bal [@mention or reply]" }
  },

  onStart: async function ({ api, event, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    try {
      let targetID = event.senderID;
      if (event.type === "message_reply") {
        targetID = event.messageReply.senderID;
      } else if (Object.keys(event.mentions || {}).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }

      let user = await BankUser.findOne({ userID: targetID });
      if (!user) user = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });

      const userName = await usersData.getName(targetID);

      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 420);
      gradient.addColorStop(0, "#0f0c29");
      gradient.addColorStop(0.5, "#302b63");
      gradient.addColorStop(1, "#24243e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 420);

      // Card Border Glow
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 380);

      // Card Header
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText("💳 DI-ABLO BANK CARD", 50, 75);

      ctx.fillStyle = "#555555";
      ctx.font = "20px Sans-serif";
      ctx.fillText("──────────────────────────────────────────", 50, 100);

      // User Details
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 26px Sans-serif";
      ctx.fillText(`HOLDER: ${userName.toUpperCase()}`, 50, 160);

      ctx.fillStyle = "#aaaaaa";
      ctx.font = "20px Sans-serif";
      ctx.fillText(`ID: ${targetID}`, 50, 200);

      // Balances
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText(`BALANCE: $${user.balance.toLocaleString()}`, 50, 270);

      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(`ACTIVE LOAN: $${user.loan.toLocaleString()}`, 50, 315);

      // Footer
      ctx.fillStyle = "#888888";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • OFFICIAL CARD", 50, 370);

      // Image Output Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bal_${targetID}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `💳 **[ DI-ABLO BANK CARD ]**\n👤 **Holder:** ${userName}`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to generate bank card!");
    }
  }
};
