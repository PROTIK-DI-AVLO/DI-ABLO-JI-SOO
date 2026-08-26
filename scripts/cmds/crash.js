const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

const MAX_BET = 100000000000; // 100 Billion Limit

module.exports = {
  config: {
    name: "crash",
    aliases: ["rocket", "rc"],
    version: "3.0.0",
    author: "Pratik Shah",
    countDown: 5,
    role: 0,
    shortDescription: "Rocket Crash Arena with Canvas Graphic Interface",
    category: "game",
    guide: { en: "{p}crash <target_multiplier e.g. 1.5/2.0> <bet_amount / 100b / all>" }
  },

  parseAmount: function (str, userBalance) {
    if (!str) return NaN;
    str = str.toLowerCase().trim();
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
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      const targetMulti = parseFloat(args[0]);
      const bet = this.parseAmount(args[1], user.balance);

      if (isNaN(targetMulti) || targetMulti < 1.1) {
        return sendMsg("❌ Minimum multiplier is 1.1x!\nExample: #crash 2.5 100b");
      }

      if (isNaN(bet) || bet <= 0) {
        return sendMsg("❌ Please enter a valid bet amount!");
      }

      if (bet > MAX_BET) {
        return sendMsg(`❌ Maximum bet limit is $100B ($100,000,000,000)!`);
      }

      if (user.balance < bet) {
        return sendMsg(`❌ Insufficient funds! You need $${bet.toLocaleString()} in your balance.`);
      }

      // Outcome calculation
      const crashPoint = parseFloat((Math.random() * (5.0 - 1.0) + 1.0).toFixed(2));
      const isWin = targetMulti <= crashPoint;

      let netProfit = 0;
      let reward = 0;

      if (isWin) {
        reward = Math.floor(bet * targetMulti);
        netProfit = reward - bet;
        user.balance += netProfit;
      } else {
        user.balance -= bet;
      }

      await user.save();

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

      // Galaxy Space Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 520);
      gradient.addColorStop(0, "#090a0f");
      gradient.addColorStop(0.5, "#1b1429");
      gradient.addColorStop(1, "#090a0f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 520);

      // Neon Purple Glow Border
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 480);

      // Header Title
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🚀 DI-ABLO CASINO • ROCKET CRASH 🚀", 50, 68);

      ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Draw Trajectory Graph Area
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(50, 110, 450, 250);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(50, 110, 450, 250);

      // Trajectory Curve
      ctx.beginPath();
      ctx.moveTo(70, 330);
      ctx.quadraticCurveTo(230, 320, 460, isWin ? 150 : 220);
      ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 5;
      ctx.stroke();

      // Draw Endpoint / Rocket Icon
      ctx.fillStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.font = "32px Sans-serif";
      ctx.fillText(isWin ? "🚀" : "💥", 445, isWin ? 145 : 225);

      // Side Info Box (Target & Crash Multipliers)
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(520, 110, 230, 115);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(520, 110, 230, 115);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("TARGET MULTIPLIER", 535, 140);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText(`${targetMulti.toFixed(1)}x`, 535, 190);

      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(520, 245, 230, 115);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(520, 245, 230, 115);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("CRASHED AT", 535, 275);
      ctx.fillStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText(`${crashPoint.toFixed(2)}x`, 535, 325);

      // Win / Loss Result Banner
      ctx.fillStyle = isWin ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)";
      ctx.fillRect(50, 380, 700, 60);
      ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 380, 700, 60);

      ctx.fillStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? `🎉 CASHOUT SUCCESSFUL!` : `💥 ROCKET CRASHED BEFORE CASHOUT!`, 75, 417);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(reward)} (+$${this.formatMoney(netProfit)} NET)` : `-$${this.formatMoney(bet)}`, 735, 417);
      ctx.textAlign = "left";

      // Footer
      ctx.fillStyle = "#888888";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${user.balance.toLocaleString()}`, 50, 475);

      // Save & Output File
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `crash_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🚀 **[ ROCKET CRASH ARENA ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to process Rocket Crash game!");
    }
  }
};
