import axios from 'axios'

export default {
    command: ['gitclone', 'clone', 'git'],
    description: 'Descarga un repo de github en zip',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            let url = args[0];
            if (!url) {
                return await sock.sendMessage(chat, {
                    text:
`╭─ *🌟 GITCLONE* ─
│ ❌ Pon el link del repo
│
│ ✦ Ejemplo:
│.gitclone https://github.com/usuario/repo
╰──────────────`
                }, { quoted: m });
            }

            if (!url.includes('github.com')) return sock.sendMessage(chat, { text: `❌ Solo links de github` }, { quoted: m });

            let regex = /github\.com\/([^\/]+)\/([^\/\s]+)/;
            let match = url.match(regex);
            if (!match) return sock.sendMessage(chat, { text: `❌ Link inválido bro` }, { quoted: m });

            let user = match[1];
            let repo = match[2].replace('.git', '');

            // Info bonita del repo
            let repoInfo = null;
            try {
                let infoRes = await axios.get(`https://api.github.com/repos/${user}/${repo}`);
                repoInfo = infoRes.data;
            } catch {}

            await sock.sendMessage(chat, { text: `⏳ Descargando *${repo}*...` }, { quoted: m });

            const branches = ['main', 'master'];
            let buffer = null;
            let branchUsed = 'main';

            for (let branch of branches) {
                try {
                    let zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/${branch}.zip`;
                    let res = await axios.get(zipUrl, { responseType: 'arraybuffer' });
                    buffer = res.data;
                    branchUsed = branch;
                    break;
                } catch {}
            }

            if (!buffer) {
                let zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
                let res = await axios.get(zipUrl, { responseType: 'arraybuffer' });
                buffer = res.data;
            }

            if (!buffer) throw new Error('No se pudo descargar');

            let fileName = `${repo}.zip`;
            let sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            let caption =
`╭─ *📦 REPO DESCARGADO* ─
│ 🆔 *Repo:* ${user}/${repo}
│ 📛 *Nombre:* ${repoInfo?.name || repo}
│ ⭐ *Stars:* ${repoInfo?.stargazers_count || 'N/A'}
│ 🍴 *Forks:* ${repoInfo?.forks_count || 'N/A'}
│ 📂 *Branch:* ${branchUsed}
│ 📏 *Peso:* ${sizeMB} MB
│ 🔗 *Url:* ${repoInfo?.html_url || url}
╰──────────────

> ${repoInfo?.description || 'Sin descripción 😅'}`;

            await sock.sendMessage(chat, {
                document: Buffer.from(buffer),
                mimetype: 'application/zip',
                fileName: fileName,
                caption: caption
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            return sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: m });
        }
    }
}