const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 },
  betStats: {
    wins: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);
const MAX_BET = 50000000000; // 50 Billion Limit

module.exports = {
  config: {
    name: "bet",
    aliases: ["qbet"],
    version: "9.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Quick money multiplier bet with Canvas Graphic Arena",
    category: "game",
    guide: { en: "{p}bet [amount / 2m / 50b / all]" }
  },

  parseBet: function (input, userBalance) {
    if (!input) return null;
    const str = input.toLowerCase().trim();
    if (str === "all") return userBalance;

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

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const rawBet = args[0];
      if (!rawBet) {
        return sendMsg("❌ Usage: #bet <bet_amount / 50b / all>\nExample: #bet 2m");
      }

      const bet = this.parseBet(rawBet, user.balance);

      if (bet === null || isNaN(bet) || bet <= 0) {
        return sendMsg("❌ Please enter a valid bet amount!");
      }

      if (bet > MAX_BET) {
        return sendMsg(`❌ Maximum bet limit is $50 Billion ($${this.formatMoney(MAX_BET)})!`);
      }

      if (user.balance < bet) {
        return sendMsg(`❌ Insufficient funds! You need $${bet.toLocaleString()} in your balance.`);
      }

      // Bet Outcome Logic
      const isWin = Math.random() < 0.50;
      const winAmount = bet;

      if (!user.betStats) {
        user.betStats = { wins: 0, total: 0 };
      }

      user.betStats.total += 1;

      if (isWin) {
        user.balance += winAmount;
        user.betStats.wins += 1;
      } else {
        user.balance -= bet;
      }

      await user.save();

      const totalGames = user.betStats.total;
      const totalWins = user.betStats.wins;
      const winRate = ((totalWins / totalGames) * 100).toFixed(1);

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try {
          userName = await usersData.getName(senderID);
        } catch (e) {
          userName = senderID;
        }
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 520);
      const ctx = canvas.getContext("2d");

      // Dark Gold / Midnight Blue Gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 520);
      gradient.addColorStop(0, "#0b0f19");
      gradient.addColorStop(0.5, "#1e1b4b");
      gradient.addColorStop(1, "#0b0f19");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 520);

      // Gold Glow Border
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 480);

      // Header Title
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🎲 DI-ABLO CASINO • QUICK BET ARENA 🎲", 50, 68);

      ctx.strokeStyle = "rgba(251, 191, 36, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Center Icon Box
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(50, 115, 700, 160);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 115, 700, 160);

      const iconText = isWin ? "💸   💎   💵" : "💣   💥   💀";
      ctx.font = "60px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(iconText, 400, 215);
      ctx.textAlign = "left";

      // Stats Bar (Win Rate & Total Games)
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 300, 700, 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 300, 700, 60);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`🎯 WIN RATE: ${winRate}% (${totalWins}/${totalGames})`, 75, 336);

      ctx.textAlign = "right";
      ctx.fillText(`💵 BET: $${this.formatMoney(bet)}`, 725, 336);
      ctx.textAlign = "left";

      // Outcome Banner
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(50, 380, 700, 60);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 380, 700, 60);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? `👑 LUCKY CHOICE! YOU DOUBLED` : `💀 BAD LUCK! YOU LOST`, 75, 417);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(winAmount)}` : `-$${this.formatMoney(bet)}`, 725, 417);
      ctx.textAlign = "left";

      // Footer Info
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${user.balance.toLocaleString()}`, 50, 475);

      // Save & Output File
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bet_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🎲 **[ QUICK BET ARENA ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error("Bet Error:", err);
      return sendMsg("❌ Quick Bet Error!");
    }
  }
};
