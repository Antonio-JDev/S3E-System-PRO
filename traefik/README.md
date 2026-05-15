# Traefik (produção)

- O arquivo `acme.json` é o storage do Let's Encrypt. No host/servidor, após o primeiro clone, execute: `chmod 600 traefik/acme.json` (Traefik recusa permissões abertas).
- O e-mail ACME vem de `ACME_EMAIL` no `.env` usado pelo `docker-compose.prod.yml`.
