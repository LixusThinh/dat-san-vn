# TASK-01 — Owner Dashboard

## Mục tiêu
Xây dựng toàn bộ Owner Dashboard cho phép chủ sân quản lý booking và sân của mình.

## Pages cần tạo

### 1. Layout `/app/(main)/owner/layout.tsx`
- Server Component, dùng `auth()` từ Clerk
- Redirect về `/` nếu role không phải `OWNER`
- Sidebar navigation với các link: Dashboard, Bookings, Venues

### 2. `/app/(main)/owner/page.tsx` — Tổng quan
Hiển thị:
- Tổng số booking hôm nay (filter từ `GET /api/bookings?date=today`)
- Số booking đang PENDING cần xử lý
- Số sân đang active
- Danh sách 5 booking mới nhất (PENDING lên đầu)

### 3. `/app/(main)/owner/bookings/page.tsx` — Quản lý booking
- Fetch `GET /api/bookings` (OWNER tự động chỉ thấy sân của mình)
- Hiển thị dạng bảng: tên người đặt, sân, field, thời gian, trạng thái, actions
- Filter theo status: ALL / PENDING / CONFIRMED / COMPLETED / CANCELLED
- Action buttons:
  - PENDING → nút **Xác nhận** (`PATCH /api/bookings/:id/confirm`) + **Từ chối** (`PATCH /api/bookings/:id/cancel`)
  - CONFIRMED → nút **Huỷ** (chỉ hiện nếu còn hơn 24h, `PATCH /api/bookings/:id/cancel`)
- Sau mỗi action → refetch danh sách
- Polling tự động mỗi 15 giây (dùng `setInterval` + `useEffect`)

### 4. `/app/(main)/owner/venues/page.tsx` — Danh sách sân của tôi
- Fetch `GET /api/venues?ownerId=me` hoặc filter từ response
- Hiển thị dạng grid card: tên sân, địa chỉ, số field, trạng thái
- Nút **Thêm sân mới** → mở modal/sheet tạo sân
- Nút **Sửa** → mở modal/sheet edit
- Nút **Quản lý Field** → link đến `/owner/venues/:id/fields`

### 5. `/app/(main)/owner/venues/[id]/fields/page.tsx` — Quản lý fields
- Fetch `GET /api/venues/:venueId/fields`
- Danh sách field: tên, loại, giá/giờ, trạng thái
- CRUD: Thêm field (`POST`), Sửa (`PATCH`), Xoá (`DELETE`)
- Dùng Dialog/Sheet của shadcn/ui cho form

## Components cần tạo

```
apps/web/components/owner/
├── booking-table.tsx        → Bảng booking với actions
├── booking-filter-tabs.tsx  → Tab filter theo status
├── venue-form.tsx           → Form tạo/sửa venue (dùng react-hook-form)
├── field-form.tsx           → Form tạo/sửa field
└── stats-card.tsx           → Card thống kê (reuse cho admin)
```

## Auth pattern (Server Component)

```typescript
import { auth } from "@clerk/nextjs/server";

const { getToken } = auth();
const token = await getToken();

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Auth pattern (Client Component)

```typescript
import { useAuth } from "@clerk/nextjs";

const { getToken } = useAuth();
const token = await getToken();
```

## Acceptance Criteria

- [ ] Owner login → vào `/owner` thấy dashboard stats
- [ ] Có booking PENDING → thấy nút Xác nhận / Từ chối
- [ ] Click Xác nhận → booking chuyển sang CONFIRMED, list tự refresh
- [ ] Có thể tạo venue mới qua form, venue xuất hiện trong danh sách
- [ ] Có thể thêm/sửa/xoá field trong venue
- [ ] `pnpm build` không có lỗi TypeScript

## Lưu ý

- Reuse `BookingStatusBadge` component đã có
- Dùng `shadcn/ui` Table, Dialog, Sheet, Tabs, Card
- Không làm payment, không làm realtime Socket.IO
