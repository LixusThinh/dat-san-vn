import { CheckCircle2, Clock3, Ticket } from "lucide-react";
import { getMyBookings } from "@/lib/api";
import { BookingsList } from "@/components/booking/bookings-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/common/section-heading";

export default async function BookingsPage() {
  const bookings = await getMyBookings();
  const confirmedCount = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((booking) => booking.status === "PENDING").length;

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="My Bookings"
          title="Theo dõi lịch đặt sân của tôi"
          description="Trang này đã sẵn layout dashboard nhẹ để phase auth chỉ cần thay dữ liệu demo bằng booking của user đăng nhập."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border-white/70">
            <CardContent className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-950">{confirmedCount}</div>
              <p className="mt-2 text-sm text-slate-600">Lượt đặt đã xác nhận</p>
            </CardContent>
          </Card>
          <Card className="border-white/70">
            <CardContent className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-950">{pendingCount}</div>
              <p className="mt-2 text-sm text-slate-600">Lượt đặt đang chờ xử lý</p>
            </CardContent>
          </Card>
          <Card className="border-white/70">
            <CardContent className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-950">{bookings.length}</div>
              <p className="mt-2 text-sm text-slate-600">Tổng lượt booking demo</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Badge>BookingStatus từ package shared</Badge>
          <Badge variant="outline" className="bg-white/80">
            Mobile-first list
          </Badge>
        </div>

        <div className="mt-8">
          <BookingsList bookings={bookings} />
        </div>
      </div>
    </div>
  );
}
