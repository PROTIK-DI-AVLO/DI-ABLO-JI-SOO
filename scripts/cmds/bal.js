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

      // Canvas Digital Card (Green Theme styled like 5053.jpg)
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#091c10";
      ctx.fillRect(0, 0, 800, 420);

      // Outer Border
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      // Top Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("WALLET BALANCE", 50, 65);
      
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px Sans-serif";
      ctx.fillText("Digital Payment Card", 50, 90);

      // Draw User Avatar (Top Right)
      try {
        const avatarUrl = `https://graph.facebook.com/${targetID}/picture?height=300&width=300&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
        const avatarImg = await loadImage(avatarUrl);

        // Circular clip for avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(660, 130, 85, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, 575, 45, 170, 170);
        ctx.restore();

        // Thick green border around avatar
        ctx.strokeStyle = "#10b981"; 
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(660, 130, 85, 0, Math.PI * 2);
        ctx.stroke();
        
        // Small active status dot (Bottom right of avatar)
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(720, 190, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#091c10";
        ctx.lineWidth = 4;
        ctx.stroke();
      } catch (e) {}

      // Balance Info Section
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("AVAILABLE BALANCE", 50, 160);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 65px Sans-serif";
      ctx.fillText(`$${this.formatMoney(user.balance)}`, 45, 230);

      // Card Holder
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px Sans-serif";
      ctx.fillText("CARD HOLDER", 50, 290);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText(targetName.toUpperCase(), 50, 320);

      // User ID
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px Sans-serif";
      ctx.fillText("USER ID", 50, 360);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText(targetID, 50, 385);

      // Fake Chip/Details on Right side
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(580, 320, 180, 50);
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText("CARD: PREMIUM", 600, 350);

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
