# API Key Guide / API Key 鑾峰彇鏁欑▼

Lumi OS supports China providers, international providers, local model runtimes, and OpenAI-compatible relays. The first-launch wizard is designed for non-technical users: choose a mode, pick a provider, paste one key, test, then launch.

API keys are stored locally:

```text
%USERPROFILE%\LumiOS\data\keys.json
```

Support bundles only report whether a key exists. They do not include raw keys.

## Recommended Providers / 鎺ㄨ崘渚涘簲鍟?
China / 涓浗浼樺厛:

- DeepSeek: Chinese chat, reasoning, and price-performance.
- Qwen / DashScope: stable China access and Alibaba Cloud model services.
- Volcengine Ark / Doubao: China backup provider and enterprise option.
- Kimi: Chinese long-context tasks.
- GLM / Zhipu: backup China model provider.

International / 鍥介檯浼樺厛:

- OpenAI: broad general capability and tool use.
- Anthropic Claude: long documents, code understanding, and writing.
- Google Gemini: multimodal and long-context backup provider.

Local / 鏈湴浼樺厛:

- Ollama: command-line local model runtime.
- LM Studio: graphical local runtime with an OpenAI-compatible local server.

## DeepSeek

Official docs:

```text
https://api-docs.deepseek.com/
```

Console:

```text
https://platform.deepseek.com/api_keys
```

涓枃姝ラ锛?
1. 鎵撳紑 DeepSeek 寮€鏀惧钩鍙板苟鐧诲綍銆?2. 杩涘叆 API Keys 椤甸潰銆?3. 鍒涘缓鏂扮殑 API Key銆?4. 澶嶅埗 Key锛岀矘璐村埌 Lumi OS 鐨?DeepSeek 杈撳叆妗嗐€?5. 鐐瑰嚮淇濆瓨锛岀劧鍚庢祴璇曡繛鎺ャ€?
English steps:

1. Open the DeepSeek platform and sign in.
2. Go to the API Keys page.
3. Create a new API key.
4. Copy the key into the DeepSeek field in Lumi OS.
5. Save it, then test the connection.

## Qwen / DashScope

Official docs:

```text
https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen
```

Console:

```text
https://bailian.console.aliyun.com/
```

涓枃姝ラ锛?
1. 鐧诲綍闃块噷浜戠櫨鐐?/ Model Studio銆?2. 寮€閫氭ā鍨嬫湇鍔″苟瀹屾垚璐﹀彿瑕佹眰銆?3. 杩涘叆 API Key 绠＄悊椤甸潰銆?4. 鍒涘缓骞跺鍒?DashScope API Key銆?5. 绮樿创鍒?Lumi OS 鐨?Qwen / DashScope 杈撳叆妗嗐€?
English steps:

1. Sign in to Alibaba Cloud Model Studio.
2. Enable the model service and complete account requirements.
3. Open API key management.
4. Create and copy a DashScope API key.
5. Paste it into the Qwen / DashScope field in Lumi OS.

## Volcengine Ark / Doubao

Official docs:

```text
https://www.volcengine.com/docs/82379/1541594
```

Console:

```text
https://console.volcengine.com/ark/
```

涓枃姝ラ锛?
1. 鐧诲綍鐏北寮曟搸鎺у埗鍙般€?2. 鎵撳紑鐏北鏂硅垷妯″瀷鏈嶅姟銆?3. 鍒涘缓鎴栭€夋嫨鎺ㄧ悊鎺ュ叆鐐广€?4. 鍦?API Key 绠＄悊澶勫垱寤?Key銆?5. 绮樿创鍒?Lumi OS 鐨?Ark / Doubao 杈撳叆妗嗐€?
English steps:

1. Sign in to the Volcengine console.
2. Open Ark model service.
3. Create or select an inference endpoint.
4. Create an API key.
5. Paste it into Lumi OS.

## Kimi / Moonshot

Official docs:

```text
https://platform.moonshot.cn/docs
```

Console:

```text
https://platform.moonshot.cn/console/api-keys
```

涓枃姝ラ锛?
1. 鐧诲綍 Moonshot AI 寮€鏀惧钩鍙般€?2. 瀹屾垚璐﹀彿璁よ瘉鎴栬璐硅姹傘€?3. 杩涘叆 API Key 绠＄悊銆?4. 鍒涘缓 Key 鍚庡鍒躲€?5. 绮樿创鍒?Lumi OS 鐨?Kimi 杈撳叆妗嗐€?
English steps:

1. Sign in to the Moonshot AI platform.
2. Complete account verification or billing setup.
3. Open API key management.
4. Create and copy a key.
5. Paste it into the Kimi field in Lumi OS.

## GLM / Zhipu

Official docs:

```text
https://docs.bigmodel.cn/
```

Console:

```text
https://bigmodel.cn/usercenter/proj-mgmt/apikeys
```

涓枃姝ラ锛?
1. 鐧诲綍鏅鸿氨寮€鏀惧钩鍙般€?2. 鎵撳紑鐢ㄦ埛涓績鐨?API Keys 椤甸潰銆?3. 鍒涘缓鏂扮殑椤圭洰 Key銆?4. 澶嶅埗 Key銆?5. 绮樿创鍒?Lumi OS 鐨?GLM 杈撳叆妗嗐€?
English steps:

