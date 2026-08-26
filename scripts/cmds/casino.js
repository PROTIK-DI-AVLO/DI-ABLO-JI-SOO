const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);
const MAX_BET = 100000000000; // 100 Billion Limit

module.exports = {
  config: {
    name: "casino",
    aliases: ["poker", "vipcasino"],
    version: "6.2.0",
    author: "Pratik Shah & DI-ABLO JI-SOO",
    countDown: 3,
    role: 0,
    shortDescription: "High stakes VIP casino poker game (Max Bet: $100B)",
    category: "game",
    guide: { en: "{p}casino [bet_amount / 100b / all]" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  parseBet: function (input, userBalance) {
    if (!input) return NaN;
    const str = input.toLowerCase().trim();
    if (str === "all") return userBalance;

    const match = str.match(/^(\d+(\.\d+)?)\s*([kmb])?$/);
    if (!match) return NaN;

    let value = parseFloat(match[1]);
    const unit = match[3];

    if (unit === "k") value *= 1000;
    else if (unit === "m") value *= 1000000;
    else if (unit === "b") value *= 1000000000;

    return Math.floor(value);
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID } = event;

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[0], user.balance);

      if (isNaN(bet) || bet <= 0) {
        return sendMsg("✨ ─── [ ᴄᴀsɪɴᴏ ᴇʀʀᴏʀ ] ─── ✨\n\n❌ Invalid bet amount!\n💡 Usage: #casino <amount / 100b / all>");
      }

      if (bet > MAX_BET) {
        return sendMsg(`✨ ─── [ ᴄᴀsɪɴᴏ ᴇʀʀᴏʀ ] ─── ✨\n\n❌ Maximum bet limit is $100 Billion ($${this.formatMoney(MAX_BET)})!`);
      }

      if (user.balance < bet) {
        return sendMsg(`✨ ─── [ ᴄᴀsɪɴᴏ ᴇʀʀᴏʀ ] ─── ✨\n\n❌ Insufficient funds!\n💰 You have $${user.balance.toLocaleString()} in your balance.`);
      }

      const isWin = Math.random() < 0.45;
      const winAmount = bet * 2;
      let newBalance = user.balance;

      if (isWin) {
        newBalance += bet; // Net gain equal to bet (total payout 2x)
      } else {
        newBalance -= bet;
      }

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try {
          userName = await usersData.getName(senderID);
        } catch (e) {
          userName = senderID;
        }
      }

      // Canvas Graphic Rendering
      const canvas = createCanvas(800, 480);
      const ctx = canvas.getContext("2d");

      // Dynamic Dark VIP Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 480);
      if (isWin) {
        gradient.addColorStop(0, "#062012");
        gradient.addColorStop(0.5, "#0b3820");
        gradient.addColorStop(1, "#04140b");
      } else {
        gradient.addColorStop(0, "#210505");
        gradient.addColorStop(0.5, "#3b0a0a");
        gradient.addColorStop(1, "#140303");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // Gold Outer Border Frame
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 440);

      // Status Border Inner Glow
      ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, 744, 424);

      // Header Banner Title
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 26px Sans-serif";
      ctx.fillText("♠️ DI-ABLO VIP POKER CASINO ♠️", 50, 68);

      ctx.strokeStyle = "rgba(241, 196, 15, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Main Outcome Display Box
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(50, 115, 700, 150);
      ctx.strokeStyle = isWin ? "rgba(46, 204, 113, 0.5)" : "rgba(231, 76, 60, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 115, 700, 150);

      // Outcome Title & Icon
      ctx.textAlign = "center";
      ctx.fillStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText(isWin ? "👑 ROYAL FLUSH • HIGH STAKES WIN 👑" : "♠️ HOUSE TOOK THE CHIPS ♠️", 400, 165);

      // Win / Loss Amount
      ctx.font = "bold 38px Sans-serif";
      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.fillText(isWin ? `+ $${winAmount.toLocaleString()}` : `- $${bet.toLocaleString()}`, 400, 225);
      ctx.textAlign = "left";

      // Info Details Bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 290, 700, 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 290, 700, 60);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`💵 BET STAKE: $${this.formatMoney(bet)}`, 75, 326);

      ctx.textAlign = "right";
      ctx.fillText(`💳 NEW BALANCE: $${newBalance.toLocaleString()}`, 725, 326);
      ctx.textAlign = "left";

      // Footer Player Tag
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • HIGH ROLLER TABLE`, 50, 420);

      // Cache File Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `casino_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const payload = {
        body: `♠️ **[ DI-ABLO VIP CASINO RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      };

      if (message && typeof message.reply === "function") {
        return message.reply(payload, sendCallback);
      } else {
        return api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
      }
    } catch (err) {
      console.error("Casino Error:", err);
      return sendMsg("❌ Casino game error!");
    }
  }
};
