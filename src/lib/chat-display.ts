import type { ChatMessage, DirectThread, PollOption } from "./api/types";

/** Message text (field name varies across endpoints). */
export function messageText(m: ChatMessage): string {
  return m.body ?? m.text ?? m.content ?? m.message ?? "";
}

export function messageSenderId(m: ChatMessage): string | undefined {
  return m.senderId ?? m.userId;
}

export function messageTime(m: ChatMessage): string | undefined {
  return m.createdAt ?? m.sentAt;
}

export function threadName(t: DirectThread): string {
  return t.displayName ?? t.name ?? t.userId;
}

/**
 * DM thread preview text. The threads endpoint returns `lastMessage` as EITHER
 * a plain string OR a full message OBJECT (id, content, type, pollId, ...), so
 * we must render a string, never the object (that crash is "Objects are not
 * valid as a React child"). Type-aware fallback mirrors the message list.
 */
export function threadPreview(t: DirectThread): string | undefined {
  const lm = t.lastMessage;
  if (lm == null) return undefined;
  if (typeof lm === "string") return lm || undefined;
  const m = lm as ChatMessage & { pollId?: string | null };
  if (m.type === "IMAGE") return "📷 Photo";
  if (m.type === "POLL" || m.poll || m.pollId) return "📊 Poll";
  return messageText(m) || undefined;
}

export function optionLabel(o: PollOption): string {
  return o.text ?? o.label ?? "Option";
}

export function optionVotes(o: PollOption): number {
  return o.votes ?? o.count ?? 0;
}
