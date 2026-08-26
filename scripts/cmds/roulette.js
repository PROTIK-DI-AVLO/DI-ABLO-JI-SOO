const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.models.BankUser || mongoose.model("DiabloBankUser", bankUserSchema);
const MAX_BET = 50000000000; // 50 Billion Limit

module.exports = {
  config: {
    name: "roulette",
    aliases: ["rb", "rdbe", "redblack"],
    version: "2.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 4,
    role: 0,
    shortDescription: "Play Red or Black roulette with Canvas graphic output",
    category: "game",
    guide: { en: "{p}roulette [red/black] [amount/2m/50b/all]" }
  },

  parseAmount: function (str, userBalance) {
    if (!str) return null;
    str = str.toLowerCase().trim();
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

      const choice = args[0]?.toLowerCase();
      if (!choice || !["red", "black", "r", "b"].includes(choice)) {
        return sendMsg("❌ Please choose 'red' or 'black'.\nExample: #roulette red 5m");
      }

      const userChoice = (choice === "red" || choice === "r") ? "RED" : "BLACK";
      const betAmount = this.parseAmount(args[1], user.balance);

      if (betAmount === null || isNaN(betAmount) || betAmount <= 0) {
        return sendMsg("❌ Invalid bet amount!");
      }

      if (betAmount > MAX_BET) {
        return sendMsg(`❌ Maximum bet limit is $50 Billion ($${this.formatMoney(MAX_BET)})!`);
      }

      if (user.balance < betAmount) {
        return sendMsg(`❌ Insufficient balance! You have $${user.balance.toLocaleString()}.`);
      }

      const resultColor = Math.random() < 0.5 ? "RED" : "BLACK";
      const isWin = userChoice === resultColor;

      let newBalance = user.balance;
      if (isWin) {
        newBalance += betAmount;
      } else {
        newBalance -= betAmount;
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

      // Canvas Rendering
      const canvas = createCanvas(800, 520);
      const ctx = canvas.getContext("2d");

      // Dark Crimson & Slate Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 520);
      gradient.addColorStop(0, "#180509");
      gradient.addColorStop(0.5, "#2d0b13");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 520);

      // Outer Crimson Border Glow
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 480);

      // Header Title
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🎡 DI-ABLO CASINO • ROULETTE ARENA 🎡", 50, 68);

      ctx.strokeStyle = "rgba(248, 113, 113, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Battle Choice Boxes Setup
      const boxWidth = 300;
      const boxHeight = 160;

      // Player Choice Box (Left)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(50, 115, boxWidth, boxHeight);
      ctx.strokeStyle = userChoice === "RED" ? "#ef4444" : "#475569";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 115, boxWidth, boxHeight);

      ctx.fillStyle = userChoice === "RED" ? "#fca5a5" : "#cbd5e1";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("👤 YOUR CHOICE", 75, 145);

      ctx.font = "60px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(userChoice === "RED" ? "🔴" : "⬛", 200, 220);
      ctx.textAlign = "left";

      // Center VS Icon
      ctx.fillStyle = "#f59e0b";
      ctx.font = "italic bold 32px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VS", 400, 205);
      ctx.textAlign = "left";

      // Roulette Wheel Spun Result Box (Right)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(450, 115, boxWidth, boxHeight);
      ctx.strokeStyle = resultColor === "RED" ? "#ef4444" : "#475569";
      ctx.lineWidth = 3;
      ctx.strokeRect(450, 115, boxWidth, boxHeight);

      ctx.fillStyle = resultColor === "RED" ? "#fca5a5" : "#cbd5e1";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("🎡 WHEEL SPUN", 475, 145);

      ctx.font = "60px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(resultColor === "RED" ? "🔴" : "⬛", 600, 220);
      ctx.textAlign = "left";

      // Middle Info Bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 300, 700, 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 300, 700, 60);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`🎯 PICKED: ${userChoice}  |  LANDED: ${resultColor}`, 75, 336);

      ctx.textAlign = "right";
      ctx.fillText(`💵 BET AMOUNT: $${this.formatMoney(betAmount)}`, 725, 336);
      ctx.textAlign = "left";

      // Result Outcome Banner
      let bannerBg = "rgba(239, 68, 68, 0.2)";
      let bannerBorder = "#ef4444";
      let bannerText = "#f87171";
      let outcomeTxt = `💔 YOU LOST -$${this.formatMoney(betAmount)}`;

      if (isWin) {
        bannerBg = "rgba(34, 197, 94, 0.2)";
        bannerBorder = "#22c55e";
        bannerText = "#4ade80";
        outcomeTxt = `🎉 YOU WON +$${this.formatMoney(betAmount * 2)}!`;
      }

      ctx.fillStyle = bannerBg;
      ctx.fillRect(50, 380, 700, 60);
      ctx.strokeStyle = bannerBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 380, 700, 60);

      ctx.fillStyle = bannerText;
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(outcomeTxt, 75, 417);

      // Footer Information
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 475);

      // Cache & File Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `roulette_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🎡 **[ RED OR BLACK ROULETTE RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error("Roulette Error:", err);
      return sendMsg("❌ Roulette game error!");
    }
  }
};
