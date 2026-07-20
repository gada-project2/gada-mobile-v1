// Core API types — mirror the gada v1 API (web app is the contract reference).
// The API wraps every response in a { success, data } envelope; list endpoints add `meta`.

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: ApiListMeta;
  error?: ApiErrorBody;
}

export interface ApiListMeta {
  total?: number;
  page?: number;
  /** gadarings list uses `perPage`; older endpoints may use `pageSize`. */
  perPage?: number;
  pageSize?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface ApiList<T> {
  items: T[];
  meta: ApiListMeta | null;
}

// --- Auth -------------------------------------------------------------------

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Capability model (production): every account can attend; hosting/vendor/
// volunteer are flat booleans on the user object (GET /auth/me -> data.user).
// There is no role choice at signup; `canConvene` unlocks via NIN verification.
export interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  photoKey?: string | null;
  phone?: string | null;
  bio?: string | null;
  interests?: string[];
  language?: string;
  theme?: string;
  /** Informational only ("USER"); do NOT gate capabilities on this. */
  role?: string;
  // Flat capability booleans from data.user.
  canConvene?: boolean;
  isVendor?: boolean;
  isVolunteer?: boolean;
  ninVerified?: boolean;
  /** From the /auth/me `capabilities` wrapper — true until NIN-verified to host. */
  requiresVerification?: boolean;
  status?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}

// POST /users/me/convener/verify — NIN (11 digits) + DOB unlocks hosting.
export interface ConvenerVerifyResponse {
  canConvene: boolean;
  message: string;
}

// PATCH /users/me. NOTE: biometricsEnabled exists on the API DTO but is a device
// concern — omitted until expo-local-authentication app-unlock is built. TODO.
export interface UpdateProfileDto {
  displayName?: string;
  /** null clears the avatar (removal). */
  photoKey?: string | null;
  interests?: string[];
  language?: string;
  theme?: string;
}

// GET/PUT /users/me/volunteer-profile (null until created).
export interface VolunteerProfile {
  id?: string;
  skills?: string[];
  availability?: string;
  bio?: string;
  marketingConsent?: boolean;
  functionalConsent?: boolean;
  createdAt?: string;
}
export interface UpdateVolunteerProfileDto {
  skills?: string[];
  availability?: string;
  bio?: string;
  marketingConsent?: boolean;
  functionalConsent?: boolean;
}

// GET/PATCH /users/me/privacy. Transactional messages always send; these govern
// marketing + analytics only.
export interface PrivacySettings {
  marketingConsent?: boolean;
  functionalConsent?: boolean;
}
export type UpdatePrivacyDto = PrivacySettings;

// GET /notifications. Item shape isn't expanded in docs-json — read defensively.
export interface AppNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
  isRead?: boolean;
  data?: Record<string, unknown>;
  createdAt?: string;
}

// --- Gadarings (events) -----------------------------------------------------
// Shapes confirmed against /v1/gadarings in docs-json. Several fields the spec
// marks optional are typed optional and read defensively in the UI.

// Known categories for pickers/labels; `(string & {})` tolerates any value the
// production taxonomy returns (e.g. BUSINESS, TECH) without breaking types.
export type Category =
  | "CONCERT"
  | "CONFERENCE"
  | "PARTY"
  | "MEETING"
  | "VOLUNTEERING"
  | "OTHER"
  | (string & {});

// Lifecycle status on the object (production enum).
export type GadaringStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "CANCELLED"
  | "COMPLETED";

export interface Gadaring {
  id: string;
  gadaringRingId?: string;
  name: string;
  description?: string;
  category: Category | (string & {});
  status: GadaringStatus | (string & {});
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  venue?: string;
  latitude?: number;
  longitude?: number;
  /** May be a full URL or an R2 storage key — the UI only renders it when it's a URL. */
  bannerKey?: string | null;
  photoKey?: string | null;
  isPrivate?: boolean;
  isFree?: boolean;
  lowestPriceKobo?: number;
  maxAttendees?: number | null;
  additionalInfo?: string | null;
  ticketsSold?: number;
  checkedInCount?: number;
  /** Present when the event is accepting volunteers; null/absent otherwise. */
  volunteerConfig?: VolunteerConfig | null;
  /** The current user's purchase for this event, if any (inline on the detail response). */
  myPurchase?: MyPurchase | null;
  createdAt?: string;
  adminStatus?: "PENDING" | "APPROVED" | "REJECTED" | (string & {});
}

