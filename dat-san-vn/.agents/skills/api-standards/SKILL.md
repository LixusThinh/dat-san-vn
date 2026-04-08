# API Standards Skill

## Response Format (bắt buộc)
Success:
{
  "data": any,
  "message": "string",
  "statusCode": 200
}

Error:
{
  "error": "BadRequestException",
  "message": "string",
  "statusCode": 400
}

## NestJS Rules
- Dùng class-validator + class-transformer cho DTO
- Throw exception đúng loại (BadRequestException, NotFoundException...)
- Pagination: ?page= & ?limit=
- Không tự thêm version trừ khi có lệnh
