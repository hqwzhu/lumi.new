# LumiOS Windows Installer MVP Design

## Goal

Build a Windows-first productized LumiOS installer experience for end users. A user should install LumiOS, open it, choose a configuration mode, follow simple API-key guidance, pass basic diagnostics, and enter the main application without reading the source README or editing `.env`.

## Current Context

The existing project already has most of the technical substrate:

- Tauri v2 desktop shell in `src-tauri/`.
- Windows NSIS bundle target in `src-tauri/tauri.conf.json`.
- React/Vite desktop frontend in `src/entries/desktop.tsx` and related components.
- Node/Express backend in `server.ts` and `server/runtime/*`.
- Release-mode Tauri backend spawning from bundled `desktop-resources/dist-server`.
- Existing API-key storage in `~/LumiOS/data/keys.json` through `server/config/keys.ts`.
- Existing local data root resolver in `server/config/data_path.ts`.
- Existing provider status, key save, Ollama, and LM Studio endpoints in `server/routes/system_routes.ts`.
- Existing in-app `SetupWizard.tsx`, but it is too narrow and internal for the productized first-run experience.
- Existing desktop PowerShell launcher on the user desktop, useful for development, but not the target product surface.

The repository worktree currently has unrelated uncommitted changes. Implementation must avoid reverting or overwriting those changes.

## First Release Scope

Target only Windows for the first MVP.

In scope:

- Windows NSIS installer that installs for the current user without requiring administrator permissions.
- First-run onboarding inside the installed Tauri app.
- Configuration mode selection: Essential, Practical, Full.
- China, International, and Local model recommendation groups.
- API-key input cards with bilingual help for every provider shown in the selected mode.
- Provider connection testing.
- Local model detection for Ollama and LM Studio.
- Startup diagnostics before entering the main app.
- Persisted setup completion state.
- Ability to reopen setup/configuration from Settings.
- Repository migration plan to `hqwzhu/lumi.new` before implementation/push work.

Out of scope for MVP:

- macOS DMG and Linux AppImage/deb production readiness.
- Auto-update release service.
- Paid subscription enforcement.
- Cloud account sync.
- Full secret encryption beyond the current local key file approach.
- Replacing every existing Settings page.
- Building a separate external launcher application.

## Product Experience

The installer experience should feel like a consumer product, not a developer setup script.

The first screen asks the user to pick a setup mode:

- **Essential**: Fastest path. Configure one primary LLM or detect one local model. Enables basic chat, memory, and common tools.
- **Practical**: Default recommendation. Configure primary LLM, optional backup LLM, local model detection, and optional voice services. Enables daily-use chat, fallback, voice, and common abilities.
- **Full**: Advanced path. Shows all major provider/service cards including LLMs, voice, music, image, Relay/Base URL, and MCP-adjacent services where supported.

The next screen asks the user for a model preference:

- **China Recommended**: DeepSeek, Qwen/DashScope, Volcengine Ark/Doubao, then Kimi and GLM as advanced options.
- **International Recommended**: OpenAI, Anthropic Claude, Google Gemini.
- **Local First**: Ollama and LM Studio detection before cloud providers.

Each provider appears as a service card:

- Provider name.
- Recommended model label.
- Capability summary, in user language, such as "basic chat", "reasoning", "voice recognition", or "speech output".
- API-key input.
- `How to get` / `如何获取` button.
- Official website/console button.
- Test connection button.
- Configured state, without revealing stored secrets.

The tutorial help opens as a drawer or modal. It must support Chinese and English versions. Each tutorial uses simple steps:

1. Open the official provider console or docs.
2. Sign in or create an account.
3. Find API Keys or credentials.
4. Create a new key.
5. Copy the key into LumiOS.
6. Click Test Connection.

The onboarding should not force optional services. A user may enter the app when at least one cloud LLM or local model is available. Optional capabilities remain marked as "Configure later".

## Provider Catalog

Create a structured provider catalog rather than hard-coding provider UI in multiple components.

The catalog should include:

- Stable provider id, such as `deepseek`, `qwen`, `ark`, `openai`, `anthropic`, `gemini`, `ollama`, `lmstudio`, `relay`.
- Region group: `china`, `international`, or `local`.
- Capability tags: `chat`, `reasoning`, `vision`, `stt`, `tts`, `music`, `image`, `relay`.
- Key names used by the backend, such as `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`, `ARK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.
- Recommended model display text.
- Setup modes where it appears: Essential, Practical, Full.
- Official docs URL and console URL where known.
- Chinese tutorial content.
- English tutorial content.
- Validation method: local config check, server-side key presence check, or real provider probe if implemented safely.

Known official sources to use in the first catalog:

- DeepSeek API docs: `https://api-docs.deepseek.com/`
- Alibaba Cloud Model Studio / Qwen first API call: `https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen`
- Volcengine Ark API Key docs: `https://www.volcengine.com/docs/82379/1541594`
- OpenAI API key help: `https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key`
- Anthropic get started docs: `https://docs.anthropic.com/en/docs/get-started`
- Gemini API key docs: `https://ai.google.dev/gemini-api/docs/api-key`

