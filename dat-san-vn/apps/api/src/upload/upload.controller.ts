// ============================================================
// DatSanVN — UploadController
// Handles image file uploads via Multer disk storage
// ============================================================

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

/**
 * Max file size: 5 MB
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed image MIME types.
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('upload')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UploadController {
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        console.log("originalname:", file.originalname);
        console.log("mimetype:", file.mimetype);
        console.log("size:", file.size);
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Loại file không hợp lệ: ${file.mimetype}. Chỉ chấp nhận JPEG, PNG, WebP.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/uploads/${file.filename}`;

    return { url };
  }
}
