// Realtime stub. There is no socket yet (the auth scheme is undocumented) and
// chat has GET history + polls only — NO send-message endpoint. All real-time
// behaviour is funnelled through here so it can be swapped for sockets later
// without touching screens. Do not fake send/receive until the API exists.

export const realtime = {
  enabled: false as const,
};
