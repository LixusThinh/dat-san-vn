import type {
  ApiResponse,
  BookingStatus,
  CreateFieldPayload,
  CreateVenuePayload,
  FieldSize,
  SportType,
  UpdateFieldPayload,
  UpdateVenuePayload,
  UserRole,
  VenueOwnerStatus,
} from "@dat-san-vn/types";
import {
  combineDateAndTime,
  formatDateLabel,
  formatTimeRange,
  isMoreThanHoursAway,
  toNumber,
} from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

type ApiEnvelope<T> = ApiResponse<T> | T;

interface CurrentUserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

interface RawManagedBooking {
  id: string;
  status: BookingStatus;
  totalPrice: number | string;
  createdAt: string;
  user?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  venue: {
    id: string;
    name: string;
    address: string;
    isActive?: boolean;
  };
  bookingSlots: Array<{
    venueSlot: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      pricePerSlot?: number | string;
      field?: {
        id: string;
        name: string;
        sportType: SportType;
        size: FieldSize;
      } | null;
    };
  }>;
}

interface RawOwnerVenue {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  district: string;
  city: string;
  isActive: boolean;
  fields: Array<{
    id: string;
    name: string;
    sportType: SportType;
    size: FieldSize;
    isActive?: boolean;
  }>;
  owners?: Array<{
    status: VenueOwnerStatus;
  }>;
  _count?: {
    fields?: number;
    bookings?: number;
  };
}

interface RawOwnerField {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  size: FieldSize;
  isActive: boolean;
  _count?: {
    slots?: number;
  };
}

export type OwnerBookingStatusFilter = "ALL" | BookingStatus;

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface OwnerBooking {
  id: string;
  status: BookingStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  venueId: string;
  venueName: string;
  venueAddress: string;
  fieldId: string | null;
  fieldName: string;
  sportType: SportType | null;
  size: FieldSize | null;
  bookingDate: string;
  bookingTime: string;
  createdAt: string;
  totalPrice: number;
  startsAt: string | null;
  canOwnerCancel: boolean;
}

export interface OwnerVenue {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  district: string;
  city: string;
  isActive: boolean;
  ownerStatus: VenueOwnerStatus;
  fields: Array<{
    id: string;
    name: string;
    sportType: SportType;
    size: FieldSize;
  }>;
  fieldCount: number;
  bookingCount: number;
}

export interface OwnerField {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  size: FieldSize;
  isActive: boolean;
  slotCount: number;
}

interface RequestApiOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
}

function unwrapApiResponse<T>(payload: ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    "statusCode" in payload
  ) {
    return payload.data as T;
  }

  return payload as T;
}

async function requestApi<T>(path: string, { token, body, headers, ...init }: RequestApiOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const errorPayload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorPayload.message)) {
        message = errorPayload.message.join(", ");
      } else if (typeof errorPayload.message === "string") {
        message = errorPayload.message;
      }
    } catch {
      // Ignore JSON parsing errors and use the fallback status message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return unwrapApiResponse(payload);
}

function mapManagedBooking(booking: RawManagedBooking): OwnerBooking {
  const firstSlot = booking.bookingSlots[0]?.venueSlot;
  const startsAt = firstSlot ? combineDateAndTime(firstSlot.date, firstSlot.startTime) : null;

  return {
    id: booking.id,
    status: booking.status,
    customerName: booking.user?.fullName?.trim() || booking.user?.email || "Khách chưa xác định",
    customerEmail: booking.user?.email ?? "Không có email",
    customerPhone: booking.user?.phone ?? null,
    venueId: booking.venue.id,
    venueName: booking.venue.name,
    venueAddress: booking.venue.address,
    fieldId: firstSlot?.field?.id ?? null,
    fieldName: firstSlot?.field?.name ?? "Chưa có sân con",
    sportType: firstSlot?.field?.sportType ?? null,
    size: firstSlot?.field?.size ?? null,
    bookingDate: firstSlot ? formatDateLabel(firstSlot.date) : "Chưa có ngày",
    bookingTime: firstSlot ? formatTimeRange(firstSlot.startTime, firstSlot.endTime) : "Chưa có giờ",
    createdAt: booking.createdAt,
    totalPrice: toNumber(booking.totalPrice),
    startsAt,
    canOwnerCancel: booking.status === "CONFIRMED" && startsAt ? isMoreThanHoursAway(startsAt, 24) : false,
  };
}

