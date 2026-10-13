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
todo lo demás se pone en su lugar.` },

    { titulo: 'Eclipse', texto:
`El día se oscureció de golpe
y nadie entendió nada.
Yo sí: era yo,
apagándome un poco cuando te ibas.` },

    { titulo: 'Brújula', texto:
`Perdí el norte hace tiempo
y no me dio pena.
Desde que estás tú
todas mis direcciones apuntan al mismo lado.` },

    { titulo: 'Marea', texto:
`Vuelvo siempre, como vuelve el mar.
No porque no sepa irme,
sino porque cada vez que me alejo
algo me tira de la orilla hacia ti.` },

    { titulo: 'Ceniza', texto:
`De lo que fuimos quedó poco,
pero ese poco quema.
Así son las cosas importantes:
se terminan y siguen calientes.` },

    { titulo: 'Umbral', texto:
`Estuve en la puerta mucho tiempo
mirando lo que había del otro lado.
Entrar fue lo más valiente que hice,
y ni siquiera lo pensé.` },

    { titulo: 'Alba', texto:
`Amanece y no te tengo al lado,
pero igual el día empieza bien.
Saber que existís
ya es una manera de tener la luz prendida.` },

    { titulo: 'Ocaso', texto:
`Se va el sol y pienso en ti,
como si fueras parte del paisaje.
Y capaz que lo eres:
hay personas que son un horario.` },

    { titulo: 'Vendaval', texto:
`Llegaste como viento fuerte:
sin avisar y moviendo todo.
Cuando paró la tormenta
ya nada estaba en su lugar, y estaba mejor.` },

    { titulo: 'Calma', texto:
`No busco fuegos artificiales.
Busco esa paz rara de estar con alguien
y no sentir que tengo que actuar
ni demostrar nada.` },

    { titulo: 'Raíces', texto:
`Te fuiste metiendo despacio,
como se meten las cosas hondas.
Hoy trato de arrancarte de mi rutina
y me doy cuenta de que ya eres parte del suelo.` },

    { titulo: 'Alas', texto:
`No viniste a recortarme las alas.
Viniste a volar al lado,
que es muy distinto
y mucho más difícil de encontrar.` },

    { titulo: 'Faro', texto:
`Cuando todo se pone oscuro
eres lo único que no parpadea.
No sé cómo lo haces,
pero siempre sabes dónde estoy.` },

    { titulo: 'Puerto', texto:
`Navegué bastante tiempo solo
creyendo que así se vivía.
Después llegué a ti
y entendí para qué sirven los puertos.` },

    { titulo: 'Ancla', texto:
`No me atan tus brazos:
me sostiene lo que haces sin darte cuenta.
Un mensaje, una espera, un "avisame".
Eso es lo que no me deja ir.` },

    { titulo: 'Vela', texto:
`Me voy gastando de a poco
y no me importa si es por ti.
Hay velas que se consumen
iluminando algo que vale la pena.` },

    { titulo: 'Mecha', texto:
`Conmigo no hubo explosión.
Hubo una mecha lenta,
de esas que tardan meses
y cuando llegan, llegan para quedarse.` },

    { titulo: 'Chispa', texto:
`Fue una tontería lo que dijiste.
Una tontería que me hizo reír
y que después, sin permiso,
se me quedó dando vueltas toda la semana.` },

    { titulo: 'Fuego lento', texto:
`Lo nuestro no hirvió de una.
Se fue cocinando despacio,
con domingos aburridos y charlas largas,
que es como se hacen las cosas que duran.` },

    { titulo: 'Incendio', texto:
`Y un día miré alrededor
y estaba todo prendido.
No sé en qué momento pasó,
solo sé que no tuve ganas de apagarlo.` },

    { titulo: 'Humo', texto:
`De algunas personas queda humo:
se fueron y todavía se sienten.
De ti me quedó otra cosa,
pero también llena la habitación.` },

    { titulo: 'Torre', texto:
`Construí muros tan altos
que ya ni yo podía salir.
Vos no los rompiste:
te sentaste afuera y esperaste.` },

    { titulo: 'Puente', texto:
`Entre lo que soy y lo que quiero
hay un hueco enorme.
Vos apareciste justo ahí,
sin saber que estabas sirviendo de puente.` },

    { titulo: 'Camino', texto:
`No sé a dónde va esto
y por primera vez no me asusta.
Hay caminos que se hacen mejores
por quién va caminando al lado.` },

    { titulo: 'Atajo', texto:
`Busqué durante años el camino corto
para no sentir tanto.
No existe.
Y ahora, contigo, tampoco lo busco.` },

    { titulo: 'Ruta', texto:
`Kilómetros de nada,
la música baja y tú manejando.
No hablamos de nada importante
y fue de lo mejor que me pasó en el año.` },

    { titulo: 'Destino', texto:
`No creo en el destino.
Creo en las decisiones,
y yo sigo eligiendo
tomar todas las que me acercan a ti.` },

    { titulo: 'Equipaje', texto:
`Traigo cosas pesadas de antes:
miedos, manías, desconfianzas.
No te pedí que las cargaras
y aun así me ayudaste sin preguntar.` },

    { titulo: 'Pasaje', texto:
`Si me dieran un pasaje a cualquier lado
no elegiría un lugar.
Elegiría una fecha
en la que tú pudieras venir conmigo.` },

    { titulo: 'Andén', texto:
`Esperé trenes que no llegaban
y me acostumbré a esperar.
Después llegaste tú,
y resulta que no era cuestión de esperar más.` },

    { titulo: 'Vagón', texto:
`Iba solo en el mismo vagón de siempre
mirando por la misma ventana.
Te subiste en una estación cualquiera
y el viaje se puso interesante.` },
    { titulo: 'Tu sombra', texto:
`Camino y tu sombra va conmigo,
aunque estés a mil kilómetros.
Es raro cómo alguien puede
ocupar tanto espacio sin estar.` },

    { titulo: 'Insomnio', texto:
`Las cuatro de la mañana
y mi cabeza sigue encendida.
No es el café:
es que me acordé de cómo te reíste ayer.` },

    { titulo: 'Nostalgia', texto:
`Extraño versiones tuyas
que ya pasaron: la del primer día,
la que no sabía mi nombre,
la que todavía no me quería.` },

    { titulo: 'Retrato', texto:
`Si tuviera que dibujarte
no empezaría por la cara.
Empezaría por las manos,
que es donde más te reconozco.` },

    { titulo: 'Boceto', texto:
`Te tengo a medio terminar en la memoria:
me faltan gestos, tonos, silencios.
Por suerte cada vez que te veo
se me agrega una línea nueva.` },

    { titulo: 'Lienzo', texto:
`Llegué en blanco, sin nada pintado,
con la costumbre de no esperar colores.
No sé qué hiciste,
pero ahora todo me aparece contigo adentro.` },

    { titulo: 'Pincel', texto:
`Me tocaste sin querer,
como se toca algo por accidente,
y dejaste una marca
que ya no puedo cubrir.` },

    { titulo: 'Color', texto:
`Mi vida venía en tonos grises,
funcional, sin sobresaltos.
Llegaste y no la pintaste entera:
solo le pusiste color donde importaba.` },

    { titulo: 'Gris', texto:
`Hubo un tiempo en que todo daba igual.
Ni triste ni feliz: gris.
Después apareciste
y volví a tener preferencias.` },

    { titulo: 'Luz', texto:
`No viniste a salvarme de nada.
Viniste a prender una luz
y con eso alcanzó
para que yo viera por dónde salir.` },

    { titulo: 'Sombra', texto:
`También quiero tus partes oscuras,
las que no mostrás en las fotos.
Ahí es donde más te reconozco
y donde más quiero quedarme.` },

    { titulo: 'Eco', texto:
`Dijiste algo hace semanas
y me sigue rebotando.
Hay palabras que uno escucha una vez
y después repite solo, sin darse cuenta.` },

    { titulo: 'Sonido', texto:
`El mundo hace mucho ruido
y yo ando siempre medio saturado.
Tu voz es de los pocos sonidos
que en vez de sumar, ordenan.` },

    { titulo: 'Música', texto:
`No sé si me gusta la canción
o me gusta que la estés cantando mal.
Probablemente lo segundo,
y no pienso decírtelo.` },

    { titulo: 'Ritmo', texto:
`Caminamos distinto, hablamos distinto,
cada uno con su propio apuro.
Y sin embargo, no sé cómo,
terminamos llegando juntos a todos lados.` },

    { titulo: 'Compás', texto:
`Me marqué solo durante años
y salí siempre desacomodado.
Contigo por fin encuentro el tiempo,
aunque siga sin saber bailar.` },

    { titulo: 'Melodía', texto:
`Hay una melodía que no sé de dónde salió.
La tarareo cuando estoy bien
y me doy cuenta tarde
de que empezó el día que te conocí.` },

    { titulo: 'Acorde', texto:
`Soltos no sonábamos a nada.
Juntos, sin ensayar ni una vez,
salimos afinados.
Hay cosas que no se explican.` },

    { titulo: 'Voz baja', texto:
`Me hablas bajito cuando nadie escucha
y yo hago como que no noto nada.
Lo noto todo.
Y me gusta todo.` },

    { titulo: 'Susurro', texto:
`Me dijiste algo al oído
y se me olvidó responder.
No fue por lo que dijiste:
fue por cómo sonó tan cerca.` },

    { titulo: 'Grito', texto:
`Hay cosas que no se dicen gritando.
Te quiero así: en voz normal,
un martes cualquiera,
sin motivo ni fecha especial.` },

    { titulo: 'Callar', texto:
`Me guardé muchas palabras
por miedo a que sonaran mal.
Hoy prefiero decirlas torcidas
antes que seguir callándolas bien.` },

    { titulo: 'Decir', texto:
`Te quiero. Así, sin adornos.
Lo digo aunque me tiemble,
porque me cansé de que las cosas importantes
se queden sin decir.` },

    { titulo: 'Oír', texto:
`Escucharme es distinto a oírme.
Vos me escuchás:
te acuerdas después,
preguntas cómo salió eso que me preocupaba.` },

    { titulo: 'Pregunta', texto:
`Me preguntaste algo simple
y me desarmaste entero.
Nadie me había preguntado eso
con ganas reales de saber la respuesta.` },

    { titulo: 'Respuesta', texto:
`Si me preguntan por qué sonrío así,
no tengo una explicación elegante.
Tengo un nombre,
y con ese nombre alcanza.` },

    { titulo: 'Duda', texto:
`Dudo de casi todo:
de la suerte, de la gente, de mí.
De lo que siento por ti
es de lo único que no.` },

    { titulo: 'Certeza', texto:
`No sé qué va a pasar mañana
y no me voy a hacer el valiente.
Pero hay una cosa que sí sé,
y es que hoy quiero estar acá.` },

    { titulo: 'Verdad', texto:
`Te voy a decir la verdad:
no eres perfecto y yo tampoco.
Y justo eso es lo que me tranquiliza,
porque lo perfecto no se puede querer.` },

    { titulo: 'Mentira', texto:
`Me mentí mucho tiempo
diciendo que estaba bien solo.
Estaba acostumbrado, que no es lo mismo.
Y tú lo notaste enseguida.` },
    { titulo: 'Prometo', texto:
`No prometo no fallar.
Prometo avisar cuando falle,
quedarme a arreglarlo
y no salir corriendo cuando se ponga feo.` },

    { titulo: 'Juro', texto:
`No soy de jurar cosas,
me parece mucho compromiso.
Pero contigo haría una excepción,
y eso ya te dice bastante.` },

    { titulo: 'Quizás', texto:
`Quizás no dure para siempre.
Quizás sí.
Mientras tanto te quiero en presente,
que es el único tiempo que existe de verdad.` },

    { titulo: 'Tal vez', texto:
`Tal vez llegue tarde a tu vida,
o tal vez llegue justo.
No lo sé, pero no me voy
por miedo a averiguarlo.` },

    { titulo: 'Ojalá', texto:
`Ojalá te pase lo bueno
que vienes guardando hace rato.
Ojalá yo esté cerca
cuando por fin te toque.` },

    { titulo: 'Aunque', texto:
`Aunque me cueste,
aunque no salga como espero,
aunque a veces no te entienda:
me quedo, y eso ya es una respuesta.` },

    { titulo: 'Mientras', texto:
`Mientras tanto te quiero así,
sin garantías ni contrato.
Las cosas más honestas que tengo
no vienen con seguro.` },

    { titulo: 'Hasta', texto:
`No sé hasta cuándo.
Nadie sabe esas cosas.
Pero si me preguntan hoy,
hoy digo: hasta que quieras.` },

    { titulo: 'Desde', texto:
`Desde que estás soy más tranquilo.
No más feliz, que eso va y viene:
más tranquilo,
que me parece un lujo más raro.` },

    { titulo: 'Para siempre', texto:
`Siempre me pareció una palabra enorme,
de esas que se dicen sin pensar.
Ahora la digo despacio
y me doy cuenta de que la decía en serio.` },

    { titulo: 'Nunca más', texto:
`Nunca pensé que iba a extrañar
algo tan chico como tu mensaje de la noche.
Y ahora lo espero
como se esperan las cosas importantes.` },

    { titulo: 'Todo', texto:
`No te quiero a medias
ni en los ratos libres.
Te quiero entero y mal organizado,
que es como me salen las cosas de verdad.` },

    { titulo: 'Nada', texto:
`No me debes nada.
No te quedas por obligación
ni yo me quedo por costumbre.
Y eso, curiosamente, es lo que me da paz.` },

    { titulo: 'Algo', texto:
`Hay algo en la forma en que me miras
que no sé nombrar.
No es deseo ni costumbre:
es como si me reconocieras.` },

    { titulo: 'Casi', texto:
`Casi te digo todo aquel día.
Casi me animo, casi sale.
Me quedé con el casi puesto
y ahora te lo digo así, tarde.` },

    { titulo: 'Mitad', texto:
`No busco mi otra mitad.
Estoy entero y medio roto, como todos.
Busco a alguien que también lo esté
y no le dé vergüenza mostrarlo.` },

    { titulo: 'Doble', texto:
`Dos cafés, dos abrigos,
dos maneras distintas de ver la misma película.
No quiero que seamos iguales:
quiero que seamos dos, bien distintos, juntos.` },

    { titulo: 'Uno', texto:
`Somos uno cuando no hablamos,
cuando alcanzás algo sin preguntar,
cuando sabes qué me pasa
solo por cómo cierro la puerta.` },

    { titulo: 'Cero', texto:
`Empezamos de cero los dos,
sin historial ni promesas viejas.
Y resultó mejor así:
lo que armamos no se lo debemos a nadie.` },

    { titulo: 'Otra vez', texto:
`Volvería a equivocarme igual
si al final del error estabas tú.
No lo digo por romanticismo:
lo digo porque ya lo hice dos veces.` },

    { titulo: 'Primera', texto:
`La primera vez que te vi
no pensé nada importante.
Pensé "qué raro lo que sentí",
y seguí caminando como si nada.` },

    { titulo: 'La última', texto:
`Si algún día es la última vez,
quiero que sea un día común.
Sin drama ni despedidas largas:
un martes, y yo mirándote de más.` },

    { titulo: 'Oscura', texto:
`También te quiero en la parte oscura,
cuando no tienes ganas de nadie.
Ahí no pido explicaciones:
me siento al lado y espero.` },

    { titulo: 'De madrugada', texto:
`En la madrugada se caen las máscaras
y quedan las verdades sueltas.
Ahí me acuerdo de ti
con una claridad que de día no tengo.` },

    { titulo: 'Medianoche', texto:
`Las doce y todavía despierto,
dándole vueltas a nada.
Después me escribís "¿estás?"
y se me acomoda todo.` },

    { titulo: 'Las tres', texto:
`Las tres de la mañana
y sigo hablando contigo como si nada.
Mañana me va a doler la cabeza
y lo voy a volver a hacer.` },

    { titulo: 'El último beso', texto:
`No fue un beso de película.
Fue en la vereda, con frío,
y los dos apurados.
Y sin embargo me duró semanas.` },

    { titulo: 'Primer beso', texto:
`Me acuerdo de todo y de nada:
el lugar, la hora, el miedo.
Lo que más recuerdo
es que después no supe qué decir.` },

    { titulo: 'Abrazo largo', texto:
`Ese abrazo duró más de lo normal
y ninguno de los dos lo cortó.
A veces las cosas se dicen así,
apretando un poco más fuerte.` },

    { titulo: 'Tu espalda', texto:
`Te diste vuelta para irte
y me quedé mirándote la espalda.
Es raro cómo algo que se va
puede ocupar tanto espacio.` },
    { titulo: 'Tu risa otra vez', texto:
`Haría lo que fuera por escucharla hoy.
No la carcajada fuerte de las fiestas:
esa risa chiquita y cansada
que te sale cuando ya no puedes más.` },

    { titulo: 'Tu enojo', texto:
`Te enojas de una manera muy tuya:
te callas, no das explicaciones.
Y yo aprendí a no insistir,
a sentarme cerca y esperar a que pase.` },

    { titulo: 'Tu perdón', texto:
`Me perdonaste sin que lo pidiera bien.
No fue olvido ni fue debilidad:
fue que me conoces lo suficiente
como para saber que no fue a propósito.` },

    { titulo: 'Mis disculpas', texto:
`Perdón por las veces que estuve
y no estuve del todo.
Por mirar el celular mientras hablabas,
por apurarte cuando necesitabas tiempo.` },

    { titulo: 'Nuestra canción', texto:
`No la elegimos, se nos impuso.
Sonó en un momento cualquiera
y ahora no podemos escucharla
sin acordarnos de esa noche.` },

    { titulo: 'Nuestro lugar', texto:
`Ese banco de la plaza no tiene nada especial.
Está feo, le falta pintura,
y sin embargo es el único lugar del mundo
donde me siento en casa.` },

    { titulo: 'Nuestra mesa', texto:
`La mesa del fondo, la de siempre,
la que nos conoce de memoria.
Ahí dijimos cosas importantes
entre papas fritas y café frío.` },

    { titulo: 'El mismo banco', texto:
`Pasé por el banco donde nos sentábamos
y me quedé un rato sin motivo.
Hay lugares que guardan gente
mucho después de que se fue.` },

    { titulo: 'La misma esquina', texto:
`En esta esquina te esperé veinte minutos
mirando el celular como un idiota.
Hoy paso y todavía
me acuerdo de cómo venías caminando.` },

    { titulo: 'Volver', texto:
`Volver no es retroceder.
Es reconocer que algo valía la pena
y animarse a tocarlo de nuevo
con las manos un poco más sabias.` },

    { titulo: 'Regresar', texto:
`Regresé con miedo de que no estuvieras.
Y estabas, con la puerta entreabierta,
como si nunca me hubiera ido.
Eso no lo hace cualquiera.` },

    { titulo: 'Irse', texto:
`Me fui muchas veces sin moverme,
con la cabeza en otro lado.
Y tú te diste cuenta siempre
antes de que yo lo admitiera.` },

    { titulo: 'Quedarse', texto:
`Quedarse es más difícil que irse.
Irse es un impulso de un segundo;
quedarse es elegirse todos los días
sabiendo lo que cuesta.` },

    { titulo: 'Esperar', texto:
`Esperé sin reloj y sin apuro.
No porque fuera paciente,
sino porque algo me decía
que esta vez valía la pena.` },

    { titulo: 'Llegar', texto:
`Llegué tarde a casi todo en mi vida.
A los trabajos, a los cumpleaños, a las fiestas.
Contigo llegué justo,
y todavía no entiendo cómo.` },

    { titulo: 'Salir', texto:
`Salir contigo no es el plan:
es la excusa.
Podríamos estar dando vueltas sin destino
y yo la estaría pasando bien.` },

    { titulo: 'Entrar', texto:
`Entraste sin golpear,
sin pedir permiso ni anunciar nada.
Y cuando quise acordarme
ya tenías las llaves de todo.` },

    { titulo: 'Abrir', texto:
`Abrirme me costó años.
No fue confianza de un día:
fue que tú no te cansaste
de tocar la puerta despacio.` },

    { titulo: 'Cerrar', texto:
`Cerré puertas que no pensaba abrir nunca.
Contigo no hizo falta fuerza:
alcanzó con que te quedaras afuera
el tiempo suficiente.` },

    { titulo: 'Puerta', texto:
`Te dejo la puerta abierta,
no como amenaza ni como prueba.
Como quien dice: si vienes,
no vas a tener que explicar por qué.` },

    { titulo: 'Ventana', texto:
`Me asomé a ti con cuidado,
como se mira algo que puede romperse.
Y resultó que no eras frágil:
eras la única ventana abierta del pasillo.` },

    { titulo: 'Techo', texto:
`Cuando todo se me vino encima
no busqué soluciones, busqué refugio.
Y ahí estabas, sin preguntar nada,
haciendo de techo por un rato.` },

    { titulo: 'Pared', texto:
`Contra la pared estuve muchas veces.
Ahí aprendí quién se acerca
y quién se corre para no comprometerse.
Vos te acercaste.` },

    { titulo: 'Piso', texto:
`Me caí y no fue elegante.
No hubo música triste ni lecciones:
hubo un piso frío
y alguien que se sentó conmigo ahí.` },

    { titulo: 'Suelo', texto:
`Tocaste fondo conmigo una vez
y no saliste corriendo.
Eso vale más
que todas las veces que estuvimos bien.` },

    { titulo: 'Cielo', texto:
`No sé si existe el cielo.
Pero si existe, me lo imagino parecido
a esas tardes en que no pasa nada
y igual no queremos que terminen.` },

    { titulo: 'Nube', texto:
`Pasaste como pasan las nubes:
sin apuro y cambiando la luz.
No te quedaste quieto
y aun así me dejaste el día distinto.` },

    { titulo: 'Lluvia', texto:
`Llovió y no teníamos paraguas.
Nos reímos igual, empapados,
y entendí que los mejores momentos
casi nunca están bien planeados.` },

    { titulo: 'Sol', texto:
`Saliste justo cuando hacía falta.
No lo hiciste a propósito,
pero ese día el sol
me pareció que también estaba de tu lado.` },

    { titulo: 'Viento', texto:
`El viento te despeinó y te reíste.
No pasó nada más que eso.
Y sin embargo me acuerdo
con una claridad que no me explico.` },
    { titulo: 'Frío', texto:
`Hacía frío y me diste tu campera
sin que yo la pidiera.
Esos gestos chicos
son los que después no se olvidan.` },

    { titulo: 'Calor', texto:
`No fue un verano:
fue una sensación de estar en el lugar correcto.
Y eso no tiene estación
ni se puede planear.` },

    { titulo: 'Primavera otra vez', texto:
`Me había acostumbrado al invierno
y ya ni lo notaba.
Después llegaste
y todo lo que estaba seco volvió a ponerse verde.` },

    { titulo: 'Verano', texto:
`Días largos, helado derretido,
risas por cualquier tontería.
Contigo el verano no es una estación:
es una manera de estar despierto.` },

    { titulo: 'Otoño', texto:
`Se caen las hojas y no me da tristeza.
Aprendí que hay cosas que se van
para que otras puedan crecer,
y que tú te quedaste igual.` },

    { titulo: 'Invierno otra vez', texto:
`Si vuelve el invierno, que venga.
Ya no le tengo tanto miedo.
Sé cómo se atraviesa
y sé que no lo voy a cruzar solo.` },

    { titulo: 'Estación', texto:
`No me importa en qué mes estemos.
Los meses son un trámite;
lo que importa es con quién
te agarra cada uno.` },

    { titulo: 'Calendario', texto:
`Marqué un día sin motivo especial
y después me olvidé por qué.
Hoy lo miro y me acuerdo:
fue el día en que dejé de tener miedo.` },

    { titulo: 'Fecha', texto:
`No celebro aniversarios.
Celebro los martes comunes
en que me preguntas cómo me fue
y de verdad esperás la respuesta.` },

    { titulo: 'Hora', texto:
`Hay una hora del día
en que pienso en ti sin querer.
Ya no peleo contra eso:
la dejé instalada.` },

    { titulo: 'Minuto', texto:
`Un minuto de más en la llamada
y ya me cambiaste el día.
Es increíble lo poco
que hace falta a veces.` },

    { titulo: 'Segundo', texto:
`Bastó un segundo de más
en esa mirada para entender todo.
Las cosas importantes
casi nunca avisan antes.` },

    { titulo: 'Instante', texto:
`Guardo un instante tuyo:
nada épico, tú riéndote de algo tonto.
Y me dura más
que recuerdos que deberían ser grandes.` },

    { titulo: 'Eterno', texto:
`Nada es eterno y lo sé.
Pero hay momentos que se niegan a pasar
y se quedan instalados
en el medio del pecho.` },

    { titulo: 'Breve', texto:
`Fue breve y fue suficiente.
No todo tiene que durar
para haber valido la pena;
algunas cosas alcanzan con pasar.` },

    { titulo: 'Largo', texto:
`Se hizo largo el tiempo sin verte,
y eso que fueron días.
Así mide el cuerpo
las cosas que le importan.` },

    { titulo: 'Corto', texto:
`Se me hizo corto todo contigo.
Las noches, las charlas, los meses.
Supongo que es la forma
que tiene el cuerpo de decir "quiero más".` },

    { titulo: 'Tarde', texto:
`Tarde te dije lo que sentía
y temprano me di cuenta.
Ese desorden es lo más honesto
que tengo para ofrecerte.` },

    { titulo: 'Temprano', texto:
`Te conocí temprano en la vida,
cuando todavía no sabía querer bien.
Por eso conmigo vas a tener paciencia:
estoy aprendiendo contigo.` },

    { titulo: 'A tiempo', texto:
`Llegué a tiempo a pocas cosas,
pero a ti llegué cuando debía.
Y con eso me alcanza
para creer que algo funciona.` },

    { titulo: 'A destiempo', texto:
`Nos encontramos a destiempo
y aun así funcionó.
Capaz que el tiempo
no era el problema que yo creía.` },

    { titulo: 'Reloj', texto:
`Paré el reloj mentalmente
cada vez que estás cerca.
No es que pase lento:
es que se me olvida mirarlo.` },

    { titulo: 'Agujero negro', texto:
`Hay días que me tragan entero
y no queda nada de mí arriba.
Tú apareces igual,
sin saber que estás sacándome a flote.` },

    { titulo: 'Gravedad', texto:
`Me atrae algo que no entiendo.
No es físico ni es costumbre:
es que donde estás tú
las cosas parecen tener más peso.` },

    { titulo: 'Órbita', texto:
`Doy vueltas alrededor de lo mismo
y siempre termino en ti.
No lo hago a propósito;
simplemente no encuentro otra dirección.` },

    { titulo: 'Planeta', texto:
`Si yo fuera un planeta
sería uno chico y medio olvidado.
Y tú serías la única razón
por la que alguien miraría para acá.` },

    { titulo: 'Estrella', texto:
`No eres la estrella más grande del cielo.
Eres la única que yo miro
cuando salgo a la vereda
y necesito acordarme de algo bueno.` },

    { titulo: 'Luna', texto:
`La luna salió igual que siempre
pero hoy la miré distinto.
Supongo que uno ve las cosas
según quién le anda dando vueltas.` },

    { titulo: 'Mar', texto:
`El mar hace el mismo ruido hace siglos
y a nadie le aburre.
Así me pasa contigo:
me repito y no me canso.` },

    { titulo: 'Montaña', texto:
`Subir hasta acá costó.
No fue un paseo ni un impulso:
fue paso a paso y con dudas.
Y la vista valió cada una.` },
];

/** Historial por chat para no repetir poemas seguidos. */
const historial: Record<string, number[]> = ((global as any).poemaHistorial ||= {});
const MEMORIA = 15;

export default {
    command: ['poema', 'poemas', 'poemita'],
    description: 'Un poema para enamorar, al azar entre 200',
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
