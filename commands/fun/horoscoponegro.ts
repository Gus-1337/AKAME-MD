import { UserJid } from '#simple';

const signos = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];

const predicciones: Record<string, string[]> = {
    aries: [
        "Hoy vas a discutir con alguien por orgulloso. Y vas a perder, como siempre.",
        "Crees que eres líder pero nadie te sigue, solo te aguantan.",
        "Tu impulsividad te va a meter en un problema que ni tú vas a poder arreglar.",
        "Vas a querer mandar a todos y vas a terminar solo.",
        "Hoy te van a humillar por creerte el más fuerte y no eres nada.",
        "Vas a pelear por algo estúpido y vas a quedar como el malo.",
        "Tu mal genio va a arruinarte una oportunidad buena.",
        "Hoy te van a ignorar y vas a explotar como niño chiquito.",
        "Crees que todos te tienen envidia, pero nadie te hace caso.",
        "Vas a prometer venganza y no vas a hacer nada, puro bla bla."
    ],
    tauro: [
        "Vas a comer por ansiedad otra vez. El gym te extraña.",
        "Tu terquedad va a alejar a una persona que si te quería.",
        "Hoy te van a decir que no y vas a hacer berrinche como niño.",
        "Dices que eres fiel pero solo eres flojo para buscar otro.",
        "Hoy vas a perder plata por tacaño, por no querer gastar.",
        "Vas a dormir todo el día y luego vas a quejarte que no tienes plata.",
        "Tu orgullo no te deja pedir perdón y por eso te quedas solo.",
        "Hoy te van a ver comiendo y van a decir que comes como cerdo.",
        "Eres tan celoso que hasta tus amigos te evitan.",
        "Vas a engordar más por no controlar tu boca."
    ],
    geminis: [
        "Hoy vas a mentir tanto que ni tú te vas a creer.",
        "Tienes dos caras y las dos caen mal.",
        "Vas a traicionar a alguien por chisme y luego te vas a hacer la víctima.",
        "Hoy vas a hablar mal de tu mejor amigo a sus espaldas.",
        "Nadie confía en ti porque cambias de opinión cada 5 minutos.",
        "Vas a estar con alguien hoy y mañana ya ni lo recuerdas.",
        "Tu doble vida se va a descubrir hoy, prepárate.",
        "Hoy vas a manipular a alguien y te van a cachar.",
        "Hablas demasiado y nadie quiere escucharte.",
        "Eres el chismoso del grupo y todos lo saben."
    ],
    cancer: [
        "Hoy vas a llorar por algo que pasó hace 5 años. Ya supéralo, a nadie le importan tus dramas emocionales. Madura.",
        "Vas a extrañar a tu ex, pero tu ex ya está con otro que si vale la pena.",
        "Hoy todo te va a doler, pero es porque eres demasiado sensible para este mundo.",
        "Vas a mandar un párrafo llorando y te van a dejar en visto.",
        "Tu familia ya está cansada de tus cambios de humor.",
        "Hoy vas a sentir que nadie te quiere, y no estás tan equivocado.",
        "Vas a stalkear a tu ex y vas a llorar toda la noche.",
        "Todo te afecta, pareces de cristal.",
        "Hoy vas a arruinar tu día por un recuerdo pendejo.",
        "Eres tan manipulador con tu lloradera que ya nadie te cree."
    ],
    leo: [
        "Hoy nadie te va a dar atención y vas a sufrir. No eres el centro del universo.",
        "Tu ego va a hacer que quedes como payaso en público.",
        "Crees que brillas pero solo das cringe.",
        "Hoy vas a subir una foto y nadie te va a dar like, y te va a doler.",
        "Todos se ríen de ti, no contigo. Aprende la diferencia.",
        "Vas a presumir algo y te van a humillar en los comentarios.",
        "Hoy vas a quedar como arrogante y te van a odiar más.",
        "Tu necesidad de atención ya da pena ajena.",
        "Crees que todos te admiran pero todos te critican.",
        "Vas a hacer un drama para que te miren y nadie va a mirar."
    ],
    virgo: [
        "Vas a criticar a todos y al final te van a dejar solo por castroso.",
        "Hoy tu perfeccionismo te va a arruinar el día. Nada te va a salir bien.",
        "Deja de querer controlar todo, ni tu vida puedes controlar.",
        "Eres tan exigente que ni tú mismo te aguantas.",
        "Hoy vas a encontrar un error en todo y vas a caer mal como siempre.",
        "Vas a corregir a alguien en público y vas a quedar como mamón.",
        "Tu limpieza obsesiva no tapa lo sucio que eres por dentro.",
        "Hoy nadie va a cumplir tus estándares imposibles.",
        "Eres el que más juzga y el que más cagadas tiene.",
        "Vas a quejarte de todo hoy y todos te van a mandar a la mierda."
    ],
    libra: [
        "Hoy no vas a poder decidir ni que comer. Indeciso de mierda.",
        "Quieres quedar bien con todos y al final quedas mal con todos.",
        "Tu ex no te extraña, ya supéralo.",
        "Hoy vas a perdonar a alguien que no merece tu perdón solo por no estar solo.",
        "Vives de la apariencia y por dentro estás vacío.",
        "Vas a coquetear con todos y nadie te va a hacer caso.",
        "Tu balance es una mentira, siempre estás mal.",
        "Hoy vas a traicionar a alguien por caer bien.",
        "Eres tan falso que ni tú sabes quién eres.",
        "Vas a prometer amor hoy y mañana ya estás con otro."
    ],
    escorpio: [
        "Hoy vas a tener ganas de vengarte de todos. Tranquilo psicópata.",
        "Tu toxicidad va a espantar a alguien que te quería de verdad.",
        "Deja de stalkear, da pena.",
        "Hoy vas a celar hasta a tus amigos, estás mal de la cabeza.",
        "Crees que eres misterioso pero solo eres raro y oscuro.",
        "Vas a guardar rencor por algo de hace años, superalo ya.",
        "Tu forma de amar da miedo, no amor.",
        "Hoy vas a hacer una escena de celos y vas a dar vergüenza.",
        "Eres tan vengativo que no duermes por planear venganzas.",
        "Vas a perder a alguien por no soltar el pasado."
    ],
    sagitario: [
        "Hoy vas a prometer cosas que no vas a cumplir, como siempre.",
        "Te crees libre pero todos saben que huyes de tus responsabilidades.",
        "Tu humor negro no da risa, solo incomoda.",
        "Hoy vas a dejar a alguien plantado por irte de fiesta.",
        "Nadie te toma en serio porque nunca terminas nada.",
        "Vas a viajar y vas a quedar sin plata a mitad del camino.",
        "Tu sinceridad es solo una excusa para ser hiriente.",
        "Hoy vas a burlarte de alguien y te van a golpear.",
        "Te crees aventurero pero solo eres irresponsable.",
        "Vas a perder una oportunidad por irte de borracho."
    ],
    capricornio: [
        "Trabajas tanto y sigues sin plata. Que triste tu caso.",
        "Hoy vas a estar amargado todo el día y vas a amargar a los demás.",
        "Tu frialdad va a hacer que pierdas a alguien importante.",
        "Crees que eres exitoso pero solo eres un esclavo del trabajo.",
        "Hoy vas a presumir algo que ni siquiera es tuyo.",
        "Tu ambición te va a dejar sin amigos.",
        "Vas a tratar mal a alguien que te quiere por tu mal humor.",
        "Hoy te van a decir que eres aburrido y tienen razón.",
        "Eres tan frío que ni tu familia te quiere abrazar.",
        "Vas a trabajar el fin de semana y nadie te lo va a agradecer."
    ],
    acuario: [
        "Te crees diferente y especial pero eres el más del montón.",
        "Hoy vas a sentir que nadie te entiende, y es verdad, nadie quiere entenderte.",
        "Deja de creerte superior, ni tú te soportas.",
        "Tu rebeldía sin causa ya aburre a todos.",
        "Hoy vas a decir que odias a todos para llamar la atención.",
        "Vas a sentirte solo aunque estés rodeado de gente.",
        "Tu frialdad emocional va a terminar una relación hoy.",
        "Te crees inteligente pero solo eres raro.",
        "Hoy vas a dar un discurso y nadie te va a entender.",
        "Eres tan distante que pareces muerto en vida."
    ],
    piscis: [
        "Vas a vivir en tu mundo de fantasía porque tu realidad da pena.",
        "Hoy vas a llorar por una película y todos se van a burlar de ti.",
        "Deja de soñar y ponte a hacer algo productivo por una vez.",
        "Siempre eres la víctima, ya nadie te cree tu cuento.",
        "Hoy vas a enamorarte de alguien que ni te topa.",
        "Vas a prometer cambiar y vas a seguir igual de inútil.",
        "Tu sensibilidad es solo manipulación barata.",
        "Hoy vas a dejar que te usen otra vez por no saber decir que no.",
        "Vives drogado de ilusiones pendejas.",
        "Vas a llorar hoy por alguien que ni se acuerda de ti."
    ]
};

