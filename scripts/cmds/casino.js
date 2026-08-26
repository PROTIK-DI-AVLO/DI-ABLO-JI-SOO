const mongoose = require("mongoose");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);

module.exports = {
  config: {
    name: "casino",
    aliases: ["casinostat", "casinomenu"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "VIP Casino Pass & Games Hub",
    category: "game",
    guide: { en: "{p}casino" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID } = event;

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

      let userName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try { userName = await usersData.getName(senderID); } catch (e) {}
      }

      // VIP Rank Calculation
      let vipRank = "BRONZE VIP";
      if (user.balance >= 100000000000) vipRank = "DIABLO LEGEND";
      else if (user.balance >= 1000000000) vipRank = "DIAMOND VIP";
      else if (user.balance >= 1000000) vipRank = "GOLD VIP";

      // Canvas Render
      const canvas = createCanvas(800, 450);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0c0814";
      ctx.fillRect(0, 0, 800, 450);

      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 420);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • VIP MEMBER PASS", 50, 55);

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 160, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 60, 110, 100, 100);
        ctx.restore();

        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(110, 160, 51, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {}

      // Profile Info
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(180, 95, 570, 130);
      ctx.strokeStyle = "rgba(241, 196, 15, 0.3)";
      ctx.strokeRect(180, 95, 570, 130);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(userName, 205, 130);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`TIER: [ ${vipRank} ]`, 205, 160);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 26px Sans-serif";
      ctx.fillText(`CASH: $${this.formatMoney(user.balance)}`, 205, 200);

      // Games Hub List
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(50, 245, 700, 120);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.strokeRect(50, 245, 700, 120);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("AVAILABLE CASINO ARENAS:", 70, 275);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 15px Sans-serif";
      ctx.fillText("• #bet <amount>  : Quick Bet 2X", 70, 310);
      ctx.fillText("• #rc <mul> <bet>: Rocket Crash", 70, 340);

      ctx.fillText("• #hilow <hi/low>: Card Hi-Low", 400, 310);
      ctx.fillText("• #slot <bet>    : Slot Machine", 400, 340);

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("PLAY RESPONSIBLY • DI-ABLO GAMING NETWORK", 50, 405);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `casino_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🎰 **[ VIP CASINO DASHBOARD ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Casino Dashboard Error!");
    }
  }
};