1. Sign in to the Zhipu AI platform.
2. Open API Keys in the user center.
3. Create a new project key.
4. Copy the key.
5. Paste it into the GLM field in Lumi OS.

## OpenAI

Official docs:

```text
https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key
```

Console:

```text
https://platform.openai.com/api-keys
```

涓枃姝ラ锛?
1. 鐧诲綍 OpenAI Platform銆?2. 纭 API 璐﹀彿宸插畬鎴愯璐硅缃€?3. 杩涘叆 API keys 椤甸潰銆?4. 鍒涘缓鏂扮殑 secret key銆?5. 澶嶅埗鍚庣矘璐村埌 Lumi OS 鐨?OpenAI 杈撳叆妗嗐€?
English steps:

1. Sign in to OpenAI Platform.
2. Make sure API billing is set up.
3. Open the API keys page.
4. Create a new secret key.
5. Copy it into the OpenAI field in Lumi OS.

Note: ChatGPT subscriptions and API credits are separate.

## Anthropic Claude

Official docs:

```text
https://docs.anthropic.com/en/docs/get-started
```

Console:

```text
https://console.anthropic.com/settings/keys
```

涓枃姝ラ锛?
1. 鐧诲綍 Anthropic Console銆?2. 瀹屾垚缁勭粐鍜岃璐硅缃€?3. 杩涘叆 API Keys銆?4. 鍒涘缓 Key銆?5. 澶嶅埗鍒?Lumi OS 鐨?Anthropic 杈撳叆妗嗐€?
English steps:

1. Sign in to Anthropic Console.
2. Complete organization and billing setup.
3. Open API Keys.
4. Create a key.
5. Paste it into the Anthropic field in Lumi OS.

## Google Gemini

Official docs:

```text
https://ai.google.dev/gemini-api/docs/api-key
```

Console:

```text
https://aistudio.google.com/app/apikey
```

涓枃姝ラ锛?
1. 鎵撳紑 Google AI Studio銆?2. 鐧诲綍鍙敤鐨?Google 璐﹀彿銆?3. 鐐瑰嚮 Get API key銆?4. 鍒涘缓 Key銆?5. 澶嶅埗鍒?Lumi OS 鐨?Gemini 杈撳叆妗嗐€?
English steps:

1. Open Google AI Studio.
2. Sign in with an eligible Google account.
3. Click Get API key.
4. Create a key.
5. Paste it into the Gemini field in Lumi OS.

## Ollama

Official download:

```text
https://ollama.com/download
```

涓枃姝ラ锛?
1. 瀹夎 Ollama銆?2. 鎵撳紑缁堢杩愯涓€涓亰澶╂ā鍨嬶紝渚嬪 `ollama run qwen2.5` 鎴?`ollama run llama3.1`銆?3. 淇濇寔 Ollama 杩愯銆?4. 鍥炲埌 Lumi OS锛岃繍琛屾湰鍦版ā鍨嬭瘖鏂€?
English steps:

1. Install Ollama.
2. Run a chat model, for example `ollama run qwen2.5` or `ollama run llama3.1`.
3. Keep Ollama running.
4. Return to Lumi OS and run local model diagnostics.

## LM Studio

Official site:

```text
https://lmstudio.ai/
```

涓枃姝ラ锛?
1. 瀹夎 LM Studio銆?2. 涓嬭浇涓€涓亰澶╂ā鍨嬨€?3. 鎵撳紑鏈湴鏈嶅姟鍣ㄥ姛鑳姐€?4. 纭 OpenAI-compatible server 姝ｅ湪杩愯锛岄€氬父鏄?`http://localhost:1234/v1`銆?5. 鍥炲埌 Lumi OS锛岃繍琛屾湰鍦版ā鍨嬭瘖鏂€?
English steps:

1. Install LM Studio.
2. Download a chat model.
3. Enable the local server.
4. Confirm the OpenAI-compatible server is running, usually at `http://localhost:1234/v1`.
5. Return to Lumi OS and run local model diagnostics.

## OpenAI-Compatible Relay / OpenAI 鍏煎涓浆

Use this for One API, LiteLLM, company gateways, or private proxy services.

涓枃姝ラ锛?
1. 纭浣犵殑涓浆鏈嶅姟鍏煎 OpenAI API 鏍煎紡銆?2. 鍑嗗 Base URL锛屼緥濡?`https://your-domain.example.com/v1`銆?3. 鍑嗗涓浆鏈嶅姟鍙戞斁鐨?API Key銆?4. 鍦?Lumi OS 鍚屾椂濉啓 Base URL 鍜?API Key銆?5. 淇濆瓨鍚庢祴璇曡繛鎺ャ€?
English steps:

1. Confirm your relay is compatible with the OpenAI API format.
2. Prepare the Base URL, for example `https://your-domain.example.com/v1`.
3. Prepare the API key issued by your relay.
4. Enter both Base URL and API key in Lumi OS.
5. Save and test the connection.
