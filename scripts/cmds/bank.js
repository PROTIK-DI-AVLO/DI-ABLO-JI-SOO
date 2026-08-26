const mongoose = require("mongoose");
const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  loan: { type: Number, default: 0 }
}));

const MAX_LOAN_LIMIT = 500000000; // 5 Million Maximum Loan Limit

module.exports = {
  config: {
    name: "bank",
    aliases: ["loan"],
    version: "1.0.0",
    author: "DI-ABLO JI-SOO",
    countDown: 5,
    role: 0,
    shortDescription: "DI-ABLO Bank account and loan management",
    category: "economy",
    guide: { en: "{p}bank | {p}bank loan <amount> | {p}bank pay <amount>" }
  },

  parseAmount: function (str, maxVal) {
    if (!str) return null;
    str = str.toLowerCase().trim();
    if (str === "all") return maxVal;

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
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    try {
      let user = await BankUser.findOne({ userID: senderID });
      if (!user) user = await BankUser.create({ userID: senderID, balance: 1000, loan: 0 });

      const action = args[0]?.toLowerCase();

      // Take Loan Logic
      if (action === "loan" || action === "borrow") {
        const amount = this.parseAmount(args[1], MAX_LOAN_LIMIT - user.loan);
        if (!amount || amount <= 0) {
          return sendMsg("❌ Please specify a valid loan amount!\nExample: #bank loan 500k");
        }

        if (user.loan + amount > MAX_LOAN_LIMIT) {
          return sendMsg(`❌ Loan limit exceeded! Maximum allowed loan limit is $${this.formatMoney(MAX_LOAN_LIMIT)}.`);
        }

        user.balance += amount;
        user.loan += amount;
        await user.save();

        return sendMsg(`✅ **LOAN APPROVED!**\n💰 You received $${this.formatMoney(amount)} in your balance.\n💳 Current Loan: $${this.formatMoney(user.loan)}`);
      }

      // Repay Loan Logic
      if (action === "pay" || action === "repay") {
        if (user.loan <= 0) {
          return sendMsg("❌ You don't have any active loan to pay back!");
        }

        const amount = this.parseAmount(args[1], Math.min(user.balance, user.loan));
        if (!amount || amount <= 0) {
          return sendMsg("❌ Please specify a valid repayment amount!\nExample: #bank pay 200k");
        }

        if (user.balance < amount) {
          return sendMsg(`❌ Insufficient balance to pay $${this.formatMoney(amount)}! You only have $${user.balance.toLocaleString()}.`);
        }

        const payAmount = Math.min(amount, user.loan);
        user.balance -= payAmount;
        user.loan -= payAmount;
        await user.save();

        return sendMsg(`✅ **REPAYMENT SUCCESSFUL!**\n💸 Paid: $${this.formatMoney(payAmount)}\n💳 Remaining Loan: $${this.formatMoney(user.loan)}\n💰 New Balance: $${this.formatMoney(user.balance)}`);
      }

      // Default Canvas Statement Display
      const userName = await usersData.getName(senderID);
      const canvas = createCanvas(800, 480);
      const ctx = canvas.getContext("2d");

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 480);
      gradient.addColorStop(0, "#0b0c10");
      gradient.addColorStop(0.5, "#1f2833");
      gradient.addColorStop(1, "#0b0c10");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // Border Glow
      ctx.strokeStyle = "#66fcf1";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 440);

      // Header
      ctx.fillStyle = "#66fcf1";
      ctx.font = "bold 34px Sans-serif";
      ctx.fillText("🏛️ DI-ABLO BANK STATEMENT", 50, 75);

      ctx.strokeStyle = "rgba(102, 252, 241, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 95);
      ctx.lineTo(750, 95);
      ctx.stroke();

      // User Information
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Sans-serif";
      ctx.fillText(`ACCOUNT HOLDER: ${userName.toUpperCase()}`, 50, 150);

      ctx.fillStyle = "#c5c6c7";
      ctx.font = "20px Sans-serif";
      ctx.fillText(`ACCOUNT ID: ${senderID}`, 50, 190);

      // Balance & Loan Display Boxes
      ctx.fillStyle = "rgba(46, 204, 113, 0.1)";
      ctx.fillRect(50, 230, 330, 110);
      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 230, 330, 110);

      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("CURRENT BALANCE", 70, 265);
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText(`$${this.formatMoney(user.balance)}`, 70, 310);

      ctx.fillStyle = "rgba(231, 76, 60, 0.1)";
      ctx.fillRect(420, 230, 330, 110);
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.strokeRect(420, 230, 330, 110);

      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 18px Sans-serif";
      ctx.fillText("ACTIVE LOAN", 440, 265);
      ctx.font = "bold 28px Sans-serif";
      ctx.fillText(`$${this.formatMoney(user.loan)}`, 440, 310);

      // Footer Instructions
      ctx.fillStyle = "#888888";
      ctx.font = "italic 16px Sans-serif";
      ctx.fillText("Use: #bank loan <amount> to take a loan | #bank pay <amount> to pay back", 50, 420);

      // Save and Send Image
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `bank_${senderID}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      const msgObj = {
        body: `🏛️ **[ DI-ABLO BANK ACCOUNT ]**`,
        attachment: fs.createReadStream(cachePath)
      };

      return api.sendMessage(msgObj, event.threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Failed to process bank system!");
    }
  }
};
