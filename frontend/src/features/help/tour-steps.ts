// Los textos del tour de bienvenida, en su propio archivo y no al lado del componente:
// react-refresh/only-export-components prohíbe exportar una constante junto a un componente, y
// el test del tour los necesita importados. Mismo motivo que features/leagues/draft-label.ts.

// PITCH es la frase con la que la app se describe a sí misma. Vive acá y no duplicada porque
// AboutBoxBox (el "¿Qué es BoxBox?" de login y register) dice exactamente lo mismo: si alguien
// la edita en un solo lado, la app pasa a contestar dos cosas distintas a la misma pregunta.
export const PITCH =
  'Una fantasy league de Fórmula 1: armás tu equipo (2 pilotos + 1 escudería) en un draft en vivo contra tus amigos, y sumás puntos con los resultados reales de cada carrera de la temporada.';

export type TourStep = { title: string; body: string };

// Cuatro pasos, en el orden en que el usuario nuevo se va a chocar con las cosas: qué es esto,
// cómo entro a una liga, qué va a pasar en el draft, de dónde salen los puntos.
export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bienvenido a BoxBox',
    body: PITCH,
  },
  {
    title: '¿Te invitaron a una liga?',
    body: 'Pedile el código a quien te invitó y pegalo en «Unirme con código»: es una palabra corta que eligió esa persona. Si en cambio querés armar la tuya, usá «Crear liga» y el código lo elegís vos.',
  },
  {
    title: 'El draft reparte la grilla',
    body: 'Cuando estén todos, quien creó la liga arranca el draft y eligen por turnos. Son tres rondas: dos pilotos y una escudería. Un piloto que ya eligió otro no lo podés elegir vos, por eso el orden va y vuelve.',
  },
  {
    title: 'Los puntos son los de verdad',
    body: 'Cada carrera real le suma a tu equipo lo que sumaron tus pilotos y tu escudería ese fin de semana. En «Posiciones» ves el campeonato real; dentro de tu liga, cómo vas contra los demás.',
  },
];
