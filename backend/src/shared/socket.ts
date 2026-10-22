// Lo setea server.ts, para que el REST de draft emita los mismos eventos que el gateway sin
// importarlo. En los tests (importan app, no server) es null y el controller no emite.

import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIo(io: Server | null): void {
  ioInstance = io;
}

export function getIo(): Server | null {
  return ioInstance;
}
