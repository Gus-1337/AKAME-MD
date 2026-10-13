export default {
    command: ['dado', 'dados'],
    description: 'Lanza un dado (o varios) de la cantidad de caras que elijas',
    category: 'fun',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'dado' });

            // Uso: .dado            -> 1 dado de 6 caras
            //      .dado 20         -> 1 dado de 20 caras
            //      .dado 3 20       -> 3 dados de 20 caras
            let cantidad = 1;
            let caras = 6;

            if (args?.length >= 2) {
                cantidad = parseInt(args[0]);
                caras = parseInt(args[1]);
            } else if (args?.length === 1) {
                caras = parseInt(args[0]);
            }

            if (isNaN(cantidad) || cantidad < 1 || cantidad > 10) {
                return sock.sendMessage(chat, { text: ' ✿ La cantidad de dados debe estar entre 1 y 10.' }, { quoted: m });
            }
            if (isNaN(caras) || caras < 2 || caras > 100) {
                return sock.sendMessage(chat, { text: ' ✿ El dado debe tener entre 2 y 100 caras.' }, { quoted: m });
            }

            const tiradas = Array.from({ length: cantidad }, () => Math.floor(Math.random() * caras) + 1);
            const total = tiradas.reduce((a, b) => a + b, 0);

            let text = `🎲 *DADO*\n\n`;
            text += `> Tiradas (${cantidad}d${caras}): ${tiradas.join(' + ')}\n`;
            if (cantidad > 1) text += `> Total: *${total}*\n`;
            if (cantidad === 1 && caras === 20 && tiradas[0] === 20) text += `\n_¡Crítico! 20 natural 🤩_`;
            if (cantidad === 1 && caras === 20 && tiradas[0] === 1) text += `\n_Pifia total… 1 natural 💀_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en dado.' }, { quoted: m });
        }
    }
}
