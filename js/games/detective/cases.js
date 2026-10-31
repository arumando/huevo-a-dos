// Casos originales de Detectives. Cada detective recibe un expediente distinto: hacen falta los dos.
export const CASES = [
  {
    id: 'c1', name: 'El pastel de la abuela', diff: 'Fácil',
    intro: 'En la fiesta familiar, el pastel de tres leches de la abuela desapareció de la cocina entre las 5:00 y las 6:00 de la tarde. A las 7:00 era el concurso de pasteles de la familia.',
    suspects: [
      { id: 'ramiro', name: 'Tío Ramiro', desc: 'Mecánico. Siempre tiene hambre.' },
      { id: 'lucia', name: 'Prima Lucía', desc: 'Estudia repostería. Este año también concursa.' },
      { id: 'felix', name: 'Don Félix', desc: 'Vecino. Tiene un perro llamado Canelo.' },
      { id: 'tono', name: 'Toño', desc: 'Sobrino de 9 años. Le encantan las bromas.' }
    ],
    questions: [
      { id: 'quien', text: '¿Quién se llevó el pastel?', options: ['ramiro', 'lucia', 'felix', 'tono'] },
      { id: 'como', text: '¿Cómo lo sacó?', options: ['Por la ventana de la cocina', 'Escondido en una caja', 'Con ayuda del perro', 'En la mochila escolar'] },
      { id: 'por', text: '¿Por qué?', options: ['Tenía hambre', 'Quería ganar el concurso', 'Era una broma', 'Para dárselo al perro'] }
    ],
    answer: { quien: 'lucia', como: 'Escondido en una caja', por: 'Quería ganar el concurso' },
    files: {
      A: [
        { kind: 'declaracion', title: 'Declaración de la abuela', text: 'Dejé el pastel en la cocina a las 5:00. A las 6:00 ya no estaba. Nadie más cocina tres leches como yo: siempre gano el concurso de las 7:00.' },
        { kind: 'foto', icon: 'huellas', title: 'Foto: piso de la cocina', text: 'Huellas de harina de un tenis pequeño. El perito calcula una talla 23.' },
        { kind: 'evidencia', icon: 'caja', title: 'Caja en la basura', text: 'Una caja de pastel vacía, con el sello «Escuela de Repostería Las Rosas». Tiene restos de crema de tres leches.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Toño', text: '—Estuve jugando videojuegos con mi tío Ramiro de 4 a 7. ¡Ni fui a la cocina!' },
        { kind: 'foto', icon: 'ventana', title: 'Foto: ventana de la cocina', text: 'La ventana estaba cerrada con seguro por dentro toda la tarde.' },
        { kind: 'documento', title: 'Notas del tío Ramiro', text: 'Se comió tres tortas a las 4:00. Dice que no le cabía ni un bocado más.' }
      ],
      B: [
        { kind: 'interrogatorio', title: 'Interrogatorio a Lucía', text: '—Llegué a las 5:30 con una caja de mi escuela; traía mi pay de limón para el concurso. No entré a la cocina.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Don Félix', text: '—Canelo estuvo amarrado en mi patio toda la tarde. Como a las 5:45 vi a alguien salir por la puerta del patio con una caja grande.' },
        { kind: 'documento', title: 'Tallas de zapato de los invitados', text: 'Ramiro: 28 · Lucía: 23 · Félix: 27 · Toño: 21.' },
        { kind: 'foto', icon: 'pay', title: 'Foto: el refrigerador', text: 'El pay de limón de Lucía está en el refrigerador, sin caja, en un plato de la abuela.' },
        { kind: 'documento', icon: 'telefono', title: 'Mensaje en el celular de Lucía', text: 'Enviado a las 5:50: «¡Este año sí gano yo! 🏆»' },
        { kind: 'evidencia', title: 'La mochila de Toño', text: 'Solo tiene cuadernos y una resortera. Nada de crema.' }
      ]
    }
  },
  {
    id: 'c2', name: 'El collar de jade', diff: 'Media',
    intro: 'Durante la inauguración del museo, entre las 9:00 y las 9:30 de la noche, alguien robó el collar de jade. A las 9:10 se fue la luz durante cinco minutos. El collar sigue en la vitrina… pero ahora es de vidrio.',
    suspects: [
      { id: 'ines', name: 'Inés, la curadora', desc: 'Organizó la exposición.' },
      { id: 'bruno', name: 'Bruno, el guardia', desc: 'Tiene la llave maestra.' },
      { id: 'ulises', name: 'Ulises, el fotógrafo', desc: 'Contratado para la inauguración.' },
      { id: 'marga', name: 'Marga, la coleccionista', desc: 'Prestó dos piezas para la exposición.' }
    ],
    questions: [
      { id: 'quien', text: '¿Quién robó el collar?', options: ['ines', 'bruno', 'ulises', 'marga'] },
      { id: 'como', text: '¿Cómo lo hizo?', options: ['Usó la llave maestra', 'Cambió el collar por una copia', 'Salió por el techo de cristal', 'Lo escondió en una escultura'] },
      { id: 'por', text: '¿Por qué?', options: ['Deudas de juego', 'Venganza contra el museo', 'Para completar su colección', 'Para una sesión de fotos'] }
    ],
    answer: { quien: 'ulises', como: 'Cambió el collar por una copia', por: 'Deudas de juego' },
    files: {
      A: [
        { kind: 'documento', title: 'Informe del electricista', text: 'El apagón de las 9:10 fue por una sobrecarga: alguien conectó tres lámparas de estudio fotográfico en el mismo contacto, junto a la vitrina.' },
        { kind: 'foto', icon: 'vitrina', title: 'Foto: la vitrina', text: 'La vitrina no tiene marcas ni golpes. El collar que está dentro es de vidrio, según el experto.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Bruno', text: '—Tengo la única llave maestra y no me separé de ella. A las 9:10 estaba en la puerta principal, con veinte invitados.' },
        { kind: 'documento', title: 'Registro de entrada de equipo', text: 'Ulises: 3 lámparas, 2 cámaras y 1 maletín metálico. Marga: 2 cajas de piezas prestadas.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Marga', text: '—Yo ya tengo un collar igual en mi colección. ¿Para qué querría otro?' },
        { kind: 'foto', icon: 'techo', title: 'Foto: el techo', text: 'El techo de cristal está intacto, sin huellas ni polvo removido.' }
      ],
      B: [
        { kind: 'interrogatorio', title: 'Interrogatorio a Ulises', text: '—Durante el apagón estaba en la terraza fotografiando la luna. Ni me acerqué a la vitrina.' },
        { kind: 'documento', icon: 'camara', title: 'Fotos en la cámara de Ulises', text: 'La última foto antes del apagón es de la vitrina, tomada a las 9:09. La siguiente es de la terraza, a las 9:25.' },
        { kind: 'documento', icon: 'carta', title: 'Carta encontrada en un abrigo', text: '«Señor Ulises: su deuda de 80 000 pesos con el Casino Estrella vence este viernes.»' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Inés', text: '—Mandé hacer una réplica de vidrio del collar para el catálogo. La guardaba en el taller y desapareció la semana pasada, cuando Ulises fotografió las piezas.' },
        { kind: 'evidencia', icon: 'maletin', title: 'El maletín metálico', text: 'Dentro hay un estuche vacío forrado de terciopelo verde, del tamaño exacto de un collar.' },
        { kind: 'documento', title: 'Rumor del personal', text: 'Hace un año, Marga discutió con la directora del museo por un préstamo.' }
      ]
    }
  },
  {
    id: 'c3', name: 'El faro apagado', diff: 'Difícil',
    intro: 'Anoche, en plena tormenta, el faro no se encendió a su hora. Un barco pesquero casi choca contra las rocas. Alguien lo hizo a propósito.',
    suspects: [
      { id: 'rosa', name: 'Rosa, la farera', desc: 'Lleva treinta años cuidando el faro.' },
      { id: 'joaquin', name: 'Joaquín, pescador', desc: 'Rival del capitán del barco.' },
      { id: 'elena', name: 'Elena, la alcaldesa', desc: 'Quiere modernizar el puerto.' },
      { id: 'tadeo', name: 'Tadeo, el aprendiz', desc: 'Ayuda a Rosa desde hace un año.' }
    ],
    questions: [
      { id: 'quien', text: '¿Quién apagó el faro?', options: ['rosa', 'joaquin', 'elena', 'tadeo'] },
      { id: 'como', text: '¿Cómo lo hizo?', options: ['Cortó el cable del generador', 'Quitó el foco principal', 'Cambió la hora del temporizador', 'Desvió el barco por radio'] },
      { id: 'por', text: '¿Por qué?', options: ['Cobrar el seguro del barco', 'Que cerraran el faro', 'Vengarse del capitán', 'Fue un descuido'] }
    ],
    answer: { quien: 'elena', como: 'Cambió la hora del temporizador', por: 'Que cerraran el faro' },
    files: {
      A: [
        { kind: 'documento', title: 'Bitácora del faro', text: 'El faro se enciende solo, con un temporizador, a las 19:00. Anoche se encendió a las 23:00.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Rosa', text: '—Revisé el generador y el foco a las 18:00. Todo estaba bien. Luego fui a cenar con Tadeo a la fonda.' },
        { kind: 'foto', icon: 'generador', title: 'Foto: sala de máquinas', text: 'El cable del generador está intacto y el foco principal en su lugar.' },
        { kind: 'documento', title: 'Acta del cabildo', text: '«Si el faro vuelve a fallar, se cerrará y el terreno podrá venderse.»' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Joaquín', text: '—Sí, me peleé con el capitán por una red. Pero anoche estaba en alta mar; pregunten por radio.' },
        { kind: 'evidencia', icon: 'huellas', title: 'Panel del temporizador', text: 'Hay una pequeña mancha de esmalte de uñas rojo en la perilla de la hora.' }
      ],
      B: [
        { kind: 'documento', icon: 'radio', title: 'Registro de radio', text: '21:15 — Joaquín llama desde «La Gaviota», a veinte millas de la costa.' },
        { kind: 'interrogatorio', title: 'Interrogatorio a Elena', text: '—Estuve en el ayuntamiento toda la tarde, firmando papeles.' },
        { kind: 'documento', icon: 'carta', title: 'Carta de una cadena de hoteles', text: '«Señora alcaldesa: si el faro cierra, compraremos ese terreno al doble de su precio.»' },
        { kind: 'declaracion', title: 'La dueña de la fonda', text: 'Rosa y Tadeo cenaron aquí de 6:30 a 10. No se levantaron ni para ir al baño, ¡platicaron todo el tiempo!' },
        { kind: 'foto', icon: 'libreta', title: 'Foto: libreta del portero del ayuntamiento', text: '«La alcaldesa salió a las 17:45 y regresó a las 19:10.»' },
        { kind: 'declaracion', title: 'Nota de la junta de esta mañana', text: 'La alcaldesa llevaba las uñas pintadas de rojo intenso.' },
        { kind: 'documento', title: 'Seguro del barco', text: 'La póliza del barco del capitán venció el mes pasado: no la renovó.' }
      ]
    }
  }
];
