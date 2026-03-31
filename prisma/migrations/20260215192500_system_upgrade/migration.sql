-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notifyAt10" INTEGER NOT NULL DEFAULT 10,
    "notifyAt13" INTEGER NOT NULL DEFAULT 13,
    "notifyAt15" INTEGER NOT NULL DEFAULT 15,
    "escalateAt16" INTEGER NOT NULL DEFAULT 16,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "visitId" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HOST',
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "fullName", "id", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "fullName", "id", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE TABLE "new_Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "numPeople" INTEGER NOT NULL DEFAULT 1,
    "vehiclePlate" TEXT,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "questionnaire" TEXT NOT NULL DEFAULT '{}',
    "checkInAt" DATETIME,
    "checkoutStartAt" DATETIME,
    "exitConfirmedAt" DATETIME,
    "durationMinutes" INTEGER,
    "visitorId" TEXT NOT NULL,
    "hostUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Visit_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Visit" ("checkInAt", "checkoutStartAt", "code", "createdAt", "createdByUserId", "destination", "exitConfirmedAt", "hostUserId", "id", "numPeople", "purpose", "questionnaire", "status", "updatedAt", "vehiclePlate", "visitorId") SELECT "checkInAt", "checkoutStartAt", "code", "createdAt", "createdByUserId", "destination", "exitConfirmedAt", "hostUserId", "id", "numPeople", "purpose", "questionnaire", "status", "updatedAt", "vehiclePlate", "visitorId" FROM "Visit";
DROP TABLE "Visit";
ALTER TABLE "new_Visit" RENAME TO "Visit";
CREATE UNIQUE INDEX "Visit_code_key" ON "Visit"("code");
CREATE INDEX "Visit_status_idx" ON "Visit"("status");
CREATE INDEX "Visit_checkInAt_idx" ON "Visit"("checkInAt");
CREATE INDEX "Visit_checkoutStartAt_idx" ON "Visit"("checkoutStartAt");
CREATE INDEX "Visit_exitConfirmedAt_idx" ON "Visit"("exitConfirmedAt");
CREATE INDEX "Visit_isWalkIn_idx" ON "Visit"("isWalkIn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