/** The current user's purchase, embedded on the event detail response. */
export interface MyPurchase {
  id: string;
  status?: PurchaseStatus;
  quantity?: number;
  totalKobo?: number;
  qrToken?: string;
  checkedInAt?: string | null;
  ticketTierId?: string;
  createdAt?: string;
}

export type TicketType = "REGULAR" | "VIP" | "TABLE" | (string & {});

export interface Ticket {
  id: string;
  name: string;
  priceKobo: number;
  priceNaira?: number;
  /** null quantity = unlimited. `sold` is issued count; remaining = quantity - sold. */
  quantity?: number | null;
  sold?: number;
  isActive?: boolean;
  type?: TicketType;
  perks?: string[];
  description?: string;
}

export interface PingPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  description?: string;
  icon?: string | null;
}

// Read model field names aren't expanded in docs-json; the create DTO uses
// roleName/numberNeeded/skillsRequired, so we accept those and tolerate legacy
// aliases. Read via the helpers in src/lib/volunteer-display.ts.
export interface VolunteerRole {
  id: string;
  roleName?: string;
  title?: string;
  numberNeeded?: number;
  slots?: number;
  skillsRequired?: string[];
  requiredSkills?: string[];
  ageRange?: string;
  genderPreference?: string;
  experienceLevel?: string;
  benefits?: string;
  description?: string;
  createdAt?: string;
}

// POST /gadarings/{id}/volunteer-config/roles
export interface CreateVolunteerRoleDto {
  roleName: string;
  numberNeeded: number;
  skillsRequired?: string[];
  ageRange?: string;
  genderPreference?: string;
  experienceLevel?: string;
  benefits?: string;
}
export type UpdateVolunteerRoleDto = Partial<CreateVolunteerRoleDto>;

// POST /gadarings/{id}/volunteers/apply
export interface ApplyVolunteerDto {
  volunteerRoleId: string;
  skills: string[];
  ageRange?: string;
  gender?: string;
  experienceLevel?: string;
}

// PATCH .../applications/{appId}
export type ReviewAction = "approve" | "reject";
export interface ReviewApplicationDto {
  action: ReviewAction;
}

// GET /volunteers/my-applications — the current user's volunteer applications.
// The item schema isn't expanded in docs-json, so the event link is read
// defensively (flat `gadaringId` or a nested `gadaring`), like Purchase.
export type VolunteerApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "WITHDRAWN"
  | (string & {});

export interface VolunteerApplication {
  id: string;
  status?: VolunteerApplicationStatus;
  gadaringId?: string;
  gadaring?: Partial<Gadaring>;
  volunteerRoleId?: string;
  roleTitle?: string;
  roleName?: string;
  volunteerRole?: Partial<VolunteerRole>;
  // Applicant (convener view; shapes vary, read defensively).
  userId?: string;
  applicantId?: string;
  applicantName?: string;
  user?: { id?: string; name?: string; displayName?: string; email?: string };
  skills?: string[];
  ageRange?: string;
  gender?: string;
  experienceLevel?: string;
  createdAt?: string;
}

export interface VolunteerConfig {
  id: string;
  gadaringId: string;
  enabled: boolean;
  roles?: VolunteerRole[];
}

// GET /gadarings/{id}/volunteer-config returns { volunteerConfig, roles }.
export interface VolunteerConfigResponse {
  volunteerConfig: VolunteerConfig | null;
  roles: VolunteerRole[];
}

