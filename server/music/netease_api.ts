/**
 * NetEase Cloud Music song URL — outer URL for frontend display.
 * Actual audio playback is handled by ncm-cli mpv (supports VIP).
 */
export async function getSongUrl(songId: number): Promise<string> {
  // Public outer URL — works as display reference; real audio is via ncm-cli mpv
  return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
}
