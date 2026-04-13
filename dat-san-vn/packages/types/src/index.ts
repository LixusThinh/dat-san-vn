// ============================================================
// DatSanVN — Shared TypeScript Types (FE ↔ BE)
// Phải đồng bộ với Prisma schema enums
// ============================================================

// --- Enums (mirror từ Prisma) ---

export type Role = 'USER' | 'OWNER' | 'ADMIN';

export type OwnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type SportType =
  | 'FOOTBALL'
  | 'BADMINTON'
  | 'TENNIS'
  | 'BASKETBALL'
  | 'VOLLEYBALL'
  | 'TABLE_TENNIS'
  | 'PICKLEBALL';

export type SlotStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'REFUNDED_FULL'
  | 'REFUNDED_HALF'
  | 'FAILED';

export type PaymentMethod = 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH';

// --- API Response Format (bắt buộc theo project convention) ---

export interface ApiResponse<T = any> {
  data: T;
  message: string;
  statusCode: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
