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
    name: "roulette",
    aliases: ["rb"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Red or Black Roulette Arena",
    category: "game",
    guide: { en: "{p}rb [red/black/green] [bet]" }
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
    if (!["red", "black", "green"].includes(choice)) {
      return sendMsg("🎡 **[ ROULETTE ARENA ]**\n\n❌ Choose color: red, black, or green!\n💡 Usage: #rb red 50b");
    }

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[1], user.balance);
      if (isNaN(bet) || bet <= 0) return sendMsg("❌ Invalid bet amount!");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds! Balance: $${user.balance.toLocaleString()}`);

      // Wheel Spin Outcome
      const rand = Math.random() * 100;
      let landed = "black";
      if (rand < 5) landed = "green"; // 5% chance
      else if (rand < 52) landed = "red"; // 47% chance
      else landed = "black";

      const isWin = choice === landed;
      let multiplier = landed === "green" ? 14 : 2;
      let winAmount = isWin ? bet * multiplier : 0;
      let newBalance = isWin ? user.balance + (winAmount - bet) : user.balance - bet;

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#170606" : "#0d0404";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      // Header Text (Clean Text Badge - No Broken Emoji Boxes)
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • ROULETTE ARENA", 50, 55);

      // Choice Box & Wheel Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(50, 80, 320, 140);
      ctx.fillRect(430, 80, 320, 140);

      ctx.strokeStyle = choice === "red" ? "#ef4444" : (choice === "black" ? "#64748b" : "#22c55e");
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 80, 320, 140);

      ctx.strokeStyle = landed === "red" ? "#ef4444" : (landed === "black" ? "#64748b" : "#22c55e");
      ctx.strokeRect(430, 80, 320, 140);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("YOUR CHOICE", 70, 110);
      ctx.fillText("WHEEL SPUN", 450, 110);

      ctx.font = "bold 32px Sans-serif";
      ctx.fillStyle = choice === "red" ? "#ef4444" : (choice === "black" ? "#ffffff" : "#22c55e");
      ctx.fillText(choice.toUpperCase(), 70, 170);

      ctx.fillStyle = landed === "red" ? "#ef4444" : (landed === "black" ? "#ffffff" : "#22c55e");
      ctx.fillText(landed.toUpperCase(), 450, 170);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("VS", 385, 160);

      // Info Bar
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(50, 240, 700, 45);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px Sans-serif";
      ctx.fillText(`PICKED: ${choice.toUpperCase()}  |  LANDED: ${landed.toUpperCase()}`, 70, 268);
      ctx.textAlign = "right";
      ctx.fillText(`BET AMOUNT: $${this.formatMoney(bet)}`, 730, 268);
      ctx.textAlign = "left";

      // Result Banner
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(50, 300, 700, 50);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.strokeRect(50, 300, 700, 50);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 20px Sans-serif";
      ctx.fillText(isWin ? `YOU WON +$${this.formatMoney(winAmount)}!` : `YOU LOST -$${this.formatMoney(bet)}`, 70, 332);

      // Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 385);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `rb_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🎡 **[ RED OR BLACK ROULETTE RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Roulette Error!");
    }
  }
};
