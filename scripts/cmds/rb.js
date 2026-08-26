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
    name: "rb",
    aliases: ["redblack", "roulette"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Red or Black Roulette Arena",
    category: "game",
    guide: { en: "{p}rb [red/black] [bet_amount]" }
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

    const pick = args[0] ? args[0].toLowerCase() : "";
    if (!["red", "r", "black", "b"].includes(pick)) {
      return sendMsg("🔴 **[ RED BLACK ROULETTE ]**\n\n❌ Pick 'red' or 'black'!\n💡 Usage: #rb red 100b");
    }

    const userChoice = ["red", "r"].includes(pick) ? "RED" : "BLACK";

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[1], user.balance);
      if (isNaN(bet) || bet <= 0) return sendMsg("❌ Invalid bet amount!");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds!`);

      // Roll result
      const rand = Math.random();
      const outcome = rand < 0.48 ? "RED" : rand < 0.96 ? "BLACK" : "GREEN ZERO";

      const isWin = userChoice === outcome;
      let newBalance = isWin ? user.balance + bet : user.balance - bet;

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#0d1f14" : "#240a0a";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • RED BLACK ROULETTE", 50, 55);

      // Pick vs Outcome Box
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(100, 90, 250, 140);
      ctx.fillRect(450, 90, 250, 140);

      ctx.strokeStyle = userChoice === "RED" ? "#ef4444" : "#3b82f6";
      ctx.strokeRect(100, 90, 250, 140);

      ctx.strokeStyle = outcome === "RED" ? "#ef4444" : outcome === "BLACK" ? "#3b82f6" : "#22c55e";
      ctx.strokeRect(450, 90, 250, 140);

      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("YOUR CHOICE", 225, 125);
      ctx.fillText("ROULETTE LANDED", 575, 125);

      ctx.fillStyle = userChoice === "RED" ? "#f87171" : "#60a5fa";
      ctx.font = "bold 36px Sans-serif";
      ctx.fillText(userChoice, 225, 185);

      ctx.fillStyle = outcome === "RED" ? "#f87171" : outcome === "BLACK" ? "#60a5fa" : "#4ade80";
      ctx.fillText(outcome, 575, 185);
      ctx.textAlign = "left";

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(80, 295, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 50, 265, 60, 60);
        ctx.restore();
      } catch (e) {}

      // Result Bar
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(120, 265, 630, 60);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.strokeRect(120, 265, 630, 60);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? "[ WINNER! DOUBLED MONEY ]" : "[ LOST! BETTER LUCK NEXT TIME ]", 140, 302);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(bet * 2)}` : `-$${this.formatMoney(bet)}`, 730, 302);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `rb_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🔴 **[ ROULETTE RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Red Black Error!");
    }
  }
};
