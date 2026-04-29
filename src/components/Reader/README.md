# Reader Architecture

The `Reader` feature is split across `src/components/Reader.jsx` and the `src/components/Reader/` subfolder.

```
src/components/
├── Reader.jsx              ← Root component (UI assembly only, ~230 lines)
└── Reader/
    ├── useReader.js        ← Orchestrator hook (composes all sub-hooks)
    │
    ├── useFoliate.js       ← Foliate viewer lifecycle
    ├── useRecallEngine.js  ← AI Recall / Orientation
    ├── useSummary.js       ← AI Chapter Summary
    ├── useExplainSelection.js ← Text selection, Highlight, AI Explain
    ├── useFocusMode.js     ← Focus Mode timer & ambience
    ├── useSessionTracking.js  ← Session duration & pages read
    │
    ├── ReaderHeader.jsx    ← Top toolbar (Back, Summarize, Recall, Notes, Focus, TOC, Settings)
    ├── AppearanceMenu.jsx  ← Appearance popover (Theme, Font, Width, Line Height, Flow)
    ├── TocSidebar.jsx      ← Table of Contents slide-out panel
    ├── ReaderFooter.jsx    ← Bottom bar (progress, chapter prev/next in scroll mode)
    └── SelectionMenu.jsx   ← Floating toolbar on text selection (Highlight, Explain, Define)
```

---

## Data Flow

```
Reader.jsx
  └── useReader() ─────────────────────────────────────────────────┐
        ├── useFoliate()          → manages viewerRef lifecycle     │
        ├── useRecallEngine()     → showRecall, handleRecall        │
        ├── useSummary()          → showSummary, handleSummarize    │
        ├── useExplainSelection() → selection, handleExplain        │
        ├── useFocusMode()        → isFocusMode, handleStartFocus   │
        └── useSessionTracking()  → recordPage, saveSession         │
                                                                    │
  All state & handlers returned from useReader() ──────────────────┘
  are spread as props into sub-components:
        <ReaderHeader />, <AppearanceMenu />, <TocSidebar />
        <ReaderFooter />, <SelectionMenu />
  and into modal components:
        <RecallModal />, <SummaryModal />, <ExplainModal />
        <PredictionPrompt />, <ReflectionCard />, <FocusSetupModal />
        <NotesModal />, <DictionaryModal />, <SettingsModal />
```

---

## Hook Reference

| Hook | Responsibility | Key exports |
|------|---------------|-------------|
| `useReader` | Orchestrator — composes sub-hooks, wires Status Bar | All state & handlers |
| `useFoliate` | Opens file in Foliate, applies styles, relays events | `viewerRef`, `setLocation`, `setToc` |
| `useRecallEngine` | Auto/manual Recall & Orientation AI generation | `showRecall`, `handleRecall`, `wasAutoRecallRef` |
| `useSummary` | AI chapter summary generation + persistence | `showSummary`, `handleSummarize`, `summaryText` |
| `useExplainSelection` | Text selection, highlight saving, AI Explain, follow-up | `selection`, `handleExplain`, `handleHighlight` |
| `useFocusMode` | Focus timer, ambience audio, entry/exit | `isFocusMode`, `handleStartFocus`, `handleExitFocus` |
| `useSessionTracking` | Records pages turned, saves session on back | `recordPage`, `saveSession` |

---

## Adding a New Feature

1. **New AI action** (e.g. Quiz Me) → create `useQuiz.js` in this folder, import it in `useReader.js`, spread its returns.
2. **New UI panel** → create `QuizPanel.jsx` here, import it in `Reader.jsx`, pass props from `useReader`.
3. **New setting** → add it to `useReaderSettings` (`src/utils/useReaderSettings.js`) and pass through `AppearanceMenu.jsx`.
