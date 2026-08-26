const mongoose = require("mongoose");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

module.exports = {
  config: {
    name: "loan",
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 2,
    role: 0,
    shortDescription: "Take a loan from DI-ABLO Bank",
    category: "economy",
    guide: { en: "{p}loan [amount / 2b]" }
  },

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

  onStart: async function ({ api, event, args, message }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      const amount = this.parseAmount(args[0]);
      if (amount === null || isNaN(amount) || amount <= 0) {
        return sendMsg("❌ ᴜsᴀɢᴇ: #ʟᴏᴀɴ [ᴀᴍᴏᴜɴᴛ / 2ʙ]");
      }

      if (user.loan > 0) {
        return sendMsg("❌ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀɴ ᴜɴᴘᴀɪᴅ ʟᴏᴀɴ. ᴘᴀʏ ɪᴛ ғɪʀsᴛ ᴜsɪɴɢ '#ᴘᴀʏʟᴏᴀɴ'.");
      }

      // Max 2 Billion Limit Check
      const MAX_LOAN = 2000000000;
      if (amount > MAX_LOAN) {
        return sendMsg(`❌ ᴍᴀxɪᴍᴜᴍ ʟᴏᴀɴ ʟɪᴍɪᴛ ɪs $2ʙ (${this.formatMoney(MAX_LOAN)}).`);
      }

      user.loan = Math.floor(amount * 1.1); // 10% interest
      user.balance += amount;
      await user.save();

      return sendMsg(`🏦 ─── [ ʟᴏᴀɴ ᴀᴘᴘʀᴏᴠᴇᴅ ] ─── 🏦\n\n` +
        `💵 ʟᴏᴀɴ ᴀᴍᴏᴜɴᴛ: $${this.formatMoney(amount)}\n` +
        `📈 ᴛᴏᴛᴀʟ ᴅᴜᴇ (10% ɪɴᴛᴇʀᴇsᴛ): $${this.formatMoney(user.loan)}\n` +
        `💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${user.balance.toLocaleString()}`
      );
    } catch (err) {
      console.error(err);
      return sendMsg("❌ ʟᴏᴀɴ sᴇʀᴠɪᴄᴇ ᴇʀʀᴏʀ.");
    }
  }
};