const colores = [
    "Negro Luto", "Rojo Sangre", "Gris Depresión", "Verde Envidia",
    "Amarillo Cobardía", "Morado Fracaso", "Marrón Mierda",
    "Azul Tristeza", "Rosado Vergüenza", "Naranja Traición",
    "Blanco Sucia", "Turquesa Soledad", "Vino Amargura",
    "Beige Mediocre", "Dorado Falso", "Plateado Oxidado"
];

export default {
    command: ['horoscoponegro', 'horoscopo', 'zodiaco'],
    description: 'Horóscopo negro y tóxico que te dice la verdad sin filtro',
    category: 'fun',
    group: true,
    run: async ({ chat, m, sock, args }: any) => {
        let signo = args[0]?.toLowerCase();
        let targetName = m.pushName || 'Usuario';

        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            let jid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            jid = await UserJid(sock, chat, jid);
            const dbData = (global as any).db.data;
            targetName = dbData.chats[chat].users?.[jid]?.name || jid.split('@')[0];
        }

        if (!signo ||!signos.includes(signo)) {
            return sock.sendMessage(chat, {
                text: `「✿」 Pon un signo válido pa\n\n> Ejemplo:.horoscoponegro cancer @usuario\n\nSignos: ${signos.join(', ')}`
            }, { quoted: m });
        }

        const lista = predicciones[signo];
        const prediccion = lista[Math.floor(Math.random() * lista.length)];
        const numero = Math.floor(Math.random() * 99) + 1;
        const color = colores[Math.floor(Math.random() * colores.length)];

        const emojiSigno: any = {
            aries: '♈', tauro: '♉', geminis: '♊', cancer: '♋',
            leo: '♌', virgo: '♍', libra: '♎', escorpio: '♏',
            sagitario: '♐', capricornio: '♑', acuario: '♒', piscis: '♓'
        };

        const texto = `*_☑︎ HORÓSCOPO NEGRO ☑︎_*\n\n> ▸ *Signo:* ${signo.toUpperCase()} ${emojiSigno[signo] || '♋'}\n> ▸ *Usuario:* ${targetName}\n\n> 🔮 *Predicción para hoy:*\n> "${prediccion}"\n\n> 💀 *Número de la mala suerte:* ${numero}\n> 🎨 *Color de la desgracia:* ${color}`;

        await sock.sendMessage(chat, { text: texto }, { quoted: m });
    }
};
