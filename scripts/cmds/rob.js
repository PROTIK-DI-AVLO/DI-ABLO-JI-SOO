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
    aliases: ["steal", "heist"],
    version: "2.1.0",
    author: "Pratik Shah",
    countDown: 10,
    role: 0,
    shortDescription: "Rob money from another user",
    category: "game",
    guide: { en: "{p}rob @mention" }
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
    if (mentionIDs.length === 0) return sendMsg("🕵️ [ HEIST ARENA ]\n\n❌ Tag a user to rob!\n💡 Usage: #rob @mention");

    const victimID = mentionIDs[0];
    if (victimID === senderID) return sendMsg("❌ You cannot rob yourself!");

    try {
      let robber = await BankUser.findOne({ userID: senderID });
      if (!robber) robber = await BankUser.create({ userID: senderID, balance: 1000 });

      let victim = await BankUser.findOne({ userID: victimID });
      if (!victim || victim.balance < 1000) return sendMsg("❌ Victim is too poor to rob! (Min balance $1,000 required)");

      if (robber.balance < 500) return sendMsg("❌ You need at least $500 balance to pay court fine if caught!");

      const isSuccess = Math.random() < 0.45; // 45% chance
      let stolenAmount = 0;
      let fineAmount = 0;

      if (isSuccess) {
        stolenAmount = Math.floor(victim.balance * (Math.random() * 0.2 + 0.1)); // 10% to 30%
        await BankUser.updateOne({ userID: senderID }, { $inc: { balance: stolenAmount } });
        await BankUser.updateOne({ userID: victimID }, { $inc: { balance: -stolenAmount } });
      } else {
        fineAmount = Math.floor(robber.balance * 0.15); // 15% fine
        await BankUser.updateOne({ userID: senderID }, { $inc: { balance: -fineAmount } });
        await BankUser.updateOne({ userID: victimID }, { $inc: { balance: fineAmount } });
      }

      // Fetch Names properly
      let robberName = senderID;
      let victimName = victimID;
      if (usersData && typeof usersData.getName === "function") {
        try { robberName = await usersData.getName(senderID); } catch (e) {}
        try { victimName = await usersData.getName(victimID); } catch (e) {}
      }

      // Canvas Dual Avatar & Info Render
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = isSuccess ? "#0b1d12" : "#240a0a";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = isSuccess ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • HEIST & ROBBERY", 40, 55);

      // Function to draw Avatar & Profile Card
      const drawAvatarCard = async (x, y, uid, title, name) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x, y, 340, 130);
        ctx.strokeStyle = isSuccess ? "rgba(46, 204, 113, 0.3)" : "rgba(231, 76, 60, 0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 340, 130);

        try {
          const url = `https://graph.facebook.com/${uid}/picture?height=200&width=200&access_token=6628568379%7Cc15a440756e44ac5b2aa361a52f5a94f`;
          const img = await loadImage(url);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + 55, y + 65, 38, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x + 17, y + 27, 76, 76);
          ctx.restore();

          // Avatar Border
          ctx.strokeStyle = isSuccess ? "#2ecc71" : "#e74c3c";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x + 55, y + 65, 39, 0, Math.PI * 2);
          ctx.stroke();
        } catch (e) {}

        // Title (ROBBER / VICTIM)
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px Sans-serif";
        ctx.fillText(title, x + 110, y + 40);

        // User Name
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Sans-serif";
        const displayName = name.length > 16 ? name.substring(0, 16) + "..." : name;
        ctx.fillText(displayName, x + 110, y + 70);

        // User ID
        ctx.fillStyle = "#64748b";
        ctx.font = "12px Sans-serif";
        ctx.fillText(`ID: ${uid}`, x + 110, y + 95);
      };

      await drawAvatarCard(40, 90, senderID, "ATTACKER / ROBBER", robberName);
      await drawAvatarCard(420, 90, victimID, "DEFENDER / VICTIM", victimName);

      // VS Badge in middle
      ctx.fillStyle = isSuccess ? "#2ecc71" : "#e74c3c";
      ctx.font = "bold 22px Sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VS", 400, 162);
      ctx.textAlign = "left";

      // Result Bar
      ctx.fillStyle = isSuccess ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)";
      ctx.fillRect(40, 245, 720, 65);
      ctx.strokeStyle = isSuccess ? "#2ecc71" : "#e74c3c";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 245, 720, 65);

      ctx.fillStyle = isSuccess ? "#4ade80" : "#f87171";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText(isSuccess ? "[ HEIST SUCCESSFUL! ]" : "[ CAUGHT BY POLICE! ]", 60, 285);

      ctx.textAlign = "right";
      ctx.fillText(isSuccess ? `+$${this.formatMoney(stolenAmount)} STOLEN` : `-$${this.formatMoney(fineAmount)} FINE PAID`, 740, 285);
      ctx.textAlign = "left";

      // Footer info
      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText("DI-ABLO CASINO • SECURE HEIST SYSTEM", 40, 365);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `rob_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `🕵️ [ HEIST RESULT ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Rob Error!");
    }
  }
};
