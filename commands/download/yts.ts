import fetch from 'node-fetch';

export default {
    command: ['yts', 'ytsearch'],
    category: 'download',
    description: 'Busca en YouTube con botón Siguiente',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';

        let page = 1;
        let qRaw = args.join(' ');

        // Detecta pagina:.yts ozuna --page 2
        if (qRaw.includes('--page')) {
            const parts = qRaw.split('--page');
            qRaw = parts[0].trim();
            page = parseInt(parts[1].trim()) || 1;
        }

        const q = qRaw;
        if (!q) return sock.sendMessage(chat, { text: `Usa: ${p}yts Ozuna` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });

            const apikey = 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';
            let url = `https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&q=${encodeURIComponent(q)}`;
            let res = await fetch(url).then(r => r.json());

            if (!res?.result?.results?.length) {
                url = `https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&query=${encodeURIComponent(q)}`;
                res = await fetch(url).then(r => r.json());
            }

            if (!res?.status ||!res.result?.results?.length) {
                return sock.sendMessage(chat, { text: `❌ No encontré nada para: ${q}` }, { quoted: msg });
            }

            const all = res.result.results;
            const perPage = 3;
            const start = (page - 1) * perPage;
            const results = all.slice(start, start + perPage);

            if (!results.length) {
                return sock.sendMessage(chat, { text: `❌ No hay más resultados para: ${q}` }, { quoted: msg });
            }

            let txt = `🔍 *${res.result.query}* - Pag ${page}\n────────────────\n\n`;
            results.forEach((v,i)=>{
                const num = start + i + 1;
                txt += `*${num}. ${v.title}*\n`;
                txt += `✧ ${v.channel} | ${v.duration}\n`;
                txt += `✧ ${v.url}\n\n`;
            });

            const hasNext = all.length > start + perPage;

            const buttons = hasNext? [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Siguiente ▶️',
                        id: `${p}yts ${q} --page ${page + 1}`
                    })
                }
            ] : [];

            await sock.sendMessage(chat, {
                image: { url: results[0].thumbnail },
                caption: txt,
                title: 'YTS RESULT',
                subtitle: `${q} - Pag ${page}`,
                footer: hasNext? 'Pulsa Siguiente' : 'Fin de resultados',
                interactiveButtons: buttons.length? buttons : undefined
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chat, { text: `Error: ${e.message}` }, { quoted: msg });
        }
    }
};