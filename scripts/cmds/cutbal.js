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
    name: "cutbal",
    aliases: ["deductbal", "removebal"],
    version: "2.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 2,
    role: 2,
    shortDescription: "Deduct user balance image receipt (Admin Only)",
    category: "economy",
    guide: { en: "{p}cutbal [@user / reply] [amount]" }
  },

  adminUIDs: ["61591412309835"],
  adminName: "ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ",

  parseAmount: function (str) {
    if (!str) return null;
    str = str.toLowerCase().trim();

    const match = str.match(/^(\d+(\.\d+)?)\s*([kmb])?$/);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const unit = match[3];

    if (unit === "k") value *= 1000;
    else if (unit === "m") value *= 1000000;
    else if (unit === "b") value *= 1000000000;

    return Math.floor(value);
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

    if (!this.adminUIDs.includes(senderID)) {
      return sendMsg("❌ ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ. ᴏɴʟʏ ᴀᴅᴍɪɴɪsᴛʀᴀᴛᴏʀ ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ ᴄᴀɴ ᴄᴜᴛ ʙᴀʟᴀɴᴄᴇ.");
    }

    let targetID = senderID;
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    const amount = this.parseAmount(args[args.length - 1]);
    if (amount === null || isNaN(amount) || amount <= 0) {
      return sendMsg("❌ Usage: {p}cutbal [@user / reply] [amount]");
    }

    try {
      let targetUser = await BankUser.findOne({ userID: targetID });
      if (!targetUser) targetUser = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });

      targetUser.balance = Math.max(0, targetUser.balance - amount);
      await targetUser.save();

      let targetName = targetID;
      if (usersData && typeof usersData.getName === "function") {
        try {
          targetName = await usersData.getName(targetID);
        } catch (e) {
          targetName = targetID;
        }
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 480);
      const ctx = canvas.getContext("2d");

      // Dark Crimson Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 480);
      gradient.addColorStop(0, "#1a0808");
      gradient.addColorStop(0.5, "#3a1010");
      gradient.addColorStop(1, "#1a0808");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // Red Border Glow
      ctx.strokeStyle = "#ff4d4d";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 440);

      // Header
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 30px Sans-serif";
      ctx.fillText("🔻 DI-ABLO BANK • ADMIN DEBIT RECEIPT", 50, 75);

      ctx.strokeStyle = "rgba(255, 107, 107, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 95);
      ctx.lineTo(750, 95);
      ctx.stroke();

      // Info Texts
      ctx.fillStyle = "#ffcccc";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(`ADMIN: ${this.adminName}`, 50, 145);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText(`TARGET USER: ${targetName.toUpperCase()}`, 50, 185);

      ctx.fillStyle = "#ff9999";
      ctx.font = "20px Sans-serif";
      ctx.fillText(`TARGET ID: ${targetID}`, 50, 220);

      // Amount Deducted Box
      ctx.fillStyle = "rgba(180, 40, 40, 0.4)";
      ctx.fillRect(50, 250, 700, 130);
      ctx.strokeStyle = "#ff4d4d";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 250, 700, 130);

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("DEDUCTED AMOUNT", 75, 285);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Sans-serif";
      ctx.fillText(`-$${amount.toLocaleString()}`, 75, 335);

      ctx.fillStyle = "#ffcccc";
      ctx.font = "bold 20px Sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`NEW BALANCE: $${targetUser.balance.toLocaleString()}`, 730, 335);
      ctx.textAlign = "left";

      // Footer
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • AUTHORIZED DEBIT TRANSACTION", 50, 435);

      // Save and Output
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `cutbal_${targetID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🔻 **[ BALANCE DEDUCTED BY ADMIN ]**\n👤 **User:** ${targetName}`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to cut balance and generate receipt!");
    }
  }
};
