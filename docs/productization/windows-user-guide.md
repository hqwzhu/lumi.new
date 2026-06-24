# Lumi OS Windows User Guide / Windows 用户使用指南

This guide is for the Windows productized build of Lumi OS.

本文档面向 Lumi OS Windows 安装版用户。

## Download / 下载

Release page:

[https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.0](https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.0)

For normal users, download:

[`Lumi OS 安装.exe`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.0/Lumi%20OS%20%E5%AE%89%E8%A3%85.exe)

普通用户只需要下载 `Lumi OS 安装.exe`。
需要卸载时，使用发布包里的 `Lumi OS 卸载.cmd`。

## Install / 安装

English:

1. Run `Lumi OS 安装.exe`.
2. Follow the Windows installer prompts.
3. Launch Lumi OS from the Start Menu or desktop shortcut.
4. Complete the first-launch setup wizard.

中文：

1. 双击运行 `Lumi OS 安装.exe`。
2. 按安装器提示完成安装。
3. 从开始菜单或桌面快捷方式启动 Lumi OS。
4. 第一次启动时完成配置向导。

If Windows SmartScreen appears, continue only when the installer came from the official GitHub Release or a trusted release channel.

如果 Windows SmartScreen 弹出提示，请只在安装器来自官方 GitHub Release 或可信下载渠道时继续。

## Uninstall / 卸载

English:

1. Close Lumi OS.
2. Run `Lumi OS 卸载.cmd` from the release package, or uninstall Lumi OS from Windows Settings.
3. When prompted, choose whether to remove local setup data and installed skills. User data is kept by default.

中文：

1. 先退出 Lumi OS。
2. 双击运行发布包里的 `Lumi OS 卸载.cmd`，或在 Windows 设置里卸载 Lumi OS。
3. 如果提示是否删除本地配置和已安装技能，按需要选择。默认会保留用户数据。


## License Activation / 授权激活

Windows MVP uses one-machine activation. Lumi OS displays a machine code on first launch. The operator generates an authorization code for that exact machine code at:

[https://www.enhe-tech.com.cn/admin/license-generator](https://www.enhe-tech.com.cn/admin/license-generator)

Paste the generated code into Lumi OS and click `激活并继续`. After activation succeeds, Lumi OS opens the API Key setup wizard.

Windows MVP 版本采用一机一授权。用户首次启动时复制机器码，运营人员在上面的授权码生成器中为同一机器码生成授权码，用户粘贴后点击激活即可继续配置 API Key。
## Choose A Setup Mode / 选择配置模式

### Essential / 精简必需版

Fastest setup path. It configures one main model provider, checks the local data directory, checks bundled backend resources, and optionally detects local models.

适合第一次安装、只想快速进入聊天和基础 AI 功能的用户。

### Practical / 实用完整版

Recommended for most users. It configures a main model provider, optional backup providers, optional Ollama or LM Studio local model detection, API key tutorials, and connection checks.

推荐大多数用户选择，适合日常稳定使用。

### Full / 全量配置

For advanced users and teams. It exposes China providers, international providers, local runtimes, and OpenAI-compatible relay configuration.

适合团队、高级用户、多 API 账号或私有中转服务场景。

## Recommended Model Providers / 推荐模型

China / 中国：

- DeepSeek
- Qwen / DashScope
- Volcengine Ark / Doubao
- Kimi
- GLM / Zhipu

International / 国际：

- OpenAI
- Anthropic Claude
- Google Gemini

Local / 本地：

- Ollama
- LM Studio

Local models do not require API keys, but the local runtime must be installed, running, and loaded with at least one chat model.

本地模型不需要 API Key，但需要安装并运行本地模型服务，并加载至少一个聊天模型。

## API Key Setup / API Key 配置

Each API key field includes a bilingual tutorial:

- `如何获取`
- `How to get`

Open the tutorial drawer, follow the official provider link, create an API key, then paste it into Lumi OS.

点击输入框旁边的教程按钮，打开官方文档或控制台，创建 API Key，然后复制到 Lumi OS。

Full guide:

```text
docs/productization/api-key-guide.md
```

Lumi OS stores keys locally:

```text
%USERPROFILE%\LumiOS\data\keys.json
```

The setup UI does not display the full key again after saving.

保存后界面只显示是否已配置，不会再次显示完整 Key。

## Diagnostics / 诊断

Before launch, Lumi OS checks:

- whether local configuration data can be written
- whether bundled backend resources are present
- whether at least one cloud model key is configured
- whether Ollama or LM Studio has a loaded local chat model

You can launch Lumi OS when at least one model source is available.

至少配置一个云端模型 API Key，或运行一个本地模型来源后，即可进入 Lumi OS。

## Export Support Bundle / 导出支持包

If setup or launch fails:

1. Open Settings.
2. Go to Desktop Node Runtime.
3. Click `Export Support Bundle`.
4. Send the downloaded `lumi-support-bundle-*.json` file to support.

如果配置或启动失败：

1. 打开设置。
2. 进入 Desktop Node Runtime。
3. 点击 `Export Support Bundle`。
4. 把导出的 `lumi-support-bundle-*.json` 发给维护者。

The support bundle includes setup status, diagnostics, platform details, data directory path, and recent diagnostic events. It does not include raw API keys.

支持包包含配置状态、诊断信息、平台信息、数据目录路径和近期诊断事件，不包含原始 API Key。

## Reopen Setup / 重新打开配置向导

After launching Lumi OS:

1. Open Settings.
2. Go to Desktop Node Runtime.
3. Click `重新打开首次设置向导`.

This resets setup state and reloads the onboarding wizard. It does not delete saved API keys.

这会重置配置完成状态并重新进入向导，但不会删除已经保存的 API Key。

## Troubleshooting / 常见问题

### No model source detected / 没有检测到模型来源

Save at least one cloud model API key, or start Ollama / LM Studio with a loaded chat model and run diagnostics again.

请保存至少一个云端模型 API Key，或启动 Ollama / LM Studio 并加载聊天模型后重新诊断。

### API key test says key is not saved yet / 测试提示 Key 尚未保存

The test saw a key in the current input field, but you have not clicked Save. Save the key before launching.

说明输入框里有 Key，但还没有点击保存。请先保存再启动。

### Relay test fails / 中转服务测试失败

OpenAI-compatible relay requires both:

- API key
- Base URL, for example `https://your-relay.example.com/v1`

OpenAI 兼容中转服务必须同时填写 API Key 和 Base URL。

### Backend resources warning / 后端资源警告

Use the packaged installer from the official release. If you are developing locally, rebuild desktop resources:

```powershell
npm run build:desktop
```

普通用户请使用官方发布的安装器。开发环境可重新构建桌面资源。
