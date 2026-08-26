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
    name: "slot",
    aliases: ["slots", "s"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Slot Machine Arena",
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
      if (isNaN(bet) || bet <= 0) return sendMsg("🎰 **[ SLOT MACHINE ARENA ]**\n\n❌ Invalid bet amount!\n💡 Usage: #slot 100b");
      if (bet > MAX_BET) return sendMsg(`❌ Max bet limit is $100B!`);
      if (user.balance < bet) return sendMsg(`❌ Insufficient funds! Balance: $${user.balance.toLocaleString()}`);

      const symbols = ["[ 777 ]", "[ BAR ]", "[ GEM ]", "[ STAR ]", "[ BELL ]", "[ COIN ]"];
      const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

      let winMultiplier = 0;
      if (reel1 === reel2 && reel2 === reel3) {
        winMultiplier = reel1 === "[ 777 ]" ? 10 : 5;
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        winMultiplier = 2;
      }

      const isWin = winMultiplier > 0;
      const profit = isWin ? bet * (winMultiplier - 1) : 0;
      let newBalance = isWin ? user.balance + profit : user.balance - bet;

      await BankUser.updateOne({ userID: senderID }, { $set: { balance: newBalance } });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Slot Machine UI
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isWin ? "#100926" : "#210909";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isWin ? "#a855f7" : "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • VIP SLOT MACHINE", 50, 55);

      // Reels Display Boxes
      const drawReel = (x, text) => {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x, 100, 200, 140);
        ctx.strokeStyle = isWin ? "#a855f7" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 100, 200, 140);

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 32px Sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(text, x + 100, 180);
        ctx.textAlign = "left";
      };

      drawReel(80, reel1);
      drawReel(300, reel2);
      drawReel(520, reel3);

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(85, 305, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 55, 275, 60, 60);
        ctx.restore();
      } catch (e) {}

      // Result Bar
      ctx.fillStyle = isWin ? "rgba(168, 85, 247, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(130, 275, 620, 60);
      ctx.strokeStyle = isWin ? "#a855f7" : "#ef4444";
      ctx.strokeRect(130, 275, 620, 60);

      ctx.fillStyle = isWin ? "#c084fc" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isWin ? `[ JACKPOT WIN! ${winMultiplier}X ]` : "[ NO MATCH! YOU LOST ]", 150, 312);

      ctx.textAlign = "right";
      ctx.fillText(isWin ? `+$${this.formatMoney(profit)}` : `-$${this.formatMoney(bet)}`, 730, 312);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`PLAYER: ${userName} • NEW BALANCE: $${newBalance.toLocaleString()}`, 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `slot_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🎰 [ SLOT MACHINE ARENA ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Slot Machine Error!");
    }
  }
};
