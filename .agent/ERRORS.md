# Errors

> CANDIDATE = auto-extracted (unverified). A human flips to active.

## 2026-08-09 — CANDIDATE (auto-extracted · session b75a191b)
- of #3 is that completion is inferred by regexing `Day (\d+)` from a display string. The real fix is passing session identity explicitly through `onStartQuestionSet` — which also fixes #5 below.
