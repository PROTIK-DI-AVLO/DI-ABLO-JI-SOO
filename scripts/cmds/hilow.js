const mongoose = require("mongoose");
const { createCanvas, loadImage } = require("canvas");
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
    name: "hilow",
    aliases: ["hl", "highlow"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Guess High or Low Card Game",
    category: "game",
    guide: { en: "{p}hilow [hi/low] [bet_amount]" }
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

    const choice = args[0] ? args[0].toLowerCase() : "";
    if (!["hi", "high", "low", "lo"].includes(choice)) {
      return sendMsg("🃏 **[ HIGH LOW ARENA ]**\n\n❌ Choose 'hi' or 'low'!\n💡 Usage: #hilow hi 50b");
    }

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[1], user.balance);
      if (isNaN(bet) || bet <= 0) return sendMsg("❌ Invalid bet amount!");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds!`);

      const card1 = Math.floor(Math.random() * 12) + 1; // 1 to 12
      let card2 = Math.floor(Math.random() * 13) + 1; // 1 to 13
      while (card2 === card1) card2 = Math.floor(Math.random() * 13) + 1;

      const isHighPicked = ["hi", "high"].includes(choice);
      const isWin = (isHighPicked && card2 > card1) || (!isHighPicked && card2 < card1);

      let newBalance = isWin ? user.balance + bet : user.balance - bet;
      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#091e13" : "#210909";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • HIGH LOW ARENA", 50, 55);

      // Card 1 Box & Card 2 Box
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(100, 90, 220, 150);
      ctx.fillRect(480, 90, 220, 150);

      ctx.strokeStyle = "#38bdf8";
      ctx.strokeRect(100, 90, 220, 150);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.strokeRect(480, 90, 220, 150);

      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("BASE CARD", 210, 120);
      ctx.fillText("DRAWN CARD", 590, 120);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 50px Sans-serif";
      ctx.fillText(card1, 210, 190);
      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.fillText(card2, 590, 190);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 26px Sans-serif";
      ctx.fillText("VS", 400, 170);

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(80, 305, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 50, 275, 60, 60);
        ctx.restore();
      } catch (e) {}

      // Result Bar
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(120, 275, 630, 60);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.strokeRect(120, 275, 630, 60);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? "[ CORRECT GUESS! YOU WON ]" : "[ WRONG GUESS! YOU LOST ]", 140, 312);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(bet * 2)}` : `-$${this.formatMoney(bet)}`, 730, 312);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `hilow_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🃏 **[ HIGH LOW ARENA ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ HiLow Error!");
    }
  }
};
