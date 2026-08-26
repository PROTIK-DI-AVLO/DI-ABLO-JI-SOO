const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 },
  slotWins: { type: Number, default: 0 },
  slotTotal: { type: Number, default: 0 },
  lastSlotDate: { type: String, default: "" },
  slotCount: { type: Number, default: 0 },
  slotWindowStart: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);
const MAX_BET = 100000000000; // 100 Billion Limit

module.exports = {
  config: {
    name: "slot",
    aliases: ["slots"],
    version: "2.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 2,
    role: 0,
    shortDescription: "Play casino slot game with Canvas interface",
    category: "game",
    guide: { en: "{p}slot [amount / 2m / 5k / 100b / all]" }
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
      if (!user) {
        user = await BankUser.create({ userID: senderID, balance: 1000 });
      }

      if (!args[0]) {
        return sendMsg("❌ Please enter a bet amount. Example: #slot 2m / #slot 100b");
      }

      const betAmount = this.parseAmount(args[0], user.balance);

      if (betAmount === null || isNaN(betAmount) || betAmount <= 0) {
        return sendMsg("❌ Invalid bet amount!");
      }

      if (betAmount > MAX_BET) {
        return sendMsg(`❌ Maximum bet limit is $100B ($${this.formatMoney(MAX_BET)}).`);
      }

      if (user.balance < betAmount) {
        return sendMsg(`❌ Insufficient balance! You have $${user.balance.toLocaleString()}.`);
      }

      // 5 Hours Cooldown & 30 Spins Limit Logic
      const now = Date.now();
      const FIVE_HOURS = 5 * 60 * 60 * 1000;

      let windowStart = user.slotWindowStart || 0;
      let currentCount = user.slotCount || 0;

      if (!windowStart || (now - windowStart) > FIVE_HOURS) {
        windowStart = now;
        currentCount = 0;
      }

      if (currentCount >= 30) {
        const remainingMs = FIVE_HOURS - (now - windowStart);
        const remainingMins = Math.ceil(remainingMs / (60 * 1000));
        const hours = Math.floor(remainingMins / 60);
        const mins = remainingMins % 60;

        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        return sendMsg(`❌ You have reached the limit of 30 spins per 5 hours.\n⏳ Please wait ${timeStr} to play again.`);
      }

      // Daily Reset Check
      const today = new Date().toISOString().slice(0, 10);
      let wins = user.slotWins || 0;
      let total = user.slotTotal || 0;

      if (user.lastSlotDate !== today) {
        wins = 0;
        total = 0;
      }

      // Heart Icons for Slot
      const items = ["💜", "❤️", "🤍", "💚", "💛", "💙"];
      const icon1 = items[Math.floor(Math.random() * items.length)];
      const icon2 = items[Math.floor(Math.random() * items.length)];
      const icon3 = items[Math.floor(Math.random() * items.length)];

      let winMultiplier = 0;
      if (icon1 === icon2 && icon2 === icon3) {
        winMultiplier = 3;
      } else if (icon1 === icon2 || icon1 === icon3 || icon2 === icon3) {
        winMultiplier = 2;
      }

      total += 1;
      currentCount += 1;
      let prize = 0;
      let newBalance = user.balance;

      if (winMultiplier > 0) {
        wins += 1;
        prize = betAmount * winMultiplier;
        newBalance = user.balance + (prize - betAmount);
      } else {
        newBalance = user.balance - betAmount;
      }

      // Explicit MongoDB Update
      await BankUser.updateOne(
        { userID: senderID },
        {
          $set: {
            balance: newBalance,
            slotWins: wins,
            slotTotal: total,
            lastSlotDate: today,
            slotCount: currentCount,
            slotWindowStart: windowStart
          }
        }
      );

      const winRate = ((wins / total) * 100).toFixed(1);

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

      // Deep Purple Casino Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 520);
      gradient.addColorStop(0, "#0d0814");
      gradient.addColorStop(0.5, "#251238");
      gradient.addColorStop(1, "#0d0814");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 520);

      // Glowing Magenta Border
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 480);

      // Header Title
      ctx.fillStyle = "#f472b6";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🎰 DI-ABLO CASINO • LUCKY SLOTS 🎰", 50, 68);

      ctx.strokeStyle = "rgba(244, 114, 182, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Slot Machine Display Frame (3 Boxes)
      const slotBoxWidth = 210;
      const slotBoxHeight = 160;
      const startX = 65;
      const slotY = 115;
      const spacing = 35;

      const reelIcons = [icon1, icon2, icon3];

      for (let i = 0; i < 3; i++) {
        const boxX = startX + i * (slotBoxWidth + spacing);

        // Box Background & Glow Border
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(boxX, slotY, slotBoxWidth, slotBoxHeight);
        ctx.strokeStyle = winMultiplier > 0 ? "#ffd700" : "#a855f7";
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, slotY, slotBoxWidth, slotBoxHeight);

        // Render Emoji Icon
        ctx.font = "75px Sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(reelIcons[i], boxX + slotBoxWidth / 2, slotY + 110);
      }
      ctx.textAlign = "left";

      // Stats Bar (Win Rate & Remaining Spins)
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 300, 700, 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 300, 700, 60);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`🎯 TODAY'S WIN RATE: ${winRate}% (${wins}/${total})`, 75, 336);

      ctx.textAlign = "right";
      ctx.fillText(`🎰 SPINS LEFT (5H): ${30 - currentCount}/30`, 725, 336);
      ctx.textAlign = "left";

      // Win / Loss Result Banner
      const isWin = winMultiplier > 0;
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(50, 380, 700, 60);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 380, 700, 60);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? `🎉 YOU WON $${this.formatMoney(prize)}!` : `💔 YOU LOST $${this.formatMoney(betAmount)}`, 75, 417);

      ctx.textAlign = "right";
      ctx.fillText(`BET: $${this.formatMoney(betAmount)}`, 725, 417);
      ctx.textAlign = "left";

      // Footer Info
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 475);

      // Cache File Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `slot_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🎰 **[ LUCKY SLOTS RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error("Slot Error:", err);
      return sendMsg("❌ Slot game error!");
    }
  }
};
