-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT,
    "telegramId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "subscriptionProductId" INTEGER,
    "patreonAccessToken" TEXT,
    "patreonRefreshToken" TEXT,
    "nextBillingDate" DATETIME,
    CONSTRAINT "User_subscriptionProductId_fkey" FOREIGN KEY ("subscriptionProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("balance", "email", "id", "nextBillingDate", "patreonAccessToken", "patreonRefreshToken", "subscriptionProductId", "telegramId") SELECT "balance", "email", "id", "nextBillingDate", "patreonAccessToken", "patreonRefreshToken", "subscriptionProductId", "telegramId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
