-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientCompanyName" TEXT NOT NULL,
    "clientContactName" TEXT,
    "clientEmail" TEXT NOT NULL,
    "services" TEXT,
    "description" TEXT,
    "startDate" DATETIME,
    "expectedCompletionDate" DATETIME,
    "actualCompletionDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "teamSize" INTEGER,
    "engagementModel" TEXT,
    "internalRef" TEXT,
    "projectUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionLabel" TEXT,
    "description" TEXT,
    "objectives" TEXT,
    "deliverables" TEXT,
    "plannedDeliveryDate" DATETIME,
    "actualDeliveryDate" DATETIME,
    "startDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "demoUrl" TEXT,
    "internalNotes" TEXT,
    "clientFacingNotes" TEXT,
    "teamSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Release_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "overallSatisfaction" INTEGER,
    "qualityOfDeliverables" INTEGER,
    "timeliness" INTEGER,
    "communication" INTEGER,
    "understandingOfRequirements" INTEGER,
    "deliveryAgainstScope" INTEGER,
    "wouldContinue" INTEGER,
    "comments" TEXT,
    "reviewerEmail" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FeedbackRequest_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "releaseId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackRequest_releaseId_key" ON "FeedbackRequest"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackRequest_token_key" ON "FeedbackRequest"("token");
