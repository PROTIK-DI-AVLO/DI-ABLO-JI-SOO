const mongoose = require("mongoose");

const bankUserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  quizStats: {
    wins: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
});

const BankUser = mongoose.models.DiabloBankUser || mongoose.model("DiabloBankUser", bankUserSchema);

module.exports = {
  config: {
    name: "qz",
    aliases: ["quiz", "question"],
    version: "13.0",
    author: "Pratik Shah",
    countDown: 5,
    role: 0,
    shortDescription: "Answer MCQ quiz questions to win $500M",
    category: "game",
    guide: { en: "{p}qz" }
  },

  formatMoney: function (num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "ʙ";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "ᴍ";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "ᴋ";
    return num.toLocaleString();
  },

  onStart: async function ({ api, event, message, commandName }) {
    const senderID = event.senderID;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    const quizData = [
      { q: "What is the process of encrypting and decrypting data called?", options: ["Cryptography", "Cryptology", "Encryptography", "Decryptography"], correctIndex: 0, category: "ICT" },
      { q: "What is Superman's real birth/Earth name?", options: ["Bruce Wayne", "Clark Kent", "Peter Parker", "Barry Allen"], correctIndex: 1, category: "DC Universe" },
      { q: "Which country does Cristiano Ronaldo play for internationally?", options: ["Spain", "Argentina", "Portugal", "Brazil"], correctIndex: 2, category: "Sports" },
      { q: "Which part is known as the brain of a computer?", options: ["RAM", "ROM", "Hard Disk", "CPU"], correctIndex: 3, category: "ICT" },
      { q: "What is the nickname of the Japan National Football Team?", options: ["Samurai Blue", "Red Devils", "La Roja", "The Blues"], correctIndex: 0, category: "Sports" },
      { q: "What is the name of Superman's home planet?", options: ["Asgard", "Krypton", "Gotham", "Metropolis"], correctIndex: 1, category: "DC Universe" },
      { q: "Which base-2 numeral system is used in digital computers?", options: ["Octal", "Hexadecimal", "Binary", "Decimal"], correctIndex: 2, category: "ICT" },
      { q: "In which city is the famous Louvre Museum located?", options: ["London", "New York", "Rome", "Paris"], correctIndex: 3, category: "General Knowledge" },
      { q: "In which year was Bitcoin officially launched?", options: ["2009", "2010", "2008", "2012"], correctIndex: 0, category: "Crypto" },
      { q: "Who is the only batter to score 400 runs in a single Test inning?", options: ["Sachin Tendulkar", "Brian Lara", "Ricky Ponting", "Don Bradman"], correctIndex: 1, category: "Sports" },
      { q: "What is the hardest naturally occurring substance on Earth?", options: ["Gold", "Platinum", "Diamond", "Iron"], correctIndex: 2, category: "Science" },
      { q: "Which is the largest planet in our solar system?", options: ["Mars", "Earth", "Saturn", "Jupiter"], correctIndex: 3, category: "Science" },
      { q: "Who is the co-founder/creator of Ethereum?", options: ["Vitalik Buterin", "Satoshi Nakamoto", "Charles Hoskinson", "Gavin Wood"], correctIndex: 0, category: "Crypto" },
      { q: "Who is the archenemy of Superman?", options: ["Joker", "Lex Luthor", "Darkseid", "General Zod"], correctIndex: 1, category: "DC Universe" },
      { q: "Who holds the record for the most goals in FIFA World Cup history?", options: ["Pele", "Maradona", "Miroslav Klose", "Cristiano Ronaldo"], correctIndex: 2, category: "Sports" },
      { q: "What does IP stand for in computer networking?", options: ["Internal Protocol", "Internet Process", "Information Protocol", "Internet Protocol"], correctIndex: 3, category: "ICT" },
      { q: "How many times has Japan won the AFC Asian Cup title?", options: ["4 Times", "3 Times", "2 Times", "5 Times"], correctIndex: 0, category: "Sports" },
      { q: "What is the national bird of Bangladesh?", options: ["Myna", "Magpie Robin (Doel)", "Cuckoo", "Shama"], correctIndex: 1, category: "Bangladesh" },
      { q: "Which country hosted the FIFA World Cup 2022?", options: ["Brazil", "Russia", "Qatar", "Germany"], correctIndex: 2, category: "Sports" },
      { q: "What is the length of the Padma Bridge in kilometers?", options: ["5.15 km", "7.15 km", "4.15 km", "6.15 km"], correctIndex: 3, category: "Bangladesh" },
      { q: "Who scored the first triple century in Test cricket history?", options: ["Andy Sandham", "Don Bradman", "Garry Sobers", "Hanif Mohammad"], correctIndex: 0, category: "Sports" },
      { q: "What is Batman's real identity?", options: ["Clark Kent", "Bruce Wayne", "Oliver Queen", "Arthur Curry"], correctIndex: 1, category: "DC Universe" },
      { q: "Which weather phenomenon is known for the highest spinning wind speed?", options: ["Typhoon", "Cyclone", "Tornado", "Hurricane"], correctIndex: 2, category: "Weather" },
      { q: "In which country was Garena (publisher of Free Fire) founded?", options: ["South Korea", "Japan", "China", "Singapore"], correctIndex: 3, category: "Gaming" },
      { q: "In which year did the Bangladesh Liberation War take place?", options: ["1971", "1952", "1969", "1990"], correctIndex: 0, category: "History" },
      { q: "Which two teams played in the first official international football match?", options: ["England vs Brazil", "Scotland vs England", "Argentina vs Uruguay", "Italy vs France"], correctIndex: 1, category: "Sports History" },
      { q: "On which planet does the Sun rise in the west and set in the east?", options: ["Mars", "Mercury", "Venus", "Jupiter"], correctIndex: 2, category: "Science" },
      { q: "Which is the smallest continent by land area?", options: ["Asia", "Africa", "Europe", "Oceania / Australia"], correctIndex: 3, category: "Geography" },
      { q: "Who portrayed Wonder Woman in the DC Extended Universe (DCEU)?", options: ["Gal Gadot", "Margot Robbie", "Amber Heard", "Amy Adams"], correctIndex: 0, category: "Movies" },
      { q: "How many bones are in an adult human body?", options: ["208", "206", "300", "201"], correctIndex: 1, category: "Science" },
      { q: "What is it called when a player scores 5 goals in a single football match?", options: ["Hat-trick", "Poker", "Repoker / Glut", "Brace"], correctIndex: 2, category: "Sports" },
      { q: "Which processor architecture is standard for Windows 11 Pro?", options: ["x86", "ARM32", "x32", "x64 / ARM64"], correctIndex: 3, category: "Tech" },
      { q: "Which is the longest river in Asia?", options: ["Yangtze", "Ganges", "Mekong", "Indus"], correctIndex: 0, category: "Geography" },
      { q: "Hong Kong is a Special Administrative Region of which country?", options: ["Japan", "China", "Taiwan", "South Korea"], correctIndex: 1, category: "General Knowledge" },
      { q: "Which is the largest mangrove forest in the world?", options: ["Amazon", "African Rainforest", "Sundarbans", "Congo Basin"], correctIndex: 2, category: "Bangladesh" },
      { q: "Who is widely regarded as one of the principal fathers of the Internet?", options: ["Tim Berners-Lee", "Bill Gates", "Steve Jobs", "Vint Cerf"], correctIndex: 3, category: "Tech" },
      { q: "In which year was the first FIFA World Cup held?", options: ["1930", "1934", "1950", "1928"], correctIndex: 0, category: "Sports" },
      { q: "In which comic book issue did Superman make his first appearance?", options: ["Detective Comics #27", "Action Comics #1", "Superman #1", "Justice League #1"], correctIndex: 1, category: "DC Universe" },
      { q: "What is the core underlying technology behind cryptocurrencies?", options: ["Central Server", "Cloud Database", "Decentralized Ledger", "Local Memory"], correctIndex: 2, category: "Crypto" },
      { q: "Which publication is famously known as the 'Bible of Cricket'?", options: ["Cricinfo", "Sports Illustrated", "The Athletic", "Wisden"], correctIndex: 3, category: "Sports" },
      { q: "In which year did the Titanic sink?", options: ["1912", "1914", "1905", "1920"], correctIndex: 0, category: "History" },
      { q: "Deficiency of which vitamin causes night blindness?", options: ["Vitamin B", "Vitamin A", "Vitamin C", "Vitamin D"], correctIndex: 1, category: "Science" },
      { q: "Which studio developed the game Garena Free Fire?", options: ["Tencent", "Krafton", "111dots Studio", "Epic Games"], correctIndex: 2, category: "Gaming" },
      { q: "Which country has won the most FIFA World Cup titles?", options: ["Germany", "Italy", "Argentina", "Brazil"], correctIndex: 3, category: "Sports" },
      { q: "Which company developed the game Clash of Clans?", options: ["Supercell", "Riot Games", "Ubisoft", "EA Sports"], correctIndex: 0, category: "Gaming" },
      { q: "Which country is popularly known as the 'Land of the Rising Sun'?", options: ["China", "Japan", "Norway", "Thailand"], correctIndex: 1, category: "General Knowledge" },
      { q: "Against which nation did Cristiano Ronaldo score his first international goal?", options: ["Spain", "Netherlands", "Greece", "England"], correctIndex: 2, category: "Sports" },
      { q: "Which is the fastest memory in a computer system?", options: ["RAM", "ROM", "HDD", "Cache Memory"], correctIndex: 3, category: "Tech" },
      { q: "What is the calm region at the center of a cyclone called?", options: ["Eye of the Storm", "Core", "Center Zone", "Vortex"], correctIndex: 0, category: "Weather" },
      { q: "In which year was the first international T20 match played?", options: ["2007", "2005", "2003", "2010"], correctIndex: 1, category: "Sports" }
    ];

    const randomQuiz = quizData[Math.floor(Math.random() * quizData.length)];
    const rewardMoney = 500000000; // Fixed Quiz Reward: $500 Million
    const optionLabels = ["A", "B", "C", "D"];
    const correctAnswerLetter = optionLabels[randomQuiz.correctIndex];
    const correctAnswerText = randomQuiz.options[randomQuiz.correctIndex];

    const quizBox = 
      `✨ ─── [ ʙʀᴀɪɴ ǫᴜɪᴢ ] ─── ✨\n\n` +
      `❓ ǫᴜᴇsᴛɪᴏɴ: ${randomQuiz.q}\n\n` +
      `🅰️ ${randomQuiz.options[0]}\n` +
      `🅱️ ${randomQuiz.options[1]}\n` +
      `🅲️ ${randomQuiz.options[2]}\n` +
      `🅳️ ${randomQuiz.options[3]}\n\n` +
      `🏷️ ᴄᴀᴛᴇɢᴏʀʏ: ${randomQuiz.category}\n` +
      `🎁 ʀᴇᴡᴀʀᴅ: $500ᴍ\n` +
      `⏳ ᴛɪᴍᴇ: 30 sᴇᴄᴏɴᴅs\n\n` +
      `💬 ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ, ʙ, ᴄ, ᴏʀ ᴅ ᴛᴏ ᴄʟᴀɪᴍ, ʙᴀʙʏ.`;

    const sentMessage = await sendMsg(quizBox);

    const timerID = setTimeout(() => {
      if (global.GoatBot.onReply.has(sentMessage.messageID)) {
        global.GoatBot.onReply.delete(sentMessage.messageID);
        sendMsg(`⌛ ᴛɪᴍᴇ ɪs ᴜᴘ, ʙᴀʙʏ!\n💡 ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ: [ ${correctAnswerLetter} ] ${correctAnswerText}`);
      }
    }, 30000);

    global.GoatBot.onReply.set(sentMessage.messageID, {
      commandName: commandName,
      author: senderID,
      correctLetter: correctAnswerLetter,
      correctText: correctAnswerText.toLowerCase(),
      reward: rewardMoney,
      timerID: timerID
    });
  },

  onReply: async function ({ api, event, message, Reply }) {
    const { senderID, body } = event;
    const { correctLetter, correctText, reward, author, timerID } = Reply;
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    if (senderID !== author) {
      return sendMsg("❌ ʙᴀʙʏ, ᴛʜɪs ɪs ɴᴏᴛ ʏᴏᴜʀ ǫᴜɪᴢ! ᴛʏᴘᴇ #ǫᴢ ᴛᴏ sᴛᴀʀᴛ ʏᴏᴜʀ ᴏᴡɴ.");
    }

    clearTimeout(timerID);

    const userInput = body.trim().toLowerCase();
    const isCorrect = (userInput === correctLetter.toLowerCase()) || (userInput === correctText);

    let user = await BankUser.findOne({ userID: senderID });
    if (!user) user = await BankUser.create({ userID: senderID, balance: 1000 });

    if (!user.quizStats) {
      user.quizStats = { wins: 0, total: 0 };
    }

    user.quizStats.total += 1;

    if (isCorrect) {
      user.quizStats.wins += 1;
      const newBalance = user.balance + reward;
      
      await BankUser.updateOne(
        { userID: senderID },
        { 
          $set: { balance: newBalance },
          $inc: { "quizStats.wins": 1, "quizStats.total": 1 }
        }
      );

      global.GoatBot.onReply.delete(Reply.messageID);

      const winRate = ((user.quizStats.wins / user.quizStats.total) * 100).toFixed(1);

      const response = 
        `✨ ─── [ ʙʀᴀɪɴ ǫᴜɪᴢ ] ─── ✨\n\n` +
        `✅ ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ, ʙᴀʙʏ!\n` +
        `🎯 ᴄʜᴏɪᴄᴇ: [ ${correctLetter} ]\n` +
        `🎁 ʏᴏᴜ ᴡᴏɴ: $${this.formatMoney(reward)}\n\n` +
        `📊 ᴡɪɴ ʀᴀᴛᴇ: ${winRate}% (${user.quizStats.wins}/${user.quizStats.total})\n` +
        `💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: $${newBalance.toLocaleString()}`;

      return sendMsg(response);
    } else {
      await BankUser.updateOne(
        { userID: senderID },
        { $inc: { "quizStats.total": 1 } }
      );
      
      global.GoatBot.onReply.delete(Reply.messageID);

      const response = 
        `✨ ─── [ ʙʀᴀɪɴ ǫᴜɪᴢ ] ─── ✨\n\n` +
        `💔 ᴡʀᴏɴɢ ᴀɴsᴡᴇʀ, ʙᴀʙʏ!\n` +
        `💡 ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ: [ ${correctLetter} ]`;

      return sendMsg(response);
    }
  }
};
