# Classique Interiors OS

Internal BOQ, site visit, vendor quotation, and reporting app built with Next.js and Prisma.

## Local development

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set a unique `AUTH_SECRET`.
3. Run `npm run db:push` and `npm run db:seed` (set `SEED_DEFAULT_PASSWORD` before seeding).
4. Start the app with `npm run dev`.

The seed script requires a distinct password of at least 16 characters for every user via `SEED_USER_PASSWORDS_JSON`. Never reuse a local demo password for production.

## Production deployment

The app uses SQLite locally and supports Turso (libSQL) as its persistent production database. Do not use the local `file:` database or local uploads on Vercel. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and a unique `AUTH_SECRET` in Vercel. Initialize a new empty Turso database once with `npm run db:init:remote`, then seed users with distinct `SEED_USER_PASSWORDS_JSON` passwords. Set `STORAGE=blob` and configure `BLOB_READ_WRITE_TOKEN` after connecting Vercel. Set `APP_URL` to the public site URL. To send assignment email automatically, configure `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`; without them, the manager gets an email draft link.

## Client BOQ requests

Share `/request` with a client. They can submit project details, item quantities and up to 8 private reference images (8 MB each). The app creates a BOQ in the team's Draft queue and displays a one-time tracking token. The client can enter that token under “Track a client request” on `/login` to see a limited status summary. The tracking token is stored as a hash; public lookup does not reveal contact details, site notes or uploaded images.

For an existing Turso database, apply migrations in order: `prisma/migrations/20261028133000_client_intake/migration.sql`, then `prisma/migrations/20261028143000_vendor_directory/migration.sql`. Do not run the fresh-database initializer against an existing database.

## BOQ handoff and vendors

Managers can drop an Excel/CSV BOQ into the items area to import line items and fill recognizable blank project fields. They review the imported values, save the BOQ, then assign it as the final step; assignment opens an email or WhatsApp draft with the visit link. The site report ZIP can be downloaded from a vendor inquiry and includes the BOQ, site notes and available visit photos. Managers can reuse saved vendors from the Vendors page. Quote attachments support drag-and-drop. The app extracts text and likely totals from text PDFs, DOCX and spreadsheets, flags draft/provisional or pending language, and shows the extracted text for review. A manager must confirm the amount, tax basis and exclusions before saving; L1 ranks the latest confirmed quote totals, lowest first. Scanned PDFs and image-only quotations are stored, but need manual review because OCR is not enabled.
