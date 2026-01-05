# Mensagem de Commit (Versão Curta)

```
fix: Correções de autenticação via Tailscale, erro 500 em ferramentas e configuração SMTP UOL

- Corrigido CORS para aceitar automaticamente IPs do Tailscale (100.x.x.x)
- Corrigido erro 500 na página de ferramentas (tratamento robusto de userId)
- Configurado SMTP UOL com porta 465 SSL/TLS nos arquivos docker-compose
- Adicionada função sendUserDataChangeEmail() para notificação de alteração de dados
- Melhorado logging de CORS para facilitar debug

Arquivos principais:
- backend/src/app.ts (CORS)
- backend/src/controllers/ferramentasController.ts (erro 500)
- backend/src/services/email.service.ts (SMTP UOL)
- docker-compose.yml e docker-compose.prod.yml (configuração SMTP)

Configuração necessária:
- Configurar SMTP_PASS no .env de produção
- Atualizar FRONTEND_URL com porta :8080 no .env de produção
```

