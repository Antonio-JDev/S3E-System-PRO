import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configuração do Multer para upload de fotos de kits
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/kits-ferramentas');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `kit-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const uploadFotoKit = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
}).single('imagem');

// Multer em memória para folha timbrada (preview personalizado)
const uploadFolhaTimbrada = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens PNG ou JPG são permitidas'));
    }
  }
});

export const uploadFolhaTimbradaHandler = uploadFolhaTimbrada.fields([
  { name: 'folhaTimbrada', maxCount: 1 }
]);

/**
 * POST /api/kits-ferramenta/:id/recibo/preview-personalizado
 * Gera preview do recibo personalizado com folha timbrada
 */
export const gerarReciboPreviewPersonalizado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { opacidade = '0.1' } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('📄 Gerando preview personalizado do recibo para kit:', id);

    let folhaTimbradaUrl: string | undefined;

    // Converter folha timbrada para data URL
    if (files?.folhaTimbrada?.[0]) {
      const folhaBuffer = files.folhaTimbrada[0].buffer;
      const folhaBase64 = folhaBuffer.toString('base64');
      folhaTimbradaUrl = `data:${files.folhaTimbrada[0].mimetype};base64,${folhaBase64}`;
    }

    const kit = await prisma.kitFerramenta.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    }) as any;

    if (!kit) {
      res.status(404).json({
        success: false,
        error: 'Kit não encontrado'
      });
      return;
    }

    // Gerar HTML do recibo com folha timbrada
    const html = gerarHTMLReciboComFolhaTimbrada(kit, folhaTimbradaUrl, parseFloat(opacidade));

    res.json({
      success: true,
      data: { html }
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar preview personalizado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar preview personalizado',
      error: error.message
    });
  }
};

/**
 * Função auxiliar para gerar HTML do recibo com folha timbrada
 */
