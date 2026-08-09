import { PrismaClient } from '@prisma/client';

function getSanitizedDbUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  
  url = url.trim();
  // Strip outer quotes if present from env string
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.substring(1, url.length - 1).trim();
  }
  return url;
}

const dbUrl = getSanitizedDbUrl();

export const prisma = new PrismaClient(
  dbUrl
    ? {
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      }
    : undefined
);
