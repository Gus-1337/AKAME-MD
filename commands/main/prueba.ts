export default {
    command: ['prueba', 'test'],
    description: 'Comando de prueba: confirma que el bot responde',
    category: 'main',
    run: async ({ chat, m, sock, sender }: any) => {
        const inicio = Date.now();
        const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
        const tiempo = Math.max(1, Date.now() - inicio);

        return sock.sendMessage(chat, {
            text:
                `✿ *PRUEBA EXITOSA* ✿\n` +
                `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
                `✔ El bot está respondiendo\n` +
                `⚡ Respuesta » *${tiempo} ms*\n` +
                `🕒 Hora » *${fecha}*\n` +
                `👤 Usuario » @${String(sender || m.sender).split('@')[0].split(':')[0]}\n` +
                `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
                `> Todo funciona bien`,
            mentions: [sender || m.sender]
        }, { quoted: m });
    }
};
