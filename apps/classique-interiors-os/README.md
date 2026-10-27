# Classique Interiors OS

Internal BOQ, site visit, vendor quotation, and reporting app built with Next.js and Prisma.

## Local development

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set a unique `AUTH_SECRET`.
3. Run `npm run db:push` and `npm run db:seed` (set `SEED_DEFAULT_PASSWORD` before seeding).
4. Start the app with `npm run dev`.

The seed script creates demo users only when `SEED_DEFAULT_PASSWORD` is supplied. Never reuse a local demo password for production.

## Production deployment

The app uses SQLite locally and supports Turso (libSQL) as its persistent production database. Do not use the local `file:` database or local uploads on Vercel. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and a unique `AUTH_SECRET` in Vercel. Initialize a new empty Turso database once with `npm run db:init:remote`, then seed users with a unique `SEED_DEFAULT_PASSWORD`. Set `STORAGE=blob` and configure `BLOB_READ_WRITE_TOKEN` after connecting Vercel Blob.
