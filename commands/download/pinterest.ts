import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';
import crypto from 'crypto';

const DELIRIUS = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');

/** Busca imágenes en Pinterest: api-faa primero y Delirius de respaldo. */
async function buscarPinterest(q: string): Promise<string[]> {
    // 1) API principal
    try {
        const res: any = await fetch(`https://api-faa.my.id/faa/pinterest?q=${encodeURIComponent(q)}`, { timeout: 15000 } as any).then(r => r.json());
        const lista = (res.resultado || res.result || []).filter((u: any) => typeof u === 'string' && u.startsWith('http'));
        if (lista.length) return lista;
    } catch (e) {
        console.log('[PINTEREST] api-faa falló, usando Delirius:', e.message);
    }
    // 2) Respaldo: Delirius (devuelve null en algunas posiciones, se filtran)
    const res: any = await fetch(`${DELIRIUS}/search/pinterest?text=${encodeURIComponent(q)}`, { timeout: 15000 } as any).then(r => r.json());
    return (res.results || []).filter((u: any) => typeof u === 'string' && u.startsWith('http'));
}

export default {
    command: ['pinterest', 'pin'],
    category: 'download',
    description: 'descarga imagenes de pinterest',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { 
            text: `☬ *AKAME - PINTEREST* ☬\n\n♡ *Usa:*\n> ${usedPrefix}pin <texto>\n\n♡ *Ejemplo:*\n> ${usedPrefix}pin mikasa\n> ${usedPrefix}pin gatos` 
        }, { quoted: msg });

        try {
            const results = await buscarPinterest(q);
            if (!results.length) {
                return sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ No se encontraron resultados para: *${q}*` }, { quoted: msg });
            }

            const images = results.slice(0, 15);

            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: images.length, expectedVideoCount: 0 }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            // Una por una con pausa: enviar 15 a la vez hace que WhatsApp responda "rate-overlimit"
            const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
            for (let i = 0; i < images.length; i++) {
                const url = images[i];
                const caption = i === 0 ?
`☬ *PINTEREST* ☬

♡ *Búsqueda:* ${q}
♡ *Resultados:* ${images.length} fotos

☬ *AKAME-MD* ♡` : '';

                let enviada = false;
                for (let intento = 1; intento <= 4 && !enviada; intento++) {
                    try {
                        const child = await generateWAMessage(targetJid, {
                            image: { url },
                            caption
                        }, { upload: sock.waUploadToServer });

                        child.message.messageContextInfo = {
                            messageSecret: crypto.randomBytes(32),
                            messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                        };

                        await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
                        enviada = true;
                    } catch (e: any) {
                        if (!String(e?.message || '').includes('rate-overlimit')) break;
                        await esperar(2000 * intento);
                    }
                }
                await esperar(700);
            }

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