// --- Circles ----------------------------------------------------------------
// Membership + detail only (chat is a later phase). Confirmed against docs-json:
// CreateCircleDto permission flags + AddMemberDto.userId.

export interface Circle {
  id: string;
  name: string;
  photoKey?: string | null;
  ownerId?: string;
  convenerId?: string;
  memberCount?: number;
  /** The current user's role in the circle if the API provides it. */
  myRole?: string;
  membersCanSend?: boolean;
  membersCanViewDetails?: boolean;
  membersCanInvite?: boolean;
  convenerApproveMembers?: boolean;
  createdAt?: string;
}

export interface CircleMember {
  id?: string;
  userId: string;
  name?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string | null;
  /** owner / admin / member, etc. */
  role?: string;
  status?: string;
  joinedAt?: string;
}

// GET /circles/{id} returns { circle, members[] }.
export interface CircleDetail {
  circle: Circle;
  members: CircleMember[];
}

// GET /circles/{id}/media — each item has mediaKey, type, senderName, sentAt.
export interface CircleMedia {
  id?: string;
  mediaKey: string;
  type?: string;
  senderName?: string;
  sentAt?: string;
}

export interface CreateCircleDto {
  name: string;
  photoKey?: string;
  memberIds?: string[];
  membersCanSend?: boolean;
  membersCanViewDetails?: boolean;
  membersCanInvite?: boolean;
  convenerApproveMembers?: boolean;
}
export type UpdateCircleDto = Partial<Omit<CreateCircleDto, "memberIds">>;

export interface AddMemberDto {
  userId: string;
}

// --- Chat (READ-ONLY history + polls) ---------------------------------------
// There is NO send-message endpoint, so the composer is always disabled. Message
// shapes aren't expanded in docs-json — read defensively via chat-display.ts.

export interface ChatMessage {
  id: string;
  type?: string;
  body?: string;
  text?: string;
  content?: string;
  message?: string;
  senderId?: string;
  userId?: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  poll?: Poll;
  createdAt?: string;
  sentAt?: string;
}

export interface DirectThread {
  userId: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface PollOption {
  id: string;
  text?: string;
  label?: string;
  votes?: number;
  count?: number;
}

export interface Poll {
  id: string;
  question: string;
  allowMultiple?: boolean;
  options: PollOption[];
  totalVotes?: number;
  /** option ids the current user picked, if the API returns it */
  myResponse?: string[];
  createdAt?: string;
}

export interface PollResults {
  id?: string;
  pollId?: string;
  question?: string;
  options: PollOption[];
  totalVotes?: number;
}

// POST /events/:id/chat · /circles/:id/messages · /chat/direct/:userId
export interface SendMessageDto {
  content?: string;
  type?: "TEXT" | "IMAGE" | "POLL";
  mediaKey?: string;
}

// POST /circles/{id}/polls and /gadarings/{id}/chat/polls
export interface CreatePollDto {
  question: string;
  options: string[];
  allowMultiple?: boolean;
}
// POST /polls/{id}/respond
export interface RespondPollDto {
  selectedOptions: string[];
}

// --- Safety: ICE live-location + Find Me -------------------------------------
// CONSENT (confirmed in docs-json): GET /map/ice-location/{userId} succeeds ONLY
// when (1) the target enabled sharing AND (2) the requester is in the target's
// ICE contact list. It is NOT an open viewer.

export interface UpdateLocationDto {
  sharingEnabled: boolean;
  latitude?: number;
  longitude?: number;
}

export interface IceLocation {
  userId?: string;
  sharingEnabled: boolean;
  latitude?: number | null;
  longitude?: number | null;
  updatedAt?: string;
}

export type FindMeAction = "accept" | "reject";

export interface SendFindMeDto {
  receiverId: string;
  gadaringId?: string;
}
export interface RespondFindMeDto {
  action: FindMeAction;
}

export interface FindMeRequest {
  id: string;
  status?: string;
  senderId?: string;
  sender?: { id?: string; name?: string; displayName?: string; avatarUrl?: string | null };
  gadaringId?: string;
  gadaring?: Partial<Gadaring>;
  createdAt?: string;
}

// ICE (In Case of Emergency) contacts — name/phone based (NOT app user ids).
export interface IceContact {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  userId?: string;
  createdAt?: string;
}
export interface CreateIceContactDto {
  name: string;
  phoneNumber: string;
  email?: string;
}

// --- Tickets & payments -----------------------------------------------------
// Some fields are inferred from docs-json (the Purchase schema isn't fully
// expanded there), so QR + event fields are typed defensively and read via the
// helpers in src/lib/ticket-display.ts.

export type PurchaseStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CHECKED_IN"
  | "CANCELLED"
  | (string & {});

/** A purchased ticket. The signed QR is whatever the API returns — we render it, never generate it. */
export interface Purchase {
  id: string;
  purchaseId?: string;
  status?: PurchaseStatus;
  quantity?: number;
  checkedIn?: boolean;
  checkedInAt?: string | null;
  createdAt?: string;

