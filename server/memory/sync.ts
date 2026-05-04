import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;
const userSockets: Map<string, Set<string>> = new Map();

export function initMemorySync(io: SocketIOServer): void {
  _io = io;
}

export function registerUserSocket(userId: string, socketId: string): void {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(socketId);
}

export function unregisterUserSocket(socketId: string): void {
  for (const [uid, sockets] of userSockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(uid);
  }
}

/** Broadcast memory change to all connected devices of a user */
export function broadcastMemoryChange(userId: string, action: 'added' | 'updated' | 'deleted', memoryId?: string): void {
  if (!_io) return;
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) {
    // If no targeted sockets, broadcast to all (web clients without auth)
    _io.emit('memories:changed', { action, memoryId, userId, timestamp: new Date().toISOString() });
    return;
  }
  for (const sid of sockets) {
    _io.to(sid).emit('memories:changed', { action, memoryId, userId, timestamp: new Date().toISOString() });
  }
}

/** Broadcast device list change */
export function broadcastDeviceChange(userId: string): void {
  if (!_io) return;
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const sid of sockets) {
      _io.to(sid).emit('devices:refresh', { timestamp: new Date().toISOString() });
    }
  }
}