function gerarHTMLReciboComFolhaTimbrada(kit: any, folhaTimbradaUrl?: string, opacidade: number = 0.1): string {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Entrega de Kit - ${kit.nome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { 
            size: A4; 
            margin: 0; 
        }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
            background: white;
            color: #111827;
            font-size: 10pt;
            line-height: 1.3;
            position: relative;
        }

        /* === FOLHA TIMBRADA / MARCA D'ÁGUA === */
        .watermark-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }

        .watermark-background.custom-letterhead {
            background-image: ${folhaTimbradaUrl ? `url('${folhaTimbradaUrl}')` : 'none'};
            background-size: 210mm 297mm;
            background-position: top left;
            background-repeat: no-repeat;
            opacity: ${opacidade};
        }

        @media print {
            .watermark-background {
                position: fixed !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header h1 {
            color: #1e40af;
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 9pt;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 10px;
            border-radius: 6px;
        }
        .info-item {
            font-size: 9pt;
        }
        .info-label {
            font-weight: 600;
            color: #374151;
            display: inline;
        }
        .info-value {
            color: #6b7280;
            display: inline;
        }
        .section-title {
            color: #1e40af;
            font-size: 11pt;
            font-weight: bold;
            margin: 12px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #dbeafe;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 9pt;
        }
        .items-table th {
            background: #f3f4f6;
            padding: 6px 4px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #e5e7eb;
            font-size: 8pt;
        }
        .items-table td {
            padding: 5px 4px;
            border: 1px solid #e5e7eb;
        }
        .item-nome {
            font-weight: 600;
            color: #111827;
        }
        .item-detalhes {
            font-size: 8pt;
            color: #6b7280;
        }
        .termo-box {
            background: #fef2f2;
            border: 1px solid #ef4444;
            padding: 10px;
            border-radius: 6px;
            margin: 12px 0;
            font-size: 8pt;
        }
        .termo-box p {
            color: #7f1d1d;
            line-height: 1.4;
            text-align: justify;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .signature-block {
            text-align: center;
        }
        .signature-line {
            border-top: 2px solid #111827;
            margin-top: 40px;
            padding-top: 6px;
        }
        .signature-name {
            font-size: 10pt;
            font-weight: bold;
            color: #111827;
        }
        .signature-label {
            color: #6b7280;
            font-size: 8pt;
        }
        .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            z-index: 1000;
        }
        .print-button:hover {
            background: #1d4ed8;
        }
        @media print {
            body { padding: 0; }
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    ${folhaTimbradaUrl ? `<div class="watermark-background custom-letterhead"></div>` : ''}
    <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>

    <div class="header">
        <h1>RECIBO DE ENTREGA DE KIT DE FERRAMENTAS</h1>
        <p class="subtitle">S3E Engenharia Elétrica - Sistema de Gestão</p>
    </div>

    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">Kit:</span>
            <span class="info-value">${kit.nome}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Recibo:</span>
            <span class="info-value">#${kit.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Eletricista:</span>
            <span class="info-value">${kit.eletricistaNome}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Data de Entrega:</span>
            <span class="info-value">${new Date(kit.dataEntrega).toLocaleDateString('pt-BR')}</span>
        </div>
    </div>

    <h3 class="section-title">Ferramentas Incluídas (${kit.itens.length} itens)</h3>
    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%">#</th>
                <th style="width: 45%">Ferramenta</th>
                <th style="width: 20%">Código</th>
                <th style="width: 15%">Categoria</th>
                <th style="width: 10%">Qtd</th>
                <th style="width: 15%">Estado</th>
            </tr>
        </thead>
        <tbody>
            ${kit.itens.map((item: any, index: number) => `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                <td>
                    <div class="item-nome">${item.ferramenta.nome}</div>
                    ${item.ferramenta.marca || item.ferramenta.modelo ? `
                    <div class="item-detalhes">
                        ${item.ferramenta.marca ? `${item.ferramenta.marca}` : ''}
                        ${item.ferramenta.modelo ? ` - ${item.ferramenta.modelo}` : ''}
                    </div>
                    ` : ''}
                </td>
                <td>${item.ferramenta.codigo}</td>
                <td>${item.ferramenta.categoria}</td>
                <td style="text-align: center; font-weight: bold;">${item.quantidade}</td>
                <td style="font-size: 8pt;">${item.estadoEntrega}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="termo-box">
        <p>
            Eu, <strong>${kit.eletricistaNome}</strong>, afirmo que recebi os itens descritos acima em perfeito estado. 
            Comprometo-me a zelar pelo bom uso e conservação das ferramentas, devolvendo-as quando solicitado ou ao 
            término do meu vínculo com a empresa. Estou ciente de que sou responsável por qualquer dano, perda ou 
            extravio das ferramentas sob minha responsabilidade.
        </p>
    </div>

    <p style="text-align: right; margin: 10px 0; font-size: 9pt;">
        <strong>Itajaí, ${new Date(kit.dataEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
    </p>

    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <div class="signature-name">${kit.eletricistaNome}</div>
                <div class="signature-label">Assinatura do Eletricista</div>
            </div>
        </div>
        <div class="signature-block">
            <div class="signature-line">
                <div class="signature-name">____________________</div>
                <div class="signature-label">Assinatura do Administrador</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>S3E Engenharia Elétrica</strong> | Sistema de Gestão de Ferramentas</p>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${kit.id.substring(0, 8)}</p>
    </div>
</body>
</html>
  `;
  return html;
}

/**
 * GET /api/kits-ferramenta
 * Lista todos os kits de ferramentas
 */
export const listarKits = async (req: Request, res: Response): Promise<void> => {
  try {
    const kits = await prisma.kitFerramenta.findMany({
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: kits,
      count: kits.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar kits:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar kits de ferramentas'
    });
  }
};

/**
 * GET /api/kits-ferramenta/:id
 * Busca um kit específico
 */
export const buscarKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const kit = await prisma.kitFerramenta.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    });

    if (!kit) {
      res.status(404).json({
        success: false,
        error: 'Kit não encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: kit
    });
  } catch (error) {
    console.error('❌ Erro ao buscar kit:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar kit'
    });
  }
};

/**
 * GET /api/kits-ferramenta/eletricista/:eletricistaId
 * Lista kits de um eletricista específico
 */
