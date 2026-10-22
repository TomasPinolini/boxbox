// En su propio archivo: react-refresh/only-export-components prohíbe exportar constantes junto a
// un componente. PITCH lo comparten el tour y AboutBoxBox.
export const PITCH =
  'Una fantasy league de Fórmula 1: armás tu equipo (2 pilotos + 1 escudería) en un draft en vivo contra tus amigos, y sumás puntos con los resultados reales de cada carrera de la temporada.';

export type TourStep = { title: string; body: string };

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
