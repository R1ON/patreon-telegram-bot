-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RefillRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER,
    "price" BIGINT,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateddAt" DATETIME NOT NULL,
    CONSTRAINT "RefillRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RefillRequest" ("amount", "createdAt", "currency", "id", "status", "updateddAt", "userId") SELECT "amount", "createdAt", "currency", "id", "status", "updateddAt", "userId" FROM "RefillRequest";
DROP TABLE "RefillRequest";
ALTER TABLE "new_RefillRequest" RENAME TO "RefillRequest";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
