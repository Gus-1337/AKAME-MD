import config from '#config';

interface Poema { titulo: string; texto: string }

const POEMAS: Poema[] = [
    { titulo: 'Coincidencia', texto:
`De todas las casualidades del mundo,
la más improbable fuimos nosotros:
dos desconocidos, dos caminos distintos,
y aun así terminamos mirando el mismo cielo.` },

    { titulo: 'Tu nombre', texto:
`Tu nombre es la palabra más corta que conozco
y la única que me tiembla al decirla.
Lo repito bajito cuando nadie escucha,
como quien reza sin saber la oración completa.` },

    { titulo: 'Costumbre', texto:
`No fue un rayo, fue una costumbre:
despertar y buscarte en el teléfono,
reírme sola de algo que dijiste,
guardarte la última galleta del paquete.` },

    { titulo: 'Distancia', texto:
`Hay kilómetros entre tus manos y las mías,
pero no hay distancia que alcance
para lo que siento cuando dices "buenas noches"
y el mundo, por un rato, se ordena.` },

    { titulo: 'La primera vez', texto:
`No recuerdo qué dijiste aquel día.
Recuerdo que me reí demasiado,
que hablé más de la cuenta,
y que al llegar a casa supe que algo había cambiado para siempre.` },

    { titulo: 'Tu risa', texto:
`Tu risa es el único sonido
que me hace olvidar el ruido de todo lo demás.
Si existiera una manera de grabarla,
la escucharía en los días en que todo sale mal.` },

    { titulo: 'Silencio', texto:
`Contigo aprendí que el silencio no es vacío.
Es estar juntos sin necesitar pruebas,
es respirar al mismo ritmo,
es no tener que llenar nada.` },

    { titulo: 'Promesa', texto:
`No te prometo días fáciles.
Te prometo estar cuando no lo sean,
quedarme cuando quieras echarte,
y sostenerte incluso cuando no me dejes.` },

    { titulo: 'Detalle', texto:
`Me di cuenta de que te quería
el día que recordaste cómo tomo el café.
Nadie había prestado tanta atención
a una cosa tan pequeña y tan mía.` },

    { titulo: 'Madrugada', texto:
`Las tres de la mañana y seguimos hablando,
como si el sueño fuera una deuda ajena.
Contigo el cansancio no pesa:
me pesa más la idea de colgar.` },

    { titulo: 'Mapa', texto:
`Si me pidieran dibujar el camino
que me trajo hasta aquí,
no sabría explicar los desvíos.
Solo señalaría el final y diría: valió la pena.` },

    { titulo: 'Refugio', texto:
`Hay tormentas que no se ven en el clima:
son las que uno trae por dentro.
Y tú, sin saberlo, fuiste el techo
donde por fin dejé de mojarme.` },

    { titulo: 'Espera', texto:
`No tengo prisa si el destino eres tú.
Puedo esperar los meses que hagan falta,
porque hay cosas que llegan tarde
pero llegan exactamente cuando debían.` },

    { titulo: 'Tu voz', texto:
`Podría reconocer tu voz en una multitud,
aunque hablaras en otro idioma.
Hay sonidos que el cuerpo aprende antes
de que la cabeza entienda por qué.` },

    { titulo: 'Nosotros', texto:
`No sé en qué momento dejamos de ser dos
y empezamos a ser un nosotros.
Solo sé que ahora, cuando pienso en futuro,
apareces en todos los planes.` },

    { titulo: 'Cicatrices', texto:
`Llegaste cuando yo ya no buscaba nada,
con mis heridas puestas y sin ganas de esconderlas.
Y en vez de asustarte,
te sentaste al lado y me preguntaste cómo estaba.` },

    { titulo: 'Enero', texto:
`Te conocí un mes cualquiera,
sin planes y sin aviso.
Y ahora ese mes tiene tu nombre
en todos los calendarios que me quedan.` },

    { titulo: 'Carta', texto:
`Escribí esta carta tres veces
y las tres me pareció poco.
Cómo explicar en palabras
lo que no me cabe ni en el pecho.` },

    { titulo: 'Espejo', texto:
`Me miro y me reconozco distinto:
más tranquilo, menos a la defensiva.
No sé qué hiciste, pero desde que estás
me llevo mejor conmigo.` },

    { titulo: 'Café', texto:
`Dos tazas, la mesa chica,
y tú contándome cosas sin importancia.
No necesito más para saber
que esto es lo más parecido a la felicidad.` },

    { titulo: 'Abrazo', texto:
`Hay abrazos que duran segundos
y otros que arreglan el día entero.
Los tuyos son de los segundos,
pero me duran hasta el día siguiente.` },

    { titulo: 'Miedo', texto:
`Tengo miedo, no te voy a mentir.
Miedo de querer tanto y tan rápido,
miedo de que esto sea demasiado bueno.
Pero me quedo. Con miedo y todo, me quedo.` },

    { titulo: 'Tu mano', texto:
`Tu mano en la mía no es un gesto:
es un idioma completo.
Ahí caben el "estoy aquí",
el "no te suelto" y el "vamos".` },

    { titulo: 'Plan', texto:
`No tengo un plan contigo.
Tengo ganas, que es distinto
y probablemente más sincero:
las ganas no se ensayan.` },

    { titulo: 'Pequeño', texto:
`Me enamoré de cosas pequeñas:
de cómo dices mi nombre,
de cómo te ríes tapándote la boca,
de cómo me guardas el último bocado.` },

    { titulo: 'Regalo', texto:
`No quiero regalos caros.
Quiero tus domingos aburridos,
tus mensajes de buenos días,
y esa manía tuya de preguntarme si comí.` },

    { titulo: 'Tormenta', texto:
`Afuera llueve y no me importa.
Adentro estás tú hablando de nada
y yo mirándote como si fueras
la única cosa importante del mundo.` },

    { titulo: 'Antes', texto:
`Antes de ti yo creía en el amor
como se cree en los cuentos: de lejos.
Ahora lo creo como se cree en la lluvia:
porque me moja y no lo puedo negar.` },

    { titulo: 'Después', texto:
`Si un día esto se termina,
quiero que sepas algo:
no me voy a arrepentir de haberte querido.
Me voy a arrepentir de no habértelo dicho más.` },

    { titulo: 'Coincidir', texto:
`Coincidir contigo fue suerte.
Elegirte todos los días
ya no lo es: es decisión,
y es la más fácil que tomo.` },

    { titulo: 'Tu sueño', texto:
`Te quedaste dormido hablando
y yo me quedé despierto escuchándote respirar.
Hay paz en esa escena
que no cambio por ninguna fiesta.` },

    { titulo: 'Casa', texto:
`Casa no es un lugar con techo.
Casa es donde me conocen el pedido,
donde me guardan la luz prendida,
donde alguien pregunta por qué llegué tarde.` },

    { titulo: 'Rutina', texto:
`Te quiero en lo cotidiano:
en el supermercado, en la fila del banco,
en el mensaje de "ya llegué",
en el "te aviso cualquier cosa".` },

    { titulo: 'Verso', texto:
`No soy bueno con las palabras,
pero contigo lo intento.
Y si este poema no sale perfecto,
que se note al menos que era sincero.` },

    { titulo: 'Raíz', texto:
`Te fuiste creciendo despacio,
como crecen las cosas importantes:
sin que yo me diera cuenta,
hasta que ya no supe vivir sin ti.` },

    { titulo: 'Mirada', texto:
`Me miraste distinto ese día
y entendí todo sin que hablaras.
Hay conversaciones enteras
que ocurren en dos segundos de ojos.` },

    { titulo: 'Vértigo', texto:
`Quererte da vértigo, no lo niego.
Es asomarse a algo que no controlo
y aun así decidir saltar,
porque abajo estás tú y eso alcanza.` },

    { titulo: 'Nunca', texto:
`Nunca me había pasado esto:
extrañar a alguien que acabo de ver.
Y ya vas entendiendo
que contigo las reglas no me sirven.` },

    { titulo: 'Siempre', texto:
`No sé si existe el siempre.
Pero si existe, quiero que tenga tu cara,
tus mañanas de mal humor
y tus abrazos sin motivo.` },

    { titulo: 'Silencio bueno', texto:
`Hay silencios que incomodan
y silencios que acompañan.
Los nuestros son de los segundos:
esos en los que no hace falta llenar nada.` },

    { titulo: 'Primavera', texto:
`Contigo todo florece antes de tiempo.
Llegaste en mi invierno
y sin hacer ruido
me llenaste de cosas verdes.` },

    { titulo: 'Elegirte', texto:
`Te elijo con tus días malos,
con tus miedos y tus manías.
Te elijo sabiendo lo que cuesta
y lo volvería a elegir mañana.` },

    { titulo: 'Ganas', texto:
`Tengo ganas de verte sin motivo,
de abrazarte sin fecha,
de quedarme sin prisa.
Tengo ganas, y eso ya es bastante.` },

    { titulo: 'Tu foto', texto:
`Guardo tu foto sin decirte.
La miro cuando el día se pone feo
y me acuerdo de que existe alguien
que hace que todo valga la pena.` },

    { titulo: 'Sin prisa', texto:
`Vamos despacio, que no hay apuro.
Las cosas buenas no corren:
se quedan esperando
a que uno esté listo para recibirlos.` },

    { titulo: 'Canción', texto:
`Hay canciones que ahora son tuyas.
Las escucho y apareces,
aunque no tengan nada que ver contigo.
O tal vez sí, y yo no me había dado cuenta.` },

    { titulo: 'Contigo', texto:
`Contigo aprendí que querer bien
no es apretar ni vigilar.
Es dejar la puerta abierta
y que igual elijan quedarse.` },

    { titulo: 'Última', texto:
`Si este fuera el último poema,
te diría lo esencial:
gracias por los días comunes,
que fueron los mejores de todos.` },

    { titulo: 'Amanecer', texto:
`Amanece y lo primero que hago
es acordarme de que existes.
No sé qué hice para merecerlo,
pero pienso aprovecharlo.` },

    { titulo: 'Quedarme', texto:
`Me quedo. No por costumbre,
no por miedo a empezar de cero.
Me quedo porque cuando llegas
todo lo demás se pone en su lugar.` }
];

