# Lumi OS macOS 安装与真机验收指南

适用对象：第一次在 Mac 上测试 Lumi OS 的用户或维护者。

当前 macOS MVP 产物：

```text
LumiOS-macOS-3.0.4-arm64.dmg
```

适用芯片：Apple Silicon Mac，也就是 M1、M2、M3、M4 系列。Intel Mac 需要单独构建 `x64` 版本。

## 下载测试包

推荐从 GitHub Actions 下载：

1. 打开仓库 `hqwzhu/lumi.new`。
2. 进入 `Actions`。
3. 打开运行记录 `LumiOS CI and Desktop Release`。
4. 找到 artifact：`lumi-os-macos-release-kit`。
5. 下载并解压。
6. 使用里面的 `LumiOS-macOS-3.0.4-arm64.dmg`。

本次已校验的 Actions run：

```text
https://github.com/hqwzhu/lumi.new/actions/runs/28034026502
```

本次已校验的文件：

```text
LumiOS-macOS-3.0.4-arm64.dmg
SHA256 c2d0617431c8e72a73b1015c0c80de5cb814f51050d018b5ef6e2e2ce2752318
```

## 安装

1. 双击打开 `LumiOS-macOS-3.0.4-arm64.dmg`。
2. 把 `Lumi OS` 拖入 `Applications`。
3. 从 `Applications` 启动 `Lumi OS`。

如果 macOS 提示无法打开：

1. 打开 `System Settings`。
2. 进入 `Privacy & Security`。
3. 在安全提示区域点击 `Open Anyway`。
4. 再次确认打开。

也可以在 `Applications` 里右键 `Lumi OS`，选择 `Open`。未签名版本只用于内部测试，不建议给普通用户分发。

## 首次启动验收

按下面顺序检查：

1. 程序可以启动，进入首次配置向导。
2. 可以选择 `精简必需版`。
3. 可以填写 DeepSeek 或其他模型 API Key。
4. 保存 API Key 后没有 `Failed to fetch`。
5. 诊断检测可以识别至少一个可用模型来源。
6. 可以进入主界面。
7. 语音交互时，只播放最终回答，不播放思考过程。
8. 设置页可以切换到 `实用完整版` 或 `全量配置版`。
9. 可以导出诊断/反馈包。
10. 退出后重新启动，配置仍然保留。

## 测试建议

最小验收只需要配置一个大模型：

```text
DeepSeek API Key
```

如果要测试本地模型，可以提前安装并启动：

```text
Ollama
LM Studio
```

但精简必需版不要求用户必须安装本地模型。

## 卸载测试版

1. 退出 Lumi OS。
2. 从 `Applications` 删除 `Lumi OS`。
3. 如需清理本地测试数据，删除：

```text
~/LumiOS
~/Library/Application Support/Lumi OS
~/Library/Logs/Lumi OS
```

清理本地数据会删除已保存的 API Key 和测试配置。

## 测试结果记录

记录以下信息后再进入正式签名发布：

```text
Mac 型号：
芯片：Apple Silicon / Intel
macOS 版本：
安装方式：DMG
首次启动：通过 / 不通过
API Key 保存：通过 / 不通过
诊断检测：通过 / 不通过
主界面进入：通过 / 不通过
语音反馈：通过 / 不通过
诊断包导出：通过 / 不通过
问题截图或日志：
```
