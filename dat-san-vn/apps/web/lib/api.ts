import type { ApiResponse } from "@dat-san-vn/types";
import {
  bookingItems,
  featuredVenues,
  filterVenues,
  type VenueDetail,
  type VenueSearchFilters,
  toVenueSummary,
  venueDetails,
} from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

async function fetchApi<T>(
  path: string,
  fallbackData: T,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return (await response.json()) as ApiResponse<T>;
  } catch {
    // Comment tiếng Việt:
    // Giai đoạn foundation cần render ổn kể cả khi API local chưa chạy.
    // Vì vậy mình giữ contract ApiResponse nhưng fallback sang mock data để đội FE tiếp tục build UI.
    return {
      data: fallbackData,
      message: "Đang dùng mock data trong giai đoạn frontend core.",
      statusCode: 200,
    };
  }
}

export async function getFeaturedVenues() {
  const response = await fetchApi("/venues/featured", featuredVenues.map(toVenueSummary));
  return response.data;
}

export async function searchVenues(filters: VenueSearchFilters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.district && filters.district !== "ALL") params.set("district", filters.district);
  if (filters.size && filters.size !== "ALL") params.set("size", filters.size);
  if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
  if (filters.startTime) params.set("startTime", filters.startTime);

  const fallback = filterVenues(filters).map(toVenueSummary);
  const query = params.toString();
  const response = await fetchApi(`/venues${query ? `?${query}` : ""}`, fallback);
  return response.data;
}

export async function getVenueDetail(id: string): Promise<VenueDetail | null> {
  const fallback = venueDetails.find((venue) => venue.id === id) ?? null;
  const response = await fetchApi(`/venues/${id}`, fallback);
  return response.data;
}

export async function getMyBookings() {
  const response = await fetchApi("/bookings/me", bookingItems);
  return response.data;
}
