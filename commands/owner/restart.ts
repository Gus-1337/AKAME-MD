import fs from 'fs';
import path from 'path';

/** Código que el lanzador (scripts/lanzar.mjs) interpreta como "reinicia el bot". */
export const RESTART_CODE = 42;

/** Archivo donde se guarda el chat que pidió el reinicio, para avisarle al volver. */
const ARCHIVO = path.join(process.cwd(), 'restart-pendiente.json');

/** Llámalo al conectarse: si hubo un .restart, avisa en el chat que lo pidió y borra el aviso pendiente. */
export const avisarReinicio = async (sock: any) => {
    try {
        if (!fs.existsSync(ARCHIVO)) return;
        const { chat } = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
        fs.unlinkSync(ARCHIVO);
        if (!chat) return;
        await sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *SERVIDOR REINICIADO* ✦\n\n` +
                `   ✅ Servidor reiniciado correctamente\n\n` +
                `> Ya puedes volver a usar los comandos`
        });
    } catch (e) {
        console.error('[restart] No se pudo enviar el aviso de reinicio:', e);
    }
};

export default {
    command: ['restart', 'reiniciar', 'reboot'],
    description: 'Reinicia el bot desde WhatsApp (solo owner)',
    category: 'owner',
    owner: true,
    run: async (ctx: any) => {
        const { sock, chat, msg } = ctx;
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: msg });

        try {
            fs.writeFileSync(ARCHIVO, JSON.stringify({ chat, fecha: Date.now() }));
        } catch (e) {
            console.error('[restart] No se pudo guardar el aviso pendiente:', e);
        }

        await reply(
            `˚₊· ͟͟͞͞➳❥ *REINICIANDO* ✦\n\n` +
            `   Vuelvo en unos segundos...\n\n` +
            `> Te aviso cuando esté listo`
        );

        // La base de datos se guarda en cada cambio, así que no se pierde nada al cerrar
        setTimeout(() => process.exit(RESTART_CODE), 1500);
    }
};
