DO $$
BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPPORT', 'BILLING', 'MASTER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformAdmin" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "PlatformAdminRole" NOT NULL DEFAULT 'SUPPORT',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAdmin_email_key" ON "PlatformAdmin"("email");
CREATE INDEX IF NOT EXISTS "PlatformAdmin_role_idx" ON "PlatformAdmin"("role");

CREATE TABLE IF NOT EXISTS "PlatformAdminSession" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAdminSession_tokenHash_key" ON "PlatformAdminSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "PlatformAdminSession_adminId_idx" ON "PlatformAdminSession"("adminId");
CREATE INDEX IF NOT EXISTS "PlatformAdminSession_expiresAt_idx" ON "PlatformAdminSession"("expiresAt");

DO $$
BEGIN
  ALTER TABLE "PlatformAdminSession"
  ADD CONSTRAINT "PlatformAdminSession_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
