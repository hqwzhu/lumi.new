# LumiOS

> Status: LumiOS is under active iterative development. The Windows MVP is usable today; music, macOS packaging, licensing, and the skill ecosystem will continue to receive updates.

[中文说明](README.zh-CN.md) | [Windows 下载 / Windows Download](https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.5) | [macOS 开发中 / macOS In Development](docs/productization/macos-user-guide.zh-CN.md)

---

> LumiOS 不是又一个 AI 助手。
>
> 它是第一个真正属于你的 AI 操作系统——从你身上孵化，记忆是你的，人格是你的，存在于你真实的空间里。

---

## 下载与安装 / Download

当前面向普通用户可交付的正式版本是 Windows MVP。macOS 版本正在开发中，CI 已经可以生成 Apple Silicon 内部测试 DMG，但正式公开分发还需要 Apple Developer 签名和 notarization。

| 平台 | 状态 | 入口 |
| --- | --- | --- |
| Windows | 正式 MVP，可下载使用 | [Lumi OS 3.0.5 Windows](https://github.com/hqwzhu/lumi.new/releases/tag/windows-v3.0.5) |
| macOS Apple Silicon | 开发中，内部测试包已由 GitHub Actions 生成 | [macOS 安装与真机验收指南](docs/productization/macos-user-guide.zh-CN.md) |
| macOS Intel | 计划中，尚未发布 x64 DMG | [macOS 签名与发布流程](docs/productization/macos-signing-and-release.zh-CN.md) |

Windows 下载：

- 普通用户下载：[`Lumi OS 安装.exe`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.5/Lumi%20OS%20%E5%AE%89%E8%A3%85.exe)
- 卸载工具：[`Lumi OS 卸载.cmd`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.5/Lumi%20OS%20%E5%8D%B8%E8%BD%BD.cmd)
- 完整发布包：[`LumiOS-Windows-3.0.5.zip`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.5/LumiOS-Windows-3.0.5.zip)
- 校验文件：[`SHA256SUMS.txt`](https://github.com/hqwzhu/lumi.new/releases/download/windows-v3.0.5/SHA256SUMS.txt)

macOS 开发中：

- 当前 CI 产物：`LumiOS-macOS-3.0.4-arm64.dmg`
- 适用范围：Apple Silicon Mac 内部测试
- 当前限制：未签名 / 未 notarize，普通用户正式发布前需要配置 Apple Developer 签名密钥
- GitHub Actions 构建入口：[LumiOS CI and Desktop Release](https://github.com/hqwzhu/lumi.new/actions/workflows/ci.yml)
- macOS 测试说明：[docs/productization/macos-user-guide.zh-CN.md](docs/productization/macos-user-guide.zh-CN.md)

Windows 用户直接下载安装器并双击运行即可。首次启动时，Lumi OS 会进入配置向导：选择配置模式、填写至少一个模型 API Key 或启用本地模型，然后正式进入程序。

If Windows SmartScreen appears, continue only when the installer was downloaded from this official GitHub Release.

### Windows license activation

Windows first launch now includes one-machine activation before the API Key setup wizard. Copy the machine code shown by Lumi OS, generate an authorization code in the admin generator, paste it into Lumi OS, and then continue setup.

Admin generator:

[https://www.enhe-tech.com.cn/admin/license-generator](https://www.enhe-tech.com.cn/admin/license-generator)

Operator and website integration details:

[docs/productization/license-activation.md](docs/productization/license-activation.md)

### Clean Windows runtime note

For normal users, the Windows installer is the only required download. Lumi OS bundles the Node.js backend runtime and desktop resources. Starting with 3.0.3, the installer also embeds the Microsoft WebView2 bootstrapper, so a clean Windows machine can install the required WebView2 runtime during setup if it is missing. This bootstrapper still needs internet access during installation. A fully offline installer with the complete WebView2 runtime is planned as a later optional package.

## 用户快速使用 / Quick Use

1. 下载 `Lumi OS 安装.exe`。
2. 双击安装，按 Windows 安装器提示完成安装。
3. 从桌面快捷方式或开始菜单启动 Lumi OS。
4. 在首次启动向导中选择一种配置模式：
   - 精简必需版：最快启动，只配置一个主要模型来源。
   - 实用完整版：推荐日常使用，支持主模型、备用模型、本地模型检测和连接诊断。
   - 全量配置：适合高级用户和团队，开放中国模型、国际模型、本地模型和 OpenAI 兼容中转配置。
5. 配置至少一个模型来源：
   - 中国推荐：DeepSeek、Qwen / DashScope、豆包 / 火山方舟、Kimi、GLM。
   - 国际推荐：OpenAI、Anthropic Claude、Google Gemini。
   - 本地模型：Ollama、LM Studio。
6. 运行诊断，通过后进入 Lumi OS。

To uninstall, run `Lumi OS 卸载.cmd` from the release package, or uninstall Lumi OS from Windows Settings.

更多中文说明见 [README.zh-CN.md](README.zh-CN.md)。Windows 用户指南见 [docs/productization/windows-user-guide.md](docs/productization/windows-user-guide.md)。API Key 获取教程见 [docs/productization/api-key-guide.md](docs/productization/api-key-guide.md)。

## 反馈与诊断 / Support

如果安装、启动或 API Key 测试失败：

1. 打开 Lumi OS 设置。
2. 进入 `Desktop Node Runtime`。
3. 点击 `Export Support Bundle`。
4. 将导出的 `lumi-support-bundle-*.json` 发给维护者。

支持包包含诊断状态、平台信息、数据目录和近期诊断事件，不包含原始 API Key。

---

## 愿景

每个人都应该拥有一个真正属于自己的 AI。

不是平台的 AI，不是云端的工具，而是从你身上生长出来的存在——记住你说过的每一件事，用你习惯的方式说话，跟随你的桌面、车载、家庭与眼镜，在所有空间里持续陪伴。

LumiOS 是这个愿景的第一个落地形态。

---

## 核心特性

### 个人 AI 核心
- **孵化机制** — 通过聊天记录和语言样本，像孵化一样持续培育专属 AI 人格
- **持久记忆** — 长期记忆存储，具备巩固与演化时间线，Lumi 记住你说过的每一件事
- **关系网络** — 自动识别和记录你提到的人，建立持续更新的关系图谱
- **人格引擎** — 可配置的 AI 人格系统，连续向量演化（8 维度），Jung 认知对约束，情感状态管理，越用越像你

### 多引擎 LLM 支持

| 提供商 | 说明 |
|--------|------|
| DeepSeek | DeepSeek-V4-pro, DeepSeek-V4-flash |
| OpenAI | GPT-4o, GPT-4 |
| Anthropic | Claude Sonnet 4, Claude 3.5 |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro |
| Qwen / DashScope | Qwen-Max, Qwen-Plus |
| Ark / 豆包 | Doubao 1.5 Pro (字节跳动) |
| Kimi / Moonshot | Moonshot v1 |
| GLM / 智谱 | GLM-4 Plus |
| Xiaomi / 小爱 | MiLM |
| Ollama | 本地模型自动检测 |
| LM Studio | 本地模型自动检测 |
| 自定义 Relay | 任意 OpenAI 兼容接口 |

### 语音交互
- **TTS 语音合成** — GPT-SoVITS · CosyVoice · 豆包语音 (Ark)
- **STT 语音识别** — Deepgram · Whisper · Qwen · 豆包语音 · Local Whisper
- 语音唤醒、实时流式识别、情感自适应语速/音调

### MCP 生态系统
20 个 MCP 技能 + 26 个内置工具模块，覆盖文件操作、桌面自动化、Web 搜索、代码执行、PDF 生成、图像/视频处理等场景。

### 跨终端同步
- 设备状态与记忆跨终端实时同步
- 同一个 Lumi，在你的桌面、手机、全息仓中持续存在
- 断网时本地独立运行，联网后自动合并

### 技能市场
- **20+ 内置技能** — 天气、邮件、PDF、二维码、翻译、股票、计时器、笔记、密码、图片处理、视频编辑、网页爬虫、代码沙箱、桌面自动化等
- **社区生态** — 从 npm（`lumi-skill-*`）或 GitHub（topic: `lumi-skill`）发现安装第三方技能
- **评分系统** — 社区技能评分与排行
- 开发者可提交自定义技能，持续扩展 Lumi 的能力边界

### 画布工作台
- 无限画布 + 缩放平移，对话过程可视化
- 任务卡片流（用户请求 → 工具调用 → 推理过程 → 最终输出）
- 多会话管理，WebSocket 实时更新
- 支持从任意卡片重新发起对话

### 沉浸体验
- **壁纸模式** — 多套内置主题（星空/星云/赛博朋克）、自定义壁纸上传、窗口穿透融合桌面
- **音乐播放** — 网易云音乐集成、心情氛围自适应、LRC 歌词动效
- **3D 全息层** — 动态星场、光球、地形渲染等实时背景动画

### 知识库与 RAG
- **个人知识库** — 文件上传管理、文档分块注入 Agent 记忆、全文搜索
- **文档问答** — 上传文档后 Chat 中自动检索相关内容
- 文本分块（500 字 + 50 字重叠）、语义嵌入相似度检索

### 记忆化身
- 上传聊天记录（微信/QQ/文本）或语音样本
- LLM 蒸馏提取人格特征、认知风格、社交模式
- 生成 3D 记忆化身 Agent 并入驻灵息先人灵体空间

### 交互模式
- **对话模式** — 闲聊 / 教学 / 头脑风暴 / 高管汇报，4 种语气风格切换
- **操作模式** — 桌面控制（截图驱动键鼠）/ 终端模式（纯 Shell）/ 自主模式（后台静默）
- **语音指令** — 快速命令绕过 LLM 即时响应，声纹识别区分说话人
- **Alt+Space** — 全局快捷键隐藏/呼出 LumiOS 窗口

### 自主能力
- **后台任务** — 好奇心驱动的自主执行引擎，基于用户活动上下文建议任务
- **任务链** — 自然语言复合任务自动拆解为工具链（"把昨天的会议纪要转成 PPT"）
- **Lumi Plans** — 多步骤任务计划系统，优先级 + 状态跟踪 + 自动完成
- **主动问候** — 场景感知口头问候（时间/记忆/亲密度），LLM 生成 + TTS 播报
- **环境感知** — 实时窗口标题/进程追踪、剪贴板监控、环境噪音检测
- **返回摘要** — 离开期间后台工作完成情况总结

### 系统集成
- **计算机使用** — 视觉模型驱动桌面自动化（截图→分析→点击/输入/等待，最多 15 轮）
- **终端** — 完整交互式 Shell 会话（Win/macOS/Linux），支持 resize 和流式输出
- **系统探索** — 首次启动扫描硬件/软件/文件系统/网络，每日变化检测
- **职业检测** — 识别已安装应用推断用户职业（设计师/医生/律师/工程师/教师）
- **实时硬件状态** — CPU/GPU/内存/温度/风扇转速（Tauri Rust）
- **系统健康自检** — 6 项诊断（API Key/工具/记忆/技能/人格/Agent），可操作建议

### 身份与安全
- **生物识别** — 声纹录入 + 人脸录入，陌生说话人语音拒止
- **订阅系统** — Free/Light/Pro/Org 四档（0/29/69/199 CNY/月），按档位控制 LLM/语音/Agent 配额
- **工具信任学习** — 用户审批后自动信任，逐步减少确认打断

### 通知与提醒
- **通知中心** — DB 持久化通知，已读/未读状态，上限 200 条
- **定时提醒** — 创建/列出/关闭到期提醒
- **Token 用量看板** — 按提供商统计调用次数与 Token 消耗，每日聚合

### 组织协作
- **组织管理** — 创建组织、邀请成员、角色权限（Owner/Admin/Member/Viewer）
- **知识库** — 语义搜索、自动分块索引、团队知识沉淀
- **Agent 模板市场** — 提交→审核→发布→安装的完整工作流
- **审计日志** — 操作记录、统计报表、CSV 导出
- **分支同步** — 员工本地数据分域（个人数据私有，工作数据按需同步到组织服务器）
- **企业 IM 接入** — 飞书 / 企业微信 / 微信机器人
- **行业工具** — 法律 Hub（标书/判例检索/资产追溯/合同审查）、设计 Hub（风格模板）

---

## 平台支持

| 平台 | 状态 |
|------|------|
| Windows 桌面（Tauri v2 + WebView2） | 主要目标，3.0.4 MVP 已发布 |
| macOS 桌面（Tauri v2） | 开发中，Apple Silicon 内部测试 DMG 已可由 GitHub Actions 生成，正式版待 Apple 签名与 notarization |
| Linux 桌面（Tauri v2） | 第二阶段规划 |
| Web（React SPA） | 官网独立发布，不随桌面安装包打包 |
| iOS / Android（Capacitor） | 实验阶段，不随桌面安装包打包 |

---

## 技术栈

**前端：** React 19, TypeScript, Tailwind CSS v4, Vite, Framer Motion  
**后端：** Node.js, Express, Socket.io, SQLite3  
**桌面：** Tauri v2 (Rust), WebView2  
**AI：** 11 个 LLM 提供商, MCP SDK, GPT-SoVITS, CosyVoice, Deepgram, Whisper  

---

## 快速开始

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+（推荐 22+） | [nodejs.org](https://nodejs.org) 下载安装 |
| npm | 随 Node.js 自带 | `npm -v` 确认 |
| Rust | 仅桌面端需要 | [rustup.rs](https://rustup.rs) 安装 |
| Git | 任意版本 | [git-scm.com](https://git-scm.com) |

> **Windows 用户**：无需 WSL，原生 PowerShell / CMD 即可。

### 一键部署（日常使用）

```powershell
# Windows (PowerShell)
git clone https://github.com/hqwzhu/lumi.new.git
cd lumi.new
copy .env.example .env
# 编辑 .env，填入 API Key
./scripts/deploy-windows.ps1                                    # 管理员安装到 Program Files
./scripts/deploy-windows.ps1 -InstallDir "$env:LOCALAPPDATA\LumiOS"  # 普通用户安装
```

```bash
# macOS
git clone https://github.com/hqwzhu/lumi.new.git
cd lumi.new
cp .env.example .env
# 编辑 .env，填入 API Key
bash scripts/deploy-macos.sh
```

```bash
# Linux (Ubuntu/Debian)
git clone https://github.com/hqwzhu/lumi.new.git
cd lumi.new
cp .env.example .env
# 编辑 .env，填入 API Key
bash scripts/deploy-linux.sh
```

部署脚本会自动：检查环境 → 安装依赖 → 构建桌面端前后端 → 编译桌面壳 → 创建桌面快捷方式。完成后桌面上就有 Lumi OS 图标，双击启动。GitHub Actions 默认也只构建桌面客户端安装包。

### 桌面开发与构建

```bash
npm run dev              # 启动本地服务
npm run tauri:dev        # 启动桌面客户端开发模式（需 Rust + Tauri CLI）
npm run build            # 构建桌面端 UI → dist/desktop
npm run build:desktop    # 构建桌面端 UI + 服务端 + 桌面资源
npm run tauri:build      # 编译桌面安装包
```

### 最简配置（3 分钟跑起来）

编辑 `.env`，只需填这两行：

```env
DEEPSEEK_API_KEY=sk-你的key
JWT_SECRET=随便写一串随机字符
```

然后 `npm install && npm run tauri:dev` 启动桌面客户端开发模式。

### 更多配置

`.env.example` 包含所有可配置项（LLM、语音、消息推送等），按需取消注释并填写。详见 [.env.example](.env.example)。

语音功能需要额外配置 API Key：
```env
DEEPGRAM_API_KEY=       # 语音转文字（STT）
DASHSCOPE_API_KEY=      # CosyVoice 语音合成（TTS）
```

### 数据目录

所有用户数据存储在 `~/LumiOS/`（独立于代码仓库）：

| 路径 | 内容 |
|------|------|
| `~/LumiOS/data/lumi.db` | SQLite 数据库（记忆、对话、Agent 等） |
| `~/LumiOS/data/keys.json` | API Key 存储 |
| `~/LumiOS/data/knowledge/` | 知识库文件 |
| `~/LumiOS/data/voice_samples/` | 语音克隆样本 |
| `~/lumi_skills/` | 已安装的 MCP 技能包 |

更新代码不会影响这些数据。从旧机器迁移时，直接拷贝整个 `~/LumiOS/` 目录即可。


---

## 产品生态

LumiOS 是 Personal AI 生态的软件核心，可配合以下硬件终端使用：

| 终端 | 说明 |
|------|------|
| Lumi One 全息仓 | 旗舰全息终端，桌面 3D AI 形象，孵化机制起点 |
| 多模态智能台灯 | 跟随用户晃动，视觉感知，光效传递 Lumi 状态 |
| 桌面机器人 | 有形态感知，情感连接强 |
| AI 陪伴玩具 | 儿童友好，灵息先人灵体的温暖载体 |

> 元始种子计划进行中——第一批用户可通过第三方合作设备提前接入 Lumi AI 生态，支持后续核心引擎升级。

---

## 路线图

- [x] Windows 桌面安装器 MVP
- [ ] macOS 桌面版正式发布（开发中，内部测试包已生成，待 Apple 签名/公证）
- [ ] Linux 桌面版
- [x] 多 LLM 引擎接入（11 个提供商）
- [x] MCP 生态系统（20 技能 + 26 内置工具）
- [x] 语音交互（TTS + STT + 语音唤醒 + 情感自适应）
- [x] 技能市场（20+ 内置技能 + 社区发现安装）
- [x] 画布工作台（无限画布任务可视化）
- [x] 壁纸模式 + 音乐播放 + 3D 全息层
- [x] 个人知识库 + RAG 文档问答
- [x] 记忆化身蒸馏与灵体空间
- [x] 对话模式 + 操作模式 + 全局快捷键
- [x] 自主后台任务 + 任务链 + Lumi Plans
- [x] 环境感知 + 主动问候 + 返回摘要
- [x] 组织协作系统（创建/邀请/知识库/审计/分支同步）
- [x] 企业 IM 接入（飞书 / 企业微信 / 微信机器人）
- [x] 个人/工作数据分域隔离
- [x] 计算机使用（视觉模型桌面自动化）+ 终端 Shell
- [x] 生物识别（声纹 + 人脸）+ 订阅系统
- [x] 系统探索 + 职业检测 + 健康自检 + 硬件状态
- [ ] 孵化机制完整版（被动感知）
- [ ] 移动端 APP（iOS / Android）
- [ ] 全息仓硬件联调
- [ ] 人车家跨终端同步协议
- [ ] 灵息先人灵体模块
- [ ] 开发者 SDK

---

## 参与贡献

欢迎提交 Issue 和 Pull Request。

如果你是 AI 工程方向的工程师，对 Personal AI 和孵化机制感兴趣，我们正在寻找技术联合创始人（CTO），股权 5%-15%，联合创始人身份。

**联系创始人：毛先生**
- 邮箱：3565286431@qq.com
- 微信：Cap_William

---

## 许可证

GNU Affero General Public License v3.0 (AGPL-3.0)。详见 [LICENSE](./LICENSE)。

**简言之：** 个人使用、修改和分发自由。若在网络服务中商用使用，必须以相同许可证开源你的修改。闭源商业许可请联系版权方。
