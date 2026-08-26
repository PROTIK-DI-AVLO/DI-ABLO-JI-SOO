const mongoose = require("mongoose");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

module.exports = {
  config: {
    name: "addbal",
    version: "1.2.0",
    author: "Pratik Shah",
    countDown: 2,
    role: 2,
    shortDescription: "Add balance to user (Admin Only)",
    category: "economy",
    guide: { en: "{p}addbal [@user / reply] [amount / 100b / all]" }
  },

  adminUIDs: ["61591412309835"], // Replace with your Facebook UID
  adminName: "ᴅɪ-ᴀʙʟᴏ ᴊɪ-sᴏᴏ",

  parseAmount: function (input) {
    if (!input) return NaN;
    const lower = input.toLowerCase().trim();
    if (lower.endsWith("k")) return parseFloat(lower) * 1000;
    if (lower.endsWith("m")) return parseFloat(lower) * 1000000;
    if (lower.endsWith("b")) return parseFloat(lower) * 1000000000;
    return parseInt(input);
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    if (!this.adminUIDs.includes(senderID)) {
      return sendMsg("❌ ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ. ᴏɴʟʏ ᴀᴅᴍɪɴɪsᴛʀᴀᴛᴏʀ ᴅɪ-ᴀʙʟᴏ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.");
    }

    let targetID = senderID;
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    const rawAmount = args[args.length - 1];
    const amount = this.parseAmount(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return sendMsg("❌ ᴜsᴀɢᴇ: {p}ᴀᴅᴅʙᴀʟ [@ᴜsᴇʀ / ʀᴇᴘʟʏ] [ᴀᴍᴏᴜɴᴛ / 100ʙ]");
    }

    try {
      let user = await BankUser.findOne({ userID: targetID });
      if (!user) {
        user = await BankUser.create({ userID: targetID, balance: 1000, loan: 0 });
      }

      user.balance += amount;
      await user.save();

      let targetName = targetID;
      if (usersData && typeof usersData.getName === "function") {
        try {
          targetName = await usersData.getName(targetID);
        } catch (e) {
          targetName = targetID;
        }
      }

      return sendMsg(`✅ ─── [ ᴅɪ-ᴀʙʟᴏ ʙᴀɴᴋ ] ─── ✅\n\n` +
        `👤 ᴀᴅᴍɪɴ: ${this.adminName}\n` +
        `💳 ᴄʀᴇᴅɪᴛᴇᴅ: +$${amount.toLocaleString()}\n` +
        `🎯 ᴛᴀʀɢᴇᴛ ᴜsᴇʀ: ${targetName}\n` +
        `💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${user.balance.toLocaleString()}`
      );
    } catch (err) {
      console.error(err);
      return sendMsg("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴀᴅᴅ ʙᴀʟᴀɴᴄᴇ.");
    }
  }
};
