// In-memory access token + a registered refresh handler.
//
// This exists as a standalone module so the API client can read the access
// token AND trigger a refresh WITHOUT importing session.ts — which imports the
// client. That mutual import was a require cycle (Metro warns about it):
//     api/client.ts  ->  auth/session.ts  ->  api/client.ts
// The client now depends only on this leaf module; session.ts registers its
// refresh function here at load. No cycle.
//
// Security model unchanged: the access token lives in memory ONLY, never
// persisted, never logged (see CLAUDE.md / session.ts).

let accessToken: string | null = null;

/** The in-memory access token, or null. Read by the API client per request. */
export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

/** session.ts registers its `refreshSession` here at module load. */
export function setRefreshHandler(fn: RefreshHandler | null): void {
  refreshHandler = fn;
}

/**
 * Trigger the registered session refresh (used by the client's 401 retry).
 * Resolves null if no handler is registered yet or the refresh fails.
 */
export function runRefresh(): Promise<string | null> {
  return refreshHandler ? refreshHandler() : Promise.resolve(null);
}
