import { PrismaClient } from '@prisma/client';

// Sanitize process.env.DATABASE_URL directly before Prisma reads it
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.substring(1, url.length - 1).trim();
  }
  process.env.DATABASE_URL = url;
}

export const prisma = new PrismaClient();