Model ids and provider aliases can change. Store recommended model labels in the catalog so they can be updated in one place. Avoid scattering model strings through onboarding components.

## Architecture

Do not build a separate external launcher for the MVP. Productize the existing Tauri application.

High-level components:

- **Installer**: Tauri NSIS bundle, current-user install mode.
- **Desktop shell**: Existing Tauri app.
- **Backend runtime**: Existing bundled Node backend from `desktop-resources/dist-server`.
- **First-run UI**: New focused onboarding module in the React desktop app.
- **Setup API**: Small backend route set for setup status, diagnostics, completion, and provider tests.
- **Provider catalog**: Shared TypeScript data for frontend rendering and backend validation where possible.
- **Persistent setup state**: `~/LumiOS/data/setup.json`.
- **Secrets**: Existing `~/LumiOS/data/keys.json`.

Recommended file boundaries:

- `src/setup/providerCatalog.ts`: frontend-facing provider metadata.
- `src/setup/SetupOnboarding.tsx`: main onboarding flow.
- `src/setup/SetupModeStep.tsx`: mode selection.
- `src/setup/ProviderSelectionStep.tsx`: region and provider selection.
- `src/setup/ProviderCard.tsx`: API-key card.
- `src/setup/ProviderHelpDrawer.tsx`: bilingual tutorial.
- `src/setup/DiagnosticsStep.tsx`: final checks and launch.
- `src/setup/setupApi.ts`: typed frontend API calls.
- `server/setup/setup_state.ts`: read/write setup state using `getDataPath`.
- `server/setup/provider_catalog.ts`: backend-safe provider ids, key names, test policies.
- `server/routes/setup_routes.ts`: setup endpoints.
- `test/setup_routes.test.ts`: backend route tests.
- `test/setup_state.test.ts`: setup state persistence tests.

Existing `Settings.tsx` can reuse the provider catalog later, but MVP should avoid a broad Settings refactor unless a small integration is needed to reopen onboarding.

## Setup State

Persist setup completion separately from user preferences:

```json
{
  "version": 1,
  "completed": true,
  "completedAt": "2026-06-20T00:00:00.000Z",
  "mode": "practical",
  "modelPreference": "china",
  "configuredProviders": ["deepseek", "qwen"],
  "skippedOptionalProviders": ["deepgram", "ark-tts"]
}
```

The frontend should request `/api/setup/status` on desktop app load. If `completed` is false and no configured provider/local model exists, show onboarding before the main app.

## Backend API

Add setup routes mounted under `/api/setup`.

Endpoints:

- `GET /api/setup/status`
  - Returns setup completion state, masked provider key status, local model status, and whether onboarding is required.

- `POST /api/setup/keys`
  - Accepts provider id and API key.
  - Validates provider id against the backend provider catalog.
  - Maps provider id to allowed backend key names.
  - Saves through existing `saveKeys`.
  - Returns masked status only.

- `POST /api/setup/test-provider`
  - Accepts provider id and optional unsaved API key.
  - For MVP, at minimum verifies required key presence and performs existing local checks for Ollama/LM Studio.
  - Real network provider probes can be added provider by provider, but must return user-readable failure reasons.

- `GET /api/setup/diagnostics`
  - Checks backend runtime, data directory writability, setup state file, provider availability, local model availability, and bundled resources.

- `POST /api/setup/complete`
  - Accepts mode, model preference, configured providers, and skipped optional providers.
  - Refuses completion unless at least one LLM provider or local model is available.
  - Writes `setup.json`.

- `POST /api/setup/reset`
  - Marks setup incomplete so the onboarding can be reopened from Settings.

Keep `/api/settings/keys`, `/api/ollama/config`, and `/api/lmstudio/config` working for existing Settings UI.

## Data Flow

First launch:

1. Tauri starts and spawns the bundled Node backend.
2. Desktop frontend loads.
3. Frontend polls or requests setup status.
4. If setup is incomplete, show onboarding.
5. User selects setup mode and model preference.
6. User enters API keys. Keys stay in React state only until submitted.
7. Frontend sends provider id and key to backend.
8. Backend saves the key to `~/LumiOS/data/keys.json`.
9. Frontend requests masked status and displays configured state.
10. User tests selected providers.
11. Diagnostics run.
12. Backend writes setup completion state.
13. Frontend enters the main LumiOS desktop experience.

No API key should be stored in browser `localStorage` by the onboarding flow.

## Error Handling

Errors must be written for ordinary users.

Backend not ready:

- Show "Starting LumiOS core service..."
- Retry for a short period.
- If timeout occurs, show Retry, View Log, and Repair Installation actions.

Invalid API key:

