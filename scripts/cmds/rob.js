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
    name: "rob",
    aliases: ["heist"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 5,
    role: 0,
    shortDescription: "Rob another user balance",
    category: "game",
    guide: { en: "{p}rob @mention" }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);
    const { senderID, mentions } = event;

    const mentionIDs = Object.keys(mentions || {});
    if (mentionIDs.length === 0) return sendMsg("🏦 **[ HEIST ARENA ]**\n\n❌ Tag someone to rob!\n💡 Usage: #rob @mention");

    const targetID = mentionIDs[0];
    if (targetID === senderID) return sendMsg("❌ You cannot rob yourself!");

    try {
      let robber = await BankUser.findOne({ userID: senderID });
      if (!robber) robber = await BankUser.create({ userID: senderID, balance: 1000 });

      let target = await BankUser.findOne({ userID: targetID });
      if (!target || target.balance <= 50) return sendMsg("❌ Target is too poor to rob!");

      const isSuccess = Math.random() < 0.50;
      let stolenAmount = 0;
      let penalty = 0;

      if (isSuccess) {
        stolenAmount = Math.floor(Math.random() * (target.balance * 0.20)) + 10;
        await BankUser.updateOne({ userID: senderID }, { $inc: { balance: stolenAmount } });
        await BankUser.updateOne({ userID: targetID }, { $inc: { balance: -stolenAmount } });
      } else {
        penalty = Math.min(robber.balance, 500);
        await BankUser.updateOne({ userID: senderID }, { $inc: { balance: -penalty } });
      }

      let robberName = senderID, targetName = mentions[targetID].replace("@", "");
      if (usersData && typeof usersData.getName === "function") {
        try { robberName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Setup with Profile Pictures
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isSuccess ? "#07170c" : "#1a0808";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isSuccess ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO HEIST • ROBBERY ARENA", 50, 55);

      // Robber & Target Avatar Boxes
      const drawUserCard = async (x, y, uid, label, color) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x, y, 320, 130);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 320, 130);

        ctx.fillStyle = color;
        ctx.font = "bold 16px Sans-serif";
        ctx.fillText(label, x + 110, y + 40);

        try {
          const url = `https://graph.facebook.com/${uid}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
          const img = await loadImage(url);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + 55, y + 65, 35, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x + 20, y + 30, 70, 70);
          ctx.restore();
        } catch (e) {}
      };

      await drawUserCard(50, 85, senderID, "ROBBER", "#ef4444");
      await drawUserCard(430, 85, targetID, "TARGET", "#3b82f6");

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("VS", 385, 155);

      // Result Bar
      ctx.fillStyle = isSuccess ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(50, 250, 700, 60);
      ctx.strokeStyle = isSuccess ? "#22c55e" : "#ef4444";
      ctx.strokeRect(50, 250, 700, 60);

      ctx.fillStyle = isSuccess ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isSuccess ? "MISSION SUCCESSFUL!" : "HEIST FAILED! CAUGHT BY POLICE", 70, 288);

      ctx.textAlign = "right";
      ctx.fillText(isSuccess ? `STOLEN: +$${stolenAmount.toLocaleString()}` : `FINE: -$${penalty.toLocaleString()}`, 730, 288);
      ctx.textAlign = "left";

      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`ROBBER: ${robberName} • TARGET: ${targetName}`, 50, 370);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `rob_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🏦 **[ DI-ABLO HEIST RESULT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Robbery Error!");
    }
  }
};
