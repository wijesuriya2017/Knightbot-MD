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

    // We'll fetch several extra endpoints in parallel but fail gracefully if any fail.
    try {
      const ownerRepo = json.full_name; // e.g. "wijesuriya2017/Knightbot-MD"

      const [
        commitRes,
        langsRes,
        pullsRes,
        releaseRes,
        contentsRes,
        topicsRes
      ] = await Promise.all([
        // latest commit
        fetch(`https://api.github.com/repos/${ownerRepo}/commits?per_page=1`).catch(() => null),
        // languages breakdown
        fetch(`https://api.github.com/repos/${ownerRepo}/languages`).catch(() => null),
        // open PRs (fetch up to 100 recent open PRs, count length)
        fetch(`https://api.github.com/repos/${ownerRepo}/pulls?state=open&per_page=100`).catch(() => null),
        // latest release (may 404)
        fetch(`https://api.github.com/repos/${ownerRepo}/releases/latest`).catch(() => null),
        // top-level contents (quick snapshot of files/folders at repo root)
        fetch(`https://api.github.com/repos/${ownerRepo}/contents`).catch(() => null),
        // repo topics (some endpoints require a preview header; try repo endpoint first)
        fetch(`https://api.github.com/repos/${ownerRepo}`, { headers: { 'Accept': 'application/vnd.github+json' } }).catch(() => null)
      ]);

      // Latest commit info
      if (commitRes && commitRes.ok) {
        const commits = await commitRes.json();
        if (Array.isArray(commits) && commits.length) {
          const c = commits[0];
          const msgShort = c.commit && c.commit.message ? c.commit.message.split('\n')[0] : 'No message';
          const author = (c.commit && c.commit.author && c.commit.author.name) ? c.commit.author.name : (c.author && c.author.login) || 'Unknown';
          const date = c.commit && c.commit.author && c.commit.author.date ? c.commit.author.date : null;
          const howLong = date ? moment(date).fromNow() : 'unknown time';
          txt += `🔧 Latest commit: "${msgShort}" — ${author} (${howLong})\n`;
        }
      }

      // Languages breakdown - convert bytes to percentages
      if (langsRes && langsRes.ok) {
        const langs = await langsRes.json();
        const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
        const langParts = Object.entries(langs)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 4) // top 4 languages
          .map(([name, bytes]) => `${name} ${(bytes / totalBytes * 100).toFixed(0)}%`);
        if (langParts.length) {
          txt += `🧩 Languages: ${langParts.join(' • ')}\n`;
        }
      }

      // Open PR count
      if (pullsRes && pullsRes.ok) {
        const pulls = await pullsRes.json();
        if (Array.isArray(pulls)) {
          txt += `🔁 Open PRs: ${pulls.length} (quick snapshot)\n`;
        }
      }

      // Latest release or tag
      let releaseLine = '';
      if (releaseRes && releaseRes.ok) {
        const rel = await releaseRes.json();
        if (rel && rel.tag_name) {
          releaseLine = `🏷️ Latest release: ${rel.tag_name} — ${rel.name || ''}`.trim();
        }
      } else {
        // fallback: try to get latest tag from tags endpoint
        try {
          const tagsRes = await fetch(`https://api.github.com/repos/${ownerRepo}/tags?per_page=1`);
          if (tagsRes && tagsRes.ok) {
            const tags = await tagsRes.json();
            if (Array.isArray(tags) && tags.length) {
              releaseLine = `🏷️ Latest tag: ${tags[0].name}`;
            }
          }
        } catch (e) { /* ignore */ }
      }
      if (releaseLine) txt += `${releaseLine}\n`;

      // Repo topics (if any)
      try {
        // Many repo objects include "topics" only if requested; try topics endpoint or the repo JSON we already have
        let topics = [];
        if (json.topics && Array.isArray(json.topics) && json.topics.length) {
          topics = json.topics;
        } else if (topicsRes && topicsRes.ok) {
          const repoAgain = await topicsRes.json();
          if (repoAgain.topics && Array.isArray(repoAgain.topics)) topics = repoAgain.topics;
        }
        if (topics.length) {
          txt += `🏷️ Topics: ${topics.slice(0,6).join(' · ')}\n`;
        }
      } catch (e) { /* ignore */ }

      // Quick snapshot: top-level file/folder count (root contents)
      if (contentsRes && contentsRes.ok) {
        const contents = await contentsRes.json();
        if (Array.isArray(contents)) {
          const files = contents.length;
          txt += `📁 Top-level items: ${files} (files & folders)\n`;
        }
      }

      // Helpful clone/install hint and quick commands (fun & actionable)
      txt += `\n💡 Quick Tip: Clone → \`git clone ${json.html_url}.git\`\n`;
      txt += `🚀 Try commands: .tagall  |  .tts  |  .sticker  |  .welcome\n`;

      // A playful community mood line
      const moods = ['🌟 Open to contributors', '🔥 Active development', '🤝 Welcomes PRs & ideas', '✨ Community-driven'];
      txt += `\n🔔 Community: ${moods[Math.floor(Math.random() * moods.length)]}\n`;

      // Small decorative badge links (badges will preview on many clients)
      txt += `\n🔗 Badges:\n`;
      txt += `https://img.shields.io/github/v/release/${json.full_name}?style=for-the-badge\n`;
      txt += `https://img.shields.io/github/license/${json.full_name}?style=for-the-badge\n`;
      txt += `https://img.shields.io/github/commit-activity/y/${json.full_name}?style=for-the-badge\n`;

    } catch (extraErr) {
      // If extras fail, don't break anything—just skip extras
      txt += `\n⚠️ Extra info couldn't be fully loaded (API limits or network). Showing basic info only.\n`;
    }

    // Try to fetch top contributors (small, optional block)
    try {
      const contribRes = await fetch(`https://api.github.com/repos/${json.full_name}/contributors?per_page=3`);
      if (contribRes && contribRes.ok) {
        const contributors = await contribRes.json();
        if (Array.isArray(contributors) && contributors.length) {
          txt += `\n👥 Top Contributors:\n`;
          contributors.forEach((c, i) => {
            txt += `${i + 1}. ${c.login} — ${c.contributions} contribs\n`;
          });
        }
      }
    } catch (e) {
      // ignore small contributor errors
    }

    // Use the local asset image (fallback to owner avatar if missing)
    let imgBuffer;
    try {
      const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
      imgBuffer = fs.readFileSync(imgPath);
    } catch {
      try {
        const avatarRes = await fetch(json.owner.avatar_url);
        imgBuffer = await avatarRes.buffer();
      } catch {
        imgBuffer = null; // if everything fails, we'll just send text-only
      }
    }

    if (imgBuffer) {
      await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text: txt }, { quoted: message });
    }

  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = githubCommand;
