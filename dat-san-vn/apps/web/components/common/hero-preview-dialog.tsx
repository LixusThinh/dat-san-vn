"use client";

import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HeroPreviewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg">
          <PlayCircle className="h-4 w-4" />
          Xem cách flow hoạt động
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking flow định hướng cho phase tiếp theo</DialogTitle>
          <DialogDescription>
            Người dùng tìm sân theo khu vực, xem slot trống, mở sheet đặt sân và nhận toast xác nhận. Đây là khung
            UI để team backend/auth nối dữ liệu thật ở mission sau.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-[28px] bg-emerald-50 p-5">
            <div className="text-sm font-semibold text-emerald-900">1. Search thông minh</div>
            <p className="mt-2 text-sm text-emerald-800">
              Filter theo khu vực, loại sân, giá và khung giờ bằng URL search params.
            </p>
          </div>
          <div className="rounded-[28px] bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-900">2. Venue detail rõ ràng</div>
            <p className="mt-2 text-sm text-amber-800">
              Gallery, field list, slot trống và CTA đặt sân nằm cùng một màn hình.
            </p>
          </div>
          <div className="rounded-[28px] bg-slate-100 p-5">
            <div className="text-sm font-semibold text-slate-900">3. Booking state thống nhất</div>
            <p className="mt-2 text-sm text-slate-700">
              Frontend đã bám enum `BookingStatus` từ package shared để tránh lệch contract với backend.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
