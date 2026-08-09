import { PrismaClient } from '@prisma/client';

// Sanitize and configure process.env.DATABASE_URL for Supabase PgBouncer compatibility
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.substring(1, url.length - 1).trim();
  }
  if (url.includes('supabase') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}pgbouncer=true`;
  }
  process.env.DATABASE_URL = url;
}

export const prisma = new PrismaClient();
