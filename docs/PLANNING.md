# WordShift - Project Planning Document

> **Purpose**: This document serves as the single source of truth for the WordShift project. AI agents should read this document first before making any changes to the codebase.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Core User Flow](#core-user-flow)
3. [Feature Specifications](#feature-specifications)
4. [Technical Decisions](#technical-decisions)
5. [Development Phases](#development-phases)
6. [Milestones & Priorities](#milestones--priorities)
7. [Open Questions](#open-questions)
8. [Changelog](#changelog)

---

## Project Overview

### What is WordShift?

WordShift is a **language learning reading aid** that allows users to read text in one language while instantly accessing translations in another language. Unlike traditional dictionaries or translation tools, WordShift:

1. **Pre-processes** all text before reading (translations are ready instantly)
2. **Preserves reading flow** with non-intrusive click-to-translate bubbles
3. **Works offline** after initial processing
4. **Requires no account** - all data stored locally

### Target Audience

Anyone learning a new language who wants to read authentic texts (books, articles, documents) without constantly switching to external dictionaries or translation tools.

### Core Value Proposition

> "Read naturally. Click to understand. Learn effortlessly."

- **Minimal disruption** to reading flow
- **Context-aware** translations that pick the right meaning
- **Instant** response (no loading after initial processing)

---

## Core User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SINGLE PAGE INTERFACE                        │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                         │  │  Target Language:               │  │
│  │   Drop file here        │  │  [Dropdown: English/Korean/...] │  │
│  │   or click to browse    │  │                                 │  │
│  │                         │  │  Source Language:               │  │
│  │   PDF, EPUB, TXT        │  │  [Auto-detected] ✓              │  │
│  │                         │  │                                 │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
│                                                                     │
│                    [ Process Text Button ]                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESSING SCREEN                              │
│                                                                     │
│   "Preparing your text..."                                          │
│   ████████████████░░░░░░░░░░░░░░░░░░  45%                          │
│                                                                     │
│   - Extracting text... ✓                                           │
│   - Detecting language... ✓ (Russian detected)                     │
│   - Translating words... (processing)                               │
│   - Building vocabulary index...                                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        READER VIEW                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │                  ┌──────────────┐                             │  │
│  │                  │families (n) ⭐│ ← Bubble with translation   │  │
│  │                  └──────┬───────┘                             │  │
│  │                         │                                     │  │
│  │   Все счастливые семьи похожи друг на друга, каждая          │  │
│  │                   ▲                                           │  │
│  │                   └── User clicked this word                  │  │
│  │   несчастливая семья несчастлива по-своему.                  │  │
│  │                                                               │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [📚 Vocabulary] [📄 My Texts] [⚙️ Settings]                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### F1: File Upload & Language Selection

| Attribute | Specification |
|-----------|---------------|
| **Location** | Single page, side-by-side layout |
| **Supported formats** | PDF, EPUB, TXT, plain text (paste) |
| **Max file size** | TBD (must handle ~500KB text files for full novels) |
| **Source language** | Auto-detected |
| **Target language** | User selects from dropdown |
| **Initial languages** | Russian ↔ English, Russian ↔ Korean |
| **Processing mode** | User selects: "Full" or "Dynamic" (toggle) |

**Processing Mode Options:**
| Mode | Description | Best For |
|------|-------------|----------|
| **Full** | Translate ALL words before reading | Offline reading, no interruptions |
| **Dynamic** | Translate words as user reads (in chunks) | Quick start, shorter texts |

**Upload Page Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                         │  │  Target Language:               │  │
│  │   Drop file here        │  │  [Dropdown: English ▼]          │  │
│  │   or click to browse    │  │                                 │  │
│  │                         │  │  Source Language:               │  │
│  │   PDF, EPUB, TXT        │  │  [Auto-detected] ✓              │  │
│  │                         │  │                                 │  │
│  └─────────────────────────┘  │  Processing Mode:               │  │
│                               │  ○ Full (translate all upfront) │  │
│                               │  ● Dynamic (translate as read)  │  │
│                               └─────────────────────────────────┘  │
│                                                                     │
│                    [ Process Text ]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] User can drag-and-drop files
- [ ] User can click to browse files
- [ ] User can paste plain text directly
- [ ] Language dropdown shows available target languages
- [ ] Source language is auto-detected and displayed
- [ ] Processing mode toggle (Full/Dynamic) with clear descriptions
- [ ] Process button is disabled until file is uploaded and language selected

---

### F2: Text Pre-processing

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | User clicks "Process Text" button |
| **Processing** | Extract text → Detect language → Tokenize → Translate each word |
| **Translation source** | Local model (default) or Cloud API (optional) |
| **Progress feedback** | Visual progress bar with step indicators |
| **Result** | Processed text stored locally (IndexedDB) |

**Translation Approach:**
```
For each unique word in text:
  1. Get base form (lemmatization)
  2. Analyze surrounding context (±5 words)
  3. Generate translation appropriate to context
  4. Cache result for this word+context combination
```

**Acceptance Criteria:**
- [ ] Progress bar shows accurate completion percentage
- [ ] Each processing step is indicated (extracting, detecting, translating, indexing)
- [ ] User can cancel processing
- [ ] Processed text is saved to local storage
- [ ] Processing works offline (with local model)

---

### F3: Interactive Reader

| Attribute | Specification |
|-----------|---------------|
| **Display** | Original text, formatted for comfortable reading |
| **Layout modes** | Scrollable (default) or Page-format like a book (mobile/tablet) |
| **Single word click** | Shows translation bubble above/below word |
| **Multi-word selection** | Drag across words → Click selected phrase → Shows phrase translation |
| **Bubble positioning** | Above or below word (smart: depends on word position on screen) |
| **Bubble behavior** | Appears on click, disappears when clicking elsewhere |
| **Save word methods** | 1) Double-tap word, OR 2) Click save icon in bubble |

**Translation Bubble Contents:**
```
   ┌─────────────────┐
   │ happy (adj) [⭐]│   ← Translation + Part of speech + Small save icon
   └────────┬────────┘
            │
            ▼
      счастливые        ← Original word in text (NOT in bubble)
```

**Bubble Design Principles:**
- Bubble contains ONLY: translation, part of speech, small save icon
- Original word is already visible in text, no need to repeat
- Bubble CAN obscure surrounding text (dismissed on click outside)
- Bubble MUST NOT obscure the original word being translated
- Arrow/pointer indicates which word the bubble refers to

**Saving Words:**
- **Method 1**: Double-tap on any word → Saves immediately
- **Method 2**: Single click → Bubble appears → Click save icon

**Saved Format (in vocabulary list):**
```
счастливые (adj) : happy
```

**Multi-Word Selection Flow:**
```
1. User drags across multiple words (e.g., "друг на друга")
2. Selected words are highlighted
3. User clicks on the highlighted selection
4. Bubble appears with phrase translation
5. User can save the entire phrase
```

**Display Modes:**
| Mode | Description | Best For |
|------|-------------|----------|
| **Scroll** | Continuous scrolling text | Desktop, long reading sessions |
| **Page** | Book-like page format with page turns | Mobile, tablet, focused reading |

**Acceptance Criteria:**
- [ ] Single-clicking a word shows translation bubble
- [ ] Double-tapping a word saves it directly (with toast confirmation)
- [ ] Bubble appears above word if word is in lower half of screen
- [ ] Bubble appears below word if word is in upper half of screen
- [ ] Bubble never obscures the clicked word
- [ ] Bubble can obscure surrounding text
- [ ] Clicking outside bubble dismisses it
- [ ] Dragging across words selects them (highlighted)
- [ ] Clicking on selected phrase shows phrase translation bubble
- [ ] Save icon in bubble saves word/phrase to vocabulary
- [ ] Text is scrollable for long documents
- [ ] Page mode available as alternative display (especially for mobile)
- [ ] Reading position is remembered

---

### F4: Vocabulary Management

| Attribute | Specification |
|-----------|---------------|
| **Storage** | Local (IndexedDB) |
| **Organization** | Per text file, Per language, Total (all) |
| **Export** | Copy to clipboard (plain text format) |
| **Format** | `original (part of speech) : translation` (one per line) |

**Vocabulary Entry Format:**
```
счастливые (adj) : happy
семья (noun) : family
читать (verb) : to read
```

**Vocabulary Views:**
1. **Per Text**: Words saved while reading specific document
2. **Per Language**: All words saved for a language pair (e.g., Russian → English)
3. **Total**: All saved words across all languages

**Acceptance Criteria:**
- [ ] Saved words appear in vocabulary list
- [ ] User can switch between per-text, per-language, total views
- [ ] User can copy entire list to clipboard
- [ ] User can delete individual words
- [ ] Lists persist across browser sessions

---

### F5: Saved Texts Management

| Attribute | Specification |
|-----------|---------------|
| **Storage** | Local (IndexedDB) |
| **Metadata** | Title, source language, target language, word count, date added |
| **Actions** | Open, Delete, Re-process (if model updated) |

**Acceptance Criteria:**
- [ ] Processed texts are saved automatically
- [ ] User can see list of all saved texts
- [ ] User can open and continue reading saved texts
- [ ] User can delete saved texts
- [ ] Opening saved text is instant (no re-processing)

---

### F6: Settings

| Attribute | Specification |
|-----------|---------------|
| **Translation source** | Local model (default) / Cloud API (configurable) |
| **API key input** | Optional field for OpenAI/Anthropic API key |
| **Theme** | Light / Dark mode |
| **Font size** | Adjustable reader font size |
| **Storage management** | View storage usage, clear all data |

**Acceptance Criteria:**
- [ ] User can switch between local and cloud translation
- [ ] User can input API key (stored locally, encrypted)
- [ ] Theme preference persists
- [ ] Font size preference persists
- [ ] User can clear all local data

---

## Technical Decisions

### Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | React 18+ with TypeScript | Largest ecosystem, best AI agent support, extensive resources |
| **Build Tool** | Vite | Fast, modern, excellent DX |
| **Styling** | Tailwind CSS | Utility-first, easy for agents to work with |
| **UI Components** | shadcn/ui (Radix-based) | Accessible, customizable, copy-paste components |
| **State Management** | Zustand | Simple, minimal boilerplate |
| **Local Storage** | IndexedDB (via Dexie.js) | Handles large data (novels), structured queries |
| **File Parsing** | pdf.js (PDF), epub.js (EPUB) | Industry standard libraries |
| **Dictionary (Primary)** | Wiktionary JSON (kaikki.org) | Fast O(1) lookup, offline, 100% accurate, includes POS |
| **LLM (Fallback)** | Ollama / OpenAI | For unknown words (retry) and phrase translation |

### Translation Strategy

> **Key Insight**: LLMs are overkill for single-word translation. Dictionaries are faster, cheaper, and more accurate.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRANSLATION APPROACH                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   WORD TRANSLATION (99% of use cases)    │   PHRASE TRANSLATION         │
│   ─────────────────────────────────────  │   ────────────────────────   │
│   Dictionary lookup (instant, free)      │   LLM (context-aware)        │
│                                          │                               │
│   ┌──────────────────────────────────┐   │   User drags to select       │
│   │ 1. Look up word in dictionary    │   │   multiple words → Click →   │
│   │    ├─ Found → Show translation   │   │   LLM translates phrase      │
│   │    └─ Not found → Show "?"       │   │                               │
│   │                                  │   │   (Future feature)            │
│   │ 2. User clicks 🔄 retry button   │   │                               │
│   │    └─ Send to LLM for fallback   │   │                               │
│   └──────────────────────────────────┘   │                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dictionary Sources (Wiktionary via kaikki.org):**
- Pre-processed JSON format (no parsing needed)
- Includes part of speech
- ~10-20K common words per language pair (~2-5MB bundled)
- Covers ~95% of typical book vocabulary

**When LLM is Used:**
1. Unknown word + user clicks retry (🔄)
2. Phrase/sentence selection (future feature)

**Benefits vs LLM-only approach:**
| Metric | Dictionary | LLM |
|--------|-----------|-----|
| Speed | <1ms | 100-500ms |
| Accuracy | 100% | ~95% (hallucinations possible) |
| Cost | Free | API costs or compute |
| Offline | ✅ Always | Ollama only |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  React Components (UI) ←→ Custom Hooks (Logic) ←→ Zustand   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                          │
│  FileParser │ LanguageDetector │ DictionaryService │        │
│                                  │ LLMService (fallback)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATA LAYER                            │
│  Dictionary JSON │ IndexedDB (Dexie) │ LocalStorage │ Cache │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                       │
│  Ollama (Local LLM) │ OpenAI API (Cloud LLM) │ File System  │
│  ↑ Only used for retry/phrase translation                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Phases

### Phase 1: Web Application (MVP)
**Target**: Fully functional web app with core features

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | File upload (TXT only) | 🔲 Not Started |
| P0 | Language selection | 🔲 Not Started |
| P0 | Basic translation (cloud API) | 🔲 Not Started |
| P0 | Interactive reader with click-to-translate | 🔲 Not Started |
| P1 | Vocabulary saving (basic) | 🔲 Not Started |
| P1 | PDF support | 🔲 Not Started |
| P1 | EPUB support | 🔲 Not Started |
| P2 | Local model support (Ollama) | 🔲 Not Started |
| P2 | Phrase selection translation | 🔲 Not Started |
| P2 | Vocabulary views (per-text, per-language, total) | 🔲 Not Started |
| P3 | Dark mode | 🔲 Not Started |
| P3 | Settings page | 🔲 Not Started |

### Phase 2: Desktop Application
**Target**: Electron or Tauri wrapper for desktop

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Desktop wrapper | 🔲 Not Started |
| P0 | Local file system integration | 🔲 Not Started |
| P1 | Bundled local translation model | 🔲 Not Started |
| P2 | System tray integration | 🔲 Not Started |

### Phase 3: Mobile Application
**Target**: Flutter or React Native app

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Mobile UI adaptation | 🔲 Not Started |
| P0 | Touch-optimized interactions | 🔲 Not Started |
| P1 | Offline-first architecture | 🔲 Not Started |

---

## Milestones & Priorities

> **For Agents**: Each milestone below includes specific files to create and acceptance tests. Complete one milestone fully before moving to the next.

---

### Milestone 1: "Hello World" (Week 1-2)

**Goal**: Basic project structure with file upload UI

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 1.1 | Initialize Vite + React + TypeScript project | `package.json`, `vite.config.ts`, `tsconfig.json` |
| 1.2 | Install dependencies (see DEVELOPMENT.md) | `package.json` |
| 1.3 | Set up Tailwind CSS | `tailwind.config.js`, `src/index.css` |
| 1.4 | Create base layout | `src/App.tsx`, `src/components/layout/Layout.tsx` |
| 1.5 | Create file drop zone | `src/components/upload/FileDropZone.tsx` |
| 1.6 | Create language selector | `src/components/upload/LanguageSelector.tsx` |
| 1.7 | Create processing mode toggle | `src/components/upload/ProcessingModeToggle.tsx` |
| 1.8 | Create upload page | `src/components/upload/UploadPage.tsx` |
| 1.9 | Create TXT file parser | `src/services/fileParser/txtParser.ts` |
| 1.10 | Display uploaded text on screen | Update `UploadPage.tsx` |

**Acceptance Test:**
```
1. User can drag-drop a .txt file
2. User can select target language from dropdown
3. User can toggle between Full/Dynamic processing mode
4. Uploaded text content is displayed on screen
5. "Process" button appears (disabled until file + language selected)
```

---

### Milestone 2: "First Translation" (Week 3-4)

**Goal**: Words are translated and clickable

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 2.1 | Create type definitions | `src/types/text.types.ts`, `src/types/translation.types.ts` |
| 2.2 | Create tokenizer service | `src/services/language/tokenizer.ts` |
| 2.3 | Create OpenAI translation provider | `src/services/translation/openaiProvider.ts` |
| 2.4 | Create translation service | `src/services/translation/translationService.ts` |
| 2.5 | Create translation cache | `src/services/translation/translationCache.ts` |
| 2.6 | Create text processing store | `src/stores/useTextStore.ts` |
| 2.7 | Create WordSpan component | `src/components/reader/WordSpan.tsx` |
| 2.8 | Create TranslationBubble component | `src/components/reader/TranslationBubble.tsx` |
| 2.9 | Create ReaderPage | `src/components/reader/ReaderPage.tsx` |
| 2.10 | Create TextDisplay component | `src/components/reader/TextDisplay.tsx` |
| 2.11 | Wire up routing | `src/App.tsx` |

**Acceptance Test:**
```
1. User uploads text and clicks "Process"
2. Progress bar shows translation progress
3. After processing, reader page displays text
4. Each word is clickable
5. Clicking a word shows translation bubble with: "translation (pos) [save icon]"
6. Clicking outside bubble dismisses it
```

---

### Milestone 3: "Reading Experience" (Week 5-6)

**Goal**: Polished bubble behavior and phrase selection

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 3.1 | Implement smart bubble positioning | Update `TranslationBubble.tsx` |
| 3.2 | Add bubble arrow pointing to word | Update `TranslationBubble.tsx` + CSS |
| 3.3 | Create useClickOutside hook | `src/hooks/useClickOutside.ts` |
| 3.4 | Create PhraseSelector component | `src/components/reader/PhraseSelector.tsx` |
| 3.5 | Add drag-to-select functionality | Update `TextDisplay.tsx`, `WordSpan.tsx` |
| 3.6 | Add phrase translation support | Update `translationService.ts` |
| 3.7 | Create processing progress UI | `src/components/upload/ProcessingProgress.tsx` |
| 3.8 | Add UI store for selection state | `src/stores/useUIStore.ts` |

**Acceptance Test:**
```
1. Bubble appears ABOVE word if word is in lower half of screen
2. Bubble appears BELOW word if word is in upper half of screen
3. Bubble has arrow pointing to the word
4. Bubble never covers the clicked word
5. User can drag across multiple words to select
6. Clicking selected phrase shows phrase translation
7. Progress bar shows step-by-step processing status
```

---

### Milestone 4: "Vocabulary" (Week 7-8)

**Goal**: Save and manage vocabulary

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 4.1 | Create vocabulary types | `src/types/vocabulary.types.ts` |
| 4.2 | Set up IndexedDB with Dexie | `src/services/storage/database.ts` |
| 4.3 | Create vocabulary storage service | `src/services/storage/vocabularyStorage.ts` |
| 4.4 | Create vocabulary store | `src/stores/useVocabularyStore.ts` |
| 4.5 | Add double-tap to save | Update `WordSpan.tsx` |
| 4.6 | Add save button in bubble | Update `TranslationBubble.tsx` |
| 4.7 | Create VocabularyPage | `src/components/vocabulary/VocabularyPage.tsx` |
| 4.8 | Create WordList component | `src/components/vocabulary/WordList.tsx` |
| 4.9 | Create vocabulary filters | `src/components/vocabulary/VocabularyFilters.tsx` |
| 4.10 | Create export/copy functionality | `src/components/vocabulary/ExportButton.tsx` |
| 4.11 | Create saved texts page | `src/components/texts/SavedTextsPage.tsx` |
| 4.12 | Add toast notifications | Install `sonner`, create toast utils |

**Acceptance Test:**
```
1. Double-tapping a word saves it (toast confirms)
2. Clicking save icon in bubble saves word
3. Vocabulary page shows saved words
4. User can filter by: per-text, per-language, all
5. User can copy vocabulary list to clipboard
6. Format: "счастливые (adj) : happy"
7. Saved texts page shows all processed texts
8. User can open a saved text and continue reading
```

---

### Milestone 4b: "Display Modes" (Week 8-9)

**Goal**: Page-based reading mode

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 4b.1 | Create PageNavigator component | `src/components/reader/PageNavigator.tsx` |
| 4b.2 | Create usePagination hook | `src/hooks/usePagination.ts` |
| 4b.3 | Add swipe gesture detection | `src/hooks/useSwipeGesture.ts` |
| 4b.4 | Add tap-to-navigate zones | Update `ReaderPage.tsx` |
| 4b.5 | Add display mode toggle to reader | Update `ReaderPage.tsx` |
| 4b.6 | Implement page calculation logic | Update `usePagination.ts` |
| 4b.7 | Add page transition animations | Update CSS |

**Acceptance Test:**
```
1. User can switch between Scroll and Page modes
2. Page mode shows content that fits viewport (no scroll)
3. User can navigate pages via: arrow buttons, tap edges, swipe
4. Page indicator shows "Page X of Y"
5. Pages recalculate on window resize
6. No words are cut off mid-word at page breaks
```

---

### Milestone 5: "Polish & Local" (Week 9-10)

**Goal**: Offline support, more file types, settings

**Step-by-Step Implementation:**

| Step | Action | Files to Create/Modify |
|------|--------|------------------------|
| 5.1 | Create Ollama provider | `src/services/translation/ollamaProvider.ts` |
| 5.2 | Add Ollama availability check | Update `ollamaProvider.ts` |
| 5.3 | Create Ollama instructions modal | `src/components/ui/OllamaInstructions.tsx` |
| 5.4 | Add PDF parser | `src/services/fileParser/pdfParser.ts` (use pdf.js) |
| 5.5 | Add EPUB parser | `src/services/fileParser/epubParser.ts` (use epub.js) |
| 5.6 | Create Settings page | `src/components/settings/SettingsPage.tsx` |
| 5.7 | Create API key input | `src/components/settings/ApiKeyInput.tsx` |
| 5.8 | Create theme toggle | `src/components/settings/ThemeToggle.tsx` |
| 5.9 | Implement dark mode | Update `tailwind.config.js`, `index.css` |
| 5.10 | Create settings store | `src/stores/useSettingsStore.ts` |
| 5.11 | Add font size control | `src/components/settings/FontSizeSlider.tsx` |

**Acceptance Test:**
```
1. User can switch between Local (Ollama) and Cloud (OpenAI) translation
2. If Ollama not running, instructions modal appears with "Retry" button
3. User can upload PDF files (text extracted correctly)
4. User can upload EPUB files (text extracted correctly)
5. Settings page allows: translation source, API key, theme, font size
6. Dark mode follows system preference OR user choice
7. All settings persist across browser sessions
```

---

## Open Questions

> These are questions that need answers before or during development. Agents should ask about these when relevant.

| ID | Question | Status | Answer |
|----|----------|--------|--------|
| Q1 | How should very long words (German compounds) be handled in bubbles? | Open | - |
| Q2 | Should there be a "reading progress" indicator for long texts? | Open | - |
| Q3 | What happens if translation fails for a specific word? | Open | - |
| Q4 | Should users be able to edit/correct translations? | Open | - |
| Q5 | How to handle words that exist in both languages (cognates)? | Open | - |
| Q6 | Maximum number of saved texts before performance degrades? | Open | - |

---

## Answered Questions

> Decisions that have been made and should be followed during development.

| ID | Question | Answer |
|----|----------|--------|
| A1 | Single or multiple API calls for translation + part of speech? | **Single call** - prompt returns `translation\|partOfSpeech` format |
| A2 | Process all words upfront or dynamically as user reads? | **User chooses** - toggle on upload page: "Full" vs "Dynamic" processing |
| A3 | Page mode: fixed words or fit to screen? | **Fit to screen** - responsive to device size |
| A4 | Page navigation method? | **All three**: swipe gestures, tap edges, and arrow buttons |
| A5 | What if Ollama isn't running? | **Show instructions** - guide user to start Ollama with clear steps |
| A6 | Default Ollama model? | **llama3.2** - good balance of quality and speed |
| A7 | Dark mode preference? | **Follow system** - respect OS dark/light preference |
| A8 | Translation API for development? | **Mock service first** - use mock translations during dev, Ollama for real testing, user provides OpenAI key later |
| A9 | Design aesthetic? | **Minimal & clean** - lots of white space, simple UI, optimize for low memory usage |
| A10 | Testing strategy? | **Write tests as we go** - each feature should have tests before moving on |
| A11 | Git workflow? | **Commit after each step** - granular history, commit after completing each step in milestones |

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-12 | Agent | Added development decisions: mock service, minimal design, tests, git workflow (A8-A11) |
| 2024-12-12 | Agent | Added detailed step-by-step Implementation Guide for each milestone |
| 2024-12-12 | Agent | Added processing mode toggle (Full/Dynamic) to F1: File Upload |
| 2024-12-12 | Agent | Answered key questions: single API call format, page navigation, Ollama instructions |
| 2024-12-12 | Agent | Refined F3: Interactive Reader UI (bubble positioning, double-tap save, phrase selection, page mode) |
| 2024-12-12 | Agent | Updated vocabulary format: `original (pos) : translation` |
| 2024-12-12 | Initial Planning | Created initial planning document |

---

*This document should be updated as decisions are made and features are completed.*

