import config from '#config';
import { preguntarIA, siputzx, yosoyyoDeepseek, deliriusGemini, stellarGemini, stellarChatgpt, deliriusGptPrompt, type Proveedor } from '#ia';

// Simi: chat casual con memoria corta por grupo/chat. Usa las IA que ya funcionan en el bot.
const MEMORIA_MAX = 8;               // últimos mensajes que recuerda
const MEMORIA_MS = 30 * 60 * 1000;   // la charla se olvida tras 30 min sin hablar

const memoria: Map<string, { t: number; turnos: string[] }> = (global as any).simiMemoria || ((global as any).simiMemoria = new Map());

const emojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F6D0}-\u{1F6FF}\u{1F170}-\u{1F251}]/gu;

const historial = (chat: string): string[] => {
    const h = memoria.get(chat);
    if (!h || Date.now() - h.t > MEMORIA_MS) return [];
    return h.turnos;
};

const guardar = (chat: string, turnos: string[]) => {
    memoria.set(chat, { t: Date.now(), turnos: turnos.slice(-MEMORIA_MAX) });
};

export default {
    command: ['simi', 'sim'],
    description: 'Chatea con Simi, una IA casual que recuerda la charla',
    category: 'ia',
    run: async ({ chat, m, sock, args, usedPrefix }: any) => {
        const texto = args.join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, {
                text: `   ׄ  ✿  Escribe algo para hablar con Simi.\n   ✿  Ejemplo: *${usedPrefix}simi ¿qué haces?*`
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '💬', key: m.key } }).catch(() => null);

            const nombre = config.botName || 'Simi';
            const sistema =
                `Eres ${nombre}, una amiga virtual simpática, divertida y cercana que chatea en WhatsApp. ` +
                'Hablas en español casual, como en un chat real. Respuestas cortas: de 1 a 3 frases. ' +
                'No uses emojis ni listas. Si te preguntan algo serio, responde con claridad.';

            const turnos = historial(chat);
            const contexto = turnos.length ? `Conversación hasta ahora:\n${turnos.join('\n')}\n\n` : '';
            const prompt = `${contexto}Usuario: ${texto}\n${nombre}:`;

            const conSistema = (p: Proveedor): Proveedor => ({
                nombre: p.nombre,
                pedir: (pr) => p.pedir(`${sistema}\n\n${pr}`)
            });

            const proveedores: Proveedor[] = [
                conSistema(yosoyyoDeepseek),
                conSistema(siputzx('gptoss120b')),
                deliriusGptPrompt(sistema),
                conSistema(stellarGemini),
                conSistema(deliriusGemini),
                conSistema(stellarChatgpt)
            ];

            const { texto: respuesta } = await preguntarIA(proveedores, prompt, 30000);
            const limpia = respuesta.replace(emojis, '').replace(/^\s*(Usuario|Simi|AKAME)[:：]\s*/i, '').trim();

            guardar(chat, [...turnos, `Usuario: ${texto}`, `${nombre}: ${limpia}`]);

            await sock.sendMessage(chat, { text: limpia }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Simi no respondió a tiempo. Intenta de nuevo en un momento.'
            }, { quoted: m });
        }
    }
};
