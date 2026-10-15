import { downloadMediaMessage } from '@whiskeysockets/baileys';
import P from 'pino';

// Canal donde también se publica el aviso: se identifica por su código de invitación
// (el link https://whatsapp.com/channel/<código>). WhatsApp devuelve el ID interno al consultarlo.
const CANAL_INVITACION = '0029VbDPchgEAKWO4mMYtC1Q';
let canalId: string | null = null;

const obtenerCanal = async (sock: any): Promise<string> => {
    if (canalId) return canalId;
    const meta = await sock.newsletterMetadata('invite', CANAL_INVITACION);
    if (!meta?.id) throw new Error('No encontré el canal con ese link');
    canalId = meta.id;
    return canalId as string;
};
const PAUSA_GRUPO_MS = 1500;

/** Saca el contenido a enviar: el mensaje citado (si respondes a uno) o lo que escribiste tú. */
const contenidoDe = (m: any, args: string[]) => {
    const citado = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const texto = args.join(' ').trim();

    // Respondiste a un mensaje: se anuncia ese mensaje
    if (citado) {
        if (citado.imageMessage) return { tipo: 'imagen', citado, texto: citado.imageMessage.caption || texto };
        const textoCitado = citado.conversation || citado.extendedTextMessage?.text || '';
        if (textoCitado) return { tipo: 'texto', texto: texto || textoCitado };
    }
    // Tú mandaste una imagen con .aviso como pie
    if (m?.message?.imageMessage) return { tipo: 'imagen', citado: m, texto };
    // Solo texto escrito
    if (texto) return { tipo: 'texto', texto };
    return null;
};

export default {
    command: ['aviso', 'update'],
    description: 'Envía un aviso a todos los grupos y al canal (texto o imagen, respondiendo a un mensaje o con imagen)',
    category: 'owner',
    isOwner: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, m, usedPrefix } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        const contenido = contenidoDe(m ?? msg, args || []);
        if (!contenido) {
            return responder(
                `📢 *AVISO*\n\n` +
                `> ${usedPrefix}aviso Tu mensaje\n` +
                `> Responde a un texto o imagen con ${usedPrefix}aviso\n` +
                `> Envía una imagen con ${usedPrefix}aviso como pie`
            );
        }

        try {
            await sock.sendMessage(chat, { react: { text: '📢', key: msg.key } }).catch(() => null);

            // La imagen se descarga una sola vez y se reutiliza para cada grupo
            let imagen: Buffer | null = null;
            if (contenido.tipo === 'imagen') {
                const media = contenido.citado === (m ?? msg) ? (m ?? msg) : { message: contenido.citado };
                imagen = Buffer.from(await downloadMediaMessage(media, 'buffer', {}, {
                    logger: P({ level: 'silent' }),
                    reuploadRequest: sock.updateMediaMessage
                }));
            }

            const encabezado = `📢 *ANUNCIO OFICIAL AKAME*`;
            const pie = contenido.texto ? `${encabezado}\n\n${contenido.texto}` : encabezado;
            const enviar = (jid: string) => imagen
                ? sock.sendMessage(jid, { image: imagen, caption: pie })
                : sock.sendMessage(jid, { text: pie });

            const grupos = Object.keys(await sock.groupFetchAllParticipating());
            let enviados = 0;
            for (const id of grupos) {
                try {
                    await enviar(id);
                    enviados++;
                    await new Promise((r) => setTimeout(r, PAUSA_GRUPO_MS));
                } catch {}
            }

            let canal = true;
            try {
                await enviar(await obtenerCanal(sock));
            } catch (e: any) {
                canal = false;
                console.log('[AVISO] canal:', e?.message);
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
            return responder(`✅ Enviado a *${enviados}* grupos${canal ? ' y al canal' : ' (el canal falló)'}`);
        } catch (e: any) {
            console.log('[AVISO ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            return responder(`❌ No pude enviar el aviso: ${e?.message || 'error'}`);
        }
    }
};