/** Historial por chat para no repetir poemas seguidos. */
const historial: Record<string, number[]> = ((global as any).poemaHistorial ||= {});
const MEMORIA = 15;

export default {
    command: ['poema', 'poemas', 'poemita'],
    description: 'Un poema para enamorar, al azar entre 50',
    category: 'fun',
    group: false,

    run: async ({ chat, m, sock, usedPrefix, prefix, args }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const dev = (config as any).devName || 'AKAME-MD';

        // .poema 7 -> ese poema en concreto
        const pedido = parseInt(args?.[0]);
        let poema: Poema;
        let idx: number;

        if (!isNaN(pedido) && pedido >= 1 && pedido <= POEMAS.length) {
            idx = pedido;
            poema = POEMAS[idx - 1];
        } else {
            if (!historial[chat]) historial[chat] = [];
            const usados = historial[chat];
            const disponibles = POEMAS.map((_, i) => i + 1).filter((n) => !usados.includes(n));
            const pool = disponibles.length ? disponibles : POEMAS.map((_, i) => i + 1);
            if (!disponibles.length) historial[chat] = [];

            idx = pool[Math.floor(Math.random() * pool.length)];
            poema = POEMAS[idx - 1];

            historial[chat].push(idx);
            if (historial[chat].length > MEMORIA) historial[chat].shift();
        }

        const txt =
`╭─〔 🥀 ${poema.titulo.toUpperCase()} 〕─
│ ✧ Poema *${idx}* de ${POEMAS.length}
╰───────────────

${poema.texto}

> ✧ ¿Otro? *${p}poema*  ·  ¿Uno exacto? *${p}poema ${idx === POEMAS.length ? 1 : idx + 1}*
> ✧ By *${dev}* ♡`;

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
