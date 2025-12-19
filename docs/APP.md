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
  - Target: **Capacitor native wrapper** (install as a real Android app; iOS later).
  - Supported: **Android first**; iOS requires a Mac for building/signing.
  - Shareable artifact: **APK** (debug) / **AAB** (Play Store).
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
- **Packaging**: **Capacitor (native wrapper)**

Rationale: fastest path to a **downloadable Android app** without a rewrite; keeps one codebase and preserves existing parsing/storage/reader features.

## Key decisions we need to make (before coding too much)

### 1) Packaging choice

Pick one:

- **Option A — Capacitor wrapper (chosen)**
  - Pros: **real downloadable app** (APK/AAB), better device integrations, avoids browser CORS for API calls via native HTTP.
  - Cons: more build complexity; iOS builds require a Mac (Xcode).

### 2) Supported platforms

- **Android first**, iOS later.
- Desktop is optional; web build should keep working for development.

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
   - Add a simple `APP.md` install guide for building/running the Capacitor app.

## How to build/run the Android app (Capacitor)

### Prereqs

- Install **Android Studio** + Android SDK (includes Gradle tooling).
- Ensure you have a working Java JDK (Android Studio usually handles this).

### Build + sync (web → native)

```bash
# 1) Build the web app into dist/
npm run build

# 2) Copy dist/ into the native project + sync plugins
npx cap sync android
```

### Run on an Android device/emulator

```bash
npx cap open android
```

Then click **Run** in Android Studio.

### Generate an APK you can share (debug)

```bash
cd android
gradlew.bat assembleDebug
```

The APK will be at:

- `android/app/build/outputs/apk/debug/app-debug.apk`

### Notes

- **API keys** are still stored locally on-device (inside the app’s WebView storage).
- **LLM translation requires internet** (API calls).
- iOS builds/signing require a Mac (Xcode). We can set it up, but Android is the fastest path from Windows.


