# Auth Rules Skill

## Roles
- USER: đặt sân, xem booking cá nhân
- OWNER: quản lý sân của mình, xem booking sân mình
- ADMIN: duyệt OWNER, quản lý hệ thống

## Rules
- OWNER phải được ADMIN duyệt (isApproved = true) mới active
- Mỗi venue thuộc 1 OWNER
- Bảo vệ route bằng Guard + decorator @Roles()
- Không cho OWNER book sân của chính mình
