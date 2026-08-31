#!/usr/bin/env bash
# =============================================================================
# Cutover: move evogo_auth / evogo_users do Postgres do ERP → postgres-evogo
# =============================================================================
# Uso (TrueNAS, pasta do compose):
#   chmod +x docker/postgres/migrate-evogo-to-dedicated.sh
#   ./docker/postgres/migrate-evogo-to-dedicated.sh
#
# Pré-requisitos:
#   - docker-compose.prod.yml já com o serviço postgres-evogo
#   - .env com DB_* e (opcional) EVOGO_DB_USER / EVOGO_DB_PASSWORD
#   - NÃO apaga evolution_go_dbdata (sessão WhatsApp / QR)
#
# Conversas do CRM (s3e_producao) NÃO são tocadas.
# =============================================================================
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
OLD_PG="${OLD_PG:-s3e-postgres-prod}"
NEW_PG="${NEW_PG:-s3e-postgres-evogo-prod}"
DUMP_DIR="${DUMP_DIR:-./backups/evogo-cutover-$(date +%Y%m%d-%H%M%S)}"

# shellcheck disable=SC1090
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # lê só KEY=VAL simples (sem export complexo)
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

DB_USER="${DB_USER:?DB_USER obrigatório no .env}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD obrigatório no .env}"
EVOGO_DB_USER="${EVOGO_DB_USER:-evogo}"
EVOGO_DB_PASSWORD="${EVOGO_DB_PASSWORD:-$DB_PASSWORD}"

echo "==> 1/6 Subindo postgres-evogo (se ainda não estiver up)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres-evogo

echo "==> Aguardando health do postgres-evogo..."
for i in $(seq 1 60); do
  if docker exec "$NEW_PG" pg_isready -U "$EVOGO_DB_USER" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ "$i" -eq 60 ]]; then
    echo "Timeout esperando $NEW_PG" >&2
    exit 1
  fi
done

mkdir -p "$DUMP_DIR"
echo "==> 2/6 Dump de evogo_auth / evogo_users a partir de $OLD_PG → $DUMP_DIR"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$OLD_PG" \
  pg_dump -U "$DB_USER" -Fc --no-owner --no-acl evogo_auth >"$DUMP_DIR/evogo_auth.dump" || {
  echo "AVISO: dump evogo_auth falhou (banco pode não existir). Segue com bases vazias." >&2
  rm -f "$DUMP_DIR/evogo_auth.dump"
}
docker exec -e PGPASSWORD="$DB_PASSWORD" "$OLD_PG" \
  pg_dump -U "$DB_USER" -Fc --no-owner --no-acl evogo_users >"$DUMP_DIR/evogo_users.dump" || {
  echo "AVISO: dump evogo_users falhou (banco pode não existir). Segue com bases vazias." >&2
  rm -f "$DUMP_DIR/evogo_users.dump"
}

echo "==> 3/6 Restore no postgres-evogo (garante DBs)"
ensure_db() {
  local db="$1"
  local exists
  exists="$(docker exec -e PGPASSWORD="$EVOGO_DB_PASSWORD" "$NEW_PG" \
    psql -U "$EVOGO_DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | tr -d '[:space:]')"
  if [[ "$exists" != "1" ]]; then
    docker exec -e PGPASSWORD="$EVOGO_DB_PASSWORD" "$NEW_PG" \
      psql -U "$EVOGO_DB_USER" -d postgres -c "CREATE DATABASE ${db};"
  fi
}
ensure_db evogo_auth
ensure_db evogo_users

if [[ -f "$DUMP_DIR/evogo_auth.dump" ]]; then
  docker exec -i -e PGPASSWORD="$EVOGO_DB_PASSWORD" "$NEW_PG" \
    pg_restore -U "$EVOGO_DB_USER" -d evogo_auth --clean --if-exists --no-owner --no-acl \
    <"$DUMP_DIR/evogo_auth.dump" || true
fi
if [[ -f "$DUMP_DIR/evogo_users.dump" ]]; then
  docker exec -i -e PGPASSWORD="$EVOGO_DB_PASSWORD" "$NEW_PG" \
    pg_restore -U "$EVOGO_DB_USER" -d evogo_users --clean --if-exists --no-owner --no-acl \
    <"$DUMP_DIR/evogo_users.dump" || true
fi

echo "==> 4/6 Recriando whatsapp-provider apontando para postgres-evogo"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate whatsapp-provider

echo "==> 5/6 Aguardando EvoGo /server/ok..."
sleep 5
for i in $(seq 1 30); do
  if docker exec s3e-whatsapp-provider-prod wget -qO- http://127.0.0.1:8080/server/ok >/dev/null 2>&1; then
    echo "EvoGo OK"
    break
  fi
  sleep 2
done

echo "==> 6/6 (MANUAL, depois de validar chat/QR) dropar legado no Postgres do ERP:"
echo "  docker exec -e PGPASSWORD=\$DB_PASSWORD $OLD_PG psql -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS evogo_auth WITH (FORCE);'"
echo "  docker exec -e PGPASSWORD=\$DB_PASSWORD $OLD_PG psql -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS evogo_users WITH (FORCE);'"
echo "  docker exec -e PGPASSWORD=\$DB_PASSWORD $OLD_PG psql -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS evolution WITH (FORCE);'"
echo "  docker exec -e PGPASSWORD=\$DB_PASSWORD $OLD_PG psql -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS db_evolution WITH (FORCE);'"
echo ""
echo "Dump em: $DUMP_DIR"
echo "NÃO apague o volume evolution_go_dbdata."
echo "Pronto."
