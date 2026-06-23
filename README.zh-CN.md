# LumiOS 中文说明

[English README](README.md) | [Windows 下载](https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.4) | [macOS 开发中](docs/productization/macos-user-guide.zh-CN.md)

LumiOS 是 Lumi AI 的桌面客户端。本仓库当前面向普通用户交付的是 Windows MVP 安装包，目标是让用户不需要手动搭环境，下载安装后通过首次启动向导完成 API Key 和基础设置。macOS 版本正在开发中，GitHub Actions 已经可以生成 Apple Silicon 内部测试 DMG；正式公开发布还需要 Apple Developer 签名和 notarization。

## 下载

正式 Windows Release 页面：

[https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.4](https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.4)

普通用户只需要下载这个文件：

[`LumiOS-Windows-3.0.4-x64-setup.exe`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.4/LumiOS-Windows-3.0.4-x64-setup.exe)

### macOS 版本状态

macOS 版本开发中，当前状态：

| 项目 | 状态 |
| --- | --- |
| Apple Silicon DMG | 已由 GitHub Actions 生成内部测试包 |
| Intel Mac DMG | 计划中，尚未发布 |
| 普通用户公开下载 | 暂不开放，等待 Apple Developer 签名和 notarization |
| 内部测试文件 | `LumiOS-macOS-3.0.4-arm64.dmg` |
| 测试说明 | [macOS 安装与真机验收指南](docs/productization/macos-user-guide.zh-CN.md) |
| 签名发布说明 | [macOS 签名、公证与正式 Release 流程](docs/productization/macos-signing-and-release.zh-CN.md) |

macOS GitHub Actions 构建入口：

[https://github.com/hqwzhu/lumi.new/actions/workflows/ci.yml](https://github.com/hqwzhu/lumi.new/actions/workflows/ci.yml)

发布页里还包含：

| 文件 | 用途 |
| --- | --- |
| `LumiOS-Windows-3.0.4-x64-setup.exe` | Windows 安装器，普通用户下载这个 |
| `LumiOS-Windows-3.0.4.zip` | 完整发布包，适合备份或内部交付 |
| `SHA256SUMS.txt` | 安装器 SHA256 校验值 |
| `manifest.json` | 机器可读的版本和下载元数据 |
| `RELEASE_NOTES.md` | 本次发布说明 |

安装器 SHA256：

```text
e06ea1aa369cd4baafbb1991b84c771b5aa9656eb6c7e863210000d6c539e2b3
```

## 安装

1. 下载 `LumiOS-Windows-3.0.4-x64-setup.exe`。
2. 双击运行安装器。
3. 按 Windows 安装器提示完成安装。
4. 从桌面快捷方式或开始菜单启动 Lumi OS。
5. 第一次启动时完成配置向导。

如果 Windows SmartScreen 提示风险，请确认安装器来自上面的官方 GitHub Release，再选择继续运行。

### 干净 Windows 环境需要额外安装什么？

普通用户只需要下载 Windows 安装器。Lumi OS 已经把 Node.js 后端运行时和桌面资源打包进安装器。从 3.0.3 开始，安装器会内嵌 Microsoft WebView2 bootstrapper；如果新电脑缺少 WebView2，安装过程会自动补装。这个方案仍然需要安装时联网。完全离线版安装器需要额外内嵌完整 WebView2 Runtime，体积会增加约 127MB，后续作为可选下载包发布。

## 首次启动配置

Lumi OS 首次启动会引导你选择配置模式。

### 精简必需版

适合第一次体验。只配置一个主要模型来源，完成基础诊断后即可进入程序。

### 实用完整版

推荐大多数用户选择。支持主模型、备用模型、本地模型检测、API Key 教程和连接诊断。

### 全量配置

适合高级用户、团队和有私有中转服务的场景。会显示中国模型、国际模型、本地模型和 OpenAI 兼容中转配置。

## 模型和 API Key

至少需要配置一个模型来源：

| 类型 | 推荐 |
| --- | --- |
| 中国模型 | DeepSeek、Qwen / DashScope、豆包 / 火山方舟、Kimi、GLM |
| 国际模型 | OpenAI、Anthropic Claude、Google Gemini |
| 本地模型 | Ollama、LM Studio |
| 中转服务 | 任意 OpenAI 兼容 API |

每个 API Key 输入框旁边都有“如何获取 / How to get”教程。打开教程后，根据官方链接创建 API Key，然后复制到 Lumi OS。

API Key 会保存在本机：

```text
%USERPROFILE%\LumiOS\data\keys.json
```

保存后界面只显示是否已配置，不会再次展示完整 Key。

## 本地模型

如果你不想配置云端 API Key，可以使用本地模型：

1. 安装 Ollama 或 LM Studio。
2. 下载并启动至少一个聊天模型。
3. 在 Lumi OS 首次启动向导里运行本地模型诊断。
4. 诊断通过后进入程序。

## 常见问题

### 没有检测到模型来源

请至少保存一个云端模型 API Key，或启动 Ollama / LM Studio 并加载聊天模型，然后重新诊断。

### API Key 测试提示尚未保存

说明输入框里有 Key，但你还没有点击保存。请先保存，再测试连接。

### OpenAI 兼容中转测试失败

中转服务需要同时填写：

- API Key
- Base URL，例如 `https://your-relay.example.com/v1`

### Windows SmartScreen 拦截

当前安装器尚未做代码签名，Windows 可能提示风险。只在确认安装器来自官方 GitHub Release 时继续运行。

## 诊断反馈

如果安装、启动或配置失败：

1. 打开设置。
2. 进入 `Desktop Node Runtime`。
3. 点击 `Export Support Bundle`。
4. 将导出的 `lumi-support-bundle-*.json` 发给维护者。

支持包包含配置状态、诊断信息、平台信息、数据目录路径和近期诊断事件，不包含原始 API Key。

## 开发者运行

普通用户不需要执行下面的命令。只有开发或二次构建时才需要。

```powershell
git clone https://github.com/hqwzhu/lumi.new.git
cd lumi.new
npm install
npm run dev
```

桌面开发模式：

```powershell
npm run build:desktop
npm run tauri:dev
```

Windows 发布包构建和检查：

```powershell
npm test
npm run lint
npm run release:windows:check
npm run package:windows-release:check
```

## 更多文档

- [Windows 用户指南](docs/productization/windows-user-guide.md)
- [macOS 安装与真机验收指南](docs/productization/macos-user-guide.zh-CN.md)
- [macOS 签名、公证与正式 Release 流程](docs/productization/macos-signing-and-release.zh-CN.md)
- [API Key 获取教程](docs/productization/api-key-guide.md)
- [诊断和反馈机制](docs/productization/diagnostics-and-feedback.md)
- [GitHub Release 与下载页流程](docs/productization/github-release-and-download-page.md)
