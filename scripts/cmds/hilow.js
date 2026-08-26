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
    name: "hilow",
    aliases: ["highlow"],
    version: "2.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 4,
    role: 0,
    shortDescription: "Guess if next card is High or Low with Canvas graphic UI",
    category: "game",
    guide: { en: "{p}hilow [high/low] [amount/2m/all]" }
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
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      const choice = args[0]?.toLowerCase();
      if (!choice || !["high", "low", "hi", "lo", "h", "l"].includes(choice)) {
        return sendMsg("❌ Please choose 'HIGH' or 'LOW'.\nExample: #hilow high 2m");
      }

      const userChoice = (choice === "high" || choice === "hi" || choice === "h") ? "HIGH" : "LOW";
      const betAmount = this.parseAmount(args[1], user.balance);

      if (betAmount === null || isNaN(betAmount) || betAmount <= 0) {
        return sendMsg("❌ Invalid bet amount!");
      }

      if (user.balance < betAmount) {
        return sendMsg(`❌ Insufficient balance! You have $${user.balance.toLocaleString()}.`);
      }

      const cardNames = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      const suits = ["♠", "♥", "♦", "♣"];

      const baseCardVal = Math.floor(Math.random() * 11); // 0 to 10
      const nextCardVal = Math.floor(Math.random() * 13); // 0 to 12

      const baseSuit = suits[Math.floor(Math.random() * suits.length)];
      const nextSuit = suits[Math.floor(Math.random() * suits.length)];

      const baseCardStr = `${cardNames[baseCardVal]}${baseSuit}`;
      const nextCardStr = `${cardNames[nextCardVal]}${nextSuit}`;

      let actualOutcome = "";
      if (nextCardVal > baseCardVal) actualOutcome = "HIGH";
      else if (nextCardVal < baseCardVal) actualOutcome = "LOW";
      else actualOutcome = "EQUAL";

      let winStatus = "LOSS";
      if (actualOutcome === "EQUAL") {
        winStatus = "EQUAL";
      } else if (userChoice === actualOutcome) {
        user.balance += betAmount;
        winStatus = "WIN";
      } else {
        user.balance -= betAmount;
        winStatus = "LOSS";
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
      const canvas = createCanvas(800, 500);
      const ctx = canvas.getContext("2d");

      // Dark Casino Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 500);
      gradient.addColorStop(0, "#0b0d17");
      gradient.addColorStop(0.5, "#1c1b36");
      gradient.addColorStop(1, "#0b0d17");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 500);

      // Gold Glow Border
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 460);

      // Header Title
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🃏 DI-ABLO CASINO • HIGH OR LOW 🃏", 50, 70);

      ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Card Drawing Function
      const drawCard = (x, y, label, cardValStr, suitSymbol) => {
        // Card Body
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, 160, 220);
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 160, 220);

        // Card Label Top
        ctx.fillStyle = "#888888";
        ctx.font = "bold 16px Sans-serif";
        ctx.fillText(label, x + 15, y - 10);

        // Suit Color (Red for ♥/♦, Black for ♠/♣)
        const isRed = suitSymbol === "♥" || suitSymbol === "♦";
        ctx.fillStyle = isRed ? "#e74c3c" : "#2c3e50";

        // Value & Suit Rendering
        ctx.font = "bold 34px Sans-serif";
        ctx.fillText(cardValStr.slice(0, -1), x + 15, y + 45);

        ctx.font = "50px Sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(suitSymbol, x + 80, y + 130);
        ctx.textAlign = "left";
      };

      // Draw Base Card & Next Card
      drawCard(180, 140, "BASE CARD", baseCardStr, baseSuit);
      drawCard(460, 140, "NEXT CARD", nextCardStr, nextSuit);

      // VS / Arrow in middle
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 32px Sans-serif";
      ctx.fillText("➔", 385, 250);

      // Outcome Banner
      let bannerColor = "#e74c3c";
      let statusText = `💔 YOU LOST $${this.formatMoney(betAmount)}`;
      if (winStatus === "WIN") {
        bannerColor = "#2ecc71";
        statusText = `🎉 WON $${this.formatMoney(betAmount * 2)}`;
      } else if (winStatus === "EQUAL") {
        bannerColor = "#f39c12";
        statusText = `🤝 EQUAL CARD! BET RETURNED`;
      }

      ctx.fillStyle = bannerColor;
      ctx.fillRect(50, 380, 700, 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(`GUESS: ${userChoice}`, 75, 415);

      ctx.textAlign = "right";
      ctx.fillText(statusText, 725, 415);
      ctx.textAlign = "left";

      // Footer Info
      ctx.fillStyle = "#aaaaaa";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${user.balance.toLocaleString()}`, 50, 465);

      // Save & Output File
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `hilow_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🃏 **[ HIGH / LOW CARD RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to process Hi-Low game!");
    }
  }
};
