import { apiFetch, apiList } from "./client";
import type {
  ApiList,
  ChatMessage,
  CreatePollDto,
  DirectThread,
  Poll,
  PollResults,
  RespondPollDto,
  SendMessageDto,
} from "./types";

const PER_PAGE = 50;

function pageQuery(page: number): string {
  return `?page=${page}&perPage=${PER_PAGE}`;
}

/** GET /chat/direct -> the user's DM threads. */
export function getDirectThreads(): Promise<DirectThread[]> {
  return apiFetch<DirectThread[]>(`/chat/direct`);
}

/** GET /chat/direct/{userId} -> DM history (paginated, newest first). */
export function getDirectMessages(userId: string, page = 1): Promise<ApiList<ChatMessage>> {
  return apiList<ChatMessage>(`/chat/direct/${userId}${pageQuery(page)}`);
}

/** GET /circles/{id}/messages -> circle chat history (paginated). */
export function getCircleMessages(circleId: string, page = 1): Promise<ApiList<ChatMessage>> {
  return apiList<ChatMessage>(`/circles/${circleId}/messages${pageQuery(page)}`);
}

/** GET /events/{id}/chat -> event chat history (paginated). */
export function getEventMessages(gadaringId: string, page = 1): Promise<ApiList<ChatMessage>> {
  return apiList<ChatMessage>(`/events/${gadaringId}/chat${pageQuery(page)}`);
}

// --- Send (returns the created message) -------------------------------------

/** POST /events/{id}/chat -> send an event chat message. */
export function sendEventMessage(gadaringId: string, dto: SendMessageDto): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/events/${gadaringId}/chat`, { method: "POST", body: dto });
}

/** POST /circles/{id}/messages -> send a circle chat message. */
export function sendCircleMessage(circleId: string, dto: SendMessageDto): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/circles/${circleId}/messages`, { method: "POST", body: dto });
}

/** POST /chat/direct/{userId} -> send a direct message. */
export function sendDirectMessage(userId: string, dto: SendMessageDto): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/chat/direct/${userId}`, { method: "POST", body: dto });
}

// --- Polls ------------------------------------------------------------------

export function createCirclePoll(circleId: string, dto: CreatePollDto): Promise<Poll> {
  return apiFetch<Poll>(`/circles/${circleId}/polls`, { method: "POST", body: dto });
}

export function createEventPoll(gadaringId: string, dto: CreatePollDto): Promise<Poll> {
  return apiFetch<Poll>(`/events/${gadaringId}/chat/polls`, { method: "POST", body: dto });
}

export function respondToPoll(pollId: string, dto: RespondPollDto): Promise<Poll> {
  return apiFetch<Poll>(`/polls/${pollId}/respond`, { method: "POST", body: dto });
}

export function getPollResults(pollId: string): Promise<PollResults> {
  return apiFetch<PollResults>(`/polls/${pollId}/results`);
}
