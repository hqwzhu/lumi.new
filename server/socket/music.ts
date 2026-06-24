/**
 * Music Socket Handler - real-time playback events backed by ncm-cli.
 */
import { Socket } from 'socket.io';
import {
  extractNcmJson,
  normalizeNcmPlaybackState,
  runNcmCli,
  type NcmPlaybackState,
} from '../music/ncm_cli';

interface MusicAtmosphere {
  track: { name: string; artists: string[]; album?: string; coverUrl?: string; duration?: number };
  mood: string;
  weather?: string;
  lumiReason?: string;
  audioUrl?: string;
  lyrics?: Array<{ time: number; text: string }>;
  scene?: import('../music/scene_generator').MusicScene;
}

const userPollers = new Map<string, ReturnType<typeof setInterval>>();
const lastKnownState = new Map<string, Partial<NcmPlaybackState>>();

async function ncmExec(args: string[], timeout = 10000): Promise<any> {
  const result = await runNcmCli([...args, '--output', 'json'], timeout);
  return extractNcmJson(result.stdout) || result.stdout || '';
}

function socketGuard(fn: (...args: any[]) => void | Promise<void>) {
  return (...args: any[]) => {
    try {
      const ret = fn(...args);
      if (ret && typeof (ret as any).catch === 'function') {
        (ret as any).catch((e: any) => console.error('[Music] Handler error:', e.message || String(e)));
      }
    } catch (e: any) {
      console.error('[Music] Handler error:', e.message || String(e));
    }
  };
}

function userRoomFor(socket: Socket, fallbackUid: string) {
  return Array.from(socket.rooms).find(room => room.startsWith('user:')) || `user:${fallbackUid}`;
}

function emitToUser(socket: Socket, event: string, payload: any, uid: string, io?: any) {
  const room = userRoomFor(socket, uid);
  if (io) io.to(room).emit(event, payload);
  else socket.emit(event, payload);
}

function rememberState(uid: string, patch: Partial<NcmPlaybackState>) {
  const previous = lastKnownState.get(uid) || {};
  lastKnownState.set(uid, { ...previous, ...patch });
}

export function registerMusicHandlers(
  socket: Socket,
  getUserId: (s: any) => string,
  io?: any,
) {
  const uid = getUserId(socket);

  socket.on('music:play', socketGuard(async (data: {
    encryptedId?: string;
    originalId?: string;
    playlist?: boolean;
    audioUrl?: string;
  }) => {
    try {
      if (data.audioUrl) {
        emitToUser(socket, 'music:state', { playing: true, source: 'url', audioUrl: data.audioUrl }, uid, io);
        return;
      }

      if (data.playlist) {
        const args = ['play', '--playlist'];
        if (data.encryptedId) args.push('--encrypted-id', data.encryptedId);
        if (data.originalId) args.push('--original-id', data.originalId);
        await ncmExec(args, 15000);
      } else if (data.encryptedId && data.originalId) {
        await ncmExec(['play', '--song', '--encrypted-id', data.encryptedId, '--original-id', data.originalId], 15000);
      }

      rememberState(uid, { playing: true, source: 'netease' });
      emitToUser(socket, 'music:state', { playing: true, source: 'netease' }, uid, io);
      startStatePoller(socket, uid, io);
      await pollAndEmitState(socket, uid, io);
    } catch (e: any) {
      emitToUser(socket, 'music:error', { message: e.message }, uid, io);
    }
  }));

  socket.on('music:pause', socketGuard(async () => {
    await ncmExec(['pause']);
    rememberState(uid, { playing: false });
    emitToUser(socket, 'music:state', { playing: false }, uid, io);
  }));

  socket.on('music:resume', socketGuard(async () => {
    await ncmExec(['resume']);
    rememberState(uid, { playing: true });
    emitToUser(socket, 'music:state', { playing: true }, uid, io);
    startStatePoller(socket, uid, io);
  }));

  socket.on('music:next', socketGuard(async () => {
    await ncmExec(['next']);
    await pollAndEmitState(socket, uid, io);
  }));

  socket.on('music:prev', socketGuard(async () => {
    await ncmExec(['prev']);
    await pollAndEmitState(socket, uid, io);
  }));

  socket.on('music:seek', socketGuard(async (data: { seconds: number }) => {
    const seconds = Math.max(0, Number(data.seconds) || 0);
    await ncmExec(['seek', String(seconds)]);
    rememberState(uid, { progress: seconds });
    emitToUser(socket, 'music:state', { progress: seconds }, uid, io);
  }));

  socket.on('music:volume', socketGuard(async (data: { level: number }) => {
    const vol = Math.max(0, Math.min(100, Number(data.level) || 50));
    await ncmExec(['volume', String(vol)]);
    rememberState(uid, { volume: vol });
    emitToUser(socket, 'music:state', { volume: vol }, uid, io);
  }));

  socket.on('music:queue:list', socketGuard(async () => {
    const queue = await ncmExec(['queue']);
    emitToUser(socket, 'music:queue', queue, uid, io);
  }));

  socket.on('music:queue:add', socketGuard(async (data: { encryptedId: string; originalId?: string; next?: boolean }) => {
    const args = ['queue', 'add', '--encrypted-id', data.encryptedId];
    if (data.originalId) args.push('--original-id', data.originalId);
    if (data.next) args.push('--next');
    await ncmExec(args);
    emitToUser(socket, 'music:queue:added', { encryptedId: data.encryptedId }, uid, io);
  }));

  socket.on('music:queue:clear', socketGuard(async () => {
    await ncmExec(['queue', 'clear']);
    emitToUser(socket, 'music:queue:cleared', {}, uid, io);
  }));

  socket.on('music:like', socketGuard(async (data: { encryptedId: string }) => {
    await ncmExec(['song', 'like', '--songId', data.encryptedId]);
    emitToUser(socket, 'music:liked', { encryptedId: data.encryptedId }, uid, io);
  }));

  socket.on('music:dislike', socketGuard(async (data: { encryptedId: string }) => {
    await ncmExec(['song', 'dislike', '--songId', data.encryptedId]);
    emitToUser(socket, 'music:disliked', { encryptedId: data.encryptedId }, uid, io);
  }));

  socket.on('music:get_state', socketGuard(() => {
    void pollAndEmitState(socket, uid, io);
  }));

  socket.on('disconnect', () => {
    stopStatePoller(uid);
  });
}

