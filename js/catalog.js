// Catálogo genérico de ejercicios. NO presupone qué máquinas hay en el gimnasio:
// la disponibilidad real se marca en Ajustes ("máquinas verificadas").
// Las claves técnicas son criterios generales y conservadores; conviene que un
// entrenador las revise antes de darlas por validadas (ver README).

export const MUSCLES = [
  { id: 'piernas', label: 'Piernas', group: true },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'isquios', label: 'Isquiotibiales' },
  { id: 'aductores', label: 'Aductores' },
  { id: 'abductores', label: 'Abductores' },
  { id: 'gemelos', label: 'Gemelos' },
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'abdomen', label: 'Abdomen' },
];
export const LEG_MUSCLES = ['gluteos', 'cuadriceps', 'isquios', 'aductores', 'abductores', 'gemelos'];
export const muscleLabel = id => (MUSCLES.find(m => m.id === id) || { label: id }).label;

// step: salto de carga habitual en kg (orientativo; editable al registrar)
export const BASE_EXERCISES = [
  {
    id: 'prensa', name: 'Prensa de piernas', machine: 'Prensa de piernas', primary: ['cuadriceps', 'gluteos'], secondary: ['isquios'], step: 5,
    cues: ['Espalda y pelvis apoyadas en el respaldo', 'Rodillas alineadas con la dirección de los pies', 'Movimiento controlado, sin bloquear las rodillas al extender'],
  },
  {
    id: 'ext-cuadriceps', name: 'Extensión de cuádriceps', machine: 'Máquina de extensión de piernas', primary: ['cuadriceps'], secondary: [], step: 2.5,
    cues: ['Ajusta el respaldo para que la rodilla quede a la altura del eje de giro', 'Extiende de forma controlada y haz una breve pausa arriba', 'Baja despacio, sin dejar caer la carga'],
  },
  {
    id: 'curl-femoral', name: 'Curl femoral', machine: 'Máquina de curl femoral', primary: ['isquios'], secondary: ['gemelos'], step: 2.5,
    cues: ['Coloca el rodillo justo por encima de los tobillos', 'Mantén la cadera apoyada, sin levantarla', 'Flexiona con control y vuelve despacio'],
  },
  {
    id: 'aductores', name: 'Aductores en máquina', machine: 'Máquina de aductores', primary: ['aductores'], secondary: [], step: 2.5,
    cues: ['Espalda apoyada y tronco quieto', 'Ajusta la apertura inicial a un rango cómodo', 'Cierra con control y vuelve despacio, sin que la carga golpee'],
  },
  {
    id: 'abductores', name: 'Abductores en máquina', machine: 'Máquina de abductores', primary: ['abductores', 'gluteos'], secondary: [], step: 2.5,
    cues: ['Espalda apoyada y tronco quieto', 'Abre las piernas con control, sin dar impulso', 'Vuelve despacio, sin que la carga golpee'],
  },
  {
    id: 'gluteo-maquina', name: 'Patada de glúteo en máquina', machine: 'Máquina de glúteo', primary: ['gluteos'], secondary: ['isquios'], step: 2.5,
    cues: ['Apóyate bien en el soporte y mantén el tronco estable', 'Empuja con el glúteo sin arquear la zona lumbar', 'Controla la vuelta, sin soltar la carga'],
  },
  {
    id: 'hip-thrust', name: 'Hip thrust en máquina', machine: 'Máquina de hip thrust', primary: ['gluteos'], secondary: ['isquios'], step: 5,
    cues: ['Apoya bien la espalda alta y coloca el cinturón o soporte sobre la cadera', 'Sube hasta alinear tronco y muslos, sin arquear la zona lumbar', 'Baja con control'],
  },
  {
    id: 'gemelos-sentada', name: 'Gemelos sentada', machine: 'Máquina de gemelos sentada', primary: ['gemelos'], secondary: [], step: 5,
    cues: ['Apoya la parte delantera del pie, con el talón libre', 'Sube todo lo que puedas, sin rebotes', 'Baja despacio hasta notar el estiramiento'],
  },
  {
    id: 'press-pecho', name: 'Press de pecho en máquina', machine: 'Máquina de press de pecho', primary: ['pecho'], secondary: ['triceps', 'hombros'], step: 2.5,
    cues: ['Ajusta el asiento para que los agarres queden a la altura del pecho', 'Espalda apoyada y hombros relajados, lejos de las orejas', 'Empuja sin bloquear los codos y vuelve despacio'],
  },
  {
    id: 'pec-deck', name: 'Aperturas en pec deck', machine: 'Pec deck / mariposa', primary: ['pecho'], secondary: ['hombros'], step: 2.5,
    cues: ['Ajusta el asiento para que los brazos queden a la altura del pecho', 'Codos ligeramente flexionados y espalda apoyada', 'Cierra con control y abre sin pasar del rango cómodo'],
  },
  {
    id: 'press-inclinado', name: 'Press inclinado en máquina', machine: 'Máquina de press inclinado', primary: ['pecho', 'hombros'], secondary: ['triceps'], step: 2.5,
    cues: ['Ajusta el asiento para que los agarres queden a la altura de la parte alta del pecho', 'Espalda apoyada, hombros abajo y atrás', 'Empuja sin bloquear los codos y vuelve despacio'],
  },
  {
    id: 'press-hombros', name: 'Press de hombros en máquina', machine: 'Máquina de press de hombros', primary: ['hombros'], secondary: ['triceps'], step: 2.5,
    cues: ['Ajusta el asiento para que los agarres arranquen a la altura de los hombros', 'Espalda apoyada, sin arquear la zona lumbar', 'Empuja hacia arriba sin bloquear los codos y baja con control'],
  },
  {
    id: 'triceps-polea', name: 'Extensión de tríceps en polea', machine: 'Polea alta', primary: ['triceps'], secondary: [], step: 2.5,
    cues: ['Codos pegados al cuerpo y quietos', 'Extiende el brazo por completo sin balancear el tronco', 'Sube despacio hasta que el antebrazo quede cerca de la horizontal'],
  },
  {
    id: 'triceps-maquina', name: 'Tríceps en máquina', machine: 'Máquina de tríceps', primary: ['triceps'], secondary: [], step: 2.5,
    cues: ['Ajusta el asiento para que los codos queden alineados con el eje de la máquina', 'Codos quietos y espalda apoyada', 'Extiende sin bloquear del todo y vuelve despacio'],
  },
  {
    id: 'jalon-pecho', name: 'Jalón al pecho', machine: 'Polea de jalón', primary: ['espalda'], secondary: ['biceps'], step: 2.5,
    cues: ['Ajusta el soporte de muslos para quedar bien sujeta', 'Lleva la barra hacia la parte alta del pecho, con los codos hacia abajo', 'Sube la barra despacio, sin que el peso te tire de los hombros'],
  },
  {
    id: 'jalon-cerrado', name: 'Jalón agarre cerrado', machine: 'Polea de jalón', primary: ['espalda'], secondary: ['biceps'], step: 2.5,
    cues: ['Ajusta el soporte de muslos para quedar bien sujeta', 'Tira hacia el pecho llevando los codos hacia las costillas', 'Vuelve arriba con control, sin encoger los hombros'],
  },
  {
    id: 'remo-sentado', name: 'Remo sentado', machine: 'Polea de remo / máquina de remo', primary: ['espalda'], secondary: ['biceps'], step: 2.5,
    cues: ['Tronco erguido, sin balancearte', 'Tira llevando los codos hacia atrás y junta las escápulas', 'Vuelve despacio estirando los brazos sin encorvar la espalda'],
  },
  {
    id: 'remo-pecho', name: 'Remo con apoyo de pecho', machine: 'Máquina de remo con apoyo', primary: ['espalda'], secondary: ['biceps', 'hombros'], step: 2.5,
    cues: ['Ajusta el asiento y apoya el pecho en el soporte', 'Tira de los codos hacia atrás sin levantar los hombros', 'Vuelve con control, sin soltar la carga'],
  },
  {
    id: 'curl-biceps-maquina', name: 'Curl de bíceps en máquina', machine: 'Máquina de curl de bíceps', primary: ['biceps'], secondary: [], step: 2.5,
    cues: ['Ajusta el asiento para que los codos queden alineados con el eje de giro', 'Codos apoyados y quietos', 'Sube con control y baja despacio sin dejar caer la carga'],
  },
  {
    id: 'curl-biceps-polea', name: 'Curl de bíceps en polea', machine: 'Polea baja', primary: ['biceps'], secondary: [], step: 2.5,
    cues: ['Codos pegados al cuerpo y quietos', 'Sube sin balancear el tronco', 'Baja despacio hasta casi extender el brazo'],
  },
  {
    id: 'abdominal-maquina', name: 'Abdominal en máquina', machine: 'Máquina de abdominales', primary: ['abdomen'], secondary: [], step: 2.5,
    cues: ['Ajusta el asiento para que el eje de giro quede a la altura de la cintura', 'Flexiona el tronco con el abdomen, sin tirar con los brazos', 'Vuelve despacio sin dejar caer la carga'],
  },
  {
    id: 'curl-femoral-sentada', name: 'Curl femoral sentada', machine: 'Máquina de curl femoral sentada', primary: ['isquios'], secondary: ['gemelos'], step: 2.5,
    cues: ['Ajusta el respaldo para que la rodilla quede a la altura del eje de giro', 'Coloca el rodillo justo por encima de los tobillos', 'Flexiona las rodillas con control y vuelve despacio'],
  },
  {
    id: 'sentadilla-goblet', name: 'Sentadilla goblet', machine: 'Mancuerna', primary: ['cuadriceps', 'gluteos'], secondary: ['abdomen'], step: 2.5,
    cues: ['Sostén la mancuerna pegada al pecho, con los codos hacia abajo', 'Pies a la anchura de los hombros y rodillas siguiendo la dirección de los pies', 'Baja con control con el tronco erguido y sube empujando el suelo con todo el pie'],
  },
  {
    id: 'peso-muerto-rumano', name: 'Peso muerto rumano con mancuernas', machine: 'Mancuernas', primary: ['isquios', 'gluteos'], secondary: [], step: 2.5,
    cues: ['Mantén las mancuernas cerca de las piernas durante todo el recorrido', 'Lleva la cadera hacia atrás con las rodillas ligeramente flexionadas y la espalda neutra', 'Baja hasta notar el estiramiento detrás del muslo, sin redondear la espalda, y sube apretando el glúteo'],
  },
  {
    id: 'zancadas', name: 'Zancadas con mancuernas', machine: 'Mancuernas', primary: ['cuadriceps', 'gluteos'], secondary: ['isquios'], step: 2.5,
    cues: ['Da un paso largo y mantén el tronco erguido', 'Baja con control hasta que las dos rodillas queden flexionadas, con la rodilla delantera alineada con el pie', 'Empuja con la pierna delantera para volver, sin impulso'],
  },
  {
    id: 'hip-thrust-banco', name: 'Hip thrust en banco', machine: 'Banco y barra o mancuerna', primary: ['gluteos'], secondary: ['isquios'], step: 5,
    cues: ['Apoya la parte alta de la espalda en el banco y los pies firmes en el suelo', 'Sube la cadera hasta alinear tronco y muslos, sin arquear la zona lumbar', 'Baja con control, con la barbilla ligeramente recogida'],
  },
  {
    id: 'press-banca-mancuernas', name: 'Press de pecho con mancuernas', machine: 'Banco y mancuernas', primary: ['pecho'], secondary: ['triceps', 'hombros'], step: 2.5,
    cues: ['Espalda apoyada en el banco y pies firmes en el suelo', 'Baja las mancuernas con control hasta que los codos queden a la altura del pecho, algo separados del cuerpo', 'Empuja hacia arriba sin chocar las mancuernas ni bloquear los codos'],
  },
  {
    id: 'press-hombros-mancuernas', name: 'Press de hombros con mancuernas', machine: 'Banco y mancuernas', primary: ['hombros'], secondary: ['triceps'], step: 2.5,
    cues: ['Sentada con la espalda apoyada y sin arquear la zona lumbar', 'Empieza con las mancuernas a la altura de los hombros y los antebrazos verticales', 'Empuja hacia arriba sin bloquear los codos y baja con control'],
  },
  {
    id: 'elevaciones-laterales', name: 'Elevaciones laterales', machine: 'Mancuernas', primary: ['hombros'], secondary: [], step: 1,
    cues: ['Usa mancuernas ligeras y los codos ligeramente flexionados', 'Sube los brazos hacia los lados hasta la altura de los hombros, sin balancear el tronco', 'Baja despacio, sin dejar caer los brazos'],
  },
  {
    id: 'remo-mancuerna', name: 'Remo con mancuerna', machine: 'Banco y mancuerna', primary: ['espalda'], secondary: ['biceps'], step: 2.5,
    cues: ['Apoya una mano y una rodilla en el banco, con la espalda recta', 'Tira de la mancuerna hacia la cadera llevando el codo hacia atrás', 'Baja despacio hasta estirar el brazo, sin girar el tronco'],
  },
  {
    id: 'face-pull', name: 'Face pull en polea', machine: 'Polea con cuerda', primary: ['hombros', 'espalda'], secondary: [], step: 2.5,
    cues: ['Coloca la polea a la altura de la cara o algo por encima, con cuerda', 'Tira hacia la cara abriendo los codos hacia fuera y atrás', 'Vuelve despacio, sin encoger los hombros'],
  },
  {
    id: 'curl-biceps-mancuernas', name: 'Curl de bíceps con mancuernas', machine: 'Mancuernas', primary: ['biceps'], secondary: [], step: 2.5,
    cues: ['Codos pegados al cuerpo y quietos', 'Sube sin balancear el tronco', 'Baja despacio hasta casi extender el brazo'],
  },
];

export const DEFAULT_ROUTINES = [
  { id: 'A', name: 'Piernas y glúteos', short: 'Piernas', exerciseIds: ['prensa', 'ext-cuadriceps', 'curl-femoral', 'aductores', 'abductores', 'gluteo-maquina'] },
  { id: 'B', name: 'Pecho y tríceps', short: 'Pecho + Tríceps', exerciseIds: ['press-pecho', 'pec-deck', 'press-inclinado', 'press-hombros', 'triceps-polea', 'triceps-maquina'] },
  { id: 'C', name: 'Espalda y bíceps', short: 'Espalda + Bíceps', exerciseIds: ['jalon-pecho', 'jalon-cerrado', 'remo-sentado', 'remo-pecho', 'curl-biceps-maquina', 'curl-biceps-polea'] },
];

// Arquitectura preparada para un cardio voluntario futuro (desactivado por defecto).
export const DEFAULT_SETTINGS = { optionalCardio: false };
