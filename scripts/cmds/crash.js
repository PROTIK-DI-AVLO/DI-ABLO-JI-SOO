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
    name: "crash",
    aliases: ["rc", "rocket"],
    version: "2.5.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Rocket Crash Multiplier Arena",
    category: "game",
    guide: { en: "{p}rc [multiplier e.g. 1.99] [bet_amount]" }
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

    const targetMul = parseFloat(args[0]);
    if (isNaN(targetMul) || targetMul < 1.01 || targetMul > 100) {
      return sendMsg("🚀 **[ ROCKET CRASH ARENA ]**\n\n❌ Target multiplier must be between 1.01x and 100x!\n💡 Usage: #rc 1.99 100b");
    }

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      const bet = this.parseBet(args[1], user.balance);
      if (isNaN(bet) || bet <= 0) return sendMsg("❌ Invalid bet amount!");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds! Balance: $${user.balance.toLocaleString()}`);

      // Generate crash multiplier
      const e = Math.pow(2, Math.random() * 5);
      const crashedAt = parseFloat(Math.max(1.0, e * 0.9).toFixed(2));

      const isWin = targetMul <= crashedAt;
      const profit = Math.floor(bet * (targetMul - 1));
      const totalPayout = bet + profit;
      let newBalance = isWin ? user.balance + profit : user.balance - bet;

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Render
      const canvas = createCanvas(800, 450);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#0f071e" : "#1a060d";
      ctx.fillRect(0, 0, 800, 450);

      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 420);

      ctx.fillStyle = "#c084fc";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • ROCKET CRASH", 50, 55);

      // Rocket Curve Graphic Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(50, 80, 400, 200);
      ctx.strokeStyle = "rgba(192, 132, 252, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 80, 400, 200);

      // Draw Curve Line
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 260);
      ctx.quadraticCurveTo(200, 250, 430, 110);
      ctx.stroke();

      // Right Stats Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(470, 80, 280, 95);
      ctx.fillRect(470, 185, 280, 95);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(470, 80, 280, 95);
      ctx.strokeRect(470, 185, 280, 95);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px Sans-serif";
      ctx.fillText("TARGET MULTIPLIER", 490, 105);
      ctx.fillText("CRASHED AT", 490, 210);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 30px Sans-serif";
      ctx.fillText(`${targetMul.toFixed(2)}x`, 490, 150);

      ctx.fillStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.fillText(`${crashedAt.toFixed(2)}x`, 490, 255);

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(85, 335, 25, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 60, 310, 50, 50);
        ctx.restore();
      } catch (e) {}

      // Result Bar
      ctx.fillStyle = isWin ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(120, 305, 630, 60);
      ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
      ctx.strokeRect(120, 305, 630, 60);

      ctx.fillStyle = isWin ? "#4ade80" : "#f87171";
      ctx.font = "bold 20px Sans-serif";
      ctx.fillText(isWin ? "[ CASHOUT SUCCESSFUL! ]" : "[ CRASHED! YOU LOST ]", 140, 342);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(totalPayout)} (+$${this.formatMoney(profit)} NET)` : `-$${this.formatMoney(bet)}`, 730, 342);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 410);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `crash_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🚀 **[ ROCKET CRASH ARENA ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Rocket Crash Error!");
    }
  }
};
