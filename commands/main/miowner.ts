// Diagnóstico: muestra cómo el bot ve tu cuenta para decidir si eres owner.
export default {
    command: ['miowner'],
    description: 'Muestra cómo el bot identifica tu cuenta (diagnóstico de owner)',
    category: 'main',

    run: async ({ chat, msg, sock }: any) => {
        const d = msg?.debugOwner || {};
        const texto =
            `✦ *DIAGNÓSTICO DE OWNER* ✦\n\n` +
            `✧ Eres owner: *${d.esOwner ? 'Sí' : 'No'}*\n` +
            `✧ Participant: ${d.participant || '-'}\n` +
            `✧ ParticipantAlt: ${d.participantAlt || '-'}\n` +
            `✧ Normalizado: ${d.normalizado || '-'}\n` +
            `✧ Números revisados: ${(d.ids || []).join(', ') || '-'}`;
        return sock.sendMessage(chat, { text: texto }, { quoted: msg });
    }
};