export const listarKitsPorEletricista = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eletricistaId } = req.params;

    const kits = await prisma.kitFerramenta.findMany({
      where: { eletricistaId },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      },
      orderBy: { dataEntrega: 'desc' }
    });

    res.json({
      success: true,
      data: kits,
      count: kits.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar kits do eletricista:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar kits do eletricista'
    });
  }
};

/**
 * POST /api/kits-ferramenta
 * Cria um novo kit de ferramentas
 */
export const criarKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      nome,
      descricao,
      eletricistaId,
      eletricistaNome,
      dataEntrega,
      imagemUrl,
      assinatura,
      observacoes,
      itens
    } = req.body;

    // Validações
    if (!nome || !eletricistaId || !eletricistaNome || !dataEntrega) {
      res.status(400).json({
        success: false,
        error: 'Nome, eletricista e data de entrega são obrigatórios'
      });
      return;
    }

    if (!itens || itens.length === 0) {
      res.status(400).json({
        success: false,
        error: 'O kit deve conter pelo menos uma ferramenta'
      });
      return;
    }

    // Verificar se eletricista existe
    const eletricista = await prisma.user.findUnique({
      where: { id: eletricistaId }
    });

    if (!eletricista) {
      res.status(404).json({
        success: false,
        error: 'Eletricista não encontrado'
      });
      return;
    }

    // Validar que não há ferramentas com códigos duplicados no kit
    const ferramentasIds = itens.map((item: any) => item.ferramentaId);
    const ferramentasUnicas = await Promise.all(
      ferramentasIds.map(async (id: string) => {
        const ferramenta = await prisma.ferramenta.findUnique({
          where: { id },
          select: { id: true, codigo: true, nome: true }
        });
        return ferramenta;
      })
    );

    // Verificar códigos duplicados
    const codigos = ferramentasUnicas.map(f => f?.codigo).filter(Boolean);
    const codigosUnicos = new Set(codigos);
    if (codigos.length !== codigosUnicos.size) {
      const codigosDuplicados = codigos.filter((codigo, index) => codigos.indexOf(codigo) !== index);
      res.status(400).json({
        success: false,
        error: `Existem ferramentas com códigos duplicados no kit. Códigos duplicados: ${[...new Set(codigosDuplicados)].join(', ')}`
      });
      return;
    }

    // Validar estoque e calcular preço total antes de criar o kit
    let precoTotalKit = 0;
    const ferramentasParaValidar = await Promise.all(
      itens.map(async (item: any) => {
        const ferramenta = await prisma.ferramenta.findUnique({
          where: { id: item.ferramentaId }
        });
        
        if (!ferramenta) {
          throw new Error(`Ferramenta ${item.ferramentaId} não encontrada`);
        }
        
        const quantidadeNecessaria = item.quantidade || 1;
        const estoqueDisponivel = ferramenta.quantidade || 0;
        
        // Verificar se há estoque suficiente
        if (estoqueDisponivel < quantidadeNecessaria) {
          throw new Error(
            `Estoque insuficiente para ${ferramenta.nome}. ` +
            `Disponível: ${estoqueDisponivel}, Necessário: ${quantidadeNecessaria}`
          );
        }
        
        // Calcular subtotal (valorCompra * quantidade)
        const subtotal = (ferramenta.valorCompra || 0) * quantidadeNecessaria;
        precoTotalKit += subtotal;
        
        return { ferramenta, quantidadeNecessaria, subtotal };
      })
    );

    // Criar kit com itens e dar baixa no estoque em transação
    const kit = await prisma.$transaction(async (tx) => {
      // 1. Criar o kit
      const kitCriado = await tx.kitFerramenta.create({
        data: {
          nome,
          descricao: descricao || null,
          eletricistaId,
          eletricistaNome,
          dataEntrega: new Date(dataEntrega),
          imagemUrl: imagemUrl || null,
          assinatura: assinatura || null,
          observacoes: observacoes || null,
          ativo: true,
          itens: {
            create: itens.map((item: any) => ({
              ferramentaId: item.ferramentaId,
              quantidade: item.quantidade || 1,
              estadoEntrega: item.estadoEntrega || 'Novo',
              observacoes: item.observacoes || null
            }))
          }
        },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          }
        }
      });

      // 2. Dar baixa no estoque de cada ferramenta
      for (const { ferramenta, quantidadeNecessaria } of ferramentasParaValidar) {
        await tx.ferramenta.update({
          where: { id: ferramenta.id },
          data: {
            quantidade: {
              decrement: quantidadeNecessaria
            }
          }
        });
      }

      return kitCriado;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entity: 'KitFerramenta',
        entityId: kit.id,
        description: `Kit "${nome}" criado e entregue para ${eletricistaNome}`,
        metadata: {
          eletricistaId,
          totalFerramentas: itens.length,
          precoTotal: precoTotalKit
        }
      }
    });

    console.log(`✅ Kit criado: ${kit.nome} para ${eletricistaNome} (${itens.length} ferramentas) - Valor Total: R$ ${precoTotalKit.toFixed(2)}`);

    res.json({
      success: true,
      data: {
        ...kit,
        precoTotal: precoTotalKit // Incluir preço total no retorno
      },
      message: '✅ Kit de ferramentas criado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar kit:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar kit de ferramentas'
    });
  }
};