async function pollAndEmitState(socket: Socket, uid: string, io?: any) {
  const result = await ncmExec(['state']);
  const state = normalizeNcmPlaybackState(result, lastKnownState.get(uid));
  if (!state) return;

  rememberState(uid, state);
  emitToUser(socket, 'music:state', state, uid, io);
}

function startStatePoller(socket: Socket, uid: string, io?: any) {
  stopStatePoller(uid);
  const interval = setInterval(() => {
    void pollAndEmitState(socket, uid, io).catch((e: any) => {
      emitToUser(socket, 'music:error', { message: e.message || String(e) }, uid, io);
    });
  }, 3000);
  userPollers.set(uid, interval);
}

function stopStatePoller(uid: string) {
  const existing = userPollers.get(uid);
  if (existing) {
    clearInterval(existing);
    userPollers.delete(uid);
  }
}

/**
 * Emit a music atmosphere event to trigger the MusicMoodLayer.
 */
export function emitMusicAtmosphere(socket: Socket, atmosphere: MusicAtmosphere) {
  const rooms = Array.from(socket.rooms);
  const userRoom = rooms.find(r => r.startsWith('user:'));
  const uid = userRoom?.replace(/^user:/, '') || 'default';
  const duration = atmosphere.track.duration && atmosphere.track.duration > 1000
    ? atmosphere.track.duration / 1000
    : atmosphere.track.duration;

  rememberState(uid, {
    playing: true,
    trackName: atmosphere.track.name,
    artists: atmosphere.track.artists,
    album: atmosphere.track.album,
    coverUrl: atmosphere.track.coverUrl,
    duration,
    progress: 0,
    source: 'netease',
  });

  if (userRoom) {
    socket.to(userRoom).emit('music:atmosphere', atmosphere);
    if (atmosphere.lyrics) socket.to(userRoom).emit('music:lyrics', { lyrics: atmosphere.lyrics });
  }
  socket.emit('music:atmosphere', atmosphere);
  if (atmosphere.lyrics) socket.emit('music:lyrics', { lyrics: atmosphere.lyrics });
  startStatePoller(socket, uid);
}
