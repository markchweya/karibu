-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HOST',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "numPeople" INTEGER NOT NULL DEFAULT 1,
    "vehiclePlate" TEXT,
    "questionnaire" TEXT NOT NULL DEFAULT '{}',
    "checkInAt" DATETIME,
    "checkoutStartAt" DATETIME,
    "exitConfirmedAt" DATETIME,
    "visitorId" TEXT NOT NULL,
    "hostUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Visit_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" TEXT NOT NULL,
    "actorUserId" TEXT,
    CONSTRAINT "Event_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'SECURITY',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "visitCode" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Visitor_idNumber_idx" ON "Visitor"("idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_code_key" ON "Visit"("code");

-- CreateIndex
CREATE INDEX "Visit_status_idx" ON "Visit"("status");

-- CreateIndex
CREATE INDEX "Visit_checkInAt_idx" ON "Visit"("checkInAt");

-- CreateIndex
CREATE INDEX "Visit_checkoutStartAt_idx" ON "Visit"("checkoutStartAt");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_role_readAt_idx" ON "Notification"("role", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
