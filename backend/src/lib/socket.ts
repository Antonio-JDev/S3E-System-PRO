import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server): void {
  io = server;
}

export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.io ainda não foi inicializado');
  }
  return io;
}

/**
 * Nome da Socket.io room por usuário. Usada para emitir eventos
 * direcionados (ex.: notificações do sino) — assim só quem é dono da
 * notificação recebe, sem broadcast para todos os operadores.
 *
 * Convenção: `user:<userId>`. O `app.ts` junta o socket nessa room logo
 * após o handshake JWT.
 */
export function socketUserRoom(userId: string): string {
  return `user:${userId.trim()}`;
}

/**
 * Emite um evento somente para os sockets do usuário informado.
 *
 * Best-effort: se o Socket.io ainda não subiu (testes/bootstrap) o emit é
 * silenciosamente ignorado — chamadores não devem quebrar por isso.
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!userId || !userId.trim()) return;
  try {
    io?.to(socketUserRoom(userId)).emit(event, payload);
  } catch {
    /* ignore */
  }
}
