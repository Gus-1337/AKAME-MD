export default {
    command: ['menulista', 'listaprueba', 'menutest2'],
    run: async ({ chat, m, sock }: any) => {
        await sock.sendMessage(chat, {
            text: "Selecciona un comando",
            title: "MENU LISTA",
            footer: "AKAME",
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "📜 Ver comandos",
                        sections: [
                            {
                                title: "ECONOMIA",
                                rows: [
                                    { title: "💰 Balance", id: ".bal" },
                                    { title: "💼 Trabajar", id: ".work" },
                                    { title: "🏦 Banco", id: ".bank" }
                                ]
                            },
                            {
                                title: "JUEGOS",
                                rows: [
                                    { title: "🎮 Slot", id: ".slot" },
                                    { title: "🎯 Ruleta", id: ".ruleta" }
                                ]
                            }
                        ]
                    })
                }
            ]
        }, { quoted: m });
    }
}