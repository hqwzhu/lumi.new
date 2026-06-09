/**
 * Music Socket Handler — real-time music playback events.
 *
 * Bridges the frontend MusicMoodLayer with the backend ncm-cli (or other music tools).
 * Handles play/pause/seek/next from frontend, emits track state back.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { Socket } from 'socket.io';

const execAsync = promisify(exec);

interface MusicState {
  playing: boolean;
  trackName?: string;
  artists?: string[];
  album?: string;
  duration?: number;
  progress?: number;
  coverUrl?: string;
  volume?: number;
  source?: 'netease' | 'minimax' | 'url';
}

interface MusicAtmosphere {
  track: { name: string; artists: string[]; album?: string; coverUrl?: string; duration?: number };
  mood: string;
  weather?: string;
  lumiReason?: string;
  audioUrl?: string;
  lyrics?: Array<{ time: number; text: string }>;
}

const userPollers = new Map<string, ReturnType<typeof setInterval>>();

function ncmCmd(args: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`npx @music163/ncm-cli ${args} --output json`, { timeout: 10000 }, (err, stdout) => {
      resolve(stdout || '');
    });
  });
}

function tryParse(text: string): any {
  try { return JSON.parse(text); } catch { return null; }
}

export function registerMusicHandlers(
  socket: Socket,
  getUserId: (s: any) => string,
  io?: any,
) {
  const uid = getUserId(socket);

  socket.on('music:play', async (data: { encryptedId?: string; originalId?: string; playlist?: boolean; audioUrl?: string }) => {
    try {
      if (data.audioUrl) {
        // Direct URL playback (for MiniMax generated music or external sources)
        socket.emit('music:state', { playing: true, source: 'url', audioUrl: data.audioUrl });
        return;
      }

      if (data.playlist) {
        const args = [data.encryptedId ? `--encrypted-id "${data.encryptedId}"` : '', data.originalId ? `--original-id "${data.originalId}"` : ''].filter(Boolean).join(' ');
        await ncmCmd(`play --playlist ${args}`);
      } else if (data.encryptedId && data.originalId) {
        await ncmCmd(`play --song --encrypted-id "${data.encryptedId}" --original-id "${data.originalId}"`);
      }

      // Start polling state
      startStatePoller(socket, uid);
      socket.emit('music:state', { playing: true, source: 'netease' });
    } catch (e: any) {
      socket.emit('music:error', { message: e.message });
    }
  });

  socket.on('music:pause', async () => {
    await ncmCmd('pause');
    socket.emit('music:state', { playing: false });
  });

  socket.on('music:resume', async () => {
    await ncmCmd('resume');
    socket.emit('music:state', { playing: true });
  });

  socket.on('music:next', async () => {
    await ncmCmd('next');
    pollAndEmitState(socket);
  });

  socket.on('music:prev', async () => {
    await ncmCmd('prev');
    pollAndEmitState(socket);
  });

  socket.on('music:seek', async (data: { seconds: number }) => {
    await ncmCmd(`seek ${Math.max(0, data.seconds || 0)}`);
  });

  socket.on('music:volume', async (data: { level: number }) => {
    const vol = Math.max(0, Math.min(100, data.level || 50));
    await ncmCmd(`volume ${vol}`);
    socket.emit('music:state', { volume: vol });
  });

  socket.on('music:get_state', () => {
    pollAndEmitState(socket);
  });

  socket.on('disconnect', () => {
    stopStatePoller(uid);
  });
}

async function pollAndEmitState(socket: Socket) {
  const raw = await ncmCmd('state');
  const data = tryParse(raw);
  if (data) {
    socket.emit('music:state', {
      playing: data.status === 'playing' || data.playing === true,
      trackName: data.trackName || data.name || data.title,
      artists: data.artists || (data.artist ? [data.artist] : undefined),
      album: data.album,
      duration: data.duration,
      progress: data.progress || data.position || data.elapsed,
      coverUrl: data.coverUrl || data.cover,
      volume: data.volume,
      source: 'netease',
    });
  }
}

function startStatePoller(socket: Socket, uid: string) {
  stopStatePoller(uid);
  const interval = setInterval(() => pollAndEmitState(socket), 3000);
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
 * Emit a music atmosphere event to trigger the MusicMoodLayer in the frontend.
 * Called from chat.ts when Lumi decides to play music based on mood.
 */
export function emitMusicAtmosphere(socket: Socket, atmosphere: MusicAtmosphere) {
  socket.emit('music:atmosphere', atmosphere);
}
