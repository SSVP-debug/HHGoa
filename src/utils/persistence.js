// Lightweight client-side "one ID per browser" guard. Not a real anti-fraud
// system (that needs a backend + auth), but it closes the obvious gap where
// someone can regenerate five different identities in five minutes with zero
// friction. Storing the final rendered card (not the raw photo) keeps this
// small and means "already claimed" can render instantly with no re-work.

const KEY = "hhgoa_builder_id_v1";

export function saveBuilderRecord(record) {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // localStorage can fail (private mode, quota) — non-fatal, just means
    // the duplicate guard silently doesn't persist this session.
  }
}

export function loadBuilderRecord() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBuilderRecord() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
