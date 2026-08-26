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
    name: "addbal",
    aliases: ["addmoney", "givemoney"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 2,
    role: 2,
    shortDescription: "Add balance to user image receipt (Admin Only)",
    category: "economy",
    guide: { en: "{p}addbal [@user / reply] [amount / 100b]" }
  },

  adminUIDs: ["61591412309835"],
  adminName: "ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ",

  parseAmount: function (input) {
    if (!input) return NaN;
    const lower = input.toLowerCase().trim();
    if (lower.endsWith("k")) return parseFloat(lower) * 1000;
    if (lower.endsWith("m")) return parseFloat(lower) * 1000000;
    if (lower.endsWith("b")) return parseFloat(lower) * 1000000000;
    return parseInt(input);
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
      return sendMsg("❌ ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ. ᴏɴʟʏ ᴀᴅᴍɪɴɪsᴛʀᴀᴛᴏʀ ᴅɪ-ᴀʙʟᴏ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.");
    }

    let targetID = senderID;
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    const rawAmount = args[args.length - 1];
    const amount = this.parseAmount(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return sendMsg("❌ Usage: {p}addbal [@user / reply] [amount / 100b]");
    }

    try {
      let user = await BankUser.findOne({ userID: targetID });
      if (!user) {
        user = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });
      }

      user.balance += amount;
      await user.save();

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

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 480);
      gradient.addColorStop(0, "#081c15");
      gradient.addColorStop(0.5, "#1b4332");
      gradient.addColorStop(1, "#081c15");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // Border Glow
      ctx.strokeStyle = "#52b788";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 440);

      // Header
      ctx.fillStyle = "#74c69d";
      ctx.font = "bold 30px Sans-serif";
      ctx.fillText("✅ DI-ABLO BANK • ADMIN CREDIT RECEIPT", 50, 75);

      ctx.strokeStyle = "rgba(116, 198, 157, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 95);
      ctx.lineTo(750, 95);
      ctx.stroke();

      // Info Texts
      ctx.fillStyle = "#d8f3dc";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(`ADMIN: ${this.adminName}`, 50, 145);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText(`RECEIVER: ${targetName.toUpperCase()}`, 50, 185);

      ctx.fillStyle = "#b7e4c7";
      ctx.font = "20px Sans-serif";
      ctx.fillText(`TARGET ID: ${targetID}`, 50, 220);

      // Amount Box
      ctx.fillStyle = "rgba(45, 106, 79, 0.4)";
      ctx.fillRect(50, 250, 700, 130);
      ctx.strokeStyle = "#52b788";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 250, 700, 130);

      ctx.fillStyle = "#74c69d";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("CREDITED AMOUNT", 75, 285);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Sans-serif";
      ctx.fillText(`+$${amount.toLocaleString()}`, 75, 335);

      ctx.fillStyle = "#d8f3dc";
      ctx.font = "bold 20px Sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`NEW BALANCE: $${user.balance.toLocaleString()}`, 730, 335);
      ctx.textAlign = "left";

      // Footer
      ctx.fillStyle = "#74c69d";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • AUTHORIZED TRANSACTION", 50, 435);

      // Output Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `addbal_${targetID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `✅ **[ BALANCE CREDITED BY ADMIN ]**\n👤 **User:** ${targetName}`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to add balance and generate receipt!");
    }
  }
};