/**
 * PUT /api/kits-ferramenta/:id
 * Atualiza um kit (suporta edição completa: nome, descrição, imagem, observações e itens)
 */
export const atualizarKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      nome,
      descricao,
      imagemUrl,
      observacoes,
      itens // Array de itens para adicionar/atualizar
    } = req.body;

    const kit = await prisma.kitFerramenta.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    });

    if (!kit) {
      res.status(404).json({
        success: false,
        error: 'Kit não encontrado'
      });
      return;
    }

    // Atualizar kit em transação para garantir consistência
    const kitAtualizado = await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados básicos do kit
      const kitAtualizado = await tx.kitFerramenta.update({
        where: { id },
        data: {
          nome: nome !== undefined ? nome : kit.nome,
          descricao: descricao !== undefined ? descricao : kit.descricao,
          imagemUrl: imagemUrl !== undefined ? imagemUrl : kit.imagemUrl,
          observacoes: observacoes !== undefined ? observacoes : kit.observacoes,
          updatedAt: new Date() // Garantir atualização da data
        }
      });

      // 2. Se itens foram fornecidos, sincronizar itens do kit
      if (itens !== undefined && Array.isArray(itens)) {
        // Obter IDs das ferramentas que devem estar no kit
        const ferramentasIdsAtuais = itens.map(item => item.ferramentaId);
        const ferramentasIdsExistentes = kit.itens.map(item => item.ferramentaId);

        // Identificar itens a remover (estavam no kit mas não estão mais na lista)
        const itensParaRemover = kit.itens.filter(item => !ferramentasIdsAtuais.includes(item.ferramentaId));

        // Remover itens que foram excluídos e devolver ao estoque
        for (const itemRemover of itensParaRemover) {
          await tx.kitFerramentaItem.delete({
            where: { id: itemRemover.id }
          });

          // Devolver ao estoque
          await tx.ferramenta.update({
            where: { id: itemRemover.ferramentaId },
            data: {
              quantidade: {
                increment: itemRemover.quantidade
              }
            }
          });
        }

        // Identificar itens novos (não estavam no kit)
        const itensNovos = itens.filter(item => !ferramentasIdsExistentes.includes(item.ferramentaId));

        // Validar que não há ferramentas com códigos duplicados no kit (incluindo itens existentes)
        const todosFerramentasIds = itens.map((item: any) => item.ferramentaId);
        const todasFerramentas = await Promise.all(
          todosFerramentasIds.map(async (id: string) => {
            const ferramenta = await tx.ferramenta.findUnique({
              where: { id },
              select: { id: true, codigo: true, nome: true }
            });
            return ferramenta;
          })
        );

        // Verificar códigos duplicados
        const codigos = todasFerramentas.map(f => f?.codigo).filter(Boolean);
        const codigosUnicos = new Set(codigos);
        if (codigos.length !== codigosUnicos.size) {
          const codigosDuplicados = codigos.filter((codigo, index) => codigos.indexOf(codigo) !== index);
          throw new Error(
            `Existem ferramentas com códigos duplicados no kit. Códigos duplicados: ${[...new Set(codigosDuplicados)].join(', ')}`
          );
        }

        // Validar estoque para novos itens
        for (const item of itensNovos) {
          const ferramenta = await tx.ferramenta.findUnique({
            where: { id: item.ferramentaId }
          });

          if (!ferramenta) {
            throw new Error(`Ferramenta ${item.ferramentaId} não encontrada`);
          }

          const quantidadeNecessaria = item.quantidade || 1;
          
          // Verificar se há estoque suficiente
          if (ferramenta.quantidade < quantidadeNecessaria) {
            throw new Error(
              `Estoque insuficiente para ${ferramenta.nome}. ` +
              `Disponível: ${ferramenta.quantidade}, Necessário: ${quantidadeNecessaria}`
            );
          }
        }

        // Adicionar novos itens ao kit e dar baixa no estoque
        for (const item of itensNovos) {
          await tx.kitFerramentaItem.create({
            data: {
              kitId: id,
              ferramentaId: item.ferramentaId,
              quantidade: item.quantidade || 1,
              estadoEntrega: item.estadoEntrega || 'Novo',
              observacoes: item.observacoes || null
            }
          });

          // Dar baixa no estoque
          await tx.ferramenta.update({
            where: { id: item.ferramentaId },
            data: {
              quantidade: {
                decrement: item.quantidade || 1
              }
            }
          });
        }

        // Atualizar itens existentes (quantidade e estado)
        const itensParaAtualizar = itens.filter(item => ferramentasIdsExistentes.includes(item.ferramentaId));
        for (const item of itensParaAtualizar) {
          const itemExistente = kit.itens.find(i => i.ferramentaId === item.ferramentaId);
          if (itemExistente) {
            const novaQuantidade = item.quantidade || 1;
            const quantidadeAnterior = itemExistente.quantidade;

            // Atualizar item
            await tx.kitFerramentaItem.update({
              where: { id: itemExistente.id },
              data: {
                quantidade: novaQuantidade,
                estadoEntrega: item.estadoEntrega || itemExistente.estadoEntrega,
                observacoes: item.observacoes !== undefined ? item.observacoes : itemExistente.observacoes
              }
            });

            // Ajustar estoque se quantidade mudou
            if (novaQuantidade !== quantidadeAnterior) {
              const diferenca = novaQuantidade - quantidadeAnterior;
              if (diferenca > 0) {
                // Aumentou quantidade - verificar estoque e dar baixa
                const ferramenta = await tx.ferramenta.findUnique({
                  where: { id: item.ferramentaId }
                });
                if (ferramenta && ferramenta.quantidade < diferenca) {
                  throw new Error(`Estoque insuficiente para aumentar quantidade. Disponível: ${ferramenta.quantidade}, Necessário: ${diferenca}`);
                }
                await tx.ferramenta.update({
                  where: { id: item.ferramentaId },
                  data: {
                    quantidade: { decrement: diferenca }
                  }
                });
              } else {
                // Diminuiu quantidade - devolver ao estoque
                await tx.ferramenta.update({
                  where: { id: item.ferramentaId },
                  data: {
                    quantidade: { increment: Math.abs(diferenca) }
                  }
                });
              }
            }
          }
        }
      }

      // 3. Retornar kit atualizado com todos os itens
      return await tx.kitFerramenta.findUnique({
        where: { id },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          }
        }
      });
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'UPDATE',
        entity: 'KitFerramenta',
        entityId: id,
        description: `Kit "${kitAtualizado?.nome}" atualizado`,
        metadata: {
          nome: nome !== undefined,
          descricao: descricao !== undefined,
          imagemUrl: imagemUrl !== undefined,
          observacoes: observacoes !== undefined,
          novosItens: itens ? itens.length : 0
        }
      }
    });

    console.log(`✅ Kit atualizado: ${kitAtualizado?.nome}`);

    res.json({
      success: true,
      data: kitAtualizado,
      message: '✅ Kit atualizado com sucesso!'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar kit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar kit'
    });
  }
};

