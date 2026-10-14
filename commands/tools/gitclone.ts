import axios from 'axios'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'

export default {
    command: ['gitclone', 'clone', 'git'],
    description: 'Descarga un repo de GitHub en zip',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const reply = (text: string) => sock.sendMessage(chat, { text }, { quoted: m });
        try {
            const url = args[0];
            if (!url) {
                return reply(`📦 *GITCLONE*\n${LINEA}\nUsa » *.gitclone <link de GitHub>*\nEjemplo » *.gitclone https://github.com/usuario/repo*`);
            }

            const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
            if (!match) return reply('❌ Ese link no es de GitHub');

            const user = match[1];
            const repo = match[2].replace(/\.git$/, '');

            // Reacción en vez de mensaje de "descargando": menos texto en el chat
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => null);

            // Info del repo (opcional, si falla solo se omite)
            let info: any = null;
            try {
                const res = await axios.get(`https://api.github.com/repos/${user}/${repo}`, { timeout: 15000 });
                info = res.data;
            } catch {}

            let buffer: any = null;
            let rama = info?.default_branch || 'main';
            for (const branch of [rama, 'main', 'master']) {
                try {
                    const res = await axios.get(`https://github.com/${user}/${repo}/archive/refs/heads/${branch}.zip`, {
                        responseType: 'arraybuffer', timeout: 60000
                    });
                    buffer = res.data;
                    rama = branch;
                    break;
                } catch {}
            }

            if (!buffer) {
                const res = await axios.get(`https://api.github.com/repos/${user}/${repo}/zipball`, {
                    responseType: 'arraybuffer', timeout: 60000
                });
                buffer = res.data;
            }
            if (!buffer) throw new Error('No se pudo descargar el repo');

            const peso = (buffer.length / (1024 * 1024)).toFixed(2);
            const descripcion = info?.description ? String(info.description).slice(0, 120) : 'Sin descripción';
            const caption =
                `📦 *${info?.name || repo}*\n` +
                `${LINEA}\n` +
                `👤 ${user}\n` +
                `⭐ ${info?.stargazers_count ?? 'N/A'}  🍴 ${info?.forks_count ?? 'N/A'}  🌿 ${rama}  💾 ${peso} MB\n` +
                `${LINEA}\n` +
                `> ${descripcion}`;

            await sock.sendMessage(chat, {
                document: Buffer.from(buffer),
                mimetype: 'application/zip',
                fileName: `${repo}.zip`,
                caption
            }, { quoted: m });

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch (e: any) {
            console.error(e);
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            return reply(`❌ No pude descargar el repo\n> ${e?.message || 'Error desconocido'}`);
        }
    }
}
