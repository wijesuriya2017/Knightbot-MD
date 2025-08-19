const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    const res = await fetch('https://api.github.com/repos/wijesuriya2017/Knightbot-MD');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = `*乂  Knight Bot MD  乂*\n\n`;
    txt += `✩  *Name* : ${json.name}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n`;
    txt += `✩  *Developer* : Navida Wijesuriya\n`;
    txt += `✩  *Features* : Auto-Reply, Group Tools, Fun Commands\n`;
    txt += `✩  *Status* : 🚀 Live and Improving\n\n`;
    txt += `💥 *KnightBot MD*`;

    // --- EXTRA ITEMS (new, without replacing old ones) ---
    txt += `\n\n✨ *Extra Info* ✨\n`;
    txt += `⭐ Stars: ${json.stargazers_count}\n`;
    txt += `🍴 Forks: ${json.forks_count}\n`;
    txt += `🐞 Issues: ${json.open_issues_count}\n`;

    // Random extra status line
    const statuses = ["⚡ Active & Growing", "🔥 Stable Release", "🌟 Community Driven"];
    txt += `🎯 More Status: ${statuses[Math.floor(Math.random() * statuses.length)]}\n`;

    // GitHub badges
    txt += `\n🔗 *Badges*:\n`;
    txt += `https://img.shields.io/github/stars/${json.full_name}?style=for-the-badge\n`;
    txt += `https://img.shields.io/github/forks/${json.full_name}?style=for-the-badge\n`;
    txt += `https://img.shields.io/github/issues/${json.full_name}?style=for-the-badge\n`;

    // Try to fetch top contributors
    try {
      const contribRes = await fetch(`https://api.github.com/repos/${json.full_name}/contributors?per_page=3`);
      const contributors = await contribRes.json();
      if (Array.isArray(contributors) && contributors.length) {
        txt += `\n👥 *Top Contributors*:\n`;
        contributors.forEach((c, i) => {
          txt += `${i + 1}. ${c.login}\n`;
        });
      }
    } catch {}

    // Use the local asset image (fallback to owner avatar if missing)
    let imgBuffer;
    try {
      const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
      imgBuffer = fs.readFileSync(imgPath);
    } catch {
      const avatarRes = await fetch(json.owner.avatar_url);
      imgBuffer = await avatarRes.buffer();
    }

    await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = githubCommand;
