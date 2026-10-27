-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "city" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BOQ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientContactName" TEXT,
    "clientContactPhone" TEXT,
    "siteAddress" TEXT NOT NULL,
    "city" TEXT,
    "siteDetails" TEXT,
    "deadline" DATETIME,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedAt" DATETIME,
    "visitToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BOQ_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BOQ_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'nos',
    "quantity" REAL NOT NULL,
    "remarks" TEXT,
    CONSTRAINT "BOQItem_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT NOT NULL,
    "notes" TEXT,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT,
    CONSTRAINT "SiteVisit_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteVisitFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteVisitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteVisitFile_siteVisitId_fkey" FOREIGN KEY ("siteVisitId") REFERENCES "SiteVisit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorPhone" TEXT,
    "vendorEmail" TEXT,
    "instructions" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorInquiry_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inquiryId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "itemRatesJson" TEXT,
    "leadTimeDays" INTEGER,
    "notes" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enteredById" TEXT,
    CONSTRAINT "VendorQuote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "VendorInquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boqId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "vendorInquiryId" TEXT,
    "vendorName" TEXT NOT NULL,
    "marginPercent" REAL NOT NULL,
    "gstPercent" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "marginAmount" REAL NOT NULL,
    "gstAmount" REAL NOT NULL,
    "grandTotal" REAL NOT NULL,
    "itemsSnapshotJson" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quotation_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BOQ_number_key" ON "BOQ"("number");

-- CreateIndex
CREATE UNIQUE INDEX "BOQ_visitToken_key" ON "BOQ"("visitToken");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_boqId_key" ON "SiteVisit"("boqId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");
