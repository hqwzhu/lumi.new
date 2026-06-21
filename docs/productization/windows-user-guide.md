# Lumi OS Windows User Guide / Windows 鐢ㄦ埛浣跨敤鎸囧崡

This guide is for the first Windows productized build of Lumi OS.

## Install / 瀹夎

English:

1. Run `Lumi OS_3.0.0_x64-setup.exe`.
2. Follow the Windows installer prompts.
3. Launch Lumi OS from the Start Menu or desktop shortcut.
4. Complete the first-launch setup wizard.

涓枃锛?
1. 鍙屽嚮杩愯 `Lumi OS_3.0.0_x64-setup.exe`銆?2. 鎸夊畨瑁呭櫒鎻愮ず瀹屾垚瀹夎銆?3. 浠庡紑濮嬭彍鍗曟垨妗岄潰蹇嵎鏂瑰紡鍚姩 Lumi OS銆?4. 绗竴娆″惎鍔ㄦ椂瀹屾垚閰嶇疆鍚戝銆?
If Windows SmartScreen appears, continue only when the installer came from the official GitHub Release or a trusted release channel.

濡傛灉 Windows SmartScreen 寮瑰嚭鎻愮ず锛岃鍙湪瀹夎鍣ㄦ潵鑷畼鏂?GitHub Release 鎴栧彲淇′笅杞芥笭閬撴椂缁х画銆?
## Choose A Setup Mode / 閫夋嫨閰嶇疆妯″紡

### Essential / 绮剧畝蹇呴渶鐗?
Fastest setup path. It configures one main model provider, checks the local data directory, checks bundled backend resources, and optionally detects local models.

閫傚悎绗竴娆″畨瑁呫€佸彧鎯冲揩閫熻繘鍏ヨ亰澶╁拰鍩虹 AI 鍔熻兘鐨勭敤鎴枫€?
### Practical / 瀹炵敤瀹屾暣鐗?
Recommended for most users. It configures a main model provider, optional backup providers, optional Ollama or LM Studio local model detection, API key tutorials, and connection checks.

鎺ㄨ崘澶у鏁扮敤鎴烽€夋嫨锛岄€傚悎鏃ュ父绋冲畾浣跨敤銆?
### Full / 鍏ㄩ噺閰嶇疆

For advanced users and teams. It exposes China providers, international providers, local runtimes, and OpenAI-compatible relay configuration.

閫傚悎鍥㈤槦銆侀珮绾х敤鎴枫€佸 API 璐﹀彿鎴栫鏈変腑杞湇鍔″満鏅€?
## Recommended Model Providers / 鎺ㄨ崘妯″瀷

China:

- DeepSeek
- Qwen / DashScope
- Volcengine Ark / Doubao
- Kimi
- GLM / Zhipu

International:

- OpenAI
- Anthropic Claude
- Google Gemini

Local:

- Ollama
- LM Studio

Local models do not require API keys, but the local runtime must be installed, running, and loaded with at least one chat model.

鏈湴妯″瀷涓嶉渶瑕?API Key锛屼絾闇€瑕佸畨瑁呭苟杩愯鏈湴妯″瀷鏈嶅姟锛屽苟鍔犺浇鑷冲皯涓€涓亰澶╂ā鍨嬨€?
## API Key Setup / API Key 閰嶇疆

Each API key field includes a bilingual tutorial:

- `濡備綍鑾峰彇`
- `How to get`

Open the tutorial drawer, follow the official provider link, create an API key, then paste it into Lumi OS.

鐐瑰嚮杈撳叆妗嗘梺杈圭殑鏁欑▼鎸夐挳锛屾墦寮€瀹樻柟鏂囨。鎴栨帶鍒跺彴锛屽垱寤?API Key锛岀劧鍚庡鍒跺埌 Lumi OS銆?
Full guide:

```text
docs/productization/api-key-guide.md
```

Lumi OS stores keys locally:

```text
%USERPROFILE%\LumiOS\data\keys.json
```

The setup UI does not display the full key again after saving.

