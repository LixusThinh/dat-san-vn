# AGENTS.md — DatSanVN

> Đọc file này trước khi thực hiện bất kỳ task nào.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Auth**: Clerk
- **Monorepo**: Turborepo + pnpm workspaces
- **Cache**: Redis (BullMQ + slot locking)
- **Infra (dev)**: Docker Compose

## URLs (local dev)

- API Base: `http://localhost:3000/api`
- Frontend: `http://localhost:3001`
- Health: `http://localhost:3000/health`

## Project Structure

```
dat-san-vn/
├── apps/
│   ├── api/         → NestJS backend
│   │   └── src/
│   │       ├── auth/        ✅ ClerkAuthGuard + RolesGuard
│   │       ├── booking/     ✅ Full lifecycle CRUD
│   │       ├── config/      ✅ bullmq + clerk configs
│   │       ├── field/       ✅ CRUD
│   │       ├── queues/      ✅ BullMQ booking-expiration
│   │       ├── user/        ✅ CRUD + role management
│   │       ├── venue/       ✅ CRUD + ownership
│   │       └── webhooks/    ✅ Clerk sync
│   └── web/         → Next.js 15 frontend
│       └── app/
│           ├── (main)/      → Layout chính (đã có)
│           ├── (auth)/      → Sign-in (đã có)
│           ├── venues/      ✅ Danh sách + chi tiết sân
│           ├── search/      ✅ Tìm kiếm sân
│           ├── bookings/    ✅ Lịch sử booking (user)
│           ├── owner/       ❌ CHƯA CÓ — cần tạo
│           └── admin/       ❌ CHƯA CÓ — cần tạo
├── packages/
│   ├── types/       → Shared TypeScript types
│   └── utils/       → Shared utilities
```

## API Response Format (tuân thủ tuyệt đối)

```typescript
// Success
{ data: any, message: string, statusCode: number }

// Error
{ error: string, message: string, statusCode: number }
```

## Code Conventions

- Database fields: `snake_case`
- Code (TS): `camelCase`
- Components: `PascalCase`
- Files: `kebab-case`
- API calls dùng `fetch` với `credentials: "include"`
- Auth header: Clerk JWT — lấy từ `useAuth()` hook của `@clerk/nextjs`

## Roles

```
USER   → Đặt sân, xem lịch sử booking
OWNER  → Quản lý sân, confirm/cancel booking (phải được ADMIN duyệt mới active)
ADMIN  → Duyệt OWNER request, quản lý toàn bộ hệ thống
```

## Business Rules (không được vi phạm)

- Booking states: `PENDING → CONFIRMED → COMPLETED / CANCELLED`
- Auto-cancel sau 15 phút nếu vẫn `PENDING` (BullMQ xử lý phía BE)
- Slot lock 5 phút khi user checkout (Redis TTL)
- Chủ sân chỉ được CANCEL trước 24h
- Refund: 100% nếu huỷ trước 12h, 50% nếu trước 6h
- OWNER chỉ thao tác được trên sân của chính mình

## Backend API Endpoints hiện có

### Auth / User
- `GET  /api/users/me`                    → Lấy thông tin user hiện tại
- `PATCH /api/users/:id/role`             → Đổi role (ADMIN only)

### Venue
- `GET    /api/venues`                    → Danh sách sân (public)
- `GET    /api/venues/:id`                → Chi tiết sân (public)
- `POST   /api/venues`                    → Tạo sân (OWNER)
- `PATCH  /api/venues/:id`                → Sửa sân (OWNER, sân của mình)
- `DELETE /api/venues/:id`                → Xoá sân (OWNER, sân của mình)
- `POST   /api/venues/:id/request-ownership` → Xin duyệt ownership (USER)
- `PATCH  /api/venues/:id/approve`        → Duyệt venue (ADMIN)
- `PATCH  /api/venues/:id/reject`         → Từ chối venue (ADMIN)

### Field
- `GET    /api/venues/:venueId/fields`    → Danh sách field
- `POST   /api/venues/:venueId/fields`    → Tạo field (OWNER)
- `PATCH  /api/venues/:venueId/fields/:id` → Sửa field (OWNER)
- `DELETE /api/venues/:venueId/fields/:id` → Xoá field (OWNER)

### Booking
- `GET    /api/bookings`                  → Lịch sử booking (USER: của mình, OWNER: sân của mình)
- `GET    /api/bookings/:id`              → Chi tiết booking
- `POST   /api/bookings`                  → Tạo booking (USER)
- `PATCH  /api/bookings/:id/confirm`      → Xác nhận booking (OWNER)
- `PATCH  /api/bookings/:id/cancel`       → Huỷ booking (USER hoặc OWNER tuỳ điều kiện)

## Frontend đã có

- `app/(main)/page.tsx`                  → Trang chủ
- `app/(main)/search/page.tsx`           → Tìm kiếm
- `app/(main)/venues/[id]/page.tsx`      → Chi tiết sân
- `app/(main)/bookings/page.tsx`         → Lịch sử booking
- `components/venue-card.tsx`            → Card sân
- `components/venue-list.tsx`            → Danh sách sân
- `components/search-filters.tsx`        → Bộ lọc
- `components/booking-sheet.tsx`         → Sheet đặt sân
- `components/booking-status-badge.tsx`  → Badge trạng thái
- `components/bookings-list.tsx`         → Danh sách booking

## Những gì CHƯA làm (frontend)

1. `app/(main)/owner/` — Owner Dashboard
2. `app/(main)/admin/` — Admin Panel
3. Admin API endpoints (BE)

## Quy tắc khi làm task

1. **Không thêm tính năng ngoài spec** — làm đúng những gì task yêu cầu
2. **Reuse components đã có** — check `apps/web/components/` trước khi tạo mới
3. **Luôn dùng Clerk auth** — `useAuth()` để lấy token, `auth()` cho Server Components
4. **Loading + Error states** — mọi page fetch data đều phải có
5. **TypeScript strict** — không dùng `any` nếu không cần thiết
6. **Sau mỗi task** — chạy `pnpm build` để verify không có lỗi TypeScript