# Classique Interiors OS

Internal BOQ, site visit, vendor quotation, and reporting app built with Next.js and Prisma.

## Local development

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set a unique `AUTH_SECRET`.
3. Run `npm run db:push` and `npm run db:seed` (set `SEED_DEFAULT_PASSWORD` before seeding).
4. Start the app with `npm run dev`.

The checked-in seed script creates demo users only when `SEED_DEFAULT_PASSWORD` is supplied. Never reuse a local demo password for production.

## Production deployment status

The app currently uses SQLite and local file uploads for development. Vercel production needs a persistent database and object storage, plus a production database configuration. Do not use the local `file:` database or local uploads on Vercel. Set `STORAGE=blob` and configure `BLOB_READ_WRITE_TOKEN` after connecting Vercel Blob. Configure a unique `AUTH_SECRET` in Vercel before serving logins.
