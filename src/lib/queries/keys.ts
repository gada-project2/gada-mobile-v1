import type { DiscoverFilters } from "../api/gadarings";
import type { MyGadaringsFilters } from "../api/manage";
import type { MyTicketsTab } from "../api/tickets";

// Centralised query keys so invalidation/caching stays consistent.
export const gadaringKeys = {
  all: ["gadarings"] as const,
  list: (filters: Omit<DiscoverFilters, "page">) =>
    ["gadarings", "list", filters] as const,
  map: (filters: Omit<DiscoverFilters, "page">) =>
    ["gadarings", "map", filters] as const,
  calendar: (range: { dateFrom: string; dateTo: string }) =>
    ["gadarings", "calendar", range] as const,
  trending: (filters: DiscoverFilters) =>
    ["gadarings", "trending", filters] as const,
  sponsored: (filters: DiscoverFilters) =>
    ["gadarings", "sponsored", filters] as const,
  detail: (id: string) => ["gadarings", "detail", id] as const,
  interest: (id: string) => ["gadarings", id, "interest"] as const,
  tickets: (id: string) => ["gadarings", id, "tickets"] as const,
  volunteerConfig: (id: string) => ["gadarings", id, "volunteer-config"] as const,
  pingPoints: (id: string) => ["gadarings", id, "ping-points"] as const,
};

// Convener: my events + assignees.
export const manageKeys = {
  all: ["manage"] as const,
  myGadarings: (filters: MyGadaringsFilters) => ["manage", "my", filters] as const,
  assignees: (gadaringId: string) => ["manage", "assignees", gadaringId] as const,
};

// Volunteering.
export const volunteerKeys = {
  all: ["volunteers"] as const,
  config: (gadaringId: string) => ["volunteers", "config", gadaringId] as const,
  applications: (gadaringId: string) => ["volunteers", "applications", gadaringId] as const,
  myApplications: () => ["volunteers", "my-applications"] as const,
};

// Circles.
export const circleKeys = {
  all: ["circles"] as const,
  list: () => ["circles", "list"] as const,
  detail: (id: string) => ["circles", "detail", id] as const,
  media: (id: string) => ["circles", id, "media"] as const,
};

// Chat (read-only history + polls).
export const chatKeys = {
  all: ["chat"] as const,
  directThreads: () => ["chat", "direct"] as const,
  messages: (kind: string, id: string) => ["chat", "messages", kind, id] as const,
  pollResults: (pollId: string) => ["chat", "poll", pollId] as const,
};

// Safety: ICE live-location + Find Me + ICE contacts.
export const safetyKeys = {
  all: ["safety"] as const,
  iceLocation: (userId: string) => ["safety", "ice-location", userId] as const,
  findMeIncoming: () => ["safety", "find-me", "incoming"] as const,
  iceContacts: () => ["safety", "ice-contacts"] as const,
};

// Account: volunteer profile + privacy.
export const accountKeys = {
  all: ["account"] as const,
  volunteerProfile: () => ["account", "volunteer-profile"] as const,
  privacy: () => ["account", "privacy"] as const,
};

// Notifications (in-app).
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (read?: boolean) => ["notifications", "list", read ?? "all"] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

// Purchased tickets + payments.
export const ticketKeys = {
  all: ["tickets"] as const,
  my: (tab: MyTicketsTab) => ["tickets", "my", tab] as const,
  detail: (purchaseId: string) => ["tickets", "detail", purchaseId] as const,
  paymentHistory: () => ["payments", "history"] as const,
};