淇濆瓨鍚庣晫闈㈠彧鏄剧ず鏄惁宸查厤缃紝涓嶄細鍐嶆鏄剧ず瀹屾暣 Key銆?
## Diagnostics / 璇婃柇

Before launch, Lumi OS checks:

- whether local configuration data can be written
- whether bundled backend resources are present
- whether at least one cloud model key is configured
- whether Ollama or LM Studio has a loaded local chat model

You can launch Lumi OS when at least one model source is available.

鑷冲皯閰嶇疆涓€涓簯绔ā鍨?API Key锛屾垨杩愯涓€涓湰鍦版ā鍨嬫簮鍚庯紝鍗冲彲杩涘叆 Lumi OS銆?
## Export Support Bundle / 瀵煎嚭鏀寔鍖?
If setup or launch fails:

1. Open Settings.
2. Go to Desktop Node Runtime.
3. Click `Export Support Bundle`.
4. Send the downloaded `lumi-support-bundle-*.json` file to support.

濡傛灉閰嶇疆鎴栧惎鍔ㄥけ璐ワ細

1. 鎵撳紑璁剧疆銆?2. 杩涘叆 Desktop Node Runtime銆?3. 鐐瑰嚮 `Export Support Bundle`銆?4. 鎶婁笅杞界殑 `lumi-support-bundle-*.json` 鍙戠粰缁存姢鑰呫€?
The support bundle includes setup status, diagnostics, platform details, data directory path, and recent diagnostic events. It does not include raw API keys.

鏀寔鍖呭寘鍚厤缃姸鎬併€佽瘖鏂俊鎭€佸钩鍙颁俊鎭€佹暟鎹洰褰曡矾寰勫拰杩戞湡璇婃柇浜嬩欢锛屼笉鍖呭惈鍘熷 API Key銆?
## Reopen Setup / 閲嶆柊鎵撳紑閰嶇疆鍚戝

After launching Lumi OS:

1. Open Settings.
2. Go to Desktop Node Runtime.
3. Click `閲嶆柊鎵撳紑棣栨璁剧疆鍚戝`.

This resets setup state and reloads the onboarding wizard. It does not delete saved API keys.

杩欎細閲嶇疆閰嶇疆瀹屾垚鐘舵€佸苟閲嶆柊杩涘叆鍚戝锛屼絾涓嶄細鍒犻櫎宸茬粡淇濆瓨鐨?API Key銆?
## Troubleshooting / 甯歌闂

### No model source detected / 娌℃湁妫€娴嬪埌妯″瀷鏉ユ簮

Save at least one cloud model API key, or start Ollama / LM Studio with a loaded chat model and run diagnostics again.

璇蜂繚瀛樿嚦灏戜竴涓簯绔ā鍨?API Key锛屾垨鍚姩 Ollama / LM Studio 骞跺姞杞借亰澶╂ā鍨嬪悗閲嶆柊璇婃柇銆?
### API key test says key is not saved yet / 娴嬭瘯鎻愮ず Key 灏氭湭淇濆瓨

The test saw a key in the current input field, but you have not clicked Save. Save the key before launching.

璇存槑杈撳叆妗嗛噷鏈?Key锛屼絾杩樻病鏈夌偣鍑讳繚瀛樸€傝鍏堜繚瀛樺啀鍚姩銆?
### Relay test fails / 涓浆鏈嶅姟娴嬭瘯澶辫触

OpenAI-compatible relay requires both:

- API key
- Base URL, for example `https://your-relay.example.com/v1`

OpenAI 鍏煎涓浆鏈嶅姟蹇呴』鍚屾椂濉啓 API Key 鍜?Base URL銆?
### Backend resources warning / 鍚庣璧勬簮璀﹀憡

Use the packaged installer from the official release. If you are developing locally, rebuild desktop resources:

```powershell
npm run build:desktop
```

鏅€氱敤鎴疯浣跨敤瀹樻柟鍙戝竷鐨勫畨瑁呭櫒銆傚紑鍙戠幆澧冨彲閲嶆柊鏋勫缓妗岄潰璧勬簮銆?