function mapOwnerVenue(venue: RawOwnerVenue): OwnerVenue {
  return {
    id: venue.id,
    name: venue.name,
    description: venue.description ?? null,
    address: venue.address,
    district: venue.district,
    city: venue.city,
    isActive: venue.isActive,
    ownerStatus: venue.owners?.[0]?.status ?? "PENDING",
    fields: venue.fields.map((field) => ({
      id: field.id,
      name: field.name,
      sportType: field.sportType,
      size: field.size,
    })),
    fieldCount: venue._count?.fields ?? venue.fields.length,
    bookingCount: venue._count?.bookings ?? 0,
  };
}

function mapOwnerField(field: RawOwnerField): OwnerField {
  return {
    id: field.id,
    venueId: field.venueId,
    name: field.name,
    sportType: field.sportType,
    size: field.size,
    isActive: field.isActive,
    slotCount: field._count?.slots ?? 0,
  };
}

export async function getCurrentUserProfile(token: string) {
  const profile = await requestApi<CurrentUserProfileResponse>("/users/me", { token });
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role,
  } satisfies CurrentUserProfile;
}

export async function getOwnerBookings(
  token: string,
  filters: {
    status?: OwnerBookingStatusFilter;
    date?: string;
  } = {},
) {
  const searchParams = new URLSearchParams();

  if (filters.status && filters.status !== "ALL") {
    searchParams.set("status", filters.status);
  }

  if (filters.date) {
    searchParams.set("date", filters.date);
  }

  const query = searchParams.toString();
  const bookings = await requestApi<RawManagedBooking[]>(`/bookings${query ? `?${query}` : ""}`, { token });
  return bookings.map(mapManagedBooking);
}

export function confirmOwnerBooking(token: string, bookingId: string) {
  return requestApi(`/bookings/${bookingId}/confirm`, {
    token,
    method: "PATCH",
  });
}

export function cancelOwnerBooking(token: string, bookingId: string) {
  return requestApi(`/bookings/${bookingId}/cancel`, {
    token,
    method: "PATCH",
  });
}

export async function getOwnerVenues(token: string) {
  const venues = await requestApi<RawOwnerVenue[]>("/venues/my", { token });
  return venues.map(mapOwnerVenue);
}

export function createOwnerVenue(token: string, payload: CreateVenuePayload) {
  return requestApi("/venues", {
    token,
    method: "POST",
    body: payload,
  });
}

export function updateOwnerVenue(token: string, venueId: string, payload: UpdateVenuePayload) {
  return requestApi(`/venues/${venueId}`, {
    token,
    method: "PATCH",
    body: payload,
  });
}

export async function getVenueFields(token: string, venueId: string) {
  const fields = await requestApi<RawOwnerField[]>(`/venues/${venueId}/fields`, { token });
  return fields.map(mapOwnerField);
}

export function createVenueField(token: string, venueId: string, payload: CreateFieldPayload) {
  return requestApi(`/venues/${venueId}/fields`, {
    token,
    method: "POST",
    body: payload,
  });
}

export function updateVenueField(token: string, fieldId: string, payload: UpdateFieldPayload) {
  return requestApi(`/fields/${fieldId}`, {
    token,
    method: "PATCH",
    body: payload,
  });
}

export function deleteVenueField(token: string, fieldId: string) {
  return requestApi(`/fields/${fieldId}`, {
    token,
    method: "DELETE",
  });
}
