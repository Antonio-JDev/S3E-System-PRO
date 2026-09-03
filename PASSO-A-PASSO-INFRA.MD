# FASE 0 — Inventário 

root@truenas[/home/truenas_admin]# cd /mnt/S3E_SERVER/Apps/s3e-aplicacao 
root@truenas[/mnt/S3E_SERVER/Apps/s3e-aplicacao]# docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 
NAMES                        IMAGE                                  STATUS
s3e-frontend-prod            odev10antonio/s3e-frontend:2.2.3       Up 3 hours (healthy)
s3e-backend-prod             odev10antonio/s3e-backend:2.2.3        Up 3 hours (healthy)
s3e-whatsapp-provider-prod   evoapicloud/evolution-go:0.7.2         Up 3 hours (healthy)
s3e-pgadmin-prod             dpage/pgadmin4:8.11                    Up 3 hours
s3e-postgres-prod            postgres:16-alpine                     Up 3 hours (healthy)
s3e-traefik-prod             traefik:v2.10.7                        Up 3 hours
s3e-redis-prod               redis:7-alpine                         Up 3 hours
ix-tailscale-tailscale-1     ghcr.io/tailscale/tailscale:v1.102.3   Up 9 hours (healthy)
root@truenas[/mnt/S3E_SERVER/Apps/s3e-aplicacao]# docker volume ls
DRIVER    VOLUME NAME
local     0b353a90dad7a936302b7ded00a36f279f29e350f992a9bb5773b925f5471bcf
local     1a5764636f77f61bc123289be73cada3bfbecc5b51a7a3bac4016323cd93d20e
local     3ec7a747b4fab2949e0aa014b3035ee2fd266b68f7a6f550837842ef0dad5cf1
local     5b23c8b740d4e396a0e67db4f940e391e8e31c3c655e62c4875884057161d332
local     5b1648b748a87d31a9c85c6939b3c03379375fb00cb8e085a2b38ac270b5002d
local     7fddae0fc8faa8fa96ffc198189c6b6dc182a133e7509ddaf5d71674912d864e
local     8b3fd59d06a679a77500b66290c07b167109f86cde4d8cdf98fde536db405444
local     8bf0bc1d8926aa8fc159549fff5c4b83c97a8eae2c9f0ef7e8bf8dd343d4bfed
local     8f2e1918a3f14d417d7bd95159fc6de3e41c8ad3e1ad086bfaf84f41100a6105
local     8fe9cb58ad39ef97476a2541ffe3bd2efe8f3e77aa8f7c4cac8c275b0d36d63c
local     9bfef1667da59f84bbdb749627d43213c316529a5f30d209fddb0a14d4de092c
local     16c5545ef31ac43d9d17f34ab6455cd9742eb4b64699e39174ee97738bc7f4e4
local     032d08580091d40d44fd4077340656390f0ffaad4b840e70b9404267e56b20f2
local     73f2588c5e7cfca6c42b34131ad005bf8ee9fd8187116087949c6d90b758c9ba
local     93a3790112223908e840c5433aaa444bc9c81592216ed5a2ecbef1817c6661ef
local     773b40fe5c8b65bdea8e7519a1ea87a0ff6da9da91650ecdc6bdc168a82946ba
local     0977d54f2a341435092e1e887d38f3cf7b7029def140e4a7edcfb2ffff792dd7
local     3486cb49687329e82499abc301f629870e8cce0f5cb177bf9e46079a5b82c606
local     6405daa32918b361c7058648b55e25ef56e430ba6acf232c51624216946850c0
local     7745eecbf7f1cc04b3c8d3008e79ee30c53a7d4d2b0fff016087bb4980c49311
local     9091eae0dd69ab2449754d28e60927bdff27a04283eb790f169bee65b6a80efa
local     377066e1dd9fe1dc02c060094e69fe42fb83e15b05a92420747cc806cf16114e
local     24638656678ff9c74ab686f03badc8ac7af377bd07ddfa541008a10997748ce8
local     apps_backend_certificados
local     apps_backend_logs
local     apps_backend_uploads
local     apps_postgres_data
local     b29c0b960d53b2dc5d3d52586c990d689fa81eb7f7f8801a39be87c993417ca3
local     b6199a77f7635620f2718f3d8292cb0ae7891c6de80ce03927af059e2432d32d
local     da5ed8d0fdcb8fe5feb8311461eb1a22d21c1e056d573edceba43ef2e0935e1f
local     e7ce2f0b351c9a615a3b34a1c72d9d8a89c851c42cf3291252be5941a1e36fd6
local     e22cc272050e7f3d3602f928acbf2a5ab143e202bc57c6fd1ee929b4101c626a
local     f50d248b032d4bd22d971de1b6a07105c49bf65d98abdd1e3aa5c04b6396989e
local     s3e-aplicacao_evolution_go_dbdata
local     s3e-aplicacao_evolution_go_logs
local     s3e-aplicacao_pgadmin_data
local     s3e-aplicacao_redis_data
root@truenas[/mnt/S3E_SERVER/Apps/s3e-aplicacao]# docker network ls
NETWORK ID     NAME                    DRIVER    SCOPE
8b144b7939e0   apps_s3e-network-prod   bridge    local
e86cc22eda82   bridge                  bridge    local
6c656c44ac7a   host                    host      local
13f906128991   none                    null      local
531e1cdc1126   s3e-aplicacao_traefik   bridge    local
root@truenas[/mnt/S3E_SERVER/Apps/s3e-aplicacao]# 

