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

export function optionLabel(o: PollOption): string {
  return o.text ?? o.label ?? "Option";
}

export function optionVotes(o: PollOption): number {
  return o.votes ?? o.count ?? 0;
}
