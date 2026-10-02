export default {
    command: ['saraauto'],
    description: 'Control total de Sara',
    category: 'tools',
    admin: true, // 🔒 SOLO ADMINS
    group: true,
    botAdmin: false,

    run: async ({ chat, m, sock, args, chatDb }) => {
        let arg = args[0]?.toLowerCase();

        if (!arg) {
            let estadoAuto = chatDb.saraAuto? '✅ Auto ON' : '❌ Auto OFF';
            let estadoTotal = chatDb.saraDisabled? '🔴 APAGADA TOTAL' : '🟢 ENCENDIDA';
            return sock.sendMessage(chat, {
                text: `✿ *CONTROL SARA - SOLO ADMINS*\n\nEstado: ${estadoTotal}\nModo: ${estadoAuto}\n\nComandos:\n>.saraauto on - Habla sola a todo\n>.saraauto off - Solo si dicen sara\n>.saraauto apagar - Apaga por completo\n>.saraauto encender - La prende`
            }, { quoted: m });
        }

        if (arg === 'on') {
            chatDb.saraAuto = true;
            chatDb.saraDisabled = false;
            return sock.sendMessage(chat, { text: `✅ *Sara Auto activada*` }, { quoted: m });
        }

        if (arg === 'off') {
            chatDb.saraAuto = false;
            chatDb.saraDisabled = false;
            return sock.sendMessage(chat, { text: `💤 *Sara modo normal*` }, { quoted: m });
        }

        if (arg === 'apagar') {
            chatDb.saraDisabled = true;
            chatDb.saraAuto = false;
            return sock.sendMessage(chat, { text: `🔴 *Sara apagada por completo*\nYa no respondo a nada.` }, { quoted: m });
        }

        if (arg === 'encender' || arg === 'prender') {
            chatDb.saraDisabled = false;
            return sock.sendMessage(chat, { text: `🟢 *Sara encendida de nuevo* 💌` }, { quoted: m });
        }
    }
}