  // Ticket tier (may be flat or nested depending on endpoint).
  ticketId?: string;
  ticketTierId?: string;
  ticketName?: string;
  ticketType?: string;
  amountKobo?: number;
  priceKobo?: number;

  // Holder (shown at check-in).
  holderName?: string;
  attendeeName?: string;

  // Event association — may be flat fields or a nested `gadaring`.
  gadaringId?: string;
  gadaring?: Partial<Gadaring>;
  name?: string;
  startDate?: string;
  venue?: string;

  // Signed QR — one of these will be present (image data-URL/URL, or a JWT token).
  qr?: string;
  qrCode?: string;
  qrToken?: string;
  qrImage?: string;
  qrImageUrl?: string;
  qrUrl?: string;
}

/** Response from initiating a paid purchase. */
export interface PaidInitResponse {
  paymentUrl: string;
  reference: string;
  paymentId?: string;
  provider?: string;
  amountKobo?: number;
}

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

/** Response from GET /payments/verify/{reference}. NOTE: carries no purchaseId. */
export interface PaymentVerification {
  id?: string;
  reference: string;
  provider?: string;
  amountKobo?: number;
  status: PaymentStatus;
  gadaringId?: string;
  paidAt?: string;
}

/** A row from GET /payments/history. */
export interface PaymentRecord {
  id: string;
  reference: string;
  amountKobo: number;
  currency?: string;
  status: PaymentStatus;
  provider?: string;
  gadaringId?: string;
  gadaringTitle?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  paidAt?: string;
}

// --- Create & manage (convener) DTOs ---------------------------------------
// Field names mirror the production read model. `maxAttendees` matches the read
// shape (was `capacity`); `dressCode` is inferred (sent only when provided;
// APIs with whitelist:true strip unknown fields rather than rejecting).

export interface CreateGadaringDto {
  name: string;
  description: string;
  category: Category;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  venue: string;
  latitude: number;
  longitude: number;
  isPrivate?: boolean;
  maxAttendees?: number;
  dressCode?: string;
  additionalInfo?: string;
  /** R2 key for the event banner. null (on update) clears it. */
  bannerKey?: string | null;
}

// PATCH /gadarings/{id} — all fields optional.
export type UpdateGadaringDto = Partial<CreateGadaringDto>;

// POST /events/{id}/repeat — clone with at least new dates.
export interface RepeatGadaringDto {
  startDate: string;
  endDate: string;
}

export interface CreateTicketDto {
  name: string;
  priceKobo: number; // 0 = free
  type: TicketType;
  quantity: number;
  perks?: string[];
  description?: string;
}

export type UpdateTicketDto = Partial<CreateTicketDto>;

// Read model uses `label`; the create DTO mirrors it (write-side unverified —
// blocked by the convener guard, but aligned with the confirmed read shape).
export interface CreatePingPointDto {
  label: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface Assignee {
  id: string;
  userId?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  createdAt?: string;
}

export interface CreateAssigneeDto {
  userId?: string;
  email?: string;
  role?: string;
}
