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
    name: "addbal",
    aliases: ["addmoney", "credit"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 2,
    role: 1, // Admin only
    shortDescription: "Add balance to user account",
    category: "admin",
    guide: { en: "{p}addbal @mention [amount]" }
  },

  parseBet: function (input) {
    if (!input) return NaN;
    const str = input.toLowerCase().trim();
    const match = str.match(/^(\d+(\.\d+)?)\s*([kmb])?$/);
    if (!match) return NaN;
    let val = parseFloat(match[1]);
    if (match[3] === "k") val *= 1000;
    if (match[3] === "m") val *= 1000000;
    if (match[3] === "b") val *= 1000000000;
    return Math.floor(val);
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID, mentions } = event;

    const mentionIDs = Object.keys(mentions || {});
    const targetID = mentionIDs.length > 0 ? mentionIDs[0] : senderID;

    const amountStr = args.filter(a => !a.startsWith("@")).join("");
    const amount = this.parseBet(amountStr);

    if (isNaN(amount) || amount <= 0) return sendMsg("❌ Invalid credit amount!");

    try {
      let user = await BankUser.findOne({ userID: targetID });
      if (!user) user = await BankUser.create({ userID: targetID, balance: 1000 });

      const newBalance = user.balance + amount;
      await BankUser.updateOne({ userID: targetID }, { $set: { balance: newBalance } });

      let targetName = targetID;
      if (usersData && typeof usersData.getName === "function") {
        try { targetName = await usersData.getName(targetID); } catch (e) {}
      }

      // Canvas Receipt Render
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#071c10";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK • ADMIN CREDIT RECEIPT", 50, 55);

      // Target Avatar
      try {
        const url = `https://graph.facebook.com/${targetID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const img = await loadImage(url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 180, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 60, 130, 100, 100);
        ctx.restore();

        ctx.strokeStyle = "#2ecc71";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(110, 180, 51, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {}

      // Receipt Details Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(190, 100, 560, 160);
      ctx.strokeStyle = "rgba(46, 204, 113, 0.4)";
      ctx.strokeRect(190, 100, 560, 160);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`RECEIVER: ${targetName}`, 220, 140);
      ctx.fillText(`TARGET ID: ${targetID}`, 220, 170);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText(`+ $${amount.toLocaleString()}`, 220, 225);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 18px Sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`NEW BALANCE: $${newBalance.toLocaleString()}`, 720, 225);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • AUTHORIZED TRANSACTION", 50, 370);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `add_${targetID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `✅ [ BALANCE CREDITED BY ADMIN ]\n👤 **User: ${targetName}`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Credit Error!");
    }
  }
};
