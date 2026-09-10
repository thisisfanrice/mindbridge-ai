const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" && input.startsWith("/api/")
    ? `${API_URL}${input}` : input;
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await globalThis.fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("mindbridge:session-expired"));
  }
  return response;
}
