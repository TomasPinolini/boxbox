-- Rename column password -> passwordHash (Prisma defaulted to DROP+ADD; replaced with RENAME to preserve data)
ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
