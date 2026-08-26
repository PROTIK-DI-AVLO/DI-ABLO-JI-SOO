const mongoose = require("mongoose");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

module.exports = {
  config: {
    name: "cutbal",
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 2,
    role: 2,
    shortDescription: "Deduct user balance (Admin Only)",
    category: "economy",
    guide: { en: "{p}cutbal [@user / reply] [amount]" }
  },

  adminUIDs: ["61591412309835"], // Replace with your Facebook UID
  adminName: "ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ",

  parseAmount: function (str) {
    if (!str) return null;
    str = str.toLowerCase().trim();

    const match = str.match(/^(\d+(\.\d+)?)\s*([kmb])?$/);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const unit = match[3];

    if (unit === "k") value *= 1000;
    else if (unit === "m") value *= 1000000;
    else if (unit === "b") value *= 1000000000;

    return Math.floor(value);
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "ʙ";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "ᴍ";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "ᴋ";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    if (!this.adminUIDs.includes(senderID)) {
      return sendMsg("❌ ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ. ᴏɴʟʏ ᴀᴅᴍɪɴɪsᴛʀᴀᴛᴏʀ ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ ᴄᴀɴ ᴄᴜᴛ ʙᴀʟᴀɴᴄᴇ.");
    }

    let targetID = senderID;
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    const amount = this.parseAmount(args[args.length - 1]);
    if (amount === null || isNaN(amount) || amount <= 0) {
      return sendMsg("❌ ᴜsᴀɢᴇ: #ᴄᴜᴛʙᴀʟ [@ᴜsᴇʀ / ʀᴇᴘʟʏ] [ᴀᴍᴏᴜɴᴛ]");
    }

    try {
      let targetUser = await BankUser.findOne({ userID: targetID });
      if (!targetUser) targetUser = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });

      targetUser.balance = Math.max(0, targetUser.balance - amount);
      await targetUser.save();

      const targetName = await usersData.getName(targetID);

      return sendMsg(`⚠️ ─── [ ᴅɪ-ᴀʙʟᴏ ʙᴀɴᴋ ] ─── ⚠️\n\n` +
        `👤 ᴀᴅᴍɪɴ: ${this.adminName}\n` +
        `🔻 ᴅᴇʙɪᴛᴇᴅ: -$${this.formatMoney(amount)}\n` +
        `🎯 ᴛᴀʀɢᴇᴛ ᴜsᴇʀ: ${targetName}\n` +
        `💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${targetUser.balance.toLocaleString()}`
      );
    } catch (err) {
      console.error(err);
      return sendMsg("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴄᴜᴛ ʙᴀʟᴀɴᴄᴇ.");
    }
  }
};
