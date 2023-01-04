/*
  Warnings:

  - You are about to drop the column `cryptoSubscriptionExpirationDate` on the `User` table. All the data in the column will be lost.
  - Added the required column `subscriptionProductId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT,
    "telegramId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "subscriptionProductId" INTEGER NOT NULL,
    "patreonAccessToken" TEXT,
    "patreonRefreshToken" TEXT,
    "nextBillingDate" DATETIME,
    CONSTRAINT "User_subscriptionProductId_fkey" FOREIGN KEY ("subscriptionProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("email", "id", "patreonAccessToken", "patreonRefreshToken", "telegramId") SELECT "email", "id", "patreonAccessToken", "patreonRefreshToken", "telegramId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