- Show provider-specific message: "This key could not be accepted. Check that it was copied from the official console and has API access enabled."
- Keep the tutorial button visible.

Network failure:

- Suggest trying a China-recommended provider, checking VPN/proxy/network, or using a local model.

No available model:

- Block completion.
- Offer three actions: add API key, detect local model, or choose a different setup mode.

Optional service failure:

- Do not block app launch.
- Mark the capability as "Configure later".

Bundled backend/resource failure:

- Diagnostics should identify missing `dist-server`, missing `node.exe`, missing `entry.cjs`, missing `server.mjs`, or data directory write failure.

Port conflict:

- Existing launcher logic already avoids killing unrelated port owners. Diagnostics should surface the owner when possible and explain that LumiOS will not close unrelated apps automatically.

## Security And Privacy

MVP security principles:

- API keys are written only to the local LumiOS data directory through backend APIs.
- The frontend receives masked booleans, not raw saved key values.
- Onboarding does not use `localStorage` for secrets.
- Tutorial links open official provider pages.
- Diagnostics should not print full secrets into logs.
- Existing `keys.json` plain local storage remains acceptable for MVP, but encryption can be a later phase.

## Installer And Packaging Requirements

Windows MVP should verify:

- `npm run build:desktop-ui` completes.
- `npm run build:server` completes.
- `npm run prepare:desktop` prepares `desktop-resources`.
- Tauri NSIS bundle includes:
  - desktop frontend under `dist/desktop`;
  - backend bundle under `desktop-resources/dist-server`;
  - Node runtime in `desktop-resources/dist-server`;
  - `entry.cjs`;
  - `server.mjs`;
  - `WebView2Loader.dll` where required.
- Installer uses `currentUser` mode.
- Installed app launches without source tree, `node_modules`, or Rust.

## Repository Migration

The source repository is `maoxiansheng946-dev/-lumi-OS`. The requested destination repository is `hqwzhu/lumi.new`.

Before implementation work:

1. Confirm `hqwzhu/lumi.new` exists and the connected GitHub identity has push permission.
2. If it does not exist or is private without connector access, ask the user to create it or grant access.
3. Add the destination as a new remote or clone a clean copy.
4. Do not overwrite unrelated local changes in `E:\AiProject\lumi-os-clean`.
5. Push the clean baseline to `hqwzhu/lumi.new`.
6. Continue feature work against the user's repository.

Because the current local worktree has uncommitted changes, migration should be done with care. Prefer a clean clone or a new worktree rather than force-resetting the existing folder.

## Testing Plan

Backend tests:

- `setup_state` creates, reads, updates, and resets setup state.
- provider id validation rejects unknown providers.
- setup key save maps provider id to allowed key names.
- setup completion refuses completion when no LLM or local model is available.
- diagnostics reports data directory writability and bundled resource checks.

Frontend tests where practical:

- mode selection changes visible provider cards.
- provider help drawer switches Chinese/English content.
- API-key card calls save/test endpoints and never writes key to `localStorage`.
- diagnostics screen blocks completion until one model source is available.

Manual Windows verification:

- Fresh data directory: installed app opens onboarding.
- Existing completed `setup.json`: installed app opens main UI.
- Essential mode with one configured provider can launch.
- Practical mode can skip optional voice services.
- Full mode shows advanced provider/service cards.
- Invalid key shows tutorial and retry.
- Ollama/LM Studio detection works when available and fails clearly when unavailable.
- Installed app works without the source folder.

Build verification:

- `npm run lint`
- `npm test`
- `npm run build:desktop`
- `npm run tauri:build`

If full Tauri build is too slow or blocked by local toolchain, record the exact blocker.

## Acceptance Criteria

The MVP is done when:

- A Windows user can install LumiOS through the NSIS installer.
- On first launch, the user sees the productized onboarding flow instead of raw app setup.
- The user can choose Essential, Practical, or Full mode.
- API-key cards include bilingual help and official links.
- China, International, and Local model choices are visibly explained.
- API keys are saved through backend APIs and not persisted in frontend `localStorage`.
- At least one model source is required before completing onboarding.
- Optional services can be skipped.
- Completion state persists in `~/LumiOS/data/setup.json`.
- Later launches enter the main app directly.
- Settings can reopen or reset setup.
- Diagnostics produce clear, actionable messages.
- The code is pushed to `hqwzhu/lumi.new` after repository access is confirmed.

## Open Decisions

Resolved:

- First version targets Windows only.
- First version should be a formal installer experience, not a developer launcher.
- Users choose Essential, Practical, or Full setup modes.
- Each API-key field needs bilingual "how to get API key" guidance.
- Model recommendations include China and International groups.
- The UX should minimize tedious setup and support fast first success.

Remaining implementation choices can be made during planning:

- Exact visual treatment of onboarding.
- Whether provider network tests are real API pings or conservative key-presence checks in the first slice.
- Whether Settings fully reuses the provider catalog in MVP or only links back to setup.
