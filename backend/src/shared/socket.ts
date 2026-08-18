// SOCKET SINGLETON — referencia global al Server de Socket.io, seteada una vez en server.ts.
//
// Por que existe: el controller REST de draft (POST /start, /pick, /reset) tiene que disparar
// los mismos broadcasts que el gateway de sockets dispara cuando la accion viene por WS —
// si alguien pickea via REST, los clientes conectados por socket igual tienen que enterarse
// (Slice 6 es un "overlay" sobre Slice 5, no un reemplazo). En vez de que draft.controller.ts
// importe directo draft.gateway.ts (acoplando el modulo REST al modulo de sockets) o que
// draft.service.ts sepa de transporte (violaria "el service no sabe que existe HTTP/WS"),
// este singleton es el punto de indireccion: server.ts lo setea al bootear, y CUALQUIER
// modulo que necesite emitir puede pedirlo sin import circular.
//
// getIo() devuelve null en tests que importan `app` directo (todos los .test.ts existentes) —
// nunca corren server.ts, asi que nunca hay io seteado. draft.controller.ts chequea el null
// y simplemente no emite nada; el REST sigue funcionando exactamente igual que en Slice 5.

import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIo(io: Server | null): void {
  ioInstance = io;
}

export function getIo(): Server | null {
  return ioInstance;
}
