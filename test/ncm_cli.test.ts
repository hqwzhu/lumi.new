import { describe, expect, it } from 'vitest';
import {
  extractNcmJson,
  normalizeNcmAccountProfile,
  normalizeNcmPlaybackState,
} from '../server/music/ncm_cli';

describe('ncm-cli output parsing', () => {
  it('extracts JSON when ncm-cli prints an update notice first', () => {
    const output = `
│ 有新版本: 0.1.5 -> 0.1.6  运行 ncm-cli upgrade 升级

{
  "success": true,
  "message": "已登录实名账号"
}
`;

    expect(extractNcmJson(output)).toEqual({
      success: true,
      message: '已登录实名账号',
    });
  });

  it('normalizes NetEase account profile fields for the UI', () => {
    const profile = normalizeNcmAccountProfile({
      code: 200,
      data: {
        originalId: 471369945,
        id: 'E1712B0A239C62F8A6F21DC80AF98234',
        nickname: 'Lumi Listener',
        avatarUrl: 'https://example.test/avatar.jpg',
        signature: 'hello',
        vipDetail: [{ type: 1 }, { type: 6 }],
      },
    });

    expect(profile).toMatchObject({
      id: 'E1712B0A239C62F8A6F21DC80AF98234',
      originalId: 471369945,
      nickname: 'Lumi Listener',
      avatarUrl: 'https://example.test/avatar.jpg',
      vipTypes: [1, 6],
    });
  });

  it('keeps the last known track when ncm-cli state omits track metadata', () => {
    const state = normalizeNcmPlaybackState(
      {
        success: true,
        state: {
          status: 'playing',
          position: 42,
          volume: 63,
          currentIndex: 0,
          queueLength: 1,
        },
      },
      {
        trackName: '晴天',
        artists: ['周杰伦'],
        album: '叶惠美',
        duration: 269,
        coverUrl: 'https://example.test/cover.jpg',
      },
    );

    expect(state).toMatchObject({
      playing: true,
      trackName: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      duration: 269,
      progress: 42,
      volume: 63,
      source: 'netease',
    });
  });
});
