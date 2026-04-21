/* ═══════════════════════════════════════════════════════════════════
   Session-storage draft autosave for Contractor Registration.
   ═══════════════════════════════════════════════════════════════════ */
import { SESSION_KEY, type SessionDraft } from "../types";

export function saveDraft(draft: Omit<SessionDraft, "savedAt">) {
  try {
    const payload: SessionDraft = { ...draft, savedAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function loadDraft(): SessionDraft | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(SESSION_KEY);
}
