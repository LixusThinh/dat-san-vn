# Booking Flow Skill

## State Machine
PENDING → CONFIRMED → COMPLETED
        ↘           ↘
       CANCELLED   CANCELLED

## Rules (tuân thủ tuyệt đối)
- Khi user bắt đầu checkout → lock slot 5 phút bằng Redis TTL
- Quá 5 phút chưa thanh toán → tự động CANCELLED + release slot
- Chủ sân (OWNER) chỉ được CANCEL booking trước 24h
- Refund policy:
  - 100% nếu huỷ trước 12h
  - 50% nếu huỷ trước 6h
  - 0% nếu huỷ trong 6h cuối
- User chỉ book được slot còn trống và chưa lock

## Related APIs
- POST   /bookings                  → tạo booking (PENDING)
- PATCH  /bookings/:id/confirm      → confirm sau thanh toán
- PATCH  /bookings/:id/cancel       → huỷ booking
- GET    /bookings/my-bookings      → danh sách của user
- GET    /venues/:venueId/slots     → lấy slot khả dụng (real-time)

## Notes for Agent
- Luôn kiểm tra slot lock trước khi tạo booking
- Sử dụng Redis cho distributed lock
- Không được thay đổi state machine trừ khi có lệnh rõ ràng từ Trùm
