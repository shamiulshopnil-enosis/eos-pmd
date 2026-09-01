-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
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
    "publicSummary" TEXT,
    "publicKeyChallenges" TEXT,
    "publicSolution" TEXT,
    "publicOutcome" TEXT,
    "publicTechStack" TEXT,
    "publicPlatforms" TEXT,
    "publicBudget" TEXT,
    "publicImageUrl" TEXT,
    "publicPerformanceConsent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("actualCompletionDate", "clientCompanyName", "clientContactName", "clientEmail", "createdAt", "description", "engagementModel", "expectedCompletionDate", "id", "internalRef", "name", "projectUrl", "services", "startDate", "status", "teamSize", "updatedAt", "visibility") SELECT "actualCompletionDate", "clientCompanyName", "clientContactName", "clientEmail", "createdAt", "description", "engagementModel", "expectedCompletionDate", "id", "internalRef", "name", "projectUrl", "services", "startDate", "status", "teamSize", "updatedAt", "visibility" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
