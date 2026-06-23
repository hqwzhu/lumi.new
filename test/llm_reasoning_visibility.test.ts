import { describe, expect, it } from 'vitest';
import {
  formatDeepSeekRequest,
  makeLLMCallStreaming,
  parseDeepSeekResponse,
} from '../server/llm/providers';

function createStreamingClient(chunks: any[]) {
  async function* stream() {
    for (const chunk of chunks) yield chunk;
  }

  return {
    chat: {
      completions: {
        create: async () => stream(),
      },
    },
  };
}

describe('LLM reasoning visibility', () => {
  it('does not expose reasoning_content as the assistant answer', () => {
    const response = parseDeepSeekResponse({
      choices: [
        {
          message: {
            reasoning_content: '先分析用户问题，再决定怎么回答。',
          },
        },
      ],
    });

    expect(response.text).toBeNull();
    expect(response.reasoningContent).toBe('先分析用户问题，再决定怎么回答。');
  });

  it('strips embedded think blocks from non-streaming answers', () => {
    const response = parseDeepSeekResponse({
      choices: [
        {
          message: {
            content: '<think>这里是内部推理，不应该展示。</think>可以，已经完成。',
          },
        },
      ],
    });

    expect(response.text).toBe('可以，已经完成。');
  });

  it('extracts the final answer when providers include reasoning labels in content', () => {
    const response = parseDeepSeekResponse({
      choices: [
        {
          message: {
            content: '思考过程：先判断意图，然后准备回复。\n最终答案：请点击保存即可。',
          },
        },
      ],
    });

    expect(response.text).toBe('请点击保存即可。');
  });

  it('streams answer content without reasoning_content chunks', async () => {
    const client = createStreamingClient([
      { choices: [{ delta: { reasoning_content: '先分析问题。' } }] },
      { choices: [{ delta: { content: '这是最终回答。' } }] },
    ]);
    const chunks: string[] = [];

    const result = await makeLLMCallStreaming(
      [{ role: 'user', content: '你好' }],
      [],
      { provider: 'deepseek', model: 'deepseek-v4-pro' },
      chunk => chunks.push(chunk),
      () => client,
      () => null,
    );

    expect(chunks).toEqual(['这是最终回答。']);
    expect(result.text).toBe('这是最终回答。');
    expect(result.reasoningContent).toBe('先分析问题。');
  });

  it('does not stream embedded think blocks to the UI or TTS', async () => {
    const client = createStreamingClient([
      { choices: [{ delta: { content: '<think>内部' } }] },
      { choices: [{ delta: { content: '推理</think>' } }] },
      { choices: [{ delta: { content: '只播放这个结果。' } }] },
    ]);
    const chunks: string[] = [];

    const result = await makeLLMCallStreaming(
      [{ role: 'user', content: '测试' }],
      [],
      { provider: 'deepseek', model: 'deepseek-v4-pro' },
      chunk => chunks.push(chunk),
      () => client,
      () => null,
    );

    expect(chunks).toEqual(['只播放这个结果。']);
    expect(result.text).toBe('只播放这个结果。');
  });

  it('does not send previous reasoning_content back to the model', () => {
    const request = formatDeepSeekRequest({
      model: 'deepseek-v4-pro',
      messages: [
        {
          role: 'assistant',
          content: '正式回答',
          reasoningContent: '隐藏推理，不能进入下一轮上下文。',
        },
      ],
      toolDeclarations: [],
    });

    expect(request.messages[0]).toEqual({
      role: 'assistant',
      content: '正式回答',
    });
  });
});
