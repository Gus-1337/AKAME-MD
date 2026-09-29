export default {
    command: ['botones', 'allbuttons'],
    run: async ({ chat, m, sock }: any) => {
        await sock.sendMessage(chat, {
            text: "Estos son TODOS los botones que existen",
            title: "COLECCION COMPLETA",
            footer: "Akame - todos los botones",
            interactiveButtons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({ display_text: "⚡ Botón rápido", id: ".ping" })
                },
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📋 Botón lista",
                        sections: [{ title: "Opciones", rows: [{ title: "Opción 1", id: ".op1" }] }]
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({ display_text: "🌐 Botón link", url: "https://google.com" })
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({ display_text: "📋 Botón copiar", copy_code: "Texto a copiar" })
                },
                {
                    name: "cta_call",
                    buttonParamsJson: JSON.stringify({ display_text: "📞 Botón llamar", phone_number: "+51 999 999 999" })
                }
            ]
        }, { quoted: m });
    }
}