# Lumi OS macOS 签名、公证与正式 Release 流程

适用对象：维护者。目标是把内部测试 DMG 升级为普通 Mac 用户可以下载使用的正式版本。

## 当前状态

当前 CI 已支持两种路径：

```text
无 Apple 签名密钥：构建 unsigned 内部测试版
有 Apple 签名密钥：构建 signed macOS release kit
```

无签名 DMG 可以测试功能，但不适合公开给普通用户。正式公开发布前必须完成 Apple Developer 代码签名和 notarization。

## Apple 账号准备

需要：

```text
Apple Developer Program 账号
Developer ID Application 证书
App-specific password 或 App Store Connect API 凭据
Team ID
```

本项目 CI 使用 Apple ID 路径，GitHub Secrets 名称如下：

```text
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
KEYCHAIN_PASSWORD
```

说明：

```text
APPLE_CERTIFICATE：base64 后的 .p12 证书内容
APPLE_CERTIFICATE_PASSWORD：导出 .p12 时设置的密码
APPLE_SIGNING_IDENTITY：证书身份名称，例如 Developer ID Application: Name (TEAMID)
APPLE_ID：Apple Developer 登录邮箱
APPLE_PASSWORD：Apple app-specific password
APPLE_TEAM_ID：Apple Team ID
KEYCHAIN_PASSWORD：CI 临时 keychain 密码，可自定义强密码
```

## 在 Mac 上导出证书

在 Keychain Access 中确认已有 `Developer ID Application` 证书，然后导出为 `.p12`。

导出后执行：

```bash
base64 -i DeveloperIDApplication.p12 | pbcopy
```

把剪贴板内容写入 GitHub Secret：

```text
APPLE_CERTIFICATE
```

如果输出有换行，GitHub Secret 可以直接粘贴多行内容。

## 获取签名身份

在 Mac 终端执行：

```bash
security find-identity -v -p codesigning
```

选择 `Developer ID Application` 那一行的引号内文本，填入：

```text
APPLE_SIGNING_IDENTITY
```

## 配置 GitHub Secrets

打开：

```text
GitHub 仓库 -> Settings -> Secrets and variables -> Actions -> New repository secret
```

依次添加：

```text
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
KEYCHAIN_PASSWORD
```

不要把这些值提交到代码仓库，也不要写入 `.env`。

## 触发 signed 构建

打开：

```text
GitHub -> Actions -> LumiOS CI and Desktop Release -> Run workflow
```

选择：

```text
branch: main
publish_release: false
release_platform: macos
prerelease: true
```

先只构建 artifact，不发布。CI 会自动检测 Apple Secrets；检测到证书后走 signed 构建路径。

构建成功后下载 artifact：

```text
lumi-os-macos-release-kit
```

在 Mac 上安装并做完整验收。

## 发布正式 macOS Release

测试通过后再次运行 workflow：

```text
branch: main
publish_release: true
release_platform: macos
prerelease: false
```

Release tag 格式：

```text
macos-v<version>-<arch>
```

示例：

```text
macos-v3.0.4-arm64
```

发布后检查 Release assets 至少包含：

```text
LumiOS-macOS-3.0.4-arm64.dmg
LumiOS-macOS-3.0.4-arm64.app.tar.gz
LumiOS-macOS-3.0.4-arm64.zip
SHA256SUMS.txt
manifest.json
RELEASE_NOTES.md
```

## 正式发布前检查

必须确认：

1. Mac 真机可以直接打开 DMG。
2. App 可以拖入 Applications。
3. 首次启动不再出现 unsigned Gatekeeper 阻断。
4. 首次配置向导可用。
5. API Key 保存可用。
6. 诊断检测可用。
7. 主界面可进入。
8. 语音反馈不播放思考过程。
9. 诊断包导出可用。
10. Release 页面下载的 DMG SHA256 与 `SHA256SUMS.txt` 一致。

## Intel Mac 版本

当前已校验产物是：

```text
macos-arm64
```

如果要支持 Intel Mac，需要增加 `x86_64-apple-darwin` 构建矩阵，并发布：

```text
LumiOS-macOS-<version>-x64.dmg
```

Intel 支持建议放在 macOS MVP 验收之后处理。
