# WordShifter - Agent Collaboration Guidelines

> **Purpose**: This document defines how AI agents should work on this project. Follow these guidelines to ensure consistent, high-quality contributions that integrate well with the existing codebase.

---

## 📋 Table of Contents

1. [Before You Start](#before-you-start)
2. [Understanding the Project](#understanding-the-project)
3. [Making Changes](#making-changes)
4. [Code Conventions](#code-conventions)
5. [When to Ask Questions](#when-to-ask-questions)
6. [Documentation Updates](#documentation-updates)
7. [Testing Requirements](#testing-requirements)
8. [Common Patterns](#common-patterns)

---

## Before You Start

### 🚀 Quick Start for Agents

**Starting a new session? Do this:**

1. **Read PLANNING.md** → Go to "Milestones & Priorities" section
2. **Find current milestone** → Look for first milestone with unchecked items
3. **Follow step-by-step** → Each milestone has a table of exact steps + files to create
4. **Check acceptance tests** → Each milestone ends with specific tests to verify

**Example workflow:**
```
1. Open PLANNING.md
2. Find "Milestone 1: Hello World"
3. See Step 1.1: "Initialize Vite + React + TypeScript project"
4. Do it, then move to Step 1.2
5. After all steps, verify "Acceptance Test" criteria
6. Mark milestone complete, move to Milestone 2
```

### Required Reading

Before making any changes, read these documents **in order**:

1. **`docs/PLANNING.md`** - Understand what we're building and why
   - **Key section**: "Milestones & Priorities" (step-by-step implementation guide)
2. **`docs/ARCHITECTURE.md`** - Understand how the system is structured
   - **Key sections**: "Directory Structure", "Component Architecture", "Data Models"
3. **`docs/DEVELOPMENT.md`** - Understand how to set up and run the project
   - **Key section**: "Project Setup", "Ollama Setup"

### Quick Context Checklist

Before implementing a feature, verify you understand:

- [ ] What problem does this feature solve?
- [ ] Where does this fit in the user flow?
- [ ] What components/services are involved?
- [ ] What data models are needed?
- [ ] Are there any open questions in PLANNING.md about this?

---

## Understanding the Project

### Core Concept

WordShifter is a **language learning reading aid**:
- Users upload text in one language
- Text is pre-processed (all words translated)
- Users read and click words to see translations
- Minimal disruption to reading flow is the #1 UX goal

### Key Technical Decisions (Don't Change Without Discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React + TypeScript | Large ecosystem, agent-friendly |
| Build | Vite | Fast, modern |
| Styling | Tailwind CSS | Utility-first, readable |
| Components | shadcn/ui | Accessible, customizable |
| State | Zustand | Simple, minimal boilerplate |
| Storage | IndexedDB (Dexie) | Handles large data |
| Translation | Local-first (Ollama) | Free, offline |

### Priority Languages

Initial language support:
- Russian ↔ English
- Russian ↔ Korean

Add other languages only after these are working well.

---

## Making Changes

### Workflow for Agents

```
1. READ: Understand the relevant docs and existing code
       │
       ▼
2. PLAN: Outline your approach (share with user if complex)
       │
       ▼
3. IMPLEMENT: Make changes following conventions
       │
       ▼
4. TEST: Verify functionality works
       │
       ▼
5. UPDATE DOCS: Update PLANNING.md status, add to changelog
```

### File Creation Guidelines

**DO create files for:**
- New React components (one component per file)
- New services (clear single responsibility)
- New utility functions (grouped by purpose)
- New type definitions (grouped by domain)

**DON'T create files for:**
- Trivial helper functions (inline or add to existing utils)
- Single-use components (keep in parent file)
- Empty placeholder files

### Naming Conventions

```
Components:     PascalCase.tsx     (e.g., TranslationBubble.tsx)
Hooks:          useCamelCase.ts    (e.g., useTranslation.ts)
Services:       camelCase.ts       (e.g., translationService.ts)
Types:          domain.types.ts    (e.g., vocabulary.types.ts)
Utilities:      camelCase.ts       (e.g., textUtils.ts)
Constants:      camelCase.ts       (e.g., languages.ts)
Stores:         useDomainStore.ts  (e.g., useTextStore.ts)
```

---

## Code Conventions

### TypeScript

```typescript
// ✅ DO: Use explicit types for function parameters and returns
function processText(text: string, language: LanguageCode): ProcessedWord[] {
  // ...
}

// ✅ DO: Use interfaces for object shapes
interface ProcessedWord {
  id: string;
  original: string;
  translation: string;
}

// ❌ DON'T: Use `any`
function process(text: any): any { } // Bad!

// ✅ DO: Use type inference for simple cases
const words = text.split(' '); // string[] is inferred
```

### React Components

```tsx
// ✅ DO: Use functional components with TypeScript props
interface WordSpanProps {
  word: string;
  translation: string;
  onClick: () => void;
}

export function WordSpan({ word, translation, onClick }: WordSpanProps) {
  return (
    <span 
      className="cursor-pointer hover:bg-yellow-100"
      onClick={onClick}
    >
      {word}
    </span>
  );
}

// ✅ DO: Keep components focused and small
// If a component is > 100 lines, consider splitting

// ✅ DO: Colocate related components
// components/reader/
//   ReaderPage.tsx
//   TextDisplay.tsx
//   WordSpan.tsx
//   TranslationBubble.tsx

// ❌ DON'T: Mix concerns
function WordSpan({ word }: { word: string }) {
  // Don't fetch data directly in display components
  const translation = await fetch(`/api/translate/${word}`); // Bad!
}
```

### Tailwind CSS

```tsx
// ✅ DO: Use Tailwind utilities directly
<button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  Process
</button>

// ✅ DO: Group related utilities logically
<div className={`
  flex items-center justify-between    // Layout
  p-4 mx-2                             // Spacing
  bg-white rounded-lg shadow           // Appearance
  hover:shadow-lg transition           // Interaction
`}>

// ✅ DO: Use cn() helper for conditional classes
import { cn } from '@/utils/cn';

<span className={cn(
  "px-1 rounded",
  isSelected && "bg-yellow-200",
  isHovered && "bg-yellow-100"
)}>
```

### Zustand Stores

```typescript
// ✅ DO: Keep stores focused on one domain
// src/stores/useVocabularyStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VocabularyStore {
  entries: VocabularyEntry[];
  addEntry: (entry: VocabularyEntry) => void;
  removeEntry: (id: string) => void;
}

export const useVocabularyStore = create<VocabularyStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set((state) => ({ 
        entries: [...state.entries, entry] 
      })),
      removeEntry: (id) => set((state) => ({ 
        entries: state.entries.filter(e => e.id !== id) 
      })),
    }),
    { name: 'vocabulary-storage' }
  )
);

// ✅ DO: Access stores with selectors to prevent unnecessary re-renders
const entries = useVocabularyStore((state) => state.entries);
const addEntry = useVocabularyStore((state) => state.addEntry);
```

### Error Handling

```typescript
// ✅ DO: Handle errors gracefully with user feedback
async function processFile(file: File): Promise<ProcessedText> {
  try {
    const text = await parseFile(file);
    const words = await translateAll(text);
    return { text, words };
  } catch (error) {
    if (error instanceof FileParseError) {
      toast.error('Could not read file. Please try a different format.');
    } else if (error instanceof TranslationError) {
      toast.error('Translation failed. Check your internet connection.');
    } else {
      toast.error('An unexpected error occurred.');
      console.error(error);
    }
    throw error;
  }
}

// ✅ DO: Create specific error types
class FileParseError extends Error {
  constructor(message: string, public format: string) {
    super(message);
    this.name = 'FileParseError';
  }
}
```

---

## When to Ask Questions

### Always Ask About:

1. **Ambiguous requirements**
   - "Should the bubble appear above or below the word?"
   - "What happens if the user clicks outside while selecting a phrase?"

2. **Architectural decisions**
   - "Should this be a new service or extend an existing one?"
   - "Should this data be cached, and for how long?"

3. **UX decisions**
   - "What should happen on mobile when there's no hover?"
   - "Should there be a loading state while saving?"

4. **Scope creep**
   - "The user asked for X, but Y might also be useful. Should I include Y?"

### Don't Ask About:

1. **Standard implementation details** (just follow conventions)
2. **Code formatting** (Prettier handles it)
3. **Type definitions** (follow existing patterns)
4. **Test structure** (follow existing patterns)

### How to Ask

When asking a question, provide context:

```markdown
**Question**: How should the translation bubble handle very long translations?

**Context**: Some Russian words translate to multi-word English phrases.
For example, "достопримечательности" → "sights/attractions/places of interest"

**Options I see**:
1. Truncate with "..." and allow expansion
2. Make bubble wider (might overflow on mobile)
3. Show scrollable content in fixed-size bubble

**My recommendation**: Option 1, but I want to confirm.
```

---

## Documentation Updates

### When to Update PLANNING.md

| Event | Action |
|-------|--------|
| Feature completed | Update status from 🔲 to ✅ |
| New decision made | Add to Technical Decisions |
| Question answered | Update Open Questions table |
| Scope changed | Update Feature Specifications |
| Milestone reached | Update Milestones section |

### Changelog Format

Always add entries to the changelog when making significant changes:

```markdown
## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-15 | Agent | Implemented F1: File Upload |
| 2024-12-14 | Agent | Set up project with Vite + React |
| 2024-12-12 | Initial | Created initial planning document |
```

### When to Update ARCHITECTURE.md

- Adding new components (update Component Hierarchy)
- Adding new services (update Service Layer)
- Changing data models (update Data Models)
- Adding integrations (update External Integrations)

---

## Testing Requirements

### What Needs Tests

| Type | Required For |
|------|--------------|
| **Unit tests** | Services, utilities, complex logic |
| **Component tests** | Interactive components, state-dependent UI |
| **Integration tests** | Data flow between services |
| **E2E tests** | Critical user flows |

### Test File Location

```
src/
  services/
    translation/
      translationService.ts
      translationService.test.ts    ← Colocated
  components/
    reader/
      TranslationBubble.tsx
      TranslationBubble.test.tsx    ← Colocated
```

### Test Naming

```typescript
// Describe what, not how
describe('TranslationService', () => {
  describe('translateWord', () => {
    it('returns cached translation when available', async () => {
      // ...
    });
    
    it('calls provider when word is not cached', async () => {
      // ...
    });
    
    it('throws TranslationError when provider fails', async () => {
      // ...
    });
  });
});
```

---

## Common Patterns

### Pattern: Service with Provider

```typescript
// Pattern for swappable implementations (like translation)

// 1. Define the interface
interface TranslationProvider {
  translate(prompt: string): Promise<string>;
}

// 2. Create implementations
class OllamaProvider implements TranslationProvider { /* ... */ }
class OpenAIProvider implements TranslationProvider { /* ... */ }

// 3. Service uses the interface
class TranslationService {
  constructor(private provider: TranslationProvider) {}
  
  async translateWord(word: string): Promise<string> {
    return this.provider.translate(`Translate: ${word}`);
  }
}

// 4. Inject based on settings
const provider = settings.translationSource === 'local' 
  ? new OllamaProvider()
  : new OpenAIProvider(settings.apiKey);
const service = new TranslationService(provider);
```

### Pattern: Hook for Component Logic

```typescript
// Keep components clean by extracting logic to hooks

// useBubblePosition.ts
export function useBubblePosition(targetElement: HTMLElement | null) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!targetElement) return;
    
    const rect = targetElement.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10  // Position above
    });
  }, [targetElement]);
  
  return position;
}

// TranslationBubble.tsx
export function TranslationBubble({ targetRef, translation }) {
  const position = useBubblePosition(targetRef);
  
  return (
    <div style={{ left: position.x, top: position.y }}>
      {translation}
    </div>
  );
}
```

### Pattern: Optimistic Updates

```typescript
// Update UI immediately, sync with storage in background

export function useSaveWord() {
  const addEntry = useVocabularyStore(s => s.addEntry);
  
  const saveWord = async (word: ProcessedWord) => {
    const entry: VocabularyEntry = {
      id: generateId(),
      original: word.original,
      translation: word.translation,
      savedAt: new Date(),
    };
    
    // Optimistic update (instant UI feedback)
    addEntry(entry);
    toast.success('Word saved!');
    
    // Persist to IndexedDB (background)
    await db.vocabulary.add(entry);
  };
  
  return { saveWord };
}
```

---

## Git Workflow

**Commit after EACH step** in the milestone tables. This provides granular history.

### Commit Format

```
feat(scope): brief description

- Detail 1
- Detail 2
```

### Commit Scopes

| Scope | Use For |
|-------|---------|
| `setup` | Project initialization, config |
| `upload` | File upload feature |
| `reader` | Reader/display feature |
| `translation` | Translation service |
| `vocabulary` | Vocabulary feature |
| `settings` | Settings page |
| `ui` | General UI components |
| `test` | Test files |
| `docs` | Documentation updates |

### Example Commits

```bash
# After Step 1.1
git add .
git commit -m "feat(setup): initialize Vite + React + TypeScript project"

# After Step 1.5
git add .
git commit -m "feat(upload): create FileDropZone component

- Supports drag-and-drop
- Accepts .txt files
- Shows file name after drop"

# After adding tests
git add .
git commit -m "test(upload): add FileDropZone component tests"
```

---

## Quick Reference Card

```
📁 Where to put things:
   Component     → src/components/{feature}/ComponentName.tsx
   Hook          → src/hooks/useName.ts
   Service       → src/services/{domain}/serviceName.ts
   Type          → src/types/domain.types.ts
   Store         → src/stores/useDomainStore.ts
   Utility       → src/utils/utilName.ts

📝 Naming:
   Components    → PascalCase
   Functions     → camelCase
   Constants     → SCREAMING_SNAKE_CASE
   Types         → PascalCase
   Files         → Match export name

🎨 Design:
   Style         → Minimal, clean, lots of white space
   Memory        → Optimize for low memory usage
   Components    → Simple, not over-engineered

✅ Before committing (after EACH step):
   - Code compiles (tsc --noEmit)
   - Tests pass (npm test)
   - Lint passes (npm run lint)
   - Docs updated (if applicable)
   - git add . && git commit -m "..."

❓ When in doubt:
   - Check existing code for patterns
   - Read the ARCHITECTURE.md
   - Ask the user!
```

---

*Following these guidelines ensures consistent, maintainable code that any agent can understand and extend.*

