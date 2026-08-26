const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);
const MAX_BET = 100000000000;

module.exports = {
  config: {
    name: "slot",
    aliases: ["slots"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Lucky Slots Game",
    category: "game",
    guide: { en: "{p}slot [bet_amount]" }
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
    let val = parseFloat(match[1]);
    if (match[3] === "k") val *= 1000;
    if (match[3] === "m") val *= 1000000;
    if (match[3] === "b") val *= 1000000000;
    return Math.floor(val);
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID } = event;

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[0], user.balance);
      if (isNaN(bet) || bet <= 0) return sendMsg("❌ Invalid bet amount!");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds!`);

      const symbols = ["777", "BAR", "GEM", "VIP", "WILD"];
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols[Math.floor(Math.random() * symbols.length)];
      const s3 = symbols[Math.floor(Math.random() * symbols.length)];

      const isJackpot = s1 === s2 && s2 === s3;
      const isTwoMatch = s1 === s2 || s2 === s3 || s1 === s3;

      let multiplier = isJackpot ? 5 : (isTwoMatch ? 2 : 0);
      let winAmount = bet * multiplier;
      let newBalance = user.balance + (winAmount - bet);

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#120617";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#c084fc";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • LUCKY SLOTS", 50, 55);

      // Slot Reels (Clean Text Badges)
      const reels = [s1, s2, s3];
      const reelX = [60, 300, 540];

      reels.forEach((symbol, i) => {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(reelX[i], 90, 200, 130);
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.strokeRect(reelX[i], 90, 200, 130);

        ctx.fillStyle = symbol === "777" ? "#f1c40f" : (symbol === "VIP" ? "#ef4444" : "#38bdf8");
        ctx.font = "bold 40px Sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(symbol, reelX[i] + 100, 170);
      });

      ctx.textAlign = "left";

      // Result Bar
      ctx.fillStyle = multiplier > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(50, 280, 700, 50);
      ctx.strokeStyle = multiplier > 0 ? "#22c55e" : "#ef4444";
      ctx.strokeRect(50, 280, 700, 50);

      ctx.fillStyle = multiplier > 0 ? "#4ade80" : "#f87171";
      ctx.font = "bold 20px Sans-serif";
      ctx.fillText(multiplier > 0 ? `YOU WON +$${this.formatMoney(winAmount)} (${multiplier}x)!` : `YOU LOST -$${this.formatMoney(bet)}`, 70, 312);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `slot_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🎰 **[ LUCKY SLOTS RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Slot Error!");
    }
  }
};
