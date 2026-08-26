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
    name: "bal",
    aliases: ["balance", "money", "wallet"],
    version: "2.5.0",
    author: "Pratik Shah",
    countDown: 2,
    role: 0,
    shortDescription: "Check Bank Balance Card",
    category: "banking",
    guide: { en: "{p}bal [@mention]" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID, mentions } = event;

    const mentionIDs = Object.keys(mentions || {});
    const targetID = mentionIDs.length > 0 ? mentionIDs[0] : senderID;

    try {
      let user = await BankUser.findOne({ userID: targetID });
      if (!user) user = await BankUser.create({ userID: targetID, balance: 1000 });

      let targetName = targetID;
      if (usersData && typeof usersData.getName === "function") {
        try { targetName = await usersData.getName(targetID); } catch (e) {}
      }

      // Canvas Digital Card
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0a1128";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK • DIGITAL VIP WALLET", 50, 55);

      // User Avatar
      try {
        const avatarUrl = `https://graph.facebook.com/${targetID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 180, 55, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 65, 125, 110, 110);
        ctx.restore();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(120, 180, 56, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {}

      // Balance Info Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(200, 100, 550, 160);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.strokeRect(200, 100, 550, 160);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("ACCOUNT HOLDER", 230, 135);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(targetName, 230, 165);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px Sans-serif";
      ctx.fillText("TOTAL NET BALANCE", 230, 205);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 36px Sans-serif";
      ctx.fillText(`$${user.balance.toLocaleString()} (${this.formatMoney(user.balance)})`, 230, 245);

      // Card VIP Tag
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.fillRect(50, 285, 700, 55);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeRect(50, 285, 700, 55);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("CARD STATUS: VIP PLATINUM MEMBER", 70, 320);

      ctx.textAlign = "right";
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`ID: ${targetID}`, 730, 320);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("DI-ABLO BANKING SYSTEM • SECURE ENCRYPTED CARD", 50, 375);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bal_${targetID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `💳 [ DIGITAL BANK CARD ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (err) {
      console.error(err);
      return sendMsg("❌ Balance Error!");
    }
  }
};
