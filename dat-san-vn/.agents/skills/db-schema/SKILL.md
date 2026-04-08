# DB Schema Skill

## Conventions
- Table name: snake_case (venues, bookings, venue_slots, users...)
- Column name: snake_case
- Primary key: id (uuid hoặc serial)
- Timestamps: created_at, updated_at
- Soft delete: deleted_at (nếu cần)

## Important Entities
- users (role: USER | OWNER | ADMIN)
- venues (sân, owner_id)
- venue_slots (slot theo ngày/giờ của sân)
- bookings
- payments (sau)

## Prisma Rules
- Dùng @@map() để force snake_case
- Relation rõ ràng với @relation
- Index cho trường hay query (location, date, status)
- Không thêm column mới trừ khi Trùm ra lệnh
