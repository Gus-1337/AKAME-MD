// Uso:
//   .top feos            -> top 5 de feos del grupo
//   .top narizón         -> top 5 de narizones (cualquier tema)
//   .top 10 maricas      -> top de 10 personas
//   .top grupos          -> top del grupo actual (ranking de miembros)

const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// Emoji de cabecera según el tema (si no hay coincidencia, uno al azar)
const emojisTema: Record<string, string> = {
    feos: '👹', feo: '👹', narizón: '👃', narizon: '👃', maricas: '🌈', marica: '🌈',
    lindos: '😍', lindo: '😍', guapos: '😎', guapo: '😎', tontos: '🤡', tonto: '🤡',
    dormilones: '😴', dormilon: '😴', chismosos: '🗣️', chismoso: '🗣️', cringe: '🫠',
    grupos: '👥', pobres: '💸', ricos: '💰', hambrientos: '🍔', valientes: '🦁',
};
const emojisAlAzar = ['🏆', '👑', '🔥', '⚡', '💫', '🎖️'];

const comentarios = [
    'Campeón indiscutible de la categoría',
    'Se acerca mucho, le falta poquito',
    'Medalla bien ganada, sin discusión',
    'Sigue entrenando, que el top es duro',
    'Aparece en el ranking y ni se entera',
    'Elegido por votación secreta del bot',
    'No se discute, es ley',
];

const bloque = (n: number, total: number) => '▰'.repeat(n) + '▱'.repeat(total - n);

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
                    text: '╭─────────────────────╮\n   ✦ *CÓMO USAR EL TOP* ✦\n╰─────────────────────╯\n\n' +
                          '▸ *.top feos*\n▸ *.top narizón*\n▸ *.top 10 maricas*\n▸ *.top grupos*'
                }, { quoted: m });
            }

            // Número opcional al inicio: cuántos puestos (3 a 10)
            let cantidad = 5;
            const rest = [...args];
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

            // Mezcla aleatoria y toma los primeros N
            const pool = [...participantes];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            const elegidos = pool.slice(0, Math.min(cantidad, pool.length));

            const esGrupos = tema.toLowerCase() === 'grupos';
            const claveTema = tema.toLowerCase();
            const emoji = esGrupos
                ? '👥'
                : emojisTema[claveTema] || emojisAlAzar[Math.floor(Math.random() * emojisAlAzar.length)];
            const titulo = esGrupos
                ? (nombreGrupo ? nombreGrupo.toUpperCase() : 'TOP DEL GRUPO')
                : `TOP ${tema.toUpperCase()}`;

            const ancho = 26;
            const linea = '━'.repeat(ancho);

            let text = `╭${linea}╮\n`;
            text += `   ${emoji}  *${titulo}*  ${emoji}\n`;
            text += `╰${linea}╯\n\n`;
            text += `✧･ﾟ: *✧･ﾟ:* ✧･ﾟ: *✧･ﾟ:*\n\n`;

            elegidos.forEach((jid, i) => {
                // Porcentaje decreciente con algo de aleatoriedad
                const base = 100 - i * Math.floor(60 / Math.max(1, cantidad - 1));
                const porcentaje = Math.min(100, Math.max(15, base - Math.floor(Math.random() * 6)));
                const llenos = Math.round(porcentaje / 10);
                const medalla = medallas[i] || `${i + 1}.`;
                const comentario = comentarios[Math.floor(Math.random() * comentarios.length)];

                text += `${medalla}  @${jid.split('@')[0]}\n`;
                text += `      ${bloque(llenos, 10)}  *${porcentaje}%*\n`;
                if (i === 0) text += `      ↳ _${comentario}_\n`;
                text += `\n`;
            });

            text += `✧･ﾟ: *✧･ﾟ:* ✧･ﾟ: *✧･ﾟ:*\n\n`;
            text += `_✦ Resultados oficiales del bot ✦_`;

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
