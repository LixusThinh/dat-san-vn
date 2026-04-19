import { auth } from "@clerk/nextjs/server";
import { SectionHeading } from "@/components/common/section-heading";
import { OwnerBookingsClient } from "@/components/owner/owner-bookings-client";
import { getOwnerBookings } from "@/lib/owner-api";

export default async function OwnerBookingsPage() {
  const authObject = await auth();
  const token = await authObject.getToken();

  if (!token) {
    return null;
  }

  const bookings = await getOwnerBookings(token).catch(() => []);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Bookings"
        title="Quản lý booking của sân"
        description="Lọc theo trạng thái, xác nhận hoặc từ chối booking PENDING, và huỷ booking CONFIRMED khi còn hơn 24 giờ."
      />

      <OwnerBookingsClient initialBookings={bookings} />
    </div>
  );
}
