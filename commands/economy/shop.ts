export default {
    command: ['shop', 'tienda'],
    description: 'Tienda',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock }: any) => {
        const text = `「🛒」 *TIENDA AKAME*\n\n1. premium - 10000 ¥enes - Acceso premium\n2. coinboost - 5000 ¥enes - x2 coins por 1h\n3. robprotect - 3000 ¥enes - Anti robo 1h\n\nUsa *.buy <nombre>*`;
        await sock.sendMessage(chat, { text }, { quoted: m });
    }
};
