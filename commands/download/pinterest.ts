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

            const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
            const pie = (i: number) => i === 0 ?
`✧ *PINTEREST* ✧

> ✦ Búsqueda » *${q}*
> ❖ Resultados » *${images.length}* fotos

⋆ AKAME-MD ⋆` : '';

            // Preparación en paralelo (5 a la vez) y envío en orden apenas cada una esté lista
            const preparar = (i: number) => generateWAMessage(targetJid, { image: { url: images[i] }, caption: pie(i) }, { upload: sock.waUploadToServer })
                .then((child: any) => {
                    child.message.messageContextInfo = {
                        messageSecret: crypto.randomBytes(32),
                        messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                    };
                    return child;
                })
                .catch(() => null);

            const listas: Promise<any>[] = [];
            let siguiente = 0;
            const worker = async () => {
                while (siguiente < images.length) {
                    const i = siguiente++;
                    listas[i] = preparar(i);
                    await listas[i];
                }
            };
            // Los 5 workers arrancan juntos; las promesas quedan en orden
            const pool = Promise.all(Array.from({ length: Math.min(5, images.length) }, worker));

            for (let i = 0; i < images.length; i++) {
                while (!listas[i]) await esperar(20);
                const child = await listas[i];
                if (!child) continue;
                for (let intento = 1; intento <= 4; intento++) {
                    try {
                        await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
                        break;
                    } catch (e: any) {
                        if (!String(e?.message || '').includes('rate-overlimit') || intento === 4) break;
                        await esperar(1000 * intento);
                    }
                }
                await esperar(200);
            }
            await pool;

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
