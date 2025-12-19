# WordShifter - Development Guide

> **Purpose**: This document provides setup instructions, development workflow, and technical reference for building WordShifter. AI agents should follow these instructions when setting up or making changes to the project.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Development Workflow](#development-workflow)
4. [Tech Stack Reference](#tech-stack-reference)
5. [Environment Configuration](#environment-configuration)
6. [Common Commands](#common-commands)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | 18.x or 20.x | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **npm** | 9.x+ | Package manager | Comes with Node.js |
| **Git** | 2.x+ | Version control | [git-scm.com](https://git-scm.com) |

### Optional Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Ollama** | Latest | Local AI translation | [ollama.ai](https://ollama.ai) |
| **VS Code** | Latest | Recommended IDE | [code.visualstudio.com](https://code.visualstudio.com) |

---

## Ollama Setup (Local AI Translation)

Ollama provides free, offline translation using local AI models. This section covers complete setup for all platforms.

### Step 1: Install Ollama

#### Windows
1. Download from [ollama.ai/download](https://ollama.ai/download)
2. Run the installer (`OllamaSetup.exe`)
3. Follow the installation wizard
4. Ollama will be added to your Start Menu and system tray

#### Mac
```bash
# Option 1: Download from website
# Go to https://ollama.ai/download and download the Mac installer

# Option 2: Using Homebrew
brew install ollama
```

#### Linux
```bash
# One-line install script
curl -fsSL https://ollama.ai/install.sh | sh
```

### Step 2: Download a Translation Model

Open a terminal/PowerShell and run:

```bash
# Download the recommended model (llama3.2 - ~2GB)
ollama pull llama3.2

# Alternative: Smaller model if you have limited RAM
ollama pull mistral

# Verify the model is installed
ollama list
```

**Model Comparison:**
| Model | Size | RAM Needed | Quality | Speed |
|-------|------|------------|---------|-------|
| `llama3.2` | ~2GB | 8GB+ | ⭐⭐⭐⭐ | Medium |
| `mistral` | ~4GB | 8GB+ | ⭐⭐⭐⭐⭐ | Medium |
| `llama3.2:1b` | ~1GB | 4GB+ | ⭐⭐⭐ | Fast |

### Step 3: Start Ollama

#### Windows
**Option A: GUI (Recommended)**
1. Open Start Menu
2. Search for "Ollama"
3. Click to launch
4. Ollama icon appears in system tray (bottom-right)
5. Ollama is now running in the background

**Option B: Command Line**
```powershell
# Open PowerShell and run:
ollama serve
```

#### Mac / Linux
```bash
# Open Terminal and run:
ollama serve

# To run in background:
ollama serve &
```

### Step 4: Verify Ollama is Running

```bash
# Check if Ollama is responding
curl http://localhost:11434/api/tags

# Or open in browser:
# http://localhost:11434/api/tags

# Expected: JSON response with list of models
```

### Step 5: Test Translation

```bash
# Quick test to verify translation works
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Translate the Russian word \"привет\" to English. Respond with only the translation.",
  "stream": false
}'

# Expected response includes: "hello" or "hi"
```

### Troubleshooting Ollama

| Issue | Solution |
|-------|----------|
| "Connection refused" | Ollama isn't running. Start it with `ollama serve` |
| "Model not found" | Run `ollama pull llama3.2` to download the model |
| Slow responses | Normal for first request (model loading). Subsequent requests are faster |
| High RAM usage | Use a smaller model: `ollama pull llama3.2:1b` |
| Port 11434 in use | Another process is using the port. Kill it or change Ollama's port |

### Auto-Start Ollama (Optional)

#### Windows
1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to Ollama in the opened folder
3. Ollama will now start when Windows starts

#### Mac
```bash
# Create a launch agent
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.ollama.server.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the launch agent
launchctl load ~/Library/LaunchAgents/com.ollama.server.plist
```

#### Linux (systemd)
```bash
# Create a systemd service
sudo tee /etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama Server
After=network.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable ollama
sudo systemctl start ollama
```

---

### Verify Installation

```bash
# Check Node.js
node --version
# Expected: v18.x.x or v20.x.x

# Check npm
npm --version
# Expected: 9.x.x or higher

# Check Git
git --version
# Expected: git version 2.x.x
```

---

## Project Setup

### Initial Setup (First Time)

```bash
# 1. Navigate to project directory
cd C:\Repositories\WordShifter

# 2. Initialize the project (if not already done)
npm create vite@latest . -- --template react-ts

# 3. Install dependencies
npm install

# 4. Install additional packages
npm install zustand dexie react-router-dom
npm install -D tailwindcss postcss autoprefixer @types/node

# 5. Initialize Tailwind CSS
npx tailwindcss init -p

# 6. Start development server
npm run dev
```

### Package Dependencies

#### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "dexie": "^3.x",
    "dexie-react-hooks": "^1.x"
  }
}
```

#### Development Dependencies

```json
{
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "@typescript-eslint/parser": "^6.x"
  }
}
```

#### Future Dependencies (Add When Needed)

```json
{
  "future-dependencies": {
    "pdfjs-dist": "^3.x",        // PDF parsing
    "epubjs": "^0.3.x",          // EPUB parsing
    "sonner": "^1.x",            // Toast notifications
    "@radix-ui/react-*": "^1.x", // UI primitives (via shadcn)
    "clsx": "^2.x",              // Conditional classnames
    "tailwind-merge": "^2.x"     // Merge Tailwind classes
  }
}
```

---

## Development Workflow

### Daily Development Flow

```bash
# 1. Start development server
npm run dev

# 2. Open in browser
# Default: http://localhost:5173

# 3. Make changes (hot reload is automatic)

# 4. Run type checking (in another terminal)
npm run type-check

# 5. Run linter
npm run lint

# 6. Run tests
npm test
```

### File Watcher Setup

The development server automatically watches for file changes. When you:
- Edit `.tsx` / `.ts` files → Hot Module Replacement (instant)
- Edit `.css` files → Style injection (instant)
- Edit `tailwind.config.js` → Requires manual restart

### Branch Strategy (for Human Developers)

```
main           ─── Stable, production-ready code
  │
  └── develop  ─── Integration branch for features
        │
        ├── feature/file-upload    ─── Feature branches
        ├── feature/translation
        └── fix/bubble-position    ─── Bug fix branches
```

---

## Tech Stack Reference

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      fontFamily: {
        // Reader font for comfortable reading
        reader: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
```

### Global CSS Setup

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 199 89% 48%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer components {
  /* Reusable component styles */
  .translation-bubble {
    @apply absolute bg-white rounded-lg shadow-lg border p-3 z-50;
    @apply animate-in fade-in-0 zoom-in-95;
  }
  
  .word-clickable {
    @apply cursor-pointer rounded px-0.5 transition-colors;
    @apply hover:bg-yellow-100 active:bg-yellow-200;
  }
  
  .word-selected {
    @apply bg-yellow-200;
  }
}
```

---

## Environment Configuration

### Environment Variables

```bash
# .env.example (copy to .env.local for local development)

# Translation Provider Settings
VITE_DEFAULT_TRANSLATION_SOURCE=local   # 'local' or 'cloud'
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# Optional: Cloud API keys (for development testing)
# Users will input their own keys in the app
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Feature Flags
VITE_ENABLE_PDF=true
VITE_ENABLE_EPUB=false  # Not yet implemented
```

### Accessing Environment Variables

```typescript
// In TypeScript files
const ollamaEndpoint = import.meta.env.VITE_OLLAMA_ENDPOINT;
const isPdfEnabled = import.meta.env.VITE_ENABLE_PDF === 'true';
```

---

## Common Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript compiler check |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix auto-fixable lint issues |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Utility

| Command | Description |
|---------|-------------|
| `npm run clean` | Remove build artifacts |
| `npm run deps:check` | Check for outdated dependencies |
| `npm run ollama:proxy` | Run a local CORS proxy in front of Ollama (useful for GitHub Pages hosted UI; devs only) |

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "rimraf dist"
  }
}
```

---

## Troubleshooting

### Common Issues

#### Issue: `Module not found` errors

```bash
# Solution: Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### Issue: TypeScript path alias not working

```bash
# Ensure both tsconfig.json and vite.config.ts have matching aliases
# tsconfig.json:
"paths": { "@/*": ["./src/*"] }

# vite.config.ts:
alias: { '@': path.resolve(__dirname, './src') }
```

#### Issue: Tailwind classes not applying

```bash
# Check tailwind.config.js content paths
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",  # Make sure this matches your file structure
]

# Restart the dev server after config changes
npm run dev
```

#### Issue: Hot reload not working

```bash
# Try these in order:
1. Save the file again
2. Clear browser cache (Ctrl+Shift+R)
3. Restart dev server
4. Check for syntax errors in console
```

#### Issue: Ollama connection refused

```bash
# 1. Check if Ollama is running
ollama list

# 2. Start Ollama if needed
ollama serve

# 3. Verify endpoint
curl http://localhost:11434/api/tags

# 4. Pull a model if none available
ollama pull llama3.2
```

#### Issue: Ollama doesn’t work on GitHub Pages (HTTPS)

If you open WordShifter from GitHub Pages (HTTPS), the browser will block requests to:
`http://localhost:11434` (mixed content) and may also block due to CORS.

**Recommended approach (hosted UI + local Ollama):**

1. Run Ollama:

```powershell
ollama serve
```

2. Run the WordShifter CORS proxy:

**Option A (recommended for normal users on Windows; no repo needed):**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/yejin-eva/WordShifter/web/scripts/ollama-cors-proxy.ps1 | iex"
```

**Option B (developers; requires this repo):**

```powershell
npm run ollama:proxy
```

3. Expose the proxy over HTTPS using a tunnel (example with Cloudflare Tunnel):
   - If you installed via `winget`, **close and reopen your terminal** before `cloudflared` is recognized.
   - Start a tunnel to the proxy port and copy the generated `https://...trycloudflare.com` URL.
   - In WordShifter Settings → Ollama URL, paste that HTTPS URL.

This keeps the UI hosted while the model runs on your machine.

### Performance Issues

#### Slow Initial Load

- Check if source maps are disabled in production build
- Verify tree-shaking is working (no unused imports)
- Consider lazy loading routes

#### Slow Translation Processing

- Use Web Workers for heavy processing
- Batch translation requests
- Cache translations aggressively

---

## IDE Setup (VS Code Recommended)

### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag"
  ]
}
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Next Steps After Setup

Once the development environment is ready:

1. **Verify setup**: Run `npm run dev` and confirm the app loads
2. **Review PLANNING.md**: Understand the feature roadmap
3. **Check current milestone**: See what's next to implement
4. **Follow AGENT_GUIDELINES.md**: When making changes

---

*Keep this document updated as the project evolves and new setup requirements are added.*

