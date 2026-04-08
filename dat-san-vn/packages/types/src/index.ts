export type Role = 'USER' | 'OWNER' | 'ADMIN';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

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
