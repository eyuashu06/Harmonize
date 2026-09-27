// Centralized API client. All requests go through here so we can attach the
// auth token, surface typed errors, and configure the base URL in one place.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type FetchOptions = RequestInit & { json?: unknown; authToken?: string | null };

export async function apiFetch<T = unknown>(
  path: string,
  { json, authToken, headers, ...init }: FetchOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (authToken) {
    finalHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : init.body,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const code = (data as { code?: string })?.code ?? "unknown_error";
    const message = (data as { message?: string })?.message ?? `Request failed: ${res.status}`;
    const details = (data as { details?: unknown })?.details;
    throw new ApiError(res.status, code, message, details);
  }
  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, init?: FetchOptions) => apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, json?: unknown, init?: FetchOptions) =>
    apiFetch<T>(path, { ...init, method: "POST", json }),
  patch: <T>(path: string, json?: unknown, init?: FetchOptions) =>
    apiFetch<T>(path, { ...init, method: "PATCH", json }),
  put: <T>(path: string, json?: unknown, init?: FetchOptions) =>
    apiFetch<T>(path, { ...init, method: "PUT", json }),
  delete: <T>(path: string, init?: FetchOptions) => apiFetch<T>(path, { ...init, method: "DELETE" }),
};

export { API_URL };
