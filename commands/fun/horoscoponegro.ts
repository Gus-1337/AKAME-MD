import { UserJid } from '#simple';
import { generarHoroscopoCard } from '../../lib/horoscopo-card.ts';

const signos = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];

const predicciones: Record<string, { amor: string[]; dinero: string[]; trabajo: string[]; salud: string[]; amistad: string[] }> = {
    aries: {
        amor: [
            "Hoy vas a discutir con tu pareja por algo pequeño y vas a ser tú el que no pide perdón primero.",
            "Alguien te va a escribir de nuevo después de meses. Lo vas a contestar, y ya sabes cómo termina eso.",
            "Tu impulsividad va a hacer que digas algo que no sientes. Esa frase la van a recordar.",
            "Si tienes pareja, la vas a sorprender con un plan. Si no, vas a coquetear con quien no te conviene.",
            "Vas a quedarte esperando un mensaje que no llega. Mejor deja el celular y sal a caminar.",
            "Tu orgullo te va a costar una cita. Di 'perdón' antes de que sea tarde.",
            "Hoy vas a terminar algo en caliente. Pásale tu enojo al gimnasio, no a tu crush."
        ],
        dinero: [
            "Vas a comprar algo por impulso que no necesitas. Revisa tu cuenta antes de pagar.",
            "Hoy te llega una cuenta que se te había olvidado. Pagarla cuesta menos que el recargo.",
            "Un gasto imprevisto te va a sacar de tu presupuesto de la semana.",
            "Vas a prestar dinero y no lo vas a recuperar. Dilo claro o no lo prestes.",
            "Hoy vale más guardar que gastar. Espera 24 horas antes de cualquier compra grande.",
            "Vas a ganar algo de plata extra, pero se va a ir en una salida de amigos."
        ],
        trabajo: [
            "Vas a discutir con tu jefe o con un compañero por una tarea mal entregada. Respira antes de responder.",
            "Te van a pedir algo urgente y lo vas a dejar para el final. Mala idea.",
            "Hoy tu idea va a ser buena, pero vas a presentarla mal y nadie la va a notar.",
            "Vas a terminar un pendiente que llevabas días postergando. Te vas a sentir liberado.",
            "Te van a dar más trabajo del que puedes hacer. Di que no a una tarea para cumplir bien las demás.",
            "Vas a quedarte hasta tarde por un error ajeno. Anótalo para después."
        ],
        salud: [
            "Dormiste poco y se nota. Tu cuerpo te va a pasar la factura en la tarde.",
            "Vas a tener dolor de cabeza si sigues con la pantalla hasta la madrugada.",
            "Hoy vas a comer mal y sin hambre. Toma agua y come algo de verdad.",
            "Tu mal humor viene de no comer a tiempo. Desayuna antes de discutir con alguien.",
            "Un poco de ejercicio hoy te va a quitar el estrés que llevas acumulando."
        ],
        amistad: [
            "Un amigo te va a pedir un favor y te va a costar decir que no. Hazlo igual.",
            "Hoy vas a hablar de más de alguien a sus espaldas. Te van a enterar.",
            "Vas a pelear con tu mejor amigo por una tontería. Se arregla si uno llama primero.",
            "Te van a invitar a un plan y vas a cancelar. Te van a dejar de invitar.",
            "Hoy conoces a alguien con quien vas a conectar más de lo que esperabas."
        ]
    },
    tauro: {
        amor: [
            "Tu terquedad va a alejar a alguien que sí te quiere. Escucha más, discute menos.",
            "Si estás soltero, vas a seguir esperando a la persona perfecta. Mientras tanto, pasa la noche sin plan.",
            "Tu pareja te va a pedir más tiempo y tú vas a responder con silencio.",
            "Hoy vas a decir 'te quiero' por primera vez en mucho tiempo. Te va a sorprender cómo lo toman.",
            "Vas a sentir celos sin motivo real. Pregunta antes de imaginar cosas."
        ],
        dinero: [
            "Hoy vas a guardar algo de plata que te va a servir la próxima semana. Buen día para ahorrar.",
            "Un gasto en comida te va a costar más de lo que pensabas. Cocina en casa.",
            "Vas a pagar algo caro por comodidad. Revisa si de verdad lo necesitas.",
            "Te van a pedir un préstamo pequeño. Presta solo lo que puedas perder.",
            "Tu cuenta va a quedar justa esta semana. Anota todo lo que gastes hoy."
        ],
        trabajo: [
            "Vas a hacer tu trabajo con calma y tu jefe lo va a notar.",
            "Te van a pedir cambiar tu horario. Tu terquedad va a complicar algo que es fácil de resolver.",
            "Hoy vas a aprender algo nuevo que te va a servir más adelante.",
            "Vas a retrasar una decisión importante por miedo a equivocarte. Decide ya.",
            "Un proyecto va a avanzar lento, pero bien. No te desesperes."
        ],
        salud: [
            "Vas a comer de más por ansiedad. Hoy tu cuerpo te pide movimiento, no snacks.",
            "Tu cuello y tu espalda van a sentirse cargados por estar sentado mucho tiempo.",
            "Dormir temprano hoy te va a dar más energía que cualquier café.",
            "Hoy vas a tener antojo de algo dulce. Compra fruta y evita el paquete entero.",
            "Una caminata corta te va a quitar el mal humor de la tarde."
        ],
        amistad: [
            "Un amigo te va a ofrecer ayuda y tú vas a rechazarla por orgullo. Acéptala.",
            "Hoy vas a ser el que organiza el plan. Te van a agradecer, aunque no lo digan.",
            "Vas a ignorar un mensaje de un amigo por flojera. Respóndelo antes de la noche.",
            "Te van a contar un secreto. Guárdalo, o pierdes la confianza de ese grupo.",
            "Tus amigos te van a decir que eres muy cerrado. Hoy vas a demostrar que no."
        ]
    },
    geminis: {
        amor: [
            "Hoy vas a decir una cosa y hacer otra con tu pareja. Eso te va a costar una discusión.",
            "Alguien nuevo te va a gustar, pero vas a tardar en decirlo. Para cuando lo hagas, ya tiene pareja.",
            "Tu pareja va a notar que no estás presente en la conversación. Mira el celular menos.",
            "Vas a coquetear por mensaje con alguien que no te conviene. Cierra el chat.",
            "Hoy vas a tener una charla sincera que te va a acercar más a alguien."
        ],
        dinero: [
            "Vas a gastar en cosas pequeñas que suman mucho al final de la semana.",
            "Vas a vender algo que no te gusta y vas a ganar más de lo que esperabas.",
            "Revisa las suscripciones que pagas. Seguro hay una que no usas.",
            "Hoy te van a ofrecer un negocio rápido. Investígalo antes de firmar.",
            "Vas a cambiar de idea sobre una compra tres veces. Decide una y cúmplela."
        ],
        trabajo: [
            "Vas a empezar cinco cosas y terminar una. Enfócate en una hoy.",
            "Tus ideas van a ser buenas, pero vas a cambiar de rumbo antes de llegar al final.",
            "Vas a responder un correo a medias y te van a pedir aclaraciones. Léelo completo.",
            "Hoy vas a aprender a usar una herramienta que te va a ahorrar tiempo.",
            "Tu jefe va a notar que cambiaste de opinión sobre el proyecto. Avisa antes."
        ],
        salud: [
            "Vas a tomar demasiado café y vas a sentirte acelerado toda la tarde.",
            "Hoy vas a dormir mal por pensar en mil cosas. Apaga pantallas una hora antes.",
            "Te va a doler la garganta por hablar mucho. Toma agua tibia.",
            "Un poco de yoga o estiramiento hoy te va a calmar la cabeza.",
            "Vas a comer a deshoras. Trata de hacer tres comidas fijas."
        ],
        amistad: [
            "Vas a contar algo que te dijeron en confianza. Te van a dejar de contar cosas.",
            "Hoy vas a organizar un plan de último minuto y va a salir mejor de lo que esperabas.",
            "Un amigo va a estar molesto contigo por un mensaje mal entendido. Aclara rápido.",
            "Vas a hablar con cinco personas hoy y con ninguna vas a hablar de verdad.",
            "Alguien del pasado te va a escribir. Responde si quieres, pero sin expectativas."
        ]
    },
    cancer: {
        amor: [
            "Vas a extrañar a un ex hoy. Pero recuerda por qué terminaron antes de escribirle.",
            "Tu pareja te va a pedir espacio y tú lo vas a tomar como rechazo. No lo es.",
            "Hoy vas a sentirte muy sensible por un comentario simple. Pregunta qué quiso decir.",
            "Vas a pasar la noche pensando en una conversación que no pasó. Duerme y háblalo mañana.",
            "Alguien te va a demostrar cariño sin decirlo. Fíjate en los detalles."
        ],
        dinero: [
            "Vas a gastar en algo para sentirte mejor. Revisa si ese gasto te ayuda de verdad.",
            "Un ingreso extra te va a llegar de algo que hiciste hace tiempo.",
            "Vas a prestar dinero por lástima. Piénsalo dos veces.",
            "Hoy vas a comer afuera por ánimo. Cuidado con el gasto del mes.",
            "Tu cuenta va a estar estable si evitas compras de madrugada."
        ],
        trabajo: [
            "Vas a sentirte presionado en el trabajo y vas a cargar con más de lo que te toca.",
            "Tus compañeros van a notar tu buen trabajo. Acepta el reconocimiento.",
            "Vas a dejar un correo sin responder por miedo a equivocarte. Responde hoy.",
            "Hoy te van a dar feedback duro. Tómalo como información, no como ataque.",
            "Un proyecto va a salir mejor si lo haces con calma y sin prisa."
        ],
        salud: [
            "Vas a sentir un nudo en el estómago por la tarde. Respira y come algo liviano.",
            "Dormir mal te va a poner más emocional de lo normal. Acuéstate temprano.",
            "Hoy te va a venir bien tomar un baño caliente y descansar.",
            "Tu ansiedad va a subir si revisas redes toda la tarde. Mejor una caminata.",
            "Vas a tener sueño todo el día. Una siesta corta te va a ayudar."
        ],
        amistad: [
            "Vas a llorar por algo pequeño y tus amigos se van a preocupar. Diles cómo estás.",
            "Un amigo te va a pedir consejo y tú vas a dar el mejor que puedes.",
            "Vas a dejar de hablarle a alguien por un malentendido. Pregunta antes de cortar.",
            "Hoy vas a sentirte solo aunque tengas gente alrededor. Llama a alguien de confianza.",
            "Te van a invitar a un plan que no te gusta mucho. Ve un rato, te va a sorprender."
        ]
    },
    leo: {
        amor: [
            "Hoy vas a querer ser el centro de atención y tu pareja va a pedir un poco de espacio.",
            "Vas a subir una foto con tu pareja y te van a preguntar si todo está bien. Responde con calma.",
            "Alguien te va a halagar y vas a creerle más de lo que debes. Revisa la intención.",
            "Vas a ser muy generoso con tu pareja hoy. Te lo van a agradecer.",
            "Una discusión por celos va a terminar en una risa. Mejor."
        ],
        dinero: [
            "Vas a pagar la cuenta de todos para quedar bien. Hoy no es día para eso.",
            "Hoy vas a comprar algo caro para lucirte. Mejor espera.",
            "Un trabajo extra te va a dar plata y reconocimiento al mismo tiempo.",
            "Tu presupuesto va a aguantar si no sales de fiesta esta noche.",
            "Vas a prestar ropa o cosas caras y te van a devolver algo dañado."
        ],
        trabajo: [
            "Vas a querer liderar una reunión hoy. Escucha a los demás antes de decidir.",
            "Tus ideas van a sonar bien, pero necesitas datos para convencer.",
            "Tu jefe va a valorar tu energía, pero te va a pedir más calma.",
            "Vas a presentar algo y te van a aplaudir. Aprovecha el impulso.",
            "Una tarea va a salir perfecta si la divides en partes pequeñas."
        ],
        salud: [
            "Vas a comer de más en la noche. Tu cuerpo te va a pedir descanso.",
            "Hoy vas a sentirte con energía, aprovecha para entrenar.",
            "Te van a doler los pies por caminar mucho. Usa zapatos cómodos.",
            "Tu estrés va a subir si quieres controlarlo todo. Delega algo.",
            "Una buena siesta hoy te va a cambiar el ánimo."
        ],
        amistad: [
            "Vas a hacer un chiste que va a incomodar a alguien. Pide disculpas si pasa.",
            "Tus amigos van a querer tu opinión. Dásela, pero con cuidado.",
            "Hoy vas a organizar la salida del grupo y todos van a ir. Felicidades.",
            "Alguien va a sentirse ignorado por ti. Escríbele aunque sea un mensaje corto.",
            "Vas a conocer a alguien que te va a caer muy bien en una fiesta."
        ]
    },
    virgo: {
        amor: [
            "Hoy vas a criticar algo de tu pareja que no era tan importante. Déjalo pasar.",
            "Vas a esperar a que todo sea perfecto para decir lo que sientes. Mejor dilo ya.",
            "Alguien te va a gustar por cómo organiza las cosas. Tómate tu tiempo para conocerlo.",
            "Tu pareja va a agradecer que hoy estés atento a sus detalles.",
            "Vas a pelear por un plan que no cambia nada. Acepta el plan del otro."
        ],
        dinero: [
            "Hoy vas a revisar tus gastos y vas a encontrar algo que puedes recortar.",
            "Vas a comprar algo para organizar tu casa. Esa compra sí vale la pena.",
            "Un gasto médico o de salud te va a obligar a mover tu presupuesto.",
            "Vas a ahorrar más de lo normal por tu método de anotar todo.",
            "Te van a cobrar de más en algo. Revisa la factura antes de pagar."
        ],
        trabajo: [
            "Vas a encontrar un error en un proyecto ajeno y lo vas a corregir sin avisar. Avisa.",
            "Tu orden va a salvar una reunión que estaba desorganizada.",
            "Hoy vas a querer revisar todo tres veces. Entrega lo que ya está bien.",
            "Te van a pedir un informe y lo vas a tener listo antes de tiempo.",
            "Vas a quedarte pegado en un detalle pequeño y se te va a pasar la fecha."
        ],
        salud: [
            "Vas a preocuparte por tu salud más de lo necesario. Un chequeo rutinario te va a calmar.",
            "Tu estómago va a estar sensible hoy. Come sin apuro y evita lo muy grasoso.",
            "Hoy vas a dormir bien si te desconectas del trabajo a tiempo.",
            "Un poco de estiramiento te va a quitar la tensión del cuello.",
            "Vas a sentir cansancio por tanto pensar. Haz una pausa."
        ],
        amistad: [
            "Vas a corregir a un amigo en público. Hazlo en privado la próxima vez.",
            "Hoy te van a pedir ayuda con algo y vas a responder con detalle. Lo van a agradecer.",
            "Vas a juzgar a alguien por una mala impresión. Dale otra oportunidad.",
            "Un amigo va a contarte un problema y vas a querer resolverlo ya. Escucha primero.",
            "Vas a pasar un buen rato con alguien que no esperabas."
        ]
    },
    libra: {
        amor: [
            "Vas a dejar que decida tu pareja todo el día y después te vas a quejar. Decide algo tú.",
            "Alguien te va a coquetear y vas a responder por no quedar mal. Cuidado.",
            "Tu pareja va a pedir una definición y tú vas a seguir dudando.",
            "Hoy vas a tener una cita tranquila que te va a gustar más de lo que esperabas.",
            "Vas a perdonar algo que te molestó por no discutir. Ponlo sobre la mesa."
        ],
        dinero: [
            "Vas a dudar tanto con una compra que se va a agotar. Ya compra o déjalo.",
            "Vas a dividir la cuenta con alguien que consumió más. Pide que se separe.",
            "Hoy vas a hacer un gasto que te va a dejar tranquilo. Vale la pena.",
            "Un pago pendiente te va a esperar hasta fin de mes. Págalo antes.",
            "Tu presupuesto va a estar bien si no compras por aparentar."
        ],
        trabajo: [
            "Te van a pedir decidir entre dos proyectos. Elige uno y explica por qué.",
            "Vas a ser buen mediador en una discusión del equipo.",
            "Vas a quedarte pensando una decisión toda la tarde. Pide opinión y avanza.",
            "Tu trabajo va a salir bien si lo presentas con orden y calma.",
            "Hoy te van a asignar una tarea que no querías. Hazla con buena cara."
        ],
        salud: [
            "Vas a tener dolor de cabeza por no decidir qué comer. Elige algo simple.",
            "Tu equilibrio va a estar bien si haces una caminata corta al aire libre.",
            "Hoy vas a dormir mejor que de costumbre si cenas temprano.",
            "Vas a tener algo de alergia o picazón. Evita lo que te cayó mal ayer.",
            "Un día de descanso te va a cambiar el ánimo para el resto de la semana."
        ],
        amistad: [
            "Vas a intentar quedar bien con todos y al final no vas a quedar bien con nadie. Sé directo.",
            "Un amigo te va a pedir una opinión sincera. Dásela con respeto.",
            "Hoy vas a pasar buen rato en un grupo que no esperabas.",
            "Vas a prometer un plan y no vas a poder ir. Avisa a tiempo.",
            "Alguien va a decirte algo que te va a hacer pensar mucho."
        ]
    },
    escorpio: {
        amor: [
            "Hoy vas a revisar el celular de tu pareja y te va a pesar. Pregunta en vez de investigar.",
            "Vas a guardar rencor por una discusión vieja. Suéltala si quieres avanzar.",
            "Tu intensidad va a asustar a alguien que recién conociste. Baja un poco el ritmo.",
            "Hoy vas a tener una conversación profunda que te va a hacer sentir cerca de alguien.",
            "Alguien del pasado te va a buscar. Piensa bien si quieres volver a abrir esa puerta."
        ],
        dinero: [
            "Vas a hacer una inversión pequeña que te va a dar buena vuelta.",
            "Vas a prestar dinero con condiciones y te va a costar cobrarlo.",
            "Revisa los cobros automáticos de tu tarjeta. Hay uno que no reconoces.",
            "Hoy vas a ganar algo por una negociación que hiciste con calma.",
            "Un gasto por rencor te va a salir caro. No compres por venganza."
        ],
        trabajo: [
            "Vas a notar algo raro en el trabajo y vas a tener razón. Pregunta con cuidado.",
            "Tu capacidad para investigar a fondo te va a servir en un problema complicado.",
            "Vas a cerrar un tema que llevabas meses sin resolver.",
            "Te van a pedir un informe detallado. Hazlo, te va a dar visibilidad.",
            "Tu jefe va a notar tu seriedad. Mantén ese perfil."
        ],
        salud: [
            "Vas a sentir tensión en la mandíbula por apretar los dientes. Relájate.",
            "Dormir poco hoy te va a poner más irritable. Acuéstate a una hora fija.",
            "Hoy tu cuerpo va a pedir agua y comida liviana.",
            "Una sesión de ejercicio intenso te va a dar la energía que necesitas.",
            "Vas a sentir dolor de espalda por cargar peso. Pide ayuda."
        ],
        amistad: [
            "Vas a guardar un secreto que te pesa. Compártelo con alguien de confianza.",
            "Vas a desconfiar de un amigo sin tener pruebas. Habla con él antes de juzgar.",
            "Hoy vas a tener un amigo que te va a apoyar en algo difícil.",
            "Vas a cortar una amistad tóxica. Te va a aliviar, aunque duela.",
            "Tu lealtad va a ser lo que más valoren de ti."
        ]
    },
    sagitario: {
        amor: [
            "Vas a prometer ir a una cita y vas a cancelar a último minuto. Avisa con tiempo.",
            "Alguien va a notar tu energía y se va a acercar. Déjalo fluir.",
            "Hoy vas a querer un plan distinto y tu pareja va a preferir quedarse en casa. Negocien.",
            "Vas a conocer a alguien en un viaje corto o una salida nueva.",
            "Vas a decir algo muy directo que va a incomodar. Piensa un poco antes de hablar."
        ],
        dinero: [
            "Vas a gastar en un viaje o salida y te va a quedar poco para la semana.",
            "Hoy te van a pagar algo que tenías pendiente. Usa esa plata con cabeza.",
            "Vas a pedir un préstamo para algo que no es urgente. Espera.",
            "Tu cuenta va a estar bien si no compras cosas por impulso de viaje.",
            "Vas a encontrar una oferta buena. Revísala antes de comprar."
        ],
        trabajo: [
            "Vas a empezar un proyecto nuevo con mucho entusiasmo. Termina uno antes de empezar otro.",
            "Tu jefe va a pedirte que te concentres. Vas a sentir que te frenan.",
            "Vas a dar una idea que va a sorprender a todos. Presenta el plan completo.",
            "Te van a invitar a un curso o charla. Vale la pena ir.",
            "Vas a entregar algo a medias por ganas de irte. Termínalo primero."
        ],
        salud: [
            "Vas a tomar más de lo normal en la noche. Cuida tu cuerpo mañana.",
            "Tu energía va a estar alta. Haz deporte antes de que se vaya.",
            "Vas a sentir molestia en las piernas después de caminar mucho.",
            "Hoy vas a dormir tarde por la emoción. Igual descansa.",
            "Un día al aire libre te va a sentar bien."
        ],
        amistad: [
            "Vas a hacer un chiste que va a herir a alguien. Piensa antes de hablar.",
            "Tus amigos van a querer viajar contigo. Di sí, si puedes.",
            "Vas a dejar plantado a alguien por irte de plan. Avisa antes.",
            "Hoy vas a conocer a alguien con quien vas a compartir muchas aventuras.",
            "Un amigo va a pedirte que seas más constante. Escúchalo."
        ]
    },
    capricornio: {
        amor: [
            "Vas a estar tan metido en el trabajo que tu pareja va a sentirse olvidada. Haz un espacio hoy.",
            "Hoy vas a ser muy frío con alguien que te quiere. Dile algo bonito.",
            "Vas a tener una cita tranquila y te va a gustar más de lo que pensabas.",
            "Tu pareja va a esperar un detalle y tú vas a olvidarlo. Haz el detalle.",
            "Alguien te va a hablar con interés y tú vas a responder con poco entusiasmo."
        ],
        dinero: [
            "Vas a ahorrar más de lo normal si evitas comprar cosas por estrés.",
            "Un gasto de trabajo te va a salir del bolsillo. Pide reembolso.",
            "Hoy te van a pagar un bono o un pago extra.",
            "Revisa tus metas de ahorro. Vas bien, pero no te confíes.",
            "Vas a invertir en algo a largo plazo. Buena decisión."
        ],
        trabajo: [
            "Vas a trabajar todo el fin de semana sin que te lo agradezcan. Pon límites.",
            "Tu disciplina va a dar frutos. Te van a elegir para algo importante.",
            "Vas a sentirte presionado por una fecha. Haz una lista y ve paso a paso.",
            "Vas a delegar una tarea y te va a sorprender el resultado.",
            "Tu jefe va a notar tu constancia. Pide una reunión para hablar de tu crecimiento."
        ],
        salud: [
            "Tu estrés va a subir con las responsabilidades. Tómate un descanso real.",
            "Vas a tener rigidez en la espalda por estar sentado. Estírate cada dos horas.",
            "Hoy vas a comer rápido y mal por falta de tiempo. Planifica tu comida.",
            "Dormir bien hoy te va a ayudar a rendir más mañana.",
            "Un chequeo médico que tenías pendiente te va a dar tranquilidad."
        ],
        amistad: [
            "Vas a cancelar una salida por trabajo. Tus amigos lo van a entender si avisas.",
            "Hoy vas a hablar poco en el grupo y te van a preguntar si estás bien.",
            "Un amigo va a necesitar tu consejo. Tu experiencia le va a servir.",
            "Vas a conocer a alguien que comparte tu forma de pensar.",
            "Tus amigos van a notar que has cambiado. Háblalo con ellos."
        ]
    },
    acuario: {
        amor: [
            "Vas a decir que no te importa tu pareja, pero sí te importa. Dilo con claridad.",
            "Hoy vas a querer más libertad y tu pareja va a sentir que se aleja. Negocien.",
            "Alguien va a notar tu forma de pensar y te va a invitar a salir.",
            "Vas a dejar una relación que ya no te hace bien. Te va a costar, pero es lo correcto.",
            "Tu lado frío va a confundir a alguien. Explica lo que sientes."
        ],
        dinero: [
            "Vas a comprar algo raro o nuevo por curiosidad. Revisa si de verdad lo usarás.",
            "Un ingreso inesperado te va a llegar por un proyecto pequeño.",
            "Vas a gastar en tecnología. Espera antes de comprar.",
            "Tu presupuesto va a estar bien si no pagas suscripciones que no usas.",
            "Vas a ayudar a alguien con dinero y te va a salir bien."
        ],
        trabajo: [
            "Vas a proponer una idea diferente y va a generar debate. Defiéndela con datos.",
            "Te van a pedir hacer algo de forma tradicional. Busca tu manera, pero cumple.",
            "Vas a trabajar mejor solo que en equipo hoy. Avisa al resto.",
            "Tu creatividad va a resolver un problema que nadie podía resolver.",
            "Vas a tener muchas ideas y ninguna terminada. Elige una."
        ],
        salud: [
            "Vas a sentirte desconectado del cuerpo. Camina y respira aire fresco.",
            "Dormirás raro hoy por pensar demasiado. Escribe lo que te preocupa antes de dormir.",
            "Tu digestión va a estar algo pesada. Come liviano.",
            "Un poco de música o arte te va a quitar el estrés.",
            "Vas a sentirte cansado por no tener una rutina fija. Ponle horario a tu día."
        ],
        amistad: [
            "Vas a estar distante con tus amigos hoy. Escríbeles algo, aunque sea breve.",
            "Un amigo te va a pedir un favor raro. Acepta si puedes.",
            "Vas a conocer a alguien en un grupo diferente al tuyo y se va a dar buena conexión.",
            "Hoy vas a dar tu opinión sin filtro y alguien se va a molestar.",
            "Tus amigos van a valorar tu forma de ser, aunque no siempre lo digas."
        ]
    },
    piscis: {
        amor: [
            "Vas a idealizar a alguien y después te vas a dar cuenta de que no es así. Conócelo mejor.",
            "Hoy vas a sentir mucho cariño por tu pareja. Demuéstralo con algo concreto.",
            "Alguien te va a escribir para hablar de algo serio. Escucha antes de contestar.",
            "Vas a llorar por algo de tu relación. Habla con tu pareja antes de cerrar el tema.",
            "Un mensaje de alguien del pasado te va a mover el ánimo toda la tarde."
        ],
        dinero: [
            "Vas a gastar en algo que te haga sentir bien por un rato. Cuida el presupuesto.",
            "Vas a prestar dinero a alguien que te cuenta una historia triste. Haz una revisión antes.",
            "Hoy vas a recibir un pago que estabas esperando hace tiempo.",
            "Tu cuenta va a estar justa si pides comida a domicilio todos los días.",
            "Vas a encontrar algo barato que te va a gustar mucho."
        ],
        trabajo: [
            "Vas a estar distraído toda la mañana. Haz primero lo más importante.",
            "Te van a pedir opinión sobre un proyecto y tu intuición va a ser muy buena.",
            "Vas a dejar una tarea para otro día y se va a acumular. Hazla hoy.",
            "Tu creatividad va a salvar un trabajo que estaba estancado.",
            "Un compañero va a pedirte ayuda. Dásela, te va a devolver el favor."
        ],
        salud: [
            "Vas a dormir demasiado y te vas a levantar cansado. Pon una alarma.",
            "Tu ánimo va a bajar si pasas mucho tiempo solo. Sal a caminar.",
            "Vas a tener sueño en la tarde. Toma agua y muévete un rato.",
            "Hoy te va a hacer bien hacer algo con las manos, como cocinar.",
            "Tus emociones van a estar a flor de piel. Descansa sin culpa."
        ],
        amistad: [
            "Vas a ser el que escucha a todos hoy. Cuida también tu propio ánimo.",
            "Un amigo te va a pedir apoyo emocional. Acompáñalo.",
            "Vas a sentir que nadie te entiende. Habla con alguien de confianza.",
            "Hoy vas a conocer a alguien muy sensible como tú. Se va a dar buena conexión.",
            "Vas a dejar de contestar a un grupo. Avisa si necesitas espacio."
        ]
    }
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

        const areas: Record<string, string> = { amor: 'Amor', dinero: 'Dinero', trabajo: 'Trabajo', salud: 'Salud', amistad: 'Amistad' };
        const claves = Object.keys(areas);
        const area = claves[Math.floor(Math.random() * claves.length)];
        const lista = predicciones[signo][area as keyof typeof areas] as string[];
        const prediccion = lista[Math.floor(Math.random() * lista.length)];
        const numero = Math.floor(Math.random() * 99) + 1;
        const color = colores[Math.floor(Math.random() * colores.length)];

        const emojiSigno: any = {
            aries: '♈', tauro: '♉', geminis: '♊', cancer: '♋',
            leo: '♌', virgo: '♍', libra: '♎', escorpio: '♏',
            sagitario: '♐', capricornio: '♑', acuario: '♒', piscis: '♓'
        };

        const texto = `*_☑︎ HORÓSCOPO NEGRO ☑︎_*\n\n> ▸ *Signo:* ${signo.toUpperCase()} ${emojiSigno[signo] || '♋'}\n> ▸ *Usuario:* ${targetName}\n\n> 🔮 *${areas[area]}:*\n> "${prediccion}"\n\n> 💀 *Número de la mala suerte:* ${numero}\n> 🎨 *Color de la desgracia:* ${color}`;

        try {
            const png = await generarHoroscopoCard({
                signo: signo.toUpperCase(),
                simbolo: emojiSigno[signo] || '♋',
                usuario: targetName,
                area: areas[area],
                prediccion,
                numero,
                color
            });
            await sock.sendMessage(chat, { image: png, caption: texto }, { quoted: m });
        } catch (err: any) {
            console.error('[HORO] tarjeta falló, se manda texto:', err?.message);
            await sock.sendMessage(chat, { text: texto }, { quoted: m });
        }
    }
};
