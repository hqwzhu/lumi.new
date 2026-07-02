import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

export interface NcmAccountProfile {
  id?: string;
  originalId?: number | string;
  nickname?: string;
  avatarUrl?: string;
  signature?: string;
  vipTypes?: number[];
  raw?: Record<string, unknown>;
}

export interface NcmPlaybackState {
  playing: boolean;
  status?: string;
  trackName?: string;
  artists?: string[];
  album?: string;
  duration?: number;
  progress: number;
  coverUrl?: string;
  volume?: number;
  currentIndex?: number;
  queueLength?: number;
  source: 'netease';
}

export function quoteNcmArg(value: string): string {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:=@-]+$/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '\\"').replace(/([&|<>^%])/g, '^$1')}"`;
}

export function normalizeNcmAppId(value: unknown): string | null {
  const appId = String(value ?? '').trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(appId) ? appId : null;
}

export function normalizeNcmPrivateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let privateKey = value
    .replace(/^\uFEFF/, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();

  if (privateKey.length < 16 || privateKey.length > 12000) return null;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
    return `${privateKey}\n`;
  }

  const compact = privateKey.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(compact) || compact.length < 800) return null;
  const body = compact.match(/.{1,64}/g)?.join('\n');
  return body ? `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n` : null;
}

export function extractNcmJson(text: string): any {
  const raw = String(text || '').trim();
  if (!raw) return null;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '{' && ch !== '[') continue;
    try {
      return JSON.parse(raw.slice(i));
    } catch {
      // ncm-cli can print notices before JSON. Keep scanning for the first
      // parseable object instead of assuming stdout starts with JSON.
    }
  }

  return null;
}

export async function runNcmCli(args: string[], timeout = 15000): Promise<{ stdout: string; stderr: string }> {
  if (process.platform === 'win32') {
    const cmdline = ['npx.cmd', '@music163/ncm-cli', ...args].map(quoteNcmArg).join(' ');
    try {
      const stdout = execFileSync('cmd.exe', ['/d', '/c', cmdline], {
        timeout,
        windowsHide: true,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      });
      return { stdout, stderr: '' };
    } catch (e: any) {
      if (e.stdout) return { stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
      throw new Error(e.stderr || e.message || String(e));
    }
  }

  try {
    const result = await execFileP('npx', ['@music163/ncm-cli', ...args], {
      timeout,
      maxBuffer: 1024 * 1024,
    });
    return { stdout: String(result.stdout || ''), stderr: String(result.stderr || '') };
  } catch (e: any) {
    if (e.stdout) return { stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
    throw new Error(e.stderr || e.message || String(e));
  }
}

export async function configureNcmCredentials(appId: string, privateKeyPem: string, timeout = 10000): Promise<void> {
  const safeAppId = normalizeNcmAppId(appId);
  const safePrivateKey = normalizeNcmPrivateKey(privateKeyPem);
  if (!safeAppId || !safePrivateKey) throw new Error('Invalid NetEase appId or privateKey');

  process.env.NETEASE_APP_ID = safeAppId;
  process.env.NETEASE_PRIVATE_KEY = safePrivateKey;

  await runNcmCli(['config', 'set', 'appId', safeAppId], timeout);
  await runNcmCli(['config', 'set', 'privateKey', safePrivateKey], timeout);
}

export function normalizeNcmAccountProfile(payload: any): NcmAccountProfile | null {
  const data = payload?.data || payload?.profile || payload?.user || payload;
  if (!data || typeof data !== 'object') return null;

  const nickname = data.nickname || data.nickName || data.name || data.username;
  const avatarUrl = data.avatarUrl || data.avatar || data.avatarImgUrl;
  const originalId = data.originalId || data.userId || data.accountId;
  const id = data.id || data.encryptedId;
  const vipDetail = Array.isArray(data.vipDetail) ? data.vipDetail : Array.isArray(data.fullVipDetail) ? data.fullVipDetail : [];
  const vipTypes = vipDetail
    .map((entry: any) => Number(entry?.type))
    .filter((type: number) => Number.isFinite(type) && type > 0);

  if (!nickname && !avatarUrl && !originalId && !id) return null;

  return {
    id: id != null ? String(id) : undefined,
    originalId,
    nickname: nickname ? String(nickname) : undefined,
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    signature: data.signature ? String(data.signature) : undefined,
    vipTypes,
    raw: data,
  };
}

function normalizeArtists(value: any): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .map((artist) => typeof artist === 'string' ? artist : artist?.name)
      .filter(Boolean)
      .map(String);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return undefined;
}

function normalizeDuration(value: any): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n > 1000 ? n / 1000 : n;
}

export function normalizeNcmPlaybackState(payload: any, fallback?: Partial<NcmPlaybackState>): NcmPlaybackState | null {
  const data = payload?.state || payload?.data?.state || payload?.data || payload;
  if (!data || typeof data !== 'object') return fallback ? {
    playing: Boolean(fallback.playing),
    progress: Number(fallback.progress || 0),
    source: 'netease',
    ...fallback,
  } as NcmPlaybackState : null;

  const status = data.status || data.playStatus || data.state;
  const playing = data.playing === true || status === 'playing' || status === 'play';
  const track = data.track || data.current || data.song || data.music || {};
  const trackName = data.trackName || data.name || data.title || track.name || track.title || fallback?.trackName;
  const artists = normalizeArtists(data.artists || data.artist || track.artists || track.artist) || fallback?.artists;
  const album = data.album || track.album?.name || track.album || fallback?.album;
  const duration = normalizeDuration(data.duration || track.duration || track.dt) || fallback?.duration;
  const progress = Number(data.position ?? data.progress ?? data.currentTime ?? fallback?.progress ?? 0);
  const volume = data.volume == null ? fallback?.volume : Number(data.volume);
  const coverUrl = data.coverUrl || data.cover || track.coverUrl || track.cover || track.album?.picUrl || fallback?.coverUrl;
  const currentIndex = data.currentIndex == null ? fallback?.currentIndex : Number(data.currentIndex);
  const queueLength = data.queueLength == null ? fallback?.queueLength : Number(data.queueLength);

  return {
    playing,
    status: status ? String(status) : undefined,
    trackName: trackName ? String(trackName) : undefined,
    artists,
    album: album ? String(album) : undefined,
    duration,
    progress: Number.isFinite(progress) ? progress : 0,
    coverUrl: coverUrl ? String(coverUrl) : undefined,
    volume: Number.isFinite(volume) ? volume : undefined,
    currentIndex: Number.isFinite(currentIndex) ? currentIndex : undefined,
    queueLength: Number.isFinite(queueLength) ? queueLength : undefined,
    source: 'netease',
  };
}
