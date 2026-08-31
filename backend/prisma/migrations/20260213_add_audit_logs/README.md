# Migration: add_audit_logs

This migration creates the `audit_logs` table and required indexes.

## How to apply

1. Ensure your DATABASE_URL in `backend/.env` is correct and points to the
   target Postgres database.

2. From the `backend/` folder run:

   psql "$DATABASE_URL" -f
   prisma/migrations/20260213_add_audit_logs/migration.sql

   Or, using Prisma (if you prefer):

   npx prisma migrate deploy --schema=prisma/schema.prisma

## Notes

- The migration creates the `pgcrypto` extension if not present (for
  gen_random_uuid()). -- If your Postgres uses `uuid_generate_v4()` instead,
  adapt the DEFAULT in the migration accordingly. -- This migration file was
  generated to allow applying the schema change without requiring the CLI to
  connect from this environment.
