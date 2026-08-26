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
    name: "sendmoney",
    aliases: ["pay", "transfer"],
    version: "2.0.0",
    author: "Protik Shah",
    countDown: 2,
    role: 0,
    shortDescription: "Send money to another user with image receipt",
    category: "economy",
    guide: { en: "{p}sendmoney [@user / reply] [amount / 100b / all]" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    let targetID = null;
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    if (!targetID || targetID === senderID) {
      return sendMsg("❌ You must mention or reply to another user to send money.");
    }

    try {
      let sender = await BankUser.findOne({ userID: senderID });
      if (!sender) sender = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      const parseAmount = (input) => {
        if (!input) return NaN;
        const lower = input.toLowerCase().trim();
        if (lower === "all") return sender.balance;
        if (lower.endsWith("k")) return parseFloat(lower) * 1000;
        if (lower.endsWith("m")) return parseFloat(lower) * 1000000;
        if (lower.endsWith("b")) return parseFloat(lower) * 1000000000;
        return parseInt(input);
      };

      const amount = parseAmount(args[args.length - 1]);

      if (isNaN(amount) || amount <= 0) {
        return sendMsg("❌ Usage: {p}sendmoney [@user / reply] [amount / 100b / all]");
      }

      if (sender.balance < amount) {
        return sendMsg(`❌ Transaction Failed. Insufficient Balance!\n💰 Your Balance: $${sender.balance.toLocaleString()}`);
      }

      let target = await BankUser.findOne({ userID: targetID });
      if (!target) target = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });

      sender.balance -= amount;
      target.balance += amount;

      await sender.save();
      await target.save();

      let senderName = senderID;
      let targetName = targetID;

      if (usersData && typeof usersData.getName === "function") {
        try {
          senderName = await usersData.getName(senderID);
          targetName = await usersData.getName(targetID);
        } catch (e) {
          senderName = senderID;
          targetName = targetID;
        }
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 500);
      const ctx = canvas.getContext("2d");

      // Modern Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 500);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.5, "#1e293b");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 500);

      // Neon Cyan Border
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 460);

      // Header
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 30px Sans-serif";
      ctx.fillText("💸 DI-ABLO BANK • TRANSFER RECEIPT", 50, 75);

      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 95);
      ctx.lineTo(750, 95);
      ctx.stroke();

      // Sender Box
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 125, 335, 110);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(50, 125, 335, 110);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("SENDER", 65, 155);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Sans-serif";
      ctx.fillText(senderName.length > 18 ? senderName.slice(0, 16) + ".." : senderName, 65, 190);
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Sans-serif";
      ctx.fillText(`ID: ${senderID}`, 65, 215);

      // Receiver Box
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(415, 125, 335, 110);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(415, 125, 335, 110);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("RECEIVER", 430, 155);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Sans-serif";
      ctx.fillText(targetName.length > 18 ? targetName.slice(0, 16) + ".." : targetName, 430, 190);
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Sans-serif";
      ctx.fillText(`ID: ${targetID}`, 430, 215);

      // Main Amount Box
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.fillRect(50, 260, 700, 140);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 260, 700, 140);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("TRANSFERRED AMOUNT", 75, 295);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px Sans-serif";
      ctx.fillText(`$${amount.toLocaleString()}`, 75, 350);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 18px Sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`REMAINING BAL: $${sender.balance.toLocaleString()}`, 730, 350);
      ctx.textAlign = "left";

      // Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • SECURE TRANSACTION", 50, 445);

      // Save and Output Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `sendmoney_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `💸 **[ MONEY TRANSFERRED SUCCESSFULLY ]**\n📤 **From:** ${senderName}\n📥 **To:** ${targetName}`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error("SendMoney Error:", err);
      return sendMsg("❌ Transaction failed due to an error.");
    }
  }
};
