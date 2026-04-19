"use client";

import type { OwnerBooking } from "@/lib/owner-api";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export function BookingTable({
  bookings,
  isLoading,
  actionBookingId,
  onConfirm,
  onReject,
  onCancel,
}: Readonly<{
  bookings: OwnerBooking[];
  isLoading?: boolean;
  actionBookingId?: string | null;
  onConfirm: (bookingId: string) => void | Promise<void>;
  onReject: (bookingId: string) => void | Promise<void>;
  onCancel: (bookingId: string) => void | Promise<void>;
}>) {
  return (
    <Card className="border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(16,34,22,0.08)]">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Người đặt</TableHead>
              <TableHead>Sân</TableHead>
              <TableHead>Khung giờ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                  {isLoading ? "Đang tải danh sách booking..." : "Chưa có booking nào khớp bộ lọc hiện tại."}
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => {
                const isPendingAction = actionBookingId === booking.id;

                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium text-slate-950">{booking.customerName}</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.customerEmail}</div>
                      {booking.customerPhone ? (
                        <div className="mt-1 text-xs text-slate-500">{booking.customerPhone}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-950">{booking.venueName}</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.fieldName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-950">{booking.bookingDate}</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.bookingTime}</div>
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-950">
                      {formatCurrency(booking.totalPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isPendingAction}
                              onClick={() => onConfirm(booking.id)}
                            >
                              Xác nhận
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-red-50 text-red-700 hover:bg-red-100"
                              disabled={isPendingAction}
                              onClick={() => onReject(booking.id)}
                            >
                              Từ chối
                            </Button>
                          </>
                        ) : null}

                        {booking.status === "CONFIRMED" && booking.canOwnerCancel ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={isPendingAction}
                            onClick={() => onCancel(booking.id)}
                          >
                            Huỷ
                          </Button>
                        ) : null}

                        {booking.status === "CONFIRMED" && !booking.canOwnerCancel ? (
                          <span className="text-xs text-slate-500">Còn dưới 24 giờ</span>
                        ) : null}

                        {booking.status !== "PENDING" && booking.status !== "CONFIRMED" ? (
                          <span className="text-xs text-slate-500">Không có thao tác</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
