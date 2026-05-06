Migration: add_nfe_eventos
==========================

This migration adds the `nfe_eventos` table used to store user-visible events (INFO / SUCESSO / ERRO)
related to NF-e processing and contingency handling.

SQL file: migration.sql

How to apply
------------
The application typically runs inside Docker. Choose one of the options below depending on your environment.

1) Apply inside running backend container (recommended for Docker Compose):

   # If using docker compose
   docker compose exec backend npx prisma migrate deploy

   # Or, if your compose command is 'docker-compose'
   docker-compose exec backend npx prisma migrate deploy

2) Apply using direct docker exec (replace <container_name> with your backend container):

   docker exec -it <container_name> npx prisma migrate deploy

3) Apply locally (development):

   npx prisma migrate dev --name add_nfe_eventos

Notes
-----
- The migration creates the extension pgcrypto (if not present) to provide gen_random_uuid().
- Running migrate deploy will execute the SQL in this folder against the configured DATABASE_URL.
- If you prefer, you can stop containers, run `npx prisma migrate dev --name add_nfe_eventos` locally, then restart containers.

