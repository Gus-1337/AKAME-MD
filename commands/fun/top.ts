// Uso:
//   .top feos            -> top 5 de feos del grupo
//   .top narizón         -> top 5 de narizones (cualquier tema)
//   .top 10 maricas      -> top de 10 personas
//   .top grupos          -> top del grupo actual (ranking de miembros)
const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const adornos = ['✦', '✧', '❖', '✿', '❀', '★'];
const barras = ['░', '▒', '▓', '█'];

const comentarios = [
    'Campeón indiscutible de la categoría 👑',
    'Se acerca mucho, le falta poquito 😏',
    'Medalla de bronce bien ganada 🥉',
    'Sigue entrenando, que el top es duro 💪',
    'Aparece en el ranking y ni se entera 😅',
    'Fue elegido por votación secreta del bot 🤖',
    'No se discute, es ley 📜',
];

export default {
    command: ['top'],
    description: 'Ranking decorado de miembros del grupo: .top <tema> (ej: .top feos, .top narizón)',
    category: 'fun',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'top' });

            if (!args || args.length === 0) {
                return sock.sendMessage(chat, {
                    text: ' ✿ Usa: *.top <tema>*\nEjemplos:\n> .top feos\n> .top narizón\n> .top 10 maricas\n> .top grupos'
                }, { quoted: m });
            }

            // Número opcional al inicio: cuántos puestos (3 a 10)
            let cantidad = 5;
            let rest = [...args];
            if (/^\d+$/.test(rest[0])) {
                const n = parseInt(rest.shift() as string);
                if (n < 3 || n > 10) {
                    return sock.sendMessage(chat, { text: ' ✿ El top debe tener entre 3 y 10 puestos.' }, { quoted: m });
                }
                cantidad = n;
            }

            const tema = rest.join(' ').trim();
            if (!tema) {
                return sock.sendMessage(chat, { text: ' ✿ Falta el tema del top. Ej: .top feos' }, { quoted: m });
            }
            const temaMayus = tema.toUpperCase();

            // Miembros del grupo (si no es grupo, se usa quien escribe)
            let participantes: string[] = [];
            let nombreGrupo = '';
            if (chat.endsWith('@g.us')) {
                try {
                    const meta = await sock.groupMetadata(chat);
                    participantes = meta.participants.map((p: any) => p.id);
                    nombreGrupo = meta.subject || '';
                } catch {}
            }
            if (participantes.length === 0) participantes = [m.sender];

            // Mezcla aleatoria (Fisher-Yates) y toma los primeros N
            const pool = [...participantes];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            const elegidos = pool.slice(0, Math.min(cantidad, pool.length));

            const adorno = adornos[Math.floor(Math.random() * adornos.length)];
            const barra = barras[Math.floor(Math.random() * barras.length)];
            const linea = barra.repeat(26);

            // Para "top grupos" el encabezado habla del grupo
            const esGrupos = tema.toLowerCase() === 'grupos';
            const titulo = esGrupos
                ? `TOP DEL GRUPO${nombreGrupo ? `: ${nombreGrupo.toUpperCase()}` : ''}`
                : `TOP ${temaMayus}`;

            let text = `${adorno}${adorno}${adorno} *${titulo}* ${adorno}${adorno}${adorno}\n`;
            text += `${linea}\n\n`;

            elegidos.forEach((jid, i) => {
                const medalla = medallas[i] || `${i + 1}.`;
                const porcentaje = Math.max(10, 100 - i * Math.floor(70 / Math.max(1, cantidad - 1)) - Math.floor(Math.random() * 5));
                const llenos = Math.round(porcentaje / 10);
                const progreso = '█'.repeat(llenos) + '░'.repeat(10 - llenos);
                const comentario = comentarios[Math.floor(Math.random() * comentarios.length)];

                text += `${medalla} @${jid.split('@')[0]}\n`;
                text += `   ${progreso} ${porcentaje}%\n`;
                if (i === 0) text += `   _${comentario}_\n`;
                text += `\n`;
            });

            text += `${linea}\n`;
            text += `_Resultados 100% verídicos (según el bot) ${adorno}_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text, mentions: elegidos }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en top.' }, { quoted: m });
        }
    }
}
