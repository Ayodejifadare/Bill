-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "category" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" DATETIME,
    "address" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "documentsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "privacySettings" TEXT,
    "preferenceSettings" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("address", "avatar", "balance", "bio", "biometricEnabled", "createdAt", "dateOfBirth", "documentsSubmitted", "email", "emailVerified", "firstName", "id", "idVerified", "lastName", "name", "password", "phone", "phoneVerified", "preferenceSettings", "privacySettings", "tokenVersion", "twoFactorEnabled", "updatedAt") SELECT "address", "avatar", "balance", "bio", "biometricEnabled", "createdAt", "dateOfBirth", "documentsSubmitted", "email", "emailVerified", "firstName", "id", "idVerified", "lastName", "name", "password", "phone", "phoneVerified", "preferenceSettings", "privacySettings", "tokenVersion", "twoFactorEnabled", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
