# WordShifter

**Read naturally. Click to understand. Learn effortlessly.**

WordShifter is a language learning reading aid that lets you read authentic texts while instantly accessing translations with a single click. No more context-switching to dictionaries or translation tools.

---

## ✨ Features

- 📄 **Multiple Formats**: Upload PDF, EPUB, TXT, or paste text directly
- 🌍 **Auto-Detection**: Automatically detects source language
- ⚡ **Instant Translations**: Pre-processed text means zero loading time
- 💬 **Click-to-Translate**: Single word clicks or phrase selections
- 📚 **Vocabulary Lists**: Save words organized by text, language, or total
- 💾 **Offline Ready**: Works offline after initial processing
- 🔒 **Privacy First**: All data stored locally, no account required

## 🎯 Supported Languages

| From | To |
|------|-----|
| Russian | English |
| Russian | Korean |
| English | Russian |
| Korean | Russian |

*More language pairs coming soon!*

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wordshifter.git
cd wordshifter

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Optional: Local AI Setup

For free, offline translations, install [Ollama](https://ollama.ai):

```bash
# Install a translation-capable model
ollama pull llama3.2

# Verify it's running
ollama list
```

---

## 📖 How It Works

```
1. DROP your text file (or paste text)
         ↓
2. SELECT target language
         ↓
3. WAIT for processing (one-time)
         ↓
4. READ and CLICK any word to see translation
         ↓
5. SAVE words to your vocabulary
```

---

## 🏗️ Project Structure

```
wordshift/
├── docs/                    # 📚 Documentation
│   ├── PLANNING.md         # Project roadmap & features
│   ├── ARCHITECTURE.md     # Technical design
│   ├── AGENT_GUIDELINES.md # AI agent collaboration
│   └── DEVELOPMENT.md      # Setup & development guide
├── src/
│   ├── components/         # React components
│   ├── services/           # Business logic
│   ├── stores/             # Zustand state management
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
└── tests/                  # Test suites
```

---

## 🤖 For AI Agents

This project is designed for seamless AI agent collaboration. Before making changes:

1. **Read** → `docs/PLANNING.md` (understand what we're building)
2. **Read** → `docs/ARCHITECTURE.md` (understand how it's built)
3. **Follow** → `docs/AGENT_GUIDELINES.md` (coding conventions)
4. **Setup** → `docs/DEVELOPMENT.md` (environment setup)

### Key Principles

- ✅ Read existing code before making changes
- ✅ Follow established patterns and conventions
- ✅ Update documentation when completing features
- ✅ Ask questions when requirements are ambiguous

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Storage** | IndexedDB (Dexie) |
| **Translation** | Ollama (local) / OpenAI (cloud) |

---

## 📋 Development Status

### Current Phase: MVP Development

| Feature | Status |
|---------|--------|
| File Upload | 🔲 Not Started |
| Language Selection | 🔲 Not Started |
| Text Processing | 🔲 Not Started |
| Interactive Reader | 🔲 Not Started |
| Vocabulary Lists | 🔲 Not Started |

See `docs/PLANNING.md` for the complete roadmap.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Read the documentation in `docs/`
2. Follow the coding conventions in `docs/AGENT_GUIDELINES.md`
3. Update `docs/PLANNING.md` when completing features

---

## 📄 License

[MIT License](LICENSE)

---

## 📬 Contact

Questions? Open an issue or reach out to the maintainers.

---

*Built for language learners who want to read without friction.*

