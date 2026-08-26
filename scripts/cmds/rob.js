const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  wallet: { type: Number, default: 1000 },
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 }
});

const User = mongoose.models.DiabloBankUser || mongoose.models.BankUser || mongoose.model("DiabloBankUser", bankUserSchema);

module.exports = {
  config: {
    name: "rob",
    aliases: ["steal", "heist"],
    version: "3.0.0",
    author: "Pratik Shah & DI-ABLO JI-SOO",
    countDown: 30,
    role: 0,
    shortDescription: "Attempt to rob wallet coins from a tagged user with Canvas visual representation",
    category: "games",
    guide: {
      en: "{p}rob @mention"
    }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const { threadID, messageID, senderID, mentions } = event;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, threadID, messageID);

    const mentionKeys = Object.keys(mentions || {});

    if (mentionKeys.length === 0) {
      return sendMsg("❌ Please mention a target to rob!\nExample: #rob @friend");
    }

    const victimID = mentionKeys[0];
    let victimName = mentions[victimID].replace("@", "").trim();

    if (victimID === senderID) {
      return sendMsg("❌ You cannot rob your own wallet!");
    }

    try {
      // Fetch MongoDB records
      let robber = await User.findOne({ userID: senderID });
      if (!robber) robber = await User.create({ userID: senderID, wallet: 1000 });

      let victim = await User.findOne({ userID: victimID });
      if (!victim) victim = await User.create({ userID: victimID, wallet: 1000 });

      let robberMoney = typeof robber.wallet !== "undefined" ? robber.wallet : (robber.balance || 0);
      let victimMoney = typeof victim.wallet !== "undefined" ? victim.wallet : (victim.balance || 0);

      if (victimMoney < 200) {
        return sendMsg(`❌ ${victimName} does not have enough wallet cash (Minimum $200 required).`);
      }
      if (robberMoney < 100) {
        return sendMsg(`❌ You need at least $100 in your wallet to cover potential police fines!`);
      }

      const isSuccess = Math.random() < 0.45;
      let stolenAmount = 0;
      let fine = 0;

      if (isSuccess) {
        stolenAmount = Math.floor(Math.random() * (victimMoney * 0.3)) + 50;
        victimMoney -= stolenAmount;
        robberMoney += stolenAmount;
      } else {
        fine = Math.min(robberMoney, Math.floor(Math.random() * 150) + 100);
        robberMoney -= fine;
        victimMoney += fine;
      }

      if (typeof robber.wallet !== "undefined") robber.wallet = robberMoney;
      else robber.balance = robberMoney;

      if (typeof victim.wallet !== "undefined") victim.wallet = victimMoney;
      else victim.balance = victimMoney;

      await robber.save();
      await victim.save();

      let robberName = senderID;
      if (usersData && typeof usersData.getName === "function") {
        try {
          robberName = await usersData.getName(senderID);
        } catch (e) {
          robberName = senderID;
        }
      }

      // Canvas Rendering
      const canvas = createCanvas(800, 520);
      const ctx = canvas.getContext("2d");

      // Dark Crimson / Heist Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 520);
      gradient.addColorStop(0, "#120305");
      gradient.addColorStop(0.5, "#2b090e");
      gradient.addColorStop(1, "#120305");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 520);

      // Crimson / Green Dynamic Border Glow
      ctx.strokeStyle = isSuccess ? "#22c55e" : "#dc2626";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 480);

      // Header Title
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText("🏦 DI-ABLO HEIST • ROBBERY ARENA 🏦", 50, 68);

      ctx.strokeStyle = "rgba(248, 113, 113, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 85);
      ctx.lineTo(750, 85);
      ctx.stroke();

      // Robber & Target Box Setup
      const boxWidth = 300;
      const boxHeight = 160;

      // Robber Box (Left)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(50, 115, boxWidth, boxHeight);
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 115, boxWidth, boxHeight);

      ctx.fillStyle = "#fb7185";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("🥷 ROBBER", 75, 145);

      ctx.font = "60px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💰", 200, 220);
      ctx.textAlign = "left";

      // VS Separator Center
      ctx.fillStyle = "#f59e0b";
      ctx.font = "italic bold 32px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VS", 400, 205);
      ctx.textAlign = "left";

      // Target Box (Right)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(450, 115, boxWidth, boxHeight);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.strokeRect(450, 115, boxWidth, boxHeight);

      ctx.fillStyle = "#60a5fa";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("🎯 TARGET", 475, 145);

      ctx.font = "60px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏦", 600, 220);
      ctx.textAlign = "left";

      // Middle Info Bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(50, 300, 700, 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 300, 700, 60);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 16px Sans-serif";
      ctx.fillText(`🎯 TARGET: ${victimName}`, 75, 336);

      ctx.textAlign = "right";
      ctx.fillText(`🛡️ BANK VAULT: SAFE`, 725, 336);
      ctx.textAlign = "left";

      // Result Outcome Banner
      let bannerBg = "rgba(239, 68, 68, 0.2)";
      let bannerBorder = "#ef4444";
      let bannerText = "#f87171";
      let outcomeTxt = `🚨 MISSION FAILED! CAUGHT BY POLICE`;
      let subTxt = `FINE PAID: -$${this.formatMoney(fine)}`;

      if (isSuccess) {
        bannerBg = "rgba(34, 197, 94, 0.2)";
        bannerBorder = "#22c55e";
        bannerText = "#4ade80";
        outcomeTxt = `✅ MISSION SUCCESSFUL!`;
        subTxt = `STOLEN: +$${this.formatMoney(stolenAmount)}`;
      }

      ctx.fillStyle = bannerBg;
      ctx.fillRect(50, 380, 700, 60);
      ctx.strokeStyle = bannerBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 380, 700, 60);

      ctx.fillStyle = bannerText;
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(outcomeTxt, 75, 417);

      ctx.textAlign = "right";
      ctx.fillText(subTxt, 725, 417);
      ctx.textAlign = "left";

      // Footer Information
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText(`ROBBER: ${robberName} • NEW WALLET: $${robberMoney.toLocaleString()}`, 50, 475);

      // Cache & File Handling
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `rob_${senderID}_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🏦 **[ DI-ABLO HEIST RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

    } catch (err) {
      console.error("Rob Error:", err);
      return sendMsg("❌ Rob command error!");
    }
  }
};
