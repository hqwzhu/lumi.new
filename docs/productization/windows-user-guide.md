# LumiOS Windows Installer MVP User Guide

This guide is for the first Windows productized build of LumiOS.

## Install

1. Run `Lumi OS_3.0.0_x64-setup.exe`.
2. Follow the Windows installer prompts.
3. Launch LumiOS from the Start Menu or desktop shortcut.
4. On first launch, complete the setup wizard.

If Windows SmartScreen appears, choose more info and run anyway only if the installer came from the official project repository or a trusted release channel.

## Choose A Setup Mode

### Essential

Use this when you want the fastest path into LumiOS.

It configures:

- One main model provider.
- Basic local data directory checks.
- Backend resource checks.
- Optional local model detection.

Recommended for first-time users who only want chat and core AI features.

### Practical

This is the recommended mode for most users.

It configures:

- A main model provider.
- Optional backup providers.
- Optional Ollama or LM Studio local model detection.
- API key tutorials and connection tests.

Recommended when you want LumiOS to work reliably for daily use.

### Full

Use this when you need a complete model matrix.

It exposes:

- Major China model providers.
- Major international model providers.
- Local model runtimes.
- OpenAI-compatible relay configuration.

Recommended for teams, advanced users, or users with multiple API accounts.

## Recommended Model Providers

### China

- DeepSeek
- Qwen / DashScope
- Volcengine Ark / Doubao
- Kimi
- GLM / Zhipu

### International

- OpenAI
- Anthropic Claude
- Google Gemini

### Local

- Ollama
- LM Studio

Local models do not require API keys, but the local runtime must be installed, running, and loaded with at least one chat model.

## API Key Setup

Each API key field includes a bilingual tutorial:

- `如何获取`
- `How to get`

Use the tutorial drawer to open the official docs or provider console, create an API key, then paste it into LumiOS.

LumiOS stores keys locally in the user data directory:

```text
%USERPROFILE%\LumiOS\data\keys.json
```

The onboarding UI does not store API keys in browser `localStorage`.

## Diagnostics

Before launch, LumiOS checks:

- Whether local configuration data can be written.
- Whether bundled backend resources are present.
- Whether at least one cloud model key is configured.
- Whether Ollama or LM Studio has a loaded local chat model.

You can launch LumiOS when at least one model source is available.

## Export Support Bundle

If setup or launch fails:

1. Open Settings.
2. Go to the Desktop Node Runtime section.
3. Click `Export Support Bundle`.
4. Send the downloaded `lumi-support-bundle-*.json` file to the maintainer.

The support bundle includes setup status, model diagnostics, platform details, data directory path, and provider configuration flags. It does not include raw API keys.

## Reopen Setup

After launching LumiOS:

1. Open Settings.
2. Go to the Desktop Node Runtime section.
3. Click `重新打开首次设置向导`.

This resets setup state and reloads LumiOS into the onboarding wizard. It does not delete saved API keys.

## Troubleshooting

### No model source detected

Save at least one cloud model API key, or start Ollama / LM Studio with a loaded chat model and run diagnostics again.

### API key test says key is not saved yet

The test saw a key in the current input field, but you have not clicked Save. Save the key before launching.

### Relay test fails

OpenAI-compatible relay requires both:

- API key
- Base URL, for example `https://your-relay.example.com/v1`

### Backend resources warning

Run the packaged installer build, or rebuild desktop resources with:

```powershell
npm run build:desktop
```

### WebView2 warning during packaging

The current installer can build without bundling `WebView2Loader.dll`. For a polished signed release, verify WebView2 runtime strategy and code signing before distribution.