# FASE 1 — Backup completo (JA TENHO)


 que fazer agora (ordem)
1. Backup
cd /mnt/S3E_SERVER/Apps/s3e-aplicacao
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
./backups/backup_cron.sh
2. Ver se o compose no servidor já tem postgres-evogo
grep -n "postgres-evogo" docker-compose.prod.yml
Se aparecer o serviço → pode seguir.
Se não aparecer → git pull origin main antes.
3. Adicionar no .env (se ainda não tiver)
EVOGO_DB_USER=evogo
EVOGO_DB_PASSWORD=<senha_forte_só_para_evogo>
EVOGO_DB_MAX_CONNECTIONS=100
DB_MAX_CONNECTIONS=150
Pode ser senha diferente da do ERP — o importante é ser a mesma em postgres-evogo e nas URLs da EvoGo.

4. Subir o Postgres dedicado
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres-evogo
docker compose -f docker-compose.prod.yml ps postgres-evogo
Espere healthy.

5. Rodar o cutover
chmod +x docker/postgres/migrate-evogo-to-dedicated.sh
./docker/postgres/migrate-evogo-to-dedicated.sh
6. Confirmar que mudou
docker inspect s3e-whatsapp-provider-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | grep POSTGRES
Deve mostrar postgres-evogo em vez de postgres.

7. Validar
curl -s http://127.0.0.1/api/health
Login no sistema
WhatsApp no Manager sem QR novo (volume s3e-aplicacao_evolution_go_dbdata preservado)
Enviar/receber mensagem de teste
8. Só depois de validar — limpar legado no ERP
docker exec s3e-postgres-prod psql -U s3e_prod -d template1 -c "DROP DATABASE IF EXISTS evogo_auth WITH (FORCE);"
docker exec s3e-postgres-prod psql -U s3e_prod -d template1 -c "DROP DATABASE IF EXISTS evogo_users WITH (FORCE);"
docker exec s3e-postgres-prod psql -U s3e_prod -d template1 -c "DROP DATABASE IF EXISTS db_evolution WITH (FORCE);"
Lembrete do que não apagar
Item	Motivo
apps_postgres_data
Todo o ERP
s3e-aplicacao_evolution_go_dbdata
Sessão WhatsApp pareada
apps_backend_uploads / certificados
Arquivos do sistema
Nunca use docker compose down -v.

Manda a saída do grep postgres-evogo docker-compose.prod.yml que eu te digo se pode ir direto para o passo 4 ou precisa do git pull antes.



Ask
Auto