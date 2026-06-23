# Windows License Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Windows first-run activation gate that binds each license code to one local machine code.

**Architecture:** Backend computes the machine code, verifies Ed25519 signed license codes, and stores activation state in the Lumi OS data directory. The desktop frontend checks license status before setup onboarding and shows a simple activation screen when needed.

**Tech Stack:** TypeScript, Express, React, Node `crypto`, Vitest, Tauri Windows release scripts.

---

### Task 1: Backend License Core

**Files:**
- Create: `server/license/machine_code.ts`
- Create: `server/license/license_code.ts`
- Create: `server/license/license_state.ts`
- Test: `test/license_code.test.ts`

- [ ] Write failing tests for machine code formatting, valid signature verification, machine mismatch, and expiry.
- [ ] Run `npm test -- test/license_code.test.ts` and confirm the expected missing-module failure.
- [ ] Implement machine code generation helpers, license parsing, signature verification, and activation state persistence.
- [ ] Run `npm test -- test/license_code.test.ts` and confirm the new tests pass.

### Task 2: Backend License Routes

**Files:**
- Create: `server/routes/license_routes.ts`
- Modify: `server/runtime/routes.ts`
- Test: `test/license_routes.test.ts`

- [ ] Write failing route tests for `/api/license/status` and `/api/license/activate`.
- [ ] Run `npm test -- test/license_routes.test.ts` and confirm route mounting fails before implementation.
- [ ] Implement the Express routes and mount them in the route aggregator.
- [ ] Run `npm test -- test/license_routes.test.ts` and confirm the route tests pass.

### Task 3: Desktop Activation UI

**Files:**
- Create: `src/license/licenseApi.ts`
- Create: `src/license/LicenseActivation.tsx`
- Modify: `src/entries/desktop.tsx`

- [ ] Add a frontend API wrapper for status and activation.
- [ ] Add a first-run activation screen with copy-machine-code and paste-license-code actions.
- [ ] Update desktop startup to load license status before setup status.
- [ ] Run `npm run lint` and fix type errors.

### Task 4: Operator Generator and Docs

**Files:**
- Create: `scripts/generate-license-code.mjs`
- Create: `docs/productization/license-activation.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] Add an operator-only CLI generator that signs a machine code using a private key from env or a local file.
- [ ] Document how the website generator must create the matching code format.
- [ ] Document the user-facing activation steps in English and Chinese README files.
- [ ] Confirm generated docs do not include private signing keys.

### Task 5: Verification, GitHub Push, Windows Package

**Files:**
- Modify only as needed based on verification results.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run release:windows`.
- [ ] Verify the packaged installer and release zip with existing release checks.
- [ ] Commit the intended changes and push to `origin/main`.
- [ ] Copy the final user-downloadable files to a clean deliverable folder for cloud drive upload.
