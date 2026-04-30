"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Clock3, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createPlayerBooking } from "@/lib/player-booking-api";
import { formatCurrency } from "@/lib/utils";

export function BookingSheet({
  venueName,
  fieldId,
  fieldName,
  timeSlotId,
  firstSlot,
  pricePerSlot,
}: Readonly<{
  venueName: string;
  fieldId: string;
  fieldName: string;
  timeSlotId?: string;
  firstSlot: string;
  pricePerSlot: number;
}>) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBooking = async () => {
    if (!timeSlotId) {
      toast({
        title: "Chưa có slot khả dụng",
        description: "Sân này hiện chưa có khung giờ trống để tạo booking.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Vui lòng đăng nhập để đặt sân");
      }

      const booking = await createPlayerBooking(token, { fieldId, timeSlotId });

      if (fieldId.includes("-field-")) {
        const [timeHour, timeMin] = firstSlot.split(":");
        const mockEndHour = String((Number(timeHour) + 1) % 24).padStart(2, "0");
        const mockBooking = {
          id: booking.id,
          venueId: fieldId.split("-")[0] + "-venue",
          venueName,
          venueAddress: "Đang cập nhật",
          fieldName,
          bookingDate: new Date().toLocaleDateString("vi-VN"),
          bookingTime: `${firstSlot} - ${mockEndHour}:${timeMin}`,
          startsAt: new Date().toISOString(),
          status: "PENDING",
          totalPrice: pricePerSlot,
          refundAmount: 0,
          refundPercent: 100,
          canCancel: true,
          cancelledAt: null,
          cancelReason: null,
        };
        const existing = JSON.parse(localStorage.getItem("mock_bookings") || "[]");
        localStorage.setItem("mock_bookings", JSON.stringify([mockBooking, ...existing]));
      }

      setOpen(false);
      toast({
        title: "Đặt sân thành công!",
        description: `Booking #${booking.id} đã được tạo. Vui lòng thanh toán trong 15 phút.`,
      });
      router.push("/bookings");
      router.refresh();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tạo booking",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg">Đặt sân ngay</Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>Booking Sheet</SheetTitle>
          <SheetDescription>
            Kiểm tra lại sân và khung giờ trước khi xác nhận booking.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4">
          <div className="rounded-[28px] bg-emerald-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Sân đã chọn</div>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{venueName}</h3>
            <p className="mt-1 text-sm text-slate-600">{fieldName}</p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <CalendarClock className="h-4 w-4 text-emerald-700" />
              Hôm nay, slot khả dụng sớm nhất
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Clock3 className="h-4 w-4 text-emerald-700" />
              {firstSlot}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Wallet className="h-4 w-4 text-emerald-700" />
              {formatCurrency(pricePerSlot)}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Để sau
          </Button>
          <Button onClick={handleBooking} disabled={isSubmitting || !timeSlotId}>
            {isSubmitting ? "Đang tạo booking..." : "Xác nhận đặt sân"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
