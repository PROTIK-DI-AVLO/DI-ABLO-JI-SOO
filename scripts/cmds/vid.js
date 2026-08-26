const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "vid",
    aliases: ["randomvid", "viralvid"],
    version: "2.0.1",
    author: "Pratik Shah",
    countDown: 10,
    role: 0,
    shortDescription: "Scrape and send random video from website",
    category: "entertainment",
    guide: { en: "{p}vid" }
  },

  onStart: async function ({ api, event, message }) {
    const sendMsg = (txt) => message && typeof message.reply === "function" ? message.reply(txt) : api.sendMessage(txt, event.threadID, event.messageID);

    try {
      sendMsg("🔍 Fetching video, please wait...");

      const targetUrl = "https://desibabe.to/category/viral-c894a3-5b987ee/10";
      
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      };

      const { data: html } = await axios.get(targetUrl, { headers });
      const $ = cheerio.load(html);

      const videoLinks = [];
      
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && (href.includes("video") || href.includes("post") || href.length > 30)) {
          const fullLink = href.startsWith("http") ? href : `https://desibabe.to${href}`;
          if (!videoLinks.includes(fullLink)) {
            videoLinks.push(fullLink);
          }
        }
      });

      if (videoLinks.length === 0) {
        return sendMsg("❌ No video links found! The site might be blocking requests.");
      }

      const randomPostUrl = videoLinks[Math.floor(Math.random() * videoLinks.length)];

      const { data: postHtml } = await axios.get(randomPostUrl, { headers });
      const $$ = cheerio.load(postHtml);

      let directVideoUrl = "";
      
      $$("video source, video, iframe").each((i, el) => {
        const src = $$(el).attr("src") || $$(el).attr("data-src");
        if (src && (src.includes(".mp4") || src.includes("embed"))) {
          directVideoUrl = src.startsWith("http") ? src : `https://desibabe.to${src}`;
        }
      });

      if (!directVideoUrl) {
        return sendMsg(`⚠️ Post link found, but could not fetch direct video file!\n🔗 Link: ${randomPostUrl}`);
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `scraped_vid_${Date.now()}.mp4`);

      const videoStream = await axios({
        method: 'GET',
        url: directVideoUrl,
        responseType: 'stream',
        headers
      });

      const writer = fs.createWriteStream(cachePath);
      videoStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const payload = {
        body: `🎬 [ VIRAL VIDEO FROM WEB ]`,
        attachment: fs.createReadStream(cachePath)
      };

      const sendCallback = () => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); };
      
      return message && typeof message.reply === "function" ? message.reply(payload, sendCallback) : api.sendMessage(payload, event.threadID, sendCallback, event.messageID);

    } catch (err) {
      console.error(err);
      return sendMsg("❌ Scraping error occurred! The website might be protected by Cloudflare or the link has changed.");
    }
  }
};
