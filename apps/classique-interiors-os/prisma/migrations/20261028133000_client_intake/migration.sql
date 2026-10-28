ALTER TABLE "BOQ" ADD COLUMN "publicTrackingTokenHash" TEXT;

CREATE UNIQUE INDEX "BOQ_publicTrackingTokenHash_key" ON "BOQ"("publicTrackingTokenHash");

CREATE TABLE "ClientReferenceFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT,
    "uploadSessionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" DATETIME,
    CONSTRAINT "ClientReferenceFile_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClientReferenceFile_url_key" ON "ClientReferenceFile"("url");
CREATE INDEX "ClientReferenceFile_uploadSessionId_boqId_idx" ON "ClientReferenceFile"("uploadSessionId", "boqId");
