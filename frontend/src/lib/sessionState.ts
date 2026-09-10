export const LEGACY_KEY = "mindbridge_user_id";
export const SESSION_KEY = "mindbridge_session_user_id";

export function activateSession(userId: string): void {
  const previous = localStorage.getItem(LEGACY_KEY);
  if (previous && previous !== userId) {
    const key = "mindbridge_legacy_user_ids";
    try {
      const old: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      const ids = Array.isArray(old) ? old.filter((v): v is string => typeof v === "string") : [];
      localStorage.setItem(key, JSON.stringify([...new Set([...ids, previous])]));
    } catch {
      localStorage.setItem(key, JSON.stringify([previous]));
    }
  }
  const oldSession = localStorage.getItem(SESSION_KEY);
  if (previous !== userId || oldSession !== userId) {
    localStorage.removeItem("mindbridge_active_conversation");
    localStorage.removeItem("mindbridge_anonymous_profile");
    localStorage.removeItem("mindbridge_has_completed_onboarding");
  }
  localStorage.setItem(SESSION_KEY, userId);
  localStorage.setItem(LEGACY_KEY, userId);
}

export function clearSessionCache(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem("mindbridge_active_conversation");
  localStorage.removeItem("mindbridge_anonymous_profile");
  localStorage.removeItem("mindbridge_has_completed_onboarding");
}