/**
 * DELETE /api/kits-ferramenta/:id
 * Exclui permanentemente um kit (hard delete)
 */
export const deletarKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    // Buscar kit com itens para devolver ao estoque
    const kit = await prisma.kitFerramenta.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    });

    if (!kit) {
      res.status(404).json({
        success: false,
        error: 'Kit não encontrado'
      });
      return;
    }

    // Salvar dados para audit log antes de deletar
    const kitNome = kit.nome;
    const eletricistaId = kit.eletricistaId;
    const quantidadeItens = kit.itens?.length || 0;

    // Devolver ferramentas ao estoque e deletar kit permanentemente em transação
    await prisma.$transaction(async (tx) => {
      // 1. Devolver ferramentas ao estoque
      if (kit.itens && kit.itens.length > 0) {
        for (const item of kit.itens) {
          await tx.ferramenta.update({
            where: { id: item.ferramentaId },
            data: {
              quantidade: {
                increment: item.quantidade
              }
            }
          });
        }
        console.log(`✅ ${kit.itens.length} ferramentas devolvidas ao estoque do kit "${kit.nome}"`);
      }

      // 2. Deletar kit permanentemente (hard delete)
      // Os itens serão deletados automaticamente pelo cascade (onDelete: Cascade)
      await tx.kitFerramenta.delete({
        where: { id }
      });
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'DELETE',
        entity: 'KitFerramenta',
        entityId: id,
        description: `Kit "${kitNome}" excluído permanentemente (${quantidadeItens} itens)`,
        metadata: { eletricistaId: eletricistaId }
      }
    });

    console.log(`✅ Kit excluído permanentemente: ${kitNome}`);

    res.json({
      success: true,
      message: '✅ Kit excluído com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar kit:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir kit'
    });
  }
};

