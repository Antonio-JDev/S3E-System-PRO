-- Migration: add_semObra_and_orcamento_pedido_faturado

This migration adds:
- Projeto.semObra (boolean)
- Projeto.justificativaSemObra (text)
- Projeto.enderecoObra, cidade, estado, responsavelObra (optional text)
- Orcamento.pedidoFaturado (boolean)

Run: npx prisma migrate deploy (or npx prisma migrate dev) after applying.

