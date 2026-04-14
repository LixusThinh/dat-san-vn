"use client";

import { startTransition, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";

export function BookingSheet({
  venueName,
  fieldName,
  firstSlot,
  pricePerSlot,
}: Readonly<{
  venueName: string;
  fieldName: string;
  firstSlot: string;
  pricePerSlot: number;
}>) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBooking = () => {
    startTransition(() => {
      setIsSubmitting(true);

      setTimeout(() => {
        setIsSubmitting(false);
        setOpen(false);
        toast({
          title: "Đã giữ chỗ tạm thời",
          description: `Sheet booking cho ${venueName} đã hoạt động. Phase sau chỉ cần nối API create booking.`,
        });
      }, 700);
    });
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
            Khung UI này đã sẵn để nối create booking API theo format `ApiResponse` ở phase backend integration.
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
          <Button onClick={handleBooking} disabled={isSubmitting}>
            {isSubmitting ? "Đang giữ chỗ..." : "Giữ chỗ tạm thời"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
