# WordShift - Architecture Document

> **Purpose**: This document describes the technical architecture, data structures, and component design. AI agents should reference this when implementing features or making technical decisions.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Directory Structure](#directory-structure)
3. [Component Architecture](#component-architecture)
4. [Data Models](#data-models)
5. [Service Layer](#service-layer)
6. [State Management](#state-management)
7. [Data Flow](#data-flow)
8. [External Integrations](#external-integrations)
9. [Performance Considerations](#performance-considerations)

---

## System Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         REACT APPLICATION                         │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│  │  │   Upload    │  │   Reader    │  │  Vocabulary │              │  │
│  │  │   Page      │  │   Page      │  │   Page      │              │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │  │
│  │         │                │                │                       │  │
│  │         └────────────────┼────────────────┘                       │  │
│  │                          ▼                                        │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │                    ZUSTAND STORE                            │  │  │
│  │  │  - currentText    - vocabulary    - settings    - ui       │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                          │                                        │  │
│  │         ┌────────────────┼────────────────┐                       │  │
│  │         ▼                ▼                ▼                       │  │
│  │  ┌───────────┐   ┌───────────────┐   ┌───────────┐              │  │
│  │  │FileParser │   │TranslationSvc │   │StorageSvc │              │  │
│  │  │  Service  │   │    Service    │   │  Service  │              │  │
│  │  └───────────┘   └───────────────┘   └───────────┘              │  │
│  │                          │                                        │  │
│  └──────────────────────────┼────────────────────────────────────────┘  │
│                             │                                           │
│  ┌──────────────────────────┼────────────────────────────────────────┐  │
│  │                      BROWSER APIs                                  │  │
│  │  IndexedDB (Dexie)  │  LocalStorage  │  File API  │  Web Workers │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
│                                                                         │
│  ┌─────────────────────┐          ┌─────────────────────────────────┐  │
│  │   LOCAL (Ollama)    │          │        CLOUD (Optional)          │  │
│  │                     │          │                                   │  │
│  │  http://localhost   │    OR    │  OpenAI API / Anthropic API      │  │
│  │  :11434             │          │  (User provides API key)         │  │
│  └─────────────────────┘          └─────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
wordshift/
├── public/                     # Static assets
│   ├── favicon.ico
│   └── fonts/
│
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI primitives (shadcn/ui)
│   │   │   ├── Button.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ...
│   │   │
│   │   ├── upload/             # Upload page components
│   │   │   ├── FileDropZone.tsx
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── TextPasteArea.tsx
│   │   │   └── UploadPage.tsx
│   │   │
│   │   ├── reader/             # Reader page components
│   │   │   ├── ReaderPage.tsx
│   │   │   ├── TextDisplay.tsx
│   │   │   ├── TranslationBubble.tsx
│   │   │   ├── WordSpan.tsx
│   │   │   └── PhraseSelector.tsx
│   │   │
│   │   ├── vocabulary/         # Vocabulary page components
│   │   │   ├── VocabularyPage.tsx
│   │   │   ├── WordList.tsx
│   │   │   ├── VocabularyFilters.tsx
│   │   │   └── ExportButton.tsx
│   │   │
│   │   ├── settings/           # Settings page components
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ApiKeyInput.tsx
│   │   │   └── ThemeToggle.tsx
│   │   │
│   │   └── layout/             # Layout components
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       └── Layout.tsx
│   │
│   ├── services/               # Business logic services
│   │   ├── fileParser/
│   │   │   ├── index.ts
│   │   │   ├── txtParser.ts
│   │   │   ├── pdfParser.ts
│   │   │   └── epubParser.ts
│   │   │
│   │   ├── translation/
│   │   │   ├── index.ts
│   │   │   ├── translationService.ts
│   │   │   ├── ollamaProvider.ts
│   │   │   ├── openaiProvider.ts
│   │   │   └── translationCache.ts
│   │   │
│   │   ├── language/
│   │   │   ├── index.ts
│   │   │   ├── languageDetector.ts
│   │   │   └── tokenizer.ts
│   │   │
│   │   └── storage/
│   │       ├── index.ts
│   │       ├── database.ts       # Dexie setup
│   │       ├── textStorage.ts
│   │       └── vocabularyStorage.ts
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── useTextStore.ts
│   │   ├── useVocabularyStore.ts
│   │   ├── useSettingsStore.ts
│   │   └── useUIStore.ts
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useFileUpload.ts
│   │   ├── useTranslation.ts
│   │   ├── useVocabulary.ts
│   │   └── useClickOutside.ts
│   │
│   ├── types/                   # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── text.types.ts
│   │   ├── translation.types.ts
│   │   ├── vocabulary.types.ts
│   │   └── settings.types.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── textUtils.ts
│   │   ├── languageUtils.ts
│   │   └── exportUtils.ts
│   │
│   ├── constants/               # Application constants
│   │   ├── languages.ts
│   │   └── config.ts
│   │
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles (Tailwind)
│
├── docs/                        # Documentation
│   ├── PLANNING.md
│   ├── ARCHITECTURE.md
│   ├── AGENT_GUIDELINES.md
│   └── DEVELOPMENT.md
│
├── tests/                       # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## Component Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   └── Navigation
│   │
│   └── Main Content (Routes)
│       │
│       ├── UploadPage
│       │   ├── FileDropZone
│       │   ├── TextPasteArea
│       │   ├── LanguageSelector (source - auto-detected)
│       │   ├── LanguageSelector (target - user selects)
│       │   ├── ProcessingModeToggle (Full / Dynamic)
│       │   ├── ProcessButton
│       │   └── ProcessingProgress
│       │
│       ├── ReaderPage
│       │   ├── TextDisplay
│       │   │   └── WordSpan (×n for each word)
│       │   ├── TranslationBubble (conditional)
│       │   │   └── SaveWordButton
│       │   └── ReaderToolbar
│       │
│       ├── VocabularyPage
│       │   ├── VocabularyFilters
│       │   │   ├── TextFilter
│       │   │   ├── LanguageFilter
│       │   │   └── ViewToggle (per-text/per-lang/all)
│       │   ├── WordList
│       │   │   └── WordItem (×n)
│       │   └── ExportButton
│       │
│       ├── SavedTextsPage
│       │   └── TextList
│       │       └── TextItem (×n)
│       │
│       └── SettingsPage
│           ├── TranslationSourceSelector
│           ├── ApiKeyInput
│           ├── ThemeToggle
│           ├── FontSizeSlider
│           └── StorageManager
```

### Key Component Specifications

#### WordSpan Component
```tsx
// Wraps each word to make it clickable
interface WordSpanProps {
  word: string;
  wordId: string;              // Unique ID for this word instance
  translation: string;         // Pre-computed translation
  partOfSpeech?: string;       // noun, verb, adj, etc.
  isSelected: boolean;         // Part of current phrase selection
  isInSelectedPhrase: boolean; // Part of drag-selected phrase
  onClick: () => void;
  onDoubleClick: () => void;   // Double-tap to save directly
  onDragStart: () => void;     // Begin phrase selection
  onDragOver: () => void;      // Extend phrase selection
}

// Behavior:
// - Single click: Triggers translation bubble
// - Double click/tap: Saves word directly to vocabulary
// - Drag: Begins phrase selection mode
// - Highlight effect on hover
// - Different highlight when part of selected phrase
```

#### TranslationBubble Component
```tsx
interface TranslationBubbleProps {
  translation: string;         // Translation text (e.g., "happy")
  partOfSpeech?: string;       // Part of speech (e.g., "adj")
  position: { x: number; y: number };
  placement: 'above' | 'below'; // Smart positioning based on screen position
  onSave: () => void;
  onClose: () => void;
}

// Bubble Content: "happy (adj) [⭐]"
// - Translation + part of speech + small save icon
// - NO original text (already visible in the document)

// Positioning Logic:
// - If word is in UPPER half of viewport → bubble appears BELOW
// - If word is in LOWER half of viewport → bubble appears ABOVE
// - Arrow/pointer always points to the original word

// Behavior:
// - MUST NOT obscure the original word
// - CAN obscure surrounding text
// - Closes on click outside
// - Save icon is small (just an icon, no text)
```

#### PhraseSelector Component
```tsx
interface PhraseSelectorProps {
  startIndex: number;          // First word index in selection
  endIndex: number;            // Last word index in selection
  selectedText: string;        // Combined text of selected words
  onConfirm: () => void;       // User clicks on selection to confirm
  onCancel: () => void;        // User clicks elsewhere to cancel
}

// Behavior:
// - Highlights all words in the drag selection
// - On click: Shows translation bubble for entire phrase
// - On click outside: Clears selection
```

#### PageNavigator Component (Page Mode)
```tsx
interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
}

// Navigation Methods (all three supported):
// 1. Arrow buttons: ← → buttons at screen edges or bottom
// 2. Tap zones: Tap left 20% of screen = prev, right 20% = next
// 3. Swipe gestures: Swipe left = next, swipe right = prev

// Page Calculation:
// - Pages are calculated based on viewport height
// - Content fits dynamically (no mid-word breaks)
// - Recalculates on window resize

// Display:
// - Shows "Page 5 of 120" or similar indicator
// - Smooth transition animation between pages
```

#### TextDisplay Component
```tsx
interface TextDisplayProps {
  processedText: ProcessedText;
  displayMode: 'scroll' | 'page';  // User preference
  onWordClick: (wordId: string, position: Position) => void;
  onWordDoubleClick: (wordId: string) => void;
  onPhraseSelect: (startIndex: number, endIndex: number) => void;
}

// Scroll Mode:
// - Continuous scrolling text
// - Standard browser scroll behavior
// - Remembers scroll position

// Page Mode:
// - Book-like pages that fit to screen
// - Navigation via PageNavigator component
// - Content divided by viewport height
```

---

## Data Models

### TypeScript Interfaces

```typescript
// src/types/text.types.ts

interface ProcessedText {
  id: string;                    // UUID
  title: string;                 // User-provided or filename
  originalContent: string;       // Raw text content
  sourceLanguage: LanguageCode;  // Detected source language
  targetLanguage: LanguageCode;  // User-selected target
  words: ProcessedWord[];        // All words with translations
  createdAt: Date;
  lastOpenedAt: Date;
  readingPosition?: number;      // Last scroll position
}

interface ProcessedWord {
  id: string;                    // UUID
  index: number;                 // Position in text
  original: string;              // Original word
  normalized: string;            // Lowercase, trimmed
  translation: string;           // Translated word
  context?: string;              // Surrounding words for context
  partOfSpeech?: string;         // noun, verb, adj, etc.
}

type LanguageCode = 'en' | 'ru' | 'ko';

interface LanguagePair {
  source: LanguageCode;
  target: LanguageCode;
}
```

```typescript
// src/types/vocabulary.types.ts

interface VocabularyEntry {
  id: string;                    // UUID
  original: string;              // Original word/phrase
  translation: string;           // Translation
  partOfSpeech?: string;         // noun, verb, adj, etc.
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  textId: string;                // Which text it came from
  textTitle: string;             // Title of source text
  savedAt: Date;
  isPhrase: boolean;             // true if multi-word selection
}

// Display format for vocabulary list:
// "счастливые (adj) : happy"
// "друг на друга (phrase) : each other"
function formatVocabularyEntry(entry: VocabularyEntry): string {
  const pos = entry.isPhrase ? 'phrase' : (entry.partOfSpeech || '');
  const posStr = pos ? ` (${pos})` : '';
  return `${entry.original}${posStr} : ${entry.translation}`;
}

interface VocabularyFilter {
  textId?: string;               // Filter by specific text
  languagePair?: LanguagePair;   // Filter by language pair
  searchQuery?: string;          // Search within words
}
```

```typescript
// src/types/settings.types.ts

interface AppSettings {
  translationSource: 'local' | 'cloud';
  cloudProvider?: 'openai' | 'anthropic';
  apiKey?: string;               // Encrypted
  theme: 'light' | 'dark' | 'system';
  readerFontSize: number;        // 12-24
  ollamaEndpoint: string;        // Default: http://localhost:11434
}
```

### Database Schema (IndexedDB via Dexie)

```typescript
// src/services/storage/database.ts

import Dexie, { Table } from 'dexie';

class WordShiftDatabase extends Dexie {
  texts!: Table<ProcessedText>;
  vocabulary!: Table<VocabularyEntry>;

  constructor() {
    super('WordShiftDB');
    
    this.version(1).stores({
      texts: 'id, title, sourceLanguage, targetLanguage, createdAt, lastOpenedAt',
      vocabulary: 'id, original, sourceLanguage, targetLanguage, textId, savedAt'
    });
  }
}

export const db = new WordShiftDatabase();
```

---

## Service Layer

### Service Interfaces

```typescript
// File Parser Service
interface FileParserService {
  parse(file: File): Promise<string>;
  detectFormat(file: File): FileFormat;
}

// Dictionary Service (PRIMARY - for word translation)
interface DictionaryService {
  // Look up a word in the bundled dictionary
  lookup(word: string, pair: LanguagePair): DictionaryEntry | null;
  
  // Check if dictionary is loaded for a language pair
  isLoaded(pair: LanguagePair): boolean;
  
  // Load dictionary for a language pair
  loadDictionary(pair: LanguagePair): Promise<void>;
}

interface DictionaryEntry {
  word: string;           // Original word (normalized)
  translation: string;    // Primary translation
  translations?: string[]; // Alternative translations
  pos: string;            // Part of speech
}

// LLM Service (FALLBACK - for unknown words and phrases)
interface LLMService {
  // Translate a word using LLM (called when dictionary lookup fails + user clicks retry)
  translateWord(word: string, context: string, pair: LanguagePair): Promise<TranslationResult>;
  
  // Translate a phrase using LLM (context-aware)
  translatePhrase(phrase: string, pair: LanguagePair): Promise<TranslationResult>;
  
  // Check if LLM is available
  isAvailable(): Promise<boolean>;
}

// Combined Translation Service (orchestrates dictionary + LLM)
interface TranslationService {
  // Look up word - uses dictionary, returns "?" if not found
  lookupWord(word: string, pair: LanguagePair): TranslationResult;
  
  // Translate word via LLM (fallback for unknown words)
  translateWordWithLLM(word: string, context: string, pair: LanguagePair): Promise<TranslationResult>;
  
  // Translate phrase via LLM
  translatePhrase(phrase: string, pair: LanguagePair): Promise<TranslationResult>;
  
  // Process all words in text using dictionary
  processText(tokens: Token[], pair: LanguagePair, onProgress: (p: number) => void): ProcessedWord[];
}

// Language Service
interface LanguageService {
  detect(text: string): Promise<LanguageCode>;
  tokenize(text: string): TokenizedText;
}

// Language detection approach:
// - Use first 500 characters of text
// - Check character ranges: Cyrillic (Russian), Hangul (Korean), Latin (English)
// - For Cyrillic: check for Russian-specific characters (ё, ъ, ы)
// - Return detected LanguageCode

// Tokenization approach:
interface TokenizedText {
  tokens: Token[];
}

interface Token {
  type: 'word' | 'punctuation' | 'whitespace';
  value: string;
  index: number;      // Position in token array
  charStart: number;  // Character position in original text
  charEnd: number;
}

// Tokenization rules:
// - Words: sequences of letters (including Unicode: Cyrillic, Hangul, Latin)
// - Punctuation: . , ! ? ; : " ' ( ) [ ] - — etc.
// - Whitespace: spaces, newlines, tabs (preserved for display)
// - Contractions: "don't" → single word, "it's" → single word

// Storage Service
interface StorageService {
  // Texts
  saveText(text: ProcessedText): Promise<void>;
  getText(id: string): Promise<ProcessedText | null>;
  getAllTexts(): Promise<ProcessedText[]>;
  deleteText(id: string): Promise<void>;
  
  // Vocabulary
  saveWord(entry: VocabularyEntry): Promise<void>;
  getVocabulary(filter?: VocabularyFilter): Promise<VocabularyEntry[]>;
  deleteWord(id: string): Promise<void>;
}
```

### Dictionary Service Implementation

```typescript
// Dictionary data structure (loaded from JSON files)
type DictionaryData = Map<string, DictionaryEntry>;

// Dictionary file naming convention
// public/dictionaries/ru-en.json  (Russian → English)
// public/dictionaries/en-ru.json  (English → Russian)
// public/dictionaries/ru-ko.json  (Russian → Korean)
// etc.

class DictionaryService {
  private dictionaries = new Map<string, DictionaryData>();
  
  async loadDictionary(pair: LanguagePair): Promise<void> {
    const key = `${pair.source}-${pair.target}`;
    if (this.dictionaries.has(key)) return;
    
    const response = await fetch(`/dictionaries/${key}.json`);
    const data = await response.json();
    
    // Convert array to Map for O(1) lookup
    const dict = new Map<string, DictionaryEntry>();
    for (const entry of data) {
      dict.set(entry.word.toLowerCase(), entry);
    }
    
    this.dictionaries.set(key, dict);
  }
  
  lookup(word: string, pair: LanguagePair): DictionaryEntry | null {
    const key = `${pair.source}-${pair.target}`;
    const dict = this.dictionaries.get(key);
    if (!dict) return null;
    
    return dict.get(word.toLowerCase()) || null;
  }
}

// Dictionary JSON format (from Wiktionary/kaikki.org)
// public/dictionaries/ru-en.json:
[
  { "word": "книга", "translation": "book", "pos": "noun" },
  { "word": "читать", "translation": "to read", "pos": "verb" },
  { "word": "счастливый", "translation": "happy", "pos": "adj" },
  // ... 10-20K common words
]
```

### LLM Provider Pattern (Fallback Only)

```typescript
// Abstract provider interface (for LLM fallback)
interface LLMProvider {
  name: string;
  translate(prompt: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

// Mock Provider (for development)
class MockLLMProvider implements LLMProvider {
  name = 'Mock (Development)';
  
  async translate(prompt: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const wordMatch = prompt.match(/Word: "(.+?)"/);
    const word = wordMatch ? wordMatch[1] : 'unknown';
    return `[${word}]|noun`;
  }
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// Ollama Provider (local LLM)
class OllamaProvider implements LLMProvider {
  name = 'Ollama (Local)';
  
  async translate(prompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'qwen2.5:7b',  // or mistral
        prompt: prompt,
        stream: false
      })
    });
    return response.json().then(r => r.response);
  }
}

// OpenAI Provider (user provides API key)
class OpenAIProvider implements TranslationProvider {
  name = 'OpenAI (Cloud)';
  
  async translate(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    return response.json().then(r => r.choices[0].message.content);
  }
}

// Provider selection priority:
// 1. Development: Use MockProvider (fast, no setup required)
// 2. Local testing: Use OllamaProvider (real translations, offline)
// 3. Production: Use OpenAIProvider (highest quality, user's API key)
```

---

## State Management

### Zustand Store Structure

```typescript
// src/stores/useTextStore.ts
interface TextStore {
  // State
  currentText: ProcessedText | null;
  processingProgress: number;
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  setCurrentText: (text: ProcessedText) => void;
  startProcessing: (file: File, targetLang: LanguageCode) => Promise<void>;
  clearCurrentText: () => void;
}

// src/stores/useVocabularyStore.ts
interface VocabularyStore {
  // State
  entries: VocabularyEntry[];
  filter: VocabularyFilter;
  
  // Actions
  loadVocabulary: () => Promise<void>;
  saveWord: (word: ProcessedWord, textId: string, textTitle: string) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  setFilter: (filter: VocabularyFilter) => void;
  exportToClipboard: () => Promise<void>;
}

// src/stores/useUIStore.ts
interface UIStore {
  // State
  selectedWordId: string | null;
  bubblePosition: { x: number; y: number } | null;
  selectedPhrase: { start: number; end: number } | null;
  
  // Actions
  selectWord: (wordId: string, position: { x: number; y: number }) => void;
  selectPhrase: (start: number, end: number) => void;
  clearSelection: () => void;
}

// src/stores/useSettingsStore.ts
interface SettingsStore {
  // State
  settings: AppSettings;
  
  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}
```

---

## Data Flow

### Text Processing Flow

With dictionary-based translation, processing is now **instant** for most words.

```
User drops file → Clicks "Process"
       │
       ▼
┌──────────────────┐
│ FileParserService │──→ Extract raw text from PDF/EPUB/TXT
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ LanguageService   │──→ Detect source language (first 500 chars)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ DictionaryService │──→ Load dictionary for language pair (if not loaded)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Tokenizer         │──→ Split text into words (preserve punctuation)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ TranslationService (dictionary-based, FAST)               │
│                                                           │
│  1. Extract unique words (case-insensitive)               │
│  2. For each unique word:                                 │
│     a. Look up in dictionary (O(1) Map access)            │
│        ├─ Found → Use translation + POS                   │
│        └─ Not found → Set translation to "?"              │
│     b. Map translations to all word instances             │
│                                                           │
│  Speed: ~10,000 words/second (vs 1-2 words/sec with LLM)  │
│                                                           │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ StorageService    │──→ Save ProcessedText to IndexedDB
└────────┬─────────┘
         │
         ▼
    Navigate to ReaderPage (most words translated, some "?")
```

#### Note on Processing Modes

With dictionary-based translation, processing is now **instant** (~10K words/sec).
The "Dynamic" vs "Full" mode distinction is **no longer necessary** - all words
are translated immediately via dictionary lookup.

The only "unknown" words are those not in the dictionary, which display "?" and
can be translated on-demand via LLM when the user clicks the retry button.

### Click-to-Translate Flow

```
User clicks word
       │
       ▼
WordSpan.onClick()
       │
       ▼
useUIStore.selectWord(wordId, position)
       │
       ▼
TranslationBubble renders
  - Reads translation from currentText.words
  - Shows: "translation (pos) 💾 🔄" OR "? 💾 🔄"
  - Positions based on click coordinates
       │
       ├────────────────────────────────────────┐
       │                                        │
       ▼                                        ▼
User clicks "💾 Save"                   User clicks "🔄 Retry" (for "?" words)
       │                                        │
       ▼                                        ▼
useVocabularyStore.saveWord()           LLMService.translateWord()
       │                                        │
       ▼                                        ▼
StorageService saves to IndexedDB       Update word in currentText
       │                                        │
       ▼                                        ▼
Toast: "Word saved!"
```

---

## External Integrations

### Dictionary Data (Primary Translation Source)

Dictionary files are bundled with the app in `public/dictionaries/`.

**Source: Wiktionary via kaikki.org**
- URL: https://kaikki.org/dictionary/
- Format: Pre-processed JSON
- License: Creative Commons (same as Wiktionary)

**Dictionary Files:**
```
public/
├── dictionaries/
│   ├── ru-en.json     # Russian → English (~10-20K words, ~2-5MB)
│   ├── en-ru.json     # English → Russian
│   ├── ru-ko.json     # Russian → Korean
│   ├── ko-ru.json     # Korean → Russian
│   ├── en-ko.json     # English → Korean
│   └── ko-en.json     # Korean → English
```

**JSON Format:**
```json
[
  {
    "word": "книга",
    "translation": "book",
    "translations": ["book", "volume", "tome"],
    "pos": "noun"
  },
  {
    "word": "читать",
    "translation": "to read",
    "pos": "verb"
  }
]
```

**Loading Strategy:**
1. Dictionary loaded lazily when language pair selected
2. Converted to Map for O(1) lookup
3. Cached in memory for session duration
4. ~2-5MB per language pair (acceptable for web)

---

### Ollama Integration (LLM Fallback)

Used ONLY for:
1. Unknown words (when user clicks 🔄 retry)
2. Phrase translation (future feature)

```typescript
// Configuration
const OLLAMA_CONFIG = {
  endpoint: 'http://localhost:11434',
  model: 'qwen2.5:7b',      // or 'mistral'
  timeout: 30000,
};

// Health check
async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.endpoint}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

// Translation prompt template (returns translation AND part of speech in one call)
const TRANSLATION_PROMPT = `
Translate the following word from {sourceLanguage} to {targetLanguage}.
Context: "{context}"
Word to translate: "{word}"

Respond in this exact format: translation|partOfSpeech
Where partOfSpeech is one of: noun, verb, adj, adv, prep, conj, pron, interj, phrase

Examples:
- "happy|adj"
- "to run|verb"
- "quickly|adv"

Respond with ONLY the translation|partOfSpeech, nothing else.
`;

// Parse response
function parseTranslationResponse(response: string): { translation: string; partOfSpeech: string } {
  const [translation, partOfSpeech] = response.trim().split('|');
  return {
    translation: translation || response.trim(),
    partOfSpeech: partOfSpeech || 'unknown'
  };
}

// Ollama availability check with user guidance
async function checkOllamaWithGuidance(): Promise<{ available: boolean; instructions?: string }> {
  const available = await checkOllamaAvailable();
  
  if (!available) {
    return {
      available: false,
      instructions: `
Ollama is not running. To start Ollama:

**Windows:**
1. Open Start Menu, search for "Ollama"
2. Click to launch (runs in system tray)
3. Or open PowerShell and run: ollama serve

**Mac:**
1. Open Terminal
2. Run: ollama serve

**Linux:**
1. Open Terminal
2. Run: ollama serve

After starting, click "Retry" to check connection.
      `.trim()
    };
  }
  
  return { available: true };
}
```

### OpenAI Integration

```typescript
// Configuration
const OPENAI_CONFIG = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',     // Cost-effective for simple translations
};

// System prompt for consistent format
const OPENAI_SYSTEM_PROMPT = `You are a translator. 
Respond in this exact format: translation|partOfSpeech
Where partOfSpeech is one of: noun, verb, adj, adv, prep, conj, pron, interj, phrase

Examples:
- "happy|adj"
- "to run|verb"
- "each other|phrase"

Respond with ONLY the translation|partOfSpeech, nothing else.`;

// API call structure (uses same format as Ollama)
async function translateWithOpenAI(
  word: string,
  context: string,
  pair: LanguagePair,
  apiKey: string
): Promise<{ translation: string; partOfSpeech: string }> {
  const response = await fetch(OPENAI_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      messages: [{
        role: 'system',
        content: OPENAI_SYSTEM_PROMPT
      }, {
        role: 'user',
        content: `Translate from ${pair.source} to ${pair.target}.\nContext: "${context}"\nWord: "${word}"`
      }],
      temperature: 0.1,  // Low temperature for consistent translations
    }),
  });
  
  const data = await response.json();
  const rawResponse = data.choices[0].message.content.trim();
  
  // Parse response using same function as Ollama
  return parseTranslationResponse(rawResponse);
}
```

---

## Design Guidelines

### Visual Style: Minimal & Clean

The UI should prioritize simplicity and low memory usage.

```
┌─────────────────────────────────────────────────────────────┐
│  DESIGN PRINCIPLES                                          │
├─────────────────────────────────────────────────────────────┤
│  ✓ Lots of white space                                      │
│  ✓ Simple, flat design (no gradients, shadows minimal)      │
│  ✓ Limited color palette (2-3 colors max)                   │
│  ✓ System fonts preferred (no custom font loading)          │
│  ✓ No unnecessary animations                                │
│  ✓ Optimize for low memory usage                            │
│  ✗ No decorative elements                                   │
│  ✗ No heavy images or icons                                 │
│  ✗ No complex CSS effects                                   │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette

```css
/* Minimal color scheme */
:root {
  --background: #ffffff;
  --foreground: #1a1a1a;
  --muted: #f5f5f5;
  --border: #e5e5e5;
  --primary: #2563eb;      /* Blue - for interactive elements */
  --primary-hover: #1d4ed8;
  --accent: #fef08a;       /* Light yellow - for word highlights */
  --success: #22c55e;      /* Green - for saved confirmation */
}

.dark {
  --background: #1a1a1a;
  --foreground: #fafafa;
  --muted: #262626;
  --border: #404040;
  --primary: #3b82f6;
  --accent: #854d0e;
  --success: #16a34a;
}
```

### Typography

```css
/* Use system fonts - no loading overhead */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;

/* Reader text - slightly larger for comfortable reading */
.reader-text {
  font-size: 18px;
  line-height: 1.7;
  max-width: 65ch;  /* Optimal reading width */
}
```

### Component Styling Examples

```tsx
// Button - simple, clean
<button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover">
  Process
</button>

// Card - minimal shadow
<div className="p-4 bg-white border border-border rounded">
  Content
</div>

// Translation bubble - simple and functional
<div className="px-3 py-2 bg-white border border-border rounded shadow-sm">
  happy (adj) ⭐
</div>

// Word highlight - subtle
<span className="px-0.5 rounded hover:bg-accent cursor-pointer">
  слово
</span>
```

### Memory Optimization

| Technique | Implementation |
|-----------|----------------|
| **Virtualization** | Use `react-window` for long texts (only render visible words) |
| **Lazy loading** | Load PDF.js and EPUB.js only when needed |
| **Image-free** | Use Unicode symbols (⭐) instead of icon libraries |
| **Minimal dependencies** | Avoid heavy UI libraries |
| **Efficient state** | Use Zustand selectors to prevent unnecessary re-renders |

---

## Performance Considerations

### Handling Large Texts (Novels)

| Challenge | Solution |
|-----------|----------|
| **Memory** | Process in chunks, virtualize text display |
| **Translation time** | Batch API calls, deduplicate words, cache aggressively |
| **Storage size** | Compress processed text, lazy-load vocabulary |
| **UI responsiveness** | Use Web Workers for processing, show progress |

### Optimization Strategies

1. **Word Deduplication**
   ```typescript
   // Don't translate "the" 5000 times
   const uniqueWords = new Set(words.map(w => w.toLowerCase()));
   const translations = await translateBatch(Array.from(uniqueWords));
   ```

2. **Virtualized Text Display**
   ```typescript
   // Only render visible portion of text
   import { FixedSizeList } from 'react-window';
   ```

3. **Web Worker for Processing**
   ```typescript
   // Offload heavy processing to worker thread
   const worker = new Worker('processingWorker.js');
   worker.postMessage({ text, targetLanguage });
   worker.onmessage = (e) => setProgress(e.data.progress);
   ```

4. **Translation Cache**
   ```typescript
   // Cache translations by word+language pair
   const cacheKey = `${word.toLowerCase()}_${source}_${target}`;
   if (cache.has(cacheKey)) return cache.get(cacheKey);
   ```

---

*This architecture is designed to be modular, testable, and easily modified by AI agents. Each service has clear interfaces and responsibilities.*

