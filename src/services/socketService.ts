import { io, Socket } from "socket.io-client";
import { getSocketOrigin } from "./apiBridge";
import { getStoredToken } from "./authService";

function getDeviceFingerprint(): string {
  const key = 'lumi_device_fingerprint';
  let fp: string | null = null;
  try { fp = localStorage.getItem(key); } catch {}
  if (!fp) {
    fp = `${navigator.platform || 'unknown'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    try { localStorage.setItem(key, fp); } catch {}
  }
  return fp;
}

const DEVICE_FINGERPRINT = getDeviceFingerprint();

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect() {
    const token = getStoredToken();

    if (!this.socket) {
      this.token = token;
      this.socket = io(getSocketOrigin(), {
        withCredentials: true,
        auth: { token, fingerprint: DEVICE_FINGERPRINT },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        console.log("[SocketService] Connected, id:", this.socket?.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("[SocketService] Disconnected:", reason);
      });

      this.socket.on("connect_error", (err) => {
        console.error("[SocketService] Connect error:", err.message);
      });
    } else if (token !== this.token) {
      this.token = token;
      this.socket.auth = { token, fingerprint: DEVICE_FINGERPRINT };
      if (this.socket.connected) {
        this.socket.disconnect().connect();
      }
    }
    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }
}

export const socketService = new SocketService();
