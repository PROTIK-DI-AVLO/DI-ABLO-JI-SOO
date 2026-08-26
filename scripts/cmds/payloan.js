const mongoose = require("mongoose");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

module.exports = {
  config: {
    name: "payloan",
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 2,
    role: 0,
    shortDescription: "Pay your active loan in DI-ABLO Bank",
    category: "economy",
    guide: { en: "{p}payloan" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "ʙ";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "ᴍ";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "ᴋ";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      if (user.loan <= 0) {
        return sendMsg("❌ ʏᴏᴜ ᴅᴏ ɴᴏᴛ ʜᴀᴠᴇ ᴀɴʏ ᴀᴄᴛɪᴠᴇ ʟᴏᴀɴs.");
      }

      if (user.balance < user.loan) {
        return sendMsg(`❌ ɪɴsᴜғғɪᴄɪᴇɴᴛ ʙᴀʟᴀɴᴄᴇ ᴛᴏ ᴘᴀʏ ʟᴏᴀɴ ᴏғ $${this.formatMoney(user.loan)}.`);
      }

      user.balance -= user.loan;
      const paidAmount = user.loan;
      user.loan = 0;
      await user.save();

      return sendMsg(`✅ ─── [ ʟᴏᴀɴ ᴄʟᴇᴀʀᴇᴅ ] ─── ✅\n\n` +
        `💵 ᴘᴀɪᴅ ᴀᴍᴏᴜɴᴛ: $${this.formatMoney(paidAmount)}\n` +
        `🏦 ʀᴇᴍᴀɪɴɪɴɢ ʟᴏᴀɴ: $0\n` +
        `💰 ᴄᴜʀʀᴇɴᴛ ʙᴀʟᴀɴᴄᴇ: $${user.balance.toLocaleString()}`
      );
    } catch (err) {
      console.error(err);
      return sendMsg("❌ ᴘᴀʏʟᴏᴀɴ sᴇʀᴠɪᴄᴇ ᴇʀʀᴏʀ.");
    }
  }
};
