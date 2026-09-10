// Cookie-based anonymous session client.
// Never put the raw credential in JavaScript storage or URL parameters.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class SessionHttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SessionHttpError";
    this.status = status;
  }
}

async function sessionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/session${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new SessionHttpError(response.status, data.message || `Session request failed: ${response.status}`);
  }
  return data as T;
}

type SessionResponse = {
  success: true;
  data: { user_id: string; created_at?: string };
};

export function createAnonymousSession() {
  return sessionRequest<SessionResponse>("/anonymous", {
    method: "POST", body: "{}",
  });
}

export function getAnonymousSession() {
  return sessionRequest<SessionResponse>("/me");
}

export function logoutAnonymousSession() {
  return sessionRequest<{ success: true }>("/logout", {
    method: "POST", body: "{}",
  });
}
