import { getAccessToken, runRefresh } from "../auth/token-store";
import type { ApiEnvelope, ApiList, ApiListMeta } from "./types";

const API_BASE = process.env.EXPO_PUBLIC_GADA_API_BASE;

if (!API_BASE) {
  // Public, non-secret config — failing loudly here beats opaque network errors.
  console.warn(
    "[api] EXPO_PUBLIC_GADA_API_BASE is not set. Check your .env and restart the dev server.",
  );
}

/** A typed error thrown for any non-2xx response or `success: false` envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON-serialisable body; sets Content-Type and defaults method to POST. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Do not attach the Authorization header (used for auth endpoints). */
  skipAuth?: boolean;
  /** Do not attempt a refresh-and-retry on 401 (used by the refresh call itself). */
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = (API_BASE ?? "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON body (e.g. an HTML gateway error) — surface as raw text.
    return { success: false, error: { code: "NON_JSON_RESPONSE", message: text } };
  }
}

/**
 * Performs the request, transparently refreshing the access token and retrying
 * ONCE on a 401. `isRetry` guards against an infinite refresh loop.
 */
async function requestEnvelope<T>(
  path: string,
  opts: ApiOptions,
  isRetry: boolean,
): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  };

  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  if (!opts.skipAuth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body,
    signal: opts.signal,
  });

  // refresh-on-401: single retry. refreshSession() is single-flight, so
  // concurrent 401s trigger only one network refresh.
  if (res.status === 401 && !opts.skipAuthRefresh && !isRetry) {
    const newToken = await runRefresh();
    if (newToken) {
      return requestEnvelope<T>(path, opts, true);
    }
  }

  const json = (await parseBody(res)) as ApiEnvelope<T> | null;

  if (!res.ok || json?.success === false) {
    const code = json?.error?.code ?? `HTTP_${res.status}`;
    const message = json?.error?.message ?? res.statusText ?? "Request failed";
    throw new ApiError(res.status, code, message, json?.error?.details);
  }

  // A 2xx with no parseable envelope still resolves (e.g. 204 No Content).
  return (json ?? ({ success: true, data: null as T } as ApiEnvelope<T>)) as ApiEnvelope<T>;
}

/** Fetch a single resource; unwraps the `{ success, data }` envelope to `data`. */
export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const env = await requestEnvelope<T>(path, opts, false);
  return env.data;
}

/**
 * Fetch a list endpoint, returning `{ items, meta }`. Tolerates every shape the
 * API uses: `data: [...]` with a sibling `meta`; `data: { items, meta }`; and
 * `data: { data: [...], hasMore, ... }` (the production chat/paginated shape,
 * where the array is DOUBLE-wrapped under `data.data`).
 */
export async function apiList<T>(path: string, opts: ApiOptions = {}): Promise<ApiList<T>> {
  const env = await requestEnvelope<unknown>(path, opts, false);
  const data = env.data as unknown;

  // 1. `data` is already the array (with an optional sibling meta on the envelope).
  if (Array.isArray(data)) {
    return { items: data as T[], meta: env.meta ?? null };
  }

  // Otherwise `data` is a container object. The array may live under `.data`
  // (chat: { data: [...], hasMore }) or `.items` — check `.data` first.
  const obj = (data ?? {}) as {
    data?: unknown;
    items?: unknown;
    meta?: ApiListMeta;
    hasMore?: boolean;
    nextCursor?: string | null;
  };

  const items = Array.isArray(obj.data)
    ? (obj.data as T[])
    : Array.isArray(obj.items)
      ? (obj.items as T[])
      : [];

  // Preserve pagination hints wherever they live so callers aren't left blind:
  // an explicit `meta`, else inner `hasMore`/`nextCursor`, else the envelope meta.
  const meta: ApiListMeta | null =
    obj.meta ??
    (obj.hasMore !== undefined || obj.nextCursor !== undefined
      ? { hasMore: obj.hasMore, nextCursor: obj.nextCursor ?? null }
      : (env.meta ?? null));

  return { items, meta };
}
