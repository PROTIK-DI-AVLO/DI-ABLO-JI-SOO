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
    name: "sendmoney",
    aliases: ["pay", "transfer"],
    version: "2.0.0",
    author: "Pratik Shah",
    countDown: 3,
    role: 0,
    shortDescription: "Transfer money to another user",
    category: "banking",
    guide: { en: "{p}pay @mention [amount]" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  parseBet: function (input) {
    if (!input) return NaN;
    const str = input.toLowerCase().trim();
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
    const { senderID, mentions } = event;

    const mentionIDs = Object.keys(mentions || {});
    if (mentionIDs.length === 0) return sendMsg("💸 **[ MONEY TRANSFER ]**\n\n❌ Tag a user to send money!\n💡 Usage: #pay @mention 100k");

    const targetID = mentionIDs[0];
    if (targetID === senderID) return sendMsg("❌ You cannot send money to yourself!");

    // Parse amount from remaining args
    const amountStr = args.filter(a => !a.startsWith("@")).join("");
    const amount = this.parseBet(amountStr);

    if (isNaN(amount) || amount <= 0) return sendMsg("❌ Invalid transfer amount!");

    try {
      let sender = await BankUser.findOne({ userID: senderID });
      if (!sender || sender.balance < amount) return sendMsg(`❌ Insufficient balance! Your balance: $${sender ? sender.balance.toLocaleString() : 0}`);

      let receiver = await BankUser.findOne({ userID: targetID });
      if (!receiver) receiver = await BankUser.create({ userID: targetID, balance: 0 });

      await BankUser.updateOne({ userID: senderID }, { $inc: { balance: -amount } });
      await BankUser.updateOne({ userID: targetID }, { $inc: { balance: amount } });

      let senderName = senderID, receiverName = mentions[targetID].replace("@", "");
      if (usersData && typeof usersData.getName === "function") {
        try { senderName = await usersData.getName(senderID); } catch (e) {}
      }

      // Canvas Transfer Receipt
      const canvas = createCanvas(800, 420);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0c192c";
      ctx.fillRect(0, 0, 800, 420);

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 770, 390);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText("DI-ABLO BANK • FUNDS TRANSFER RECEIPT", 50, 55);

      // Draw Sender & Receiver Avatars
      const drawAvatar = async (x, y, uid, title) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x, y, 320, 130);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.strokeRect(x, y, 320, 130);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 14px Sans-serif";
        ctx.fillText(title, x + 110, y + 40);

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

      await drawAvatar(50, 90, senderID, "SENDER");
      await drawAvatar(430, 90, targetID, "RECEIVER");

      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText(">>>", 380, 160);

      // Amount Banner
      ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(50, 250, 700, 60);
      ctx.strokeStyle = "#22c55e";
      ctx.strokeRect(50, 250, 700, 60);

      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 22px Sans-serif";
      ctx.fillText("TRANSFERRED SUCCESSFULLY", 70, 288);

      ctx.textAlign = "right";
      ctx.fillText(`+$${this.formatMoney(amount)}`, 730, 288);
      ctx.textAlign = "left";

      ctx.fillStyle = "#64748b";
      ctx.font = "italic 14px Sans-serif";
      ctx.fillText(`FROM: ${senderName}  |  TO: ${receiverName}`, 50, 370);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `pay_${senderID}_${Date.now()}.png`);
      await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

      const payload = {
        body: `💸 [ TRANSFER SUCCESSFUL ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);
    } catch (e) {
      console.error(e);
      return sendMsg("❌ Transfer Error!");
    }
  }
};
