em rede externa 10 s costuma ser apertado para algumas telas, e sem paginação em projetos isso pesa mais. Resumo objetivo:

1) Timeout de 10 s (API_CONFIG.TIMEOUT)
Hoje está assim:

Escopo	Tempo
Padrão (quase tudo)
10 s (frontend/src/config/api.ts)
Envio PDF WhatsApp
45 s (só send-orcamento-pdf)
Upload/mídia WhatsApp
60–120 s (rotas específicas)
Na rede da empresa (LAN/VPN rápida): 10 s costuma bastar para CRUD simples.

Fora (4G, Wi‑Fi ruim, VPN lenta, usuário longe do servidor): 10 s vira gargalo quando a requisição:

traz muito dado (lista grande),
gera PDF/relatório,
ou faz várias consultas no backend.
O sintoma típico é o que você viu: timeout of 10000ms exceeded — o Axios desiste antes da API terminar; às vezes o backend até conclui depois.

Recomendação prática (sem mudar tudo de uma vez):

Manter 45 s só no PDF (já está).
Para uso externo, subir o global para algo como 15–20 s ajuda nas telas “normais”.
Não precisa ir para 45 s no global — isso deixa a UI “travada” esperando erro em qualquer falha.
O ideal no médio prazo: timeout maior só nas rotas pesadas + paginação (abaixo).
2) Projetos sem limite de resultados — qual impacto?
No código, a listagem principal não usa skip/take:


projetosController.ts
Lines 23-54
    const projetos = await prisma.projeto.findMany({
      where,
      include: {
        cliente: { ... },
        orcamento: { ... },
        tasks: { ..., take: 10 },
        alocacoes: { ... },  // sem take — traz TODAS as alocações de cada projeto
        vendas: { ..., take: 5 }
      },
      orderBy: { createdAt: 'desc' }
    });
No front (ProjetosModerno), na abertura da tela carrega em paralelo:

todos os projetos,
todos os clientes,
orçamentos aprovados,
usuários,
depois progresso de todos os IDs (/api/projetos/progresso?ids=...).
Impactos reais
Área	O que acontece
Tempo de abertura
Cresce com a quantidade de OS/projetos; fora da rede, mais chance de bater nos 10 s.
Tamanho da resposta
JSON grande → mais download, mais parse no navegador.
Banco
findMany + vários include = consulta pesada; piora conforme histórico cresce.
Memória no browser
Array gigante em React → lista/kanban mais lenta ao rolar/filtrar.
URL de progresso
Passar centenas de IDs na query pode ficar grande (limite de URL do servidor/proxy).
Alocações
Em getProjetos, alocações não têm take — cada projeto pode puxar muitos registros extras.
Quando “dói” na prática
Poucos projetos (dezenas): costuma ir bem.
Dezenas a ~100: já pode sentir lentidão e timeouts esporádicos fora da rede.
Centenas+: risco alto de tela lenta, timeout e consumo alto de RAM.
Ou seja: não é bug imediato, mas é dívida técnica que escala mal — e combina mal com timeout de 10 s em rede externa.

O que faria sentido (quando for priorizar)
Paginação no backend (page, pageSize, total) em GET /api/projetos.
Lista “leve” na grade/kanban (só campos do card); detalhe completo só ao abrir um projeto.
Limitar alocacoes na listagem (ou não incluir na lista).
Timeout global 15–20 s se muitos usuários acessam de fora — ou variável de ambiente VITE_API_TIMEOUT.
Manter timeouts altos só em rotas pesadas (PDF, upload, relatórios).
Se quiser, no próximo passo posso implementar paginação mínima em projetos (ex.: 25 por página) + subir o timeout global para 20 s só via env de produção, sem quebrar o que já funciona na rede interna.