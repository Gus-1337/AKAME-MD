export default {
    command: ['menudios', 'menucanal'],
    run: async ({ chat, m, sock }: any) => {
        await sock.sendMessage(chat, {
            text: "乂 *AKAME-MD | MENU DIOS* 乂\n\nEl menu más pro que verás\nPowered by Maycol",
            footer: "Akame",
            title: "MENU",
            interactiveButtons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📢 Canal",
                        url: "https://whatsapp.com/channel/0029VbApe6yCcW4rQv8tOm2H"
                    })
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copiar prefijo",
                        copy_code: "."
                    })
                }
            ]
        }, { quoted: m });
    }
}