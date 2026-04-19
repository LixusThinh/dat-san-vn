# TASK-02 — Admin Panel (FE + BE)

## Mục tiêu
Xây dựng Admin Panel và các API endpoint còn thiếu để admin quản lý hệ thống.

---

## PHẦN 1 — Backend: Admin Endpoints (NestJS)

### File cần tạo/sửa trong `apps/api/src/`

#### 1. `admin/admin.controller.ts`
Guard: `ClerkAuthGuard` + `RolesGuard` với `@Roles('ADMIN')` trên toàn bộ controller

Endpoints:
```
GET    /api/admin/stats              → Thống kê tổng quan
GET    /api/admin/users              → Danh sách tất cả user (có phân trang)
PATCH  /api/admin/users/:id/role     → Đổi role user
DELETE /api/admin/users/:id          → Ban/xoá user

GET    /api/admin/venues             → Tất cả venue (kể cả chưa duyệt)
PATCH  /api/admin/venues/:id/approve → Duyệt venue + set owner role = OWNER
PATCH  /api/admin/venues/:id/reject  → Từ chối venue

GET    /api/admin/bookings           → Tất cả booking trong hệ thống
```

#### 2. `admin/admin.service.ts`
- `getStats()`: đếm totalUsers, totalVenues, totalBookings, pendingVenues, todayBookings
- `getUsers(page, limit)`: query Prisma với pagination
- `updateUserRole(id, role)`: update role trong DB
- `deleteUser(id)`: soft delete hoặc hard delete
- `getVenues(status?)`: filter theo status nếu có
- `approveVenue(id)`: set venue.status = APPROVED, set owner.role = OWNER
- `rejectVenue(id)`: set venue.status = REJECTED
- `getAllBookings(page, limit)`: query tất cả bookings

#### 3. `admin/admin.module.ts`
Import PrismaModule, đăng ký controller + service

#### 4. Thêm vào `app.module.ts`
```typescript
import { AdminModule } from './admin/admin.module';
// thêm AdminModule vào imports[]
```

---

## PHẦN 2 — Frontend: Admin Panel (Next.js)

### Pages cần tạo

#### 1. `/app/(main)/admin/layout.tsx`
- Server Component
- Redirect nếu role không phải `ADMIN`
- Sidebar: Dashboard, Users, Venues, Bookings

#### 2. `/app/(main)/admin/page.tsx` — Dashboard
Hiển thị stats cards:
- Tổng số user
- Tổng số venue (bao nhiêu đang chờ duyệt)
- Tổng booking hôm nay
- Số venue chờ duyệt (highlight đỏ nếu > 0)

#### 3. `/app/(main)/admin/users/page.tsx` — Quản lý Users
- Fetch `GET /api/admin/users`
- Bảng: avatar, tên, email, role, ngày tạo, actions
- Action: đổi role (dropdown: USER / OWNER / ADMIN), xoá user
- Search theo email/tên

#### 4. `/app/(main)/admin/venues/page.tsx` — Quản lý Venues
- Fetch `GET /api/admin/venues`
- Tab filter: ALL / PENDING / APPROVED / REJECTED
- Bảng: tên sân, chủ sân, địa chỉ, trạng thái, ngày tạo, actions
- Action:
  - PENDING → nút **Duyệt** + **Từ chối**
  - APPROVED → badge xanh, không có action
- Sau khi duyệt → owner của venue tự động được set role OWNER

#### 5. `/app/(main)/admin/bookings/page.tsx` — Xem Bookings
- Fetch `GET /api/admin/bookings`
- Read-only, không có action
- Filter theo status, date range

### Components cần tạo

```
apps/web/components/admin/
├── stats-overview.tsx     → Grid stats cards (reuse stats-card từ owner nếu đã có)
├── users-table.tsx        → Bảng users với role editor
└── venue-approval-table.tsx → Bảng venue với approve/reject actions
```

## Acceptance Criteria

### Backend
- [ ] `GET /api/admin/stats` trả về đúng format `{ data: {...}, message, statusCode }`
- [ ] `PATCH /api/admin/venues/:id/approve` → venue.status = APPROVED, owner.role = OWNER
- [ ] Non-ADMIN gọi admin endpoints → trả về 403
- [ ] `pnpm build` không lỗi

### Frontend
- [ ] Admin login → vào `/admin` thấy stats
- [ ] Có venue đang PENDING → thấy nút Duyệt / Từ chối
- [ ] Click Duyệt → venue chuyển APPROVED, owner được set role OWNER
- [ ] Danh sách users hiển thị đúng, có thể đổi role
- [ ] `pnpm build` không lỗi TypeScript

## Lưu ý

- Backend: đừng quên thêm `AdminModule` vào `app.module.ts`
- Frontend: Admin layout guard phải chạy server-side (dùng `auth()` không phải `useAuth()`)
- Reuse `stats-card.tsx` từ owner nếu TASK-01 đã tạo
