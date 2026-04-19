"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "@/hooks/use-toast";
import {
  cancelOwnerBooking,
  confirmOwnerBooking,
  getOwnerBookings,
  type OwnerBooking,
  type OwnerBookingStatusFilter,
} from "@/lib/owner-api";
import { BookingFilterTabs } from "@/components/owner/booking-filter-tabs";
import { BookingTable } from "@/components/owner/booking-table";

export function OwnerBookingsClient({
  initialBookings,
}: Readonly<{
  initialBookings: OwnerBooking[];
}>) {
  const { getToken } = useAuth();
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<OwnerBookingStatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  async function refreshBookings(nextFilter: OwnerBookingStatusFilter, silent = false) {
    const token = await getToken();
    if (!token) {
      toast({
        variant: "destructive",
        title: "Thiếu phiên đăng nhập",
        description: "Không thể tải danh sách booking khi chưa có access token.",
      });
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const nextBookings = await getOwnerBookings(token, {
        status: nextFilter,
      });
      setBookings(nextBookings);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Tải booking thất bại",
        description: error instanceof Error ? error.message : "Không thể tải danh sách booking.",
      });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void refreshBookings(filter);

    const interval = window.setInterval(() => {
      void refreshBookings(filter, true);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [filter, getToken]);

  async function runBookingAction(
    bookingId: string,
    action: (token: string, targetBookingId: string) => Promise<unknown>,
    successMessage: string,
  ) {
    const token = await getToken();
    if (!token) {
      toast({
        variant: "destructive",
        title: "Thiếu phiên đăng nhập",
        description: "Vui lòng đăng nhập lại để thực hiện thao tác này.",
      });
      return;
    }

    setActionBookingId(bookingId);

    try {
      await action(token, bookingId);
      toast({
        title: "Cập nhật thành công",
        description: successMessage,
      });
      await refreshBookings(filter, true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Thao tác thất bại",
        description: error instanceof Error ? error.message : "Không thể cập nhật booking.",
      });
    } finally {
      setActionBookingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <BookingFilterTabs value={filter} onValueChange={setFilter} />
        <p className="text-sm text-slate-500">Danh sách tự làm mới mỗi 15 giây để chủ sân không bỏ sót booking mới.</p>
      </div>

      <BookingTable
        bookings={bookings}
        isLoading={isLoading}
        actionBookingId={actionBookingId}
        onConfirm={(bookingId) =>
          runBookingAction(bookingId, confirmOwnerBooking, "Booking đã được xác nhận và danh sách đã làm mới.")
        }
        onReject={(bookingId) =>
          runBookingAction(bookingId, cancelOwnerBooking, "Booking đã bị từ chối.")
        }
        onCancel={(bookingId) =>
          runBookingAction(bookingId, cancelOwnerBooking, "Booking đã được huỷ.")
        }
      />
    </div>
  );
}
