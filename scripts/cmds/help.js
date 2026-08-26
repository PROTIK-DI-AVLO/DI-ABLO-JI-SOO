const axios = require("axios");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

let xfont = null;
let yfont = null;
let categoryEmoji = null;

async function loadResources() {
  try {
    const [catRes, cmdRes, emojiRes] = await Promise.all([
      axios.get("https://raw.githubusercontent.com/Saim-x69x/sakura/main/xfont.json"),
      axios.get("https://raw.githubusercontent.com/Saim-x69x/sakura/main/yfont.json"),
      axios.get("https://raw.githubusercontent.com/Saim-x69x/sakura/main/category.json")
    ]);
    xfont = catRes.data;
    yfont = cmdRes.data;
    categoryEmoji = emojiRes.data;
  } catch (err) {}
}

function fontConvert(text, type = "command") {
  const fontMap = type === "category" ? xfont : yfont;
  if (!fontMap) return text;
  return text.split("").map(ch => fontMap[ch] || ch).join("");
}

function getCategoryEmoji(cat) {
  return categoryEmoji?.[cat.toLowerCase()] || "🗂️";
}

function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(0).map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function getClosestCommand(name) {
  const lower = name.toLowerCase();
  let best = null, dist = Infinity;
  for (const cmd of commands.keys()) {
    const d = levenshteinDistance(lower, cmd.toLowerCase());
    if (d < dist) {
      dist = d;
      best = cmd;
    }
  }
  return dist <= 3 ? best : null;
}

function roleTextToString(role) {
  switch (role) {
    case 0: return "0 (All Users)";
    case 1: return "1 (Group Admins)";
    case 2: return "2 (VIP Users)";
    case 3: return "3 (Bot Admin)";
    case 4: return "4 (Bot Creator)";
    default: return `${role} (Unknown)`;
  }
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    version: "2.0",
    author: "rocky404",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Shows all commands or details." },
    longDescription: { en: "Display categories, command lists or specific command info." },
    category: "info",
    guide: { en: "{pn}, {pn} [command], {pn} -c [category]" }
  },

  onStart: async function ({ message, args, event, role }) {
    const prefix = getPrefix(event.threadID);

    if (!xfont || !yfont || !categoryEmoji) await loadResources();

    const categories = {};
    for (const [name, cmd] of commands) {
      if (!cmd?.config || typeof cmd.onStart !== "function") continue;
      if (cmd.config.role > role) continue;
      const cat = (cmd.config.category || "UNCATEGORIZED").toUpperCase();
      if (!categories[cat]) categories[cat] = [];
      if (!categories[cat].includes(name)) {
        categories[cat].push(name);
      }
    }

    const helpImage = "https://files.catbox.moe/uoljwh.mp4";
    const input = args.join(" ").trim();

    // 📌 -c [category] দিয়ে নির্দিষ্ট ক্যাটাগরি ফিল্টার করা
    if (args[0] === "-c" && args[1]) {
      const categoryName = args[1].toUpperCase();
      if (!categories[categoryName]) {
        return message.reply(`❌ Category "${categoryName}" not found.`);
      }

      const emoji = getCategoryEmoji(categoryName);
      const list = categories[categoryName].sort();
      const total = list.length;

      let msg = "";
      msg += `╭─────⭓ ${emoji} ${fontConvert(categoryName, "category")}\n`;
      for (let i = 0; i < list.length; i += 3) {
        const cmds = list.slice(i, i + 3).map((item) => `✧${fontConvert(item, "command")}`);
        msg += `│ ${cmds.join("  ")}\n`;
      }
      msg += `╰────────────⭓\n\n`;
      msg += `⭔ Total Commands in this category: ${total}\n`;
      msg += `⭔ Type ${prefix}help <cmd> to see details.\n\n`;
      msg += `╭─✦ ADMIN: Protik 彡\n├‣ WHATSAPP\n╰‣ 01613828497`;

      try {
        const helpMessage = await message.reply({
          body: msg,
          attachment: await global.utils.getStreamFromURL(helpImage)
        });
        setTimeout(() => message.unsend(helpMessage.messageID), 80000);
        return;
      } catch (error) {
        console.error("Help Error:", error);
        return;
      }
    }

    // 📌 শুধু /help দিলে পুরো কমান্ড লিস্ট ডিসপ্লে করা (MahMUD Style)
    if (!input) {
      let msg = "";

      Object.keys(categories).sort().forEach((cat) => {
        const emoji = getCategoryEmoji(cat);
        msg += `\n╭─────⭓ ${emoji} ${fontConvert(cat, "category")}`;
        const names = categories[cat].sort();
        for (let i = 0; i < names.length; i += 3) {
          const cmds = names.slice(i, i + 3).map((item) => `✧${fontConvert(item, "command")}`);
          msg += `\n│ ${cmds.join("  ")}`;
        }
        msg += `\n╰────────────⭓\n`;
      });

      msg += `\n⭔ Total Commands: ${commands.size}\n`;
      msg += `⭔ Type ${prefix}help <cmd> to see details.\n`;
      msg += `\n╭─✦ ADMIN: Protik 彡\n├‣ WHATSAPP\n╰‣ 01613828497`;

      try {
        const helpMessage = await message.reply({
          body: msg,
          attachment: await global.utils.getStreamFromURL(helpImage)
        });
        setTimeout(() => message.unsend(helpMessage.messageID), 80000);
        return;
      } catch (error) {
        console.error("Help Error:", error);
        return;
      }
    }

    // 📌 নির্দিষ্ট কোনো কমান্ডের হেল্প দেখতে গেলে (MahMUD Style Command Info Layout)
    const cmdName = input.toLowerCase();
    const cmd = commands.get(cmdName) || commands.get(aliases.get(cmdName));

    if (!cmd || !cmd.config) {
      const suggestion = getClosestCommand(cmdName);
      return message.reply(
        suggestion
          ? `❌ Command "${cmdName}" not found.\n👉 Maybe you meant: ${suggestion}`
          : `❌ Command "${cmdName}" not found.`
      );
    }

    const c = cmd.config;
    const usage = c.guide?.en?.replace(/{pn}/g, prefix + c.name) || (prefix + c.name);

    const response = 
      `╭─────────⭓\n` +
      `│ 🎀 NAME: ${c.name}\n` +
      `│ 📃 Aliases: ${c.aliases ? (Array.isArray(c.aliases) ? c.aliases.join(", ") : c.aliases) : "None"}\n` +
      `├──‣ INFO\n` +
      `│ 📝 Description: ${c.longDescription?.en || c.shortDescription?.en || "No description."}\n` +
      `│ 👑 Author: ${c.author || "Unknown"}\n` +
      `│ 📚 Guide: ${usage}\n` +
      `├──‣ Details\n` +
      `│ ⭐ Version: ${c.version || "1.0"}\n` +
      `│ ♻️ Role: ${roleTextToString(c.role)}\n` +
      `╰────────────⭓`;

    try {
      const helpMessage = await message.reply(response);
      setTimeout(() => message.unsend(helpMessage.messageID), 80000);
    } catch (error) {
      console.error("Help Detail Error:", error);
    }
  }
};
