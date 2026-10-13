import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';
import crypto from 'crypto';

const DELIRIUS = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');

const soloUrls = (lista: any[]) => (lista || []).filter((u: any) => typeof u === 'string' && u.startsWith('http'));

/** Busca imágenes: api-faa (Google) -> Delirius gimage -> Delirius Pinterest. */
async function buscarImagenes(q: string): Promise<string[]> {
    // 1) API principal (Google Images)
    try {
        const res: any = await fetch(`https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(q)}`, { timeout: 15000 } as any).then(r => r.json());
        const lista = soloUrls(res.resultado || res.result || []);
        if (lista.length) return lista;
    } catch (e) {
        console.log('[IMAGEN] api-faa falló, usando Delirius:', e.message);
    }
    // 2) Respaldo: Delirius gimage (Google Images)
    try {
        const res: any = await fetch(`${DELIRIUS}/search/gimage?query=${encodeURIComponent(q)}`, { timeout: 15000 } as any).then(r => r.json());
        const lista = soloUrls(res.results || res.result || res.data || []);
        if (lista.length) return lista;
    } catch (e) {
        console.log('[IMAGEN] Delirius gimage falló:', e.message);
    }
    // 3) Último respaldo: Delirius Pinterest
    const res: any = await fetch(`${DELIRIUS}/search/pinterest?text=${encodeURIComponent(q)}`, { timeout: 15000 } as any).then(r => r.json());
    return soloUrls(res.results || []);
}

async function getBuffer(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.google.com/'
      },
      timeout: 10000
    });
    if (!res.ok) return null;
    const buff = await res.buffer();
    // minimo 10kb para no mandar basura
    if (buff.length < 10240) return null;
    return buff;
  } catch {
    return null;
  }
}

export default {
    command: ['imagen', 'image', 'gimage', 'imagenes'],
    category: 'download',
    description: 'Google Image en álbum AKAME-MD',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, {
            text: `🌸 *IMAGEN - GOOGLE* 🌸\n\n🌸 *Usa:*\n> ${usedPrefix}imagen <texto>`
        }, { quoted: msg });

        try {
            let results = await buscarImagenes(q);
            if (!results.length) throw new Error('Sin resultados');

            // Filtra dominios que siempre fallan
            results = results.filter(u =>!u.includes('nocookie.net') &&!u.includes('losgatos'));

            // Pre-valida y descarga buffer para evitar el Failed to fetch stream
            const validImages = [];
            for (const url of results) {
                if (validImages.length >= 10) break;
                const buff = await getBuffer(url);
                if (buff) validImages.push({ url, buff });
            }

            if (!validImages.length) throw new Error('Todas las imágenes fallaron');

            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: validImages.length, expectedVideoCount: 0 }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            for (let i = 0; i < validImages.length; i++) {
                try {
                    const caption = i === 0?
`🌸 ○--- *GOOGLE IMAGE* ---○ 🌸
─────────────────
│ ──☆ *Query:* ${q}
│ ──☆ *Total:* ${validImages.length} imgs
─────────────────
*AKAME-MD* 🌸` : '';

                    const child = await generateWAMessage(targetJid, {
                        image: validImages[i].buff,
                        caption
                    }, { upload: sock.waUploadToServer });

                    child.message.messageContextInfo = {
                        messageSecret: crypto.randomBytes(32),
                        messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                    };

                    await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
                } catch (e) {
                    console.log('[IMG SKIP]', e.message);
                }
            }

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `🌸 Error: ${e.message}` }, { quoted: msg });
        }
    }
};
