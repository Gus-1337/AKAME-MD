import config from '#config';
import { preguntarIA, enviarRespuesta, deliriusGptPrompt, siputzx, yosoyyoDeepseek, type Proveedor } from '#ia';

const emojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F6D0}-\u{1F6FF}\u{1F170}-\u{1F251}]/gu;

export default {
    command: ['ia', 'chat', 'gpt'],
    description: 'Responde preguntas utilizando inteligencia artificial',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Por favor, ingresa una pregunta o mensaje para continuar.'
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '🤖', key: m.key } });

            const sistema = `Eres ${config.botName}, una IA con la elegancia de Akame (Akame ga Kill), creada por ${config.devName}. Eres elegante, serena y amable. Responde en español de forma completa, sin usar emojis.`;
            const conSistema = (p: Proveedor): Proveedor => ({
                nombre: p.nombre,
                pedir: (prompt) => p.pedir(`${sistema}\n\n${prompt}`)
            });

            const proveedores: Proveedor[] = [
                deliriusGptPrompt(sistema),
                conSistema(siputzx('gptoss120b')),
                conSistema(yosoyyoDeepseek)
            ];

            const { texto } = await preguntarIA(proveedores, `Responde en español de forma completa: ${text}`);
            const limpio = texto.replace(emojis, '').trim();
            await enviarRespuesta(sock, chat, m, '', limpio);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Ocurrió un error al procesar tu solicitud.'
            }, { quoted: m });
        }
    }
};
