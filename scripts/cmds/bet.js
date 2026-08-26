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
    name: "bet",
    aliases: ["quickbet", "b"],
    version: "2.5.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Quick Bet Arena",
    category: "game",
    guide: { en: "{p}bet [amount/100b/all]" }
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
      if (isNaN(bet) || bet <= 0) return sendMsg("✨ ─── [ BET ERROR ] ─── ✨\n\n❌ Invalid bet amount!\n💡 Usage: #bet <amount/100b/all>");
      if (bet > MAX_BET) return sendMsg(`❌ Maximum bet limit is $100 Billion!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient balance! You have $${user.balance.toLocaleString()}`);

      const isWin = Math.random() < 0.48;
      let newBalance = isWin ? user.balance + bet : user.balance - bet;

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas setup
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#092011" : "#200909";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • QUICK BET ARENA", 50, 55);

      // User Profile Picture
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 180, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 60, 130, 100, 100);
        ctx.restore();

        ctx.strokeStyle = isWin ? "#2ecc71" : "#e74c3c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(110, 180, 51, 0, Math.PI * 2, true);
        ctx.stroke();
      } catch (e) {}

      // Result Center Box
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(190, 100, 560, 160);
      ctx.strokeStyle = isWin ? "rgba(46, 204, 113, 0.4)" : "rgba(231, 76, 60, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(190, 100, 560, 160);

      ctx.textAlign = "center";
      ctx.fillStyle = isWin ? "#2ecc71" : "#e74c3c";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText(isWin ? "[ LUCKY CHOICE! YOU DOUBLED ]" : "[ BAD LUCK! YOU LOST ]", 470, 150);

      ctx.font = "bold 36px Sans-serif";
      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.fillText(isWin ? `+ $${this.formatMoney(bet)}` : `- $${this.formatMoney(bet)}`, 470, 215);
      ctx.textAlign = "left";

      // Info Footer
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(50, 280, 700, 50);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(50, 280, 700, 50);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`BET STAKE: $${this.formatMoney(bet)}`, 70, 311);

      ctx.textAlign = "right";
      ctx.fillText(`NEW BALANCE: $${newBalance.toLocaleString()}`, 730, 311);
      ctx.textAlign = "left";

      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName}`, 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bet_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🎲 **[ QUICK BET ARENA ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (err) {
      console.error(err);
      return sendMsg("❌ Bet Error!");
    }
  }
};
