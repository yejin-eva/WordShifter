# WordShifter “App” Version (Branch: `app`)

## What “app version” means

The `app` branch is for a packaged, app-like distribution of WordShifter built from the **same core product** as `main`, but with **app-specific UX + distribution constraints**.

### Core principles

- **Core lives in `main`**: business logic + services + UI patterns should be developed in `main` first whenever possible.
- **`app` is API-only**: no Ollama setup, no local-server instructions, and no Ollama provider selection in Settings.
- **Fast setup for users**: the only translation setup should be “paste API key → Test API → done”.

## Scope for `app`

### Must-have (MVP)

- **Distribution**
  - Target: **Installable PWA (install from browser)**.
  - Supported: **Android + iOS** (Android-first testing).
  - Provide a single “How to install” path for PWA install.
- **Translation**
  - Settings shows **API providers only**: OpenAI + Groq.
  - API key storage is **local-only, on-device** (no server accounts; never sync keys).
  - “Test API” remains available.
  - Clear “Active provider” indicator.
- **Reader + vocabulary**
  - Same core experience as web: upload → process → read → click → save vocab.
  - Keep all data local (IndexedDB).
- **Offline**
  - **Saved books are available offline** (stored locally via IndexedDB).
  - **Dictionaries work offline** (bundled/cached).
  - **LLM translation requires internet** (API calls).
- **Documents**
  - **PDF + EPUB must work well on mobile MVP**.
  - PDF: prioritize **good text extraction** first; layout-preserving view is a follow-up if needed.

### Nice-to-have (post-MVP)

- **Model selection dropdown** per provider (speed vs quality).
- **Keychain/secure storage** if we adopt a native wrapper.
- **Share/Import**
  - Import text from share sheet (mobile).
  - Export vocabulary as file (not just clipboard).

## Stack decision (locked in)

- **Language**: **TypeScript**
- **UI framework**: **React**
- **Build**: **Vite**
- **Packaging**: **PWA-first**

Rationale: fastest path to Android+iOS “app-like” experience without a rewrite; keeps one codebase and preserves existing parsing/storage/reader features.

## Key decisions we need to make (before coding too much)

### 1) Packaging choice

Pick one:

- **Option A — Installable PWA (chosen)**
  - Pros: easiest, fastest, one codebase, “web is basically desktop” aligns.
  - Cons: app-store distribution is limited; file access can be constrained on iOS.
- **Option B — Capacitor wrapper**
  - Pros: real app-store distribution, better device integrations.
  - Cons: more build complexity, platform setup, native plugins.

### 2) Supported platforms

- **Both iOS + Android**, with Android-first testing.
- PWA install on mobile first; desktop is optional but should keep working.

### 3) Offline expectations

WordShifter is dictionary-first; offline behavior depends on dictionaries being available locally:

- **Offline reading + word lookup**: ✅ when dictionaries are bundled/available.
- **Phrase translation / retry via LLM API**: ❌ requires internet (API calls).

If we want a “mostly offline” app later, we can explore on-device models, but that’s explicitly out of MVP scope.

## Required code changes for `app` branch (high-level)

1. **Settings UI**
   - Remove/hide Ollama sections and “Ollama (Local)” toggle.
   - Default to API mode.
2. **Settings defaults / migrations**
   - Ensure fresh installs start with `llmProvider = 'api'`.
3. **Docs**
   - Add a simple `APP.md` install guide once packaging choice is decided.