/**
 * POST /api/kits-ferramenta/upload-foto
 * Faz upload de foto do kit entregue
 */
export const uploadFotoKitHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada'
      });
      return;
    }

    const imageUrl = `/uploads/kits-ferramentas/${file.filename}`;
    
    console.log(`✅ Foto do kit enviada: ${file.filename}`);

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: file.filename
      },
      message: '✅ Foto enviada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao fazer upload da foto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer upload da foto'
    });
  }
};

/**
 * GET /api/kits-ferramenta/:id/recibo
 * Gera recibo em HTML/PDF do kit de ferramentas
 */
export const gerarRecibo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const kit = await prisma.kitFerramenta.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            ferramenta: true
          }
        }
      }
    }) as any;

    if (!kit) {
      res.status(404).json({
        success: false,
        error: 'Kit não encontrado'
      });
      return;
    }

    // Gerar HTML do recibo (formato compacto A4)
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Entrega de Kit - ${kit.nome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 0; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            color: #111827;
            font-size: 10pt;
            line-height: 1.3;
            position: relative;
        }
        .page-content {
            padding: 15mm;
            position: relative;
            z-index: 2;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header h1 {
            color: #1e40af;
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 9pt;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 10px;
            border-radius: 6px;
        }
        .info-item {
            font-size: 9pt;
        }
        .info-label {
            font-weight: 600;
            color: #374151;
            display: inline;
        }
        .info-value {
            color: #6b7280;
            display: inline;
        }
        .section-title {
            color: #1e40af;
            font-size: 11pt;
            font-weight: bold;
            margin: 12px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #dbeafe;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 9pt;
        }
        .items-table th {
            background: #f3f4f6;
            padding: 6px 4px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #e5e7eb;
            font-size: 8pt;
        }
        .items-table td {
            padding: 5px 4px;
            border: 1px solid #e5e7eb;
        }
        .item-nome {
            font-weight: 600;
            color: #111827;
        }
        .item-detalhes {
            font-size: 8pt;
            color: #6b7280;
        }
        .termo-box {
            background: #fef2f2;
            border: 1px solid #ef4444;
            padding: 10px;
            border-radius: 6px;
            margin: 12px 0;
            font-size: 8pt;
        }
        .termo-box p {
            color: #7f1d1d;
            line-height: 1.4;
            text-align: justify;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .signature-block {
            text-align: center;
        }
        .signature-line {
            border-top: 2px solid #111827;
            margin-top: 40px;
            padding-top: 6px;
        }
        .signature-name {
            font-size: 10pt;
            font-weight: bold;
            color: #111827;
        }
        .signature-label {
            color: #6b7280;
            font-size: 8pt;
        }
        .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            z-index: 1000;
        }
        .print-button:hover {
            background: #1d4ed8;
        }
        @media print {
            body { padding: 0; }
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>

    <div class="header">
        <h1>RECIBO DE ENTREGA DE KIT DE FERRAMENTAS</h1>
        <p class="subtitle">S3E Engenharia Elétrica - Sistema de Gestão</p>
    </div>

    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">Kit:</span>
            <span class="info-value">${kit.nome}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Recibo:</span>
            <span class="info-value">#${kit.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Eletricista:</span>
            <span class="info-value">${kit.eletricistaNome}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Data de Entrega:</span>
            <span class="info-value">${new Date(kit.dataEntrega).toLocaleDateString('pt-BR')}</span>
        </div>
    </div>

    <h3 class="section-title">Ferramentas Incluídas (${kit.itens.length} itens)</h3>
    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%">#</th>
                <th style="width: 45%">Ferramenta</th>
                <th style="width: 20%">Código</th>
                <th style="width: 15%">Categoria</th>
                <th style="width: 10%">Qtd</th>
                <th style="width: 15%">Estado</th>
            </tr>
        </thead>
        <tbody>
            ${kit.itens.map((item, index) => `
            <tr>
                <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                <td>
                    <div class="item-nome">${item.ferramenta.nome}</div>
                    ${item.ferramenta.marca || item.ferramenta.modelo ? `
                    <div class="item-detalhes">
                        ${item.ferramenta.marca ? `${item.ferramenta.marca}` : ''}
                        ${item.ferramenta.modelo ? ` - ${item.ferramenta.modelo}` : ''}
                    </div>
                    ` : ''}
                </td>
                <td>${item.ferramenta.codigo}</td>
                <td>${item.ferramenta.categoria}</td>
                <td style="text-align: center; font-weight: bold;">${item.quantidade}</td>
                <td style="font-size: 8pt;">${item.estadoEntrega}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="termo-box">
        <p>
            Eu, <strong>${kit.eletricistaNome}</strong>, afirmo que recebi os itens descritos acima em perfeito estado. 
            Comprometo-me a zelar pelo bom uso e conservação das ferramentas, devolvendo-as quando solicitado ou ao 
            término do meu vínculo com a empresa. Estou ciente de que sou responsável por qualquer dano, perda ou 
            extravio das ferramentas sob minha responsabilidade.
        </p>
    </div>

    <p style="text-align: right; margin: 10px 0; font-size: 9pt;">
        <strong>Itajaí, ${new Date(kit.dataEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
    </p>

    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line">
                <div class="signature-name">${kit.eletricistaNome}</div>
                <div class="signature-label">Assinatura do Eletricista</div>
            </div>
        </div>
        <div class="signature-block">
            <div class="signature-line">
                <div class="signature-name">____________________</div>
                <div class="signature-label">Assinatura do Administrador</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>S3E Engenharia Elétrica</strong> | Sistema de Gestão de Ferramentas</p>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${kit.id.substring(0, 8)}</p>
    </div>

    <script>
        // Auto print quando abrir
        window.onload = function() {
            // Pequeno delay para carregar CSS
            setTimeout(function() {
                window.print();
            }, 800);
        };
    </script>
</body>
</html>
    `;

    // Retornar HTML como JSON para o frontend processar
    res.status(200).json({
      success: true,
      data: html,
      message: '✅ Recibo gerado com sucesso!'
    });

    console.log(`✅ Recibo gerado para kit: ${kit.nome} (${kit.eletricistaNome || 'N/A'})`);
  } catch (error) {
    console.error('❌ Erro ao gerar recibo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar recibo. Tente novamente mais tarde.'
    });
  }
};

