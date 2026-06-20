import { describe, it, expect, vi } from 'vitest';

describe('setup local model detection', () => {
  it('detects Ollama chat models and ignores embedding-only models', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'nomic-embed-text' }, { name: 'qwen2.5:7b' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
    const { detectLocalModelSources } = await import('../server/setup/local_models');

    const result = await detectLocalModelSources({ fetcher: fetcher as any });

    expect(result.hasLocalModel).toBe(true);
    expect(result.providers.ollama.detected).toBe(true);
    expect(result.providers.ollama.models).toEqual(['nomic-embed-text', 'qwen2.5:7b']);
    expect(result.providers.lmstudio.detected).toBe(false);
  });

  it('detects LM Studio models from the OpenAI-compatible models endpoint', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('ollama offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'local-model' }] }),
      });
    const { detectLocalModelSources } = await import('../server/setup/local_models');

    const result = await detectLocalModelSources({ fetcher: fetcher as any });

    expect(result.hasLocalModel).toBe(true);
    expect(result.providers.ollama.detected).toBe(false);
    expect(result.providers.lmstudio.detected).toBe(true);
    expect(result.providers.lmstudio.models).toEqual(['local-model']);
  });
});
