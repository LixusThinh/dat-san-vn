// apps/api/prisma.config.ts
import dotenv from "dotenv";
dotenv.config();   // Load .env trước khi Prisma đọc

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
  },

  migrations: {
    path: "./prisma/migrations",
  },
});