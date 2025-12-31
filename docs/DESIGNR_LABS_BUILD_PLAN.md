# Designr Labs - Build Plan

## Core Principle
**Stupid Simple**: One drop zone, any input. If it's complicated, find another way.

---

## Phase 1: Foundation (Current)
**Status**: In Progress

### Single Unified Input
- [x] One drop zone accepts: images, files, URLs
- [x] Backend auto-detects input type
- [x] Same output format regardless of input
- [ ] Basic validation (file size, type)

### What We Support Now
| Input | How | Status |
|-------|-----|--------|
| Image (PNG/JPG/WebP) | Drag-drop or click | Done |
| Screenshot | Paste (Cmd+V) | Phase 1 |

### Security Checklist
- [x] File size limit (10MB)
- [x] File type validation
- [x] Base64 encoding (no raw file storage)
- [x] Auth required for all endpoints
- [ ] Rate limiting

---

## Phase 2: More Input Types
**Goal**: Same simple interface, more input options

| Input | Implementation | Complexity |
|-------|---------------|------------|
| Paste from clipboard | `onPaste` event | Low |
| URL to screenshot | Backend fetches + analyzes | Medium |
| Text description | Skip vision, direct to prompt | Low |

### NOT Building (Too Complex)
- Video analysis (wait for better APIs)
- Real-time dictation (use browser speech-to-text first)
- Multi-file batch processing

---

## Phase 3: Output Improvements
**Goal**: Make results more useful

- [ ] One-click copy all prompts
- [ ] Export to Markdown file
- [ ] Save to library (local storage first)
- [ ] History of recent analyses

---

## Phase 4: Polish
- [ ] Loading states that don't cause anxiety
- [ ] Clear error messages with solutions
- [ ] Keyboard shortcuts
- [ ] Mobile-friendly

---

## Architecture (Keep It Simple)

```
User Input (any type)
       │
       ▼
┌─────────────────┐
│  UnifiedInput   │  ← One component handles everything
│  Component      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/vision/   │  ← One endpoint
│  analyze        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  InputRouter    │  ← Detects type, routes to handler
│  (backend)      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Image     Text
 Handler   Handler
    │         │
    └────┬────┘
         ▼
   Same Response Format
```

---

## Rules

1. **One way to do each thing** - No multiple upload methods
2. **Fail fast with clear errors** - Don't let users wonder
3. **No loading spinners > 5 seconds** - Show progress or cancel option
4. **Every feature must be deletable** - No dependencies that trap us
5. **Test each phase before next** - Don't stack untested code

---

## What NOT To Build

- Complex canvas (use Excalidraw embed if needed later)
- User accounts beyond auth (Supabase handles this)
- Custom file storage (use Supabase storage if needed)
- Collaboration features (MVP is single-user)
- Browser extension (adds maintenance burden)

---

## Success Metrics

- [ ] Upload to prompt in < 10 seconds
- [ ] Zero confusion about what to do next
- [ ] Works on mobile
- [ ] No errors that don't explain how to fix
