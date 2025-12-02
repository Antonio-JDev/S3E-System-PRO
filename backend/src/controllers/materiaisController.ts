import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { classificarMaterialPorNome, normalizarCategoria, isCategoriaValida } from '../utils/materialClassifier';

const prisma = new PrismaClient();

// No CommonJS, __dirname já está disponível automaticamente

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const uploadImportFile = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|csv|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JSON, XLSX ou CSV são permitidos'));
    }
  }
}).single('arquivo');

// Listar todos os materiais
export const getMateriais = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria, ativo } = req.query;
    
    const where: any = {};
    if (categoria) where.categoria = categoria;
    // ✅ CORREÇÃO: Filtrar por ativo: true por padrão (mostrar apenas materiais ativos)
    // Se ativo for explicitamente 'false', mostrar apenas inativos
    // Se não for especificado, mostrar apenas ativos
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    } else {
      where.ativo = true; // Por padrão, mostrar apenas materiais ativos
    }

    const materiais = await prisma.material.findMany({
      where,
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    res.json(materiais);
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
};

// Buscar material por ID
export const getMaterialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        movimentacoes: {
          orderBy: { data: 'desc' },
          take: 10
        }
      }
    });

    if (!material) {
      res.status(404).json({ error: 'Material não encontrado' });
      return;
    }

    res.json(material);
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
};

// Criar material
export const createMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    let { categoria, nome, ...rest } = req.body;
    
    // Normalizar categoria se fornecida
    if (categoria) {
      categoria = normalizarCategoria(categoria);
    }
    
    // Se categoria não fornecida ou inválida, classificar automaticamente
    if (!categoria || !isCategoriaValida(categoria)) {
      categoria = classificarMaterialPorNome(nome || '');
      console.log(`🔍 Categoria auto-classificada: "${categoria}" para "${nome}"`);
    }
    
    const material = await prisma.material.create({
      data: {
        ...rest,
        nome,
        categoria
      }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro ao criar material' });
  }
};

// Atualizar material
export const updateMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let { categoria, nome, ...rest } = req.body;

    // Normalizar categoria se fornecida
    if (categoria) {
      categoria = normalizarCategoria(categoria);
    }

    // Se categoria não fornecida ou inválida, classificar automaticamente
    if (!categoria || !isCategoriaValida(categoria)) {
      // Buscar nome atual do material se não foi fornecido
      if (!nome) {
        const materialAtual = await prisma.material.findUnique({
          where: { id },
          select: { nome: true }
        });
        nome = materialAtual?.nome || '';
      }
      categoria = classificarMaterialPorNome(nome);
      console.log(`🔍 Categoria auto-classificada na atualização: "${categoria}" para "${nome}"`);
    }

    const material = await prisma.material.update({
      where: { id },
      data: {
        ...rest,
        ...(nome && { nome }),
        categoria
      }
    });

    res.json(material);
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
};

// Deletar material
export const deleteMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role?.toLowerCase(); // Role do usuário autenticado

    // Verificar se o material existe
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        compraItems: true,
        orcamentoItems: true,
        kitItems: true,
        movimentacoes: true
      }
    });

    if (!material) {
      res.status(404).json({ success: false, error: 'Material não encontrado' });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor', 'administrador'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas Administradores e Desenvolvedores podem excluir materiais permanentemente.'
        });
        return;
      }

      // Exclusão permanente - deletar do banco
      // Nota: Isso pode quebrar referências em compras, orçamentos, etc.
      // Mas desenvolvedor/admin tem permissão para fazer isso
      await prisma.material.delete({
        where: { id }
      });

      res.json({ 
        success: true,
        message: 'Material excluído permanentemente do banco de dados' 
      });
      return;
    }

    // SOFT DELETE (para outros usuários ou quando não especificado permanent)
    // Verificar se há registros relacionados em compras ou contas a pagar
    // Mesmo que haja, vamos fazer soft delete (desativar) para manter histórico
    // O material não será excluído fisicamente, apenas desativado
    await prisma.material.update({
      where: { id },
      data: {
        ativo: false,
        updatedAt: new Date()
      }
    });

    // Nota: O material permanece no banco de dados para manter histórico
    // de compras, contas a pagar, orçamentos, etc.
    res.json({ 
      success: true,
      message: 'Material desativado com sucesso. Ele permanecerá no histórico de compras e contas a pagar.' 
    });
  } catch (error) {
    console.error('Erro ao deletar material:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar material' });
  }
};

// Registrar movimentação de estoque
export const registrarMovimentacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId, tipo, quantidade, motivo, referencia, observacoes } = req.body;

    // Buscar material atual
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      res.status(404).json({ error: 'Material não encontrado' });
      return;
    }

    // Calcular novo estoque
    let novoEstoque = material.estoque;
    if (tipo === 'ENTRADA') {
      novoEstoque += quantidade;
    } else if (tipo === 'SAIDA') {
      novoEstoque -= quantidade;
      if (novoEstoque < 0) {
        res.status(400).json({ error: 'Estoque insuficiente' });
        return;
      }
    }

    // Criar movimentação e atualizar estoque em transação
    const [movimentacao, materialAtualizado] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          materialId,
          tipo,
          quantidade,
          motivo,
          referencia,
          observacoes
        }
      }),
      prisma.material.update({
        where: { id: materialId },
        data: { estoque: novoEstoque }
      })
    ]);

    res.status(201).json({ movimentacao, material: materialAtualizado });
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
};

// Obter histórico de movimentações
export const getMovimentacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId } = req.query;

    const where = materialId ? { materialId: materialId as string } : {};

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        material: {
          select: { id: true, nome: true, sku: true }
        }
      },
      orderBy: { data: 'desc' },
      take: 100
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ error: 'Erro ao buscar movimentações' });
  }
};

// Obter histórico de compras de um material
export const getHistoricoCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const compraItems = await prisma.compraItem.findMany({
      where: { materialId: id },
      include: {
        compra: {
          select: {
            dataCompra: true,
            dataEmissaoNF: true,
            numeroNF: true,
            fornecedorNome: true,
            status: true
          }
        }
      },
      orderBy: { compra: { dataCompra: 'desc' } }
    });

    const historico = compraItems.map(item => ({
      dataCompra: item.compra.dataCompra,
      numeroNF: item.compra.numeroNF,
      fornecedor: item.compra.fornecedorNome,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnit,
      valorTotal: item.valorTotal,
      status: item.compra.status,
      nomeProduto: item.nomeProduto // Incluir nome do produto da compra
    }));

    res.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico de compras:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de compras' });
  }
};

// Buscar materiais similares pelo nome (para verificação de duplicatas)
export const buscarMateriaisSimilares = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nomeProduto, ncm } = req.body;

    if (!nomeProduto) {
      res.status(400).json({ error: 'Nome do produto é obrigatório' });
      return;
    }

    console.log(`🔍 Buscando materiais similares a: "${nomeProduto}"`);

    // Extrair palavras-chave do nome (mínimo 3 caracteres)
    const palavrasChave = nomeProduto
      .split(/\s+/)
      .filter((palavra: string) => palavra.length >= 3)
      .slice(0, 5); // Limitar a 5 palavras-chave principais

    const materiaisSimilares = await prisma.material.findMany({
      where: {
        AND: [
          { ativo: true },
          {
            OR: [
              // Busca exata pelo nome
              { nome: { equals: nomeProduto, mode: 'insensitive' } },
              // Busca exata pela descrição
              { descricao: { equals: nomeProduto, mode: 'insensitive' } },
              // Busca por NCM se fornecido
              ...(ncm ? [{ sku: { contains: String(ncm) } }] : []),
              // Busca por palavras-chave no nome
              ...palavrasChave.map((palavra: string) => ({
                nome: { contains: palavra, mode: 'insensitive' as any }
              })),
              // Busca por palavras-chave na descrição
              ...palavrasChave.map((palavra: string) => ({
                descricao: { contains: palavra, mode: 'insensitive' as any }
              }))
            ]
          }
        ]
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      },
      take: 10, // Limitar a 10 resultados
      orderBy: { nome: 'asc' }
    });

    console.log(`✅ Encontrados ${materiaisSimilares.length} materiais similares`);

    res.json(materiaisSimilares);
  } catch (error) {
    console.error('Erro ao buscar materiais similares:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais similares' });
  }
};

// Corrigir nomes genéricos de materiais baseado no histórico de compras
export const corrigirNomesGenericos = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar materiais com nomes genéricos
    const materiaisGenericos = await prisma.material.findMany({
      where: {
        OR: [
          { nome: { contains: 'Produto importado via XML' } },
          { categoria: 'Importado XML' }
        ]
      }
    });

    console.log(`📋 Encontrados ${materiaisGenericos.length} materiais com nomes genéricos`);

    let corrigidos = 0;

    for (const material of materiaisGenericos) {
      // Buscar a compra mais recente deste material
      const compraItem = await prisma.compraItem.findFirst({
        where: { materialId: material.id },
        orderBy: { compra: { dataCompra: 'desc' } },
        include: { compra: true }
      });

      if (compraItem && compraItem.nomeProduto && !compraItem.nomeProduto.includes('Produto importado')) {
        // Classificar categoria automaticamente baseado no nome do produto
        const categoriaClassificada = classificarMaterialPorNome(compraItem.nomeProduto);
        
        // Atualizar com o nome real do produto
        await prisma.material.update({
          where: { id: material.id },
          data: {
            nome: compraItem.nomeProduto,
            descricao: compraItem.nomeProduto,
            categoria: categoriaClassificada // ✅ Categoria classificada automaticamente
          }
        });
        console.log(`✅ Material ${material.id} atualizado: "${compraItem.nomeProduto}"`);
        corrigidos++;
      }
    }

    res.json({
      success: true,
      message: `${corrigidos} materiais corrigidos com sucesso`,
      total: materiaisGenericos.length,
      corrigidos
    });
  } catch (error) {
    console.error('Erro ao corrigir nomes genéricos:', error);
    res.status(500).json({ error: 'Erro ao corrigir nomes genéricos' });
  }
};

/**
 * Exportar materiais críticos (estoque baixo/zerado) para cotação com fornecedor
 * GET /api/materiais/exportar-criticos?formato=xlsx|csv|pdf
 */
export const exportarMateriaisCriticos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formato = 'xlsx' } = req.query;

    // Buscar materiais com estoque crítico
    // Primeiro buscar todos os materiais ativos
    const todosMateriais = await prisma.material.findMany({
      where: {
        ativo: true
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true, email: true, telefone: true }
        }
      },
      orderBy: [
        { estoque: 'asc' },
        { sku: 'asc' }
      ]
    });

    // Filtrar materiais críticos (estoque zerado ou abaixo do mínimo)
    const materiais = todosMateriais.filter(m => 
      m.estoque === 0 || m.estoque <= m.estoqueMinimo
    );

    console.log(`📊 Exportando ${materiais.length} materiais críticos em formato ${formato}`);

    if (materiais.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Nenhum material com estoque crítico encontrado'
      });
      return;
    }

    // Gerar arquivo conforme formato solicitado
    if (formato === 'xlsx') {
      await gerarExcelCotacao(res, materiais);
    } else if (formato === 'csv') {
      await gerarCSVCotacao(res, materiais);
    } else if (formato === 'pdf') {
      await gerarPDFCotacao(res, materiais);
    } else {
      res.status(400).json({ error: 'Formato inválido. Use: xlsx, csv ou pdf' });
    }

  } catch (error) {
    console.error('Erro ao exportar materiais críticos:', error);
    res.status(500).json({ error: 'Erro ao exportar materiais críticos' });
  }
};

/**
 * Gerar arquivo Excel para cotação com fornecedor
 */
async function gerarExcelCotacao(res: Response, materiais: any[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'S3E Engenharia';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Materiais para Cotação');

    // Mesclar células do cabeçalho
    sheet.mergeCells('A1:I1');
    sheet.mergeCells('A2:I2');
    sheet.mergeCells('A4:I4');

    // Cabeçalho
    sheet.getCell('A1').value = 'S3E ENGENHARIA ELÉTRICA - SOLICITAÇÃO DE COTAÇÃO';
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1a5490' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 25;

    sheet.getCell('A2').value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    sheet.getCell('A2').font = { size: 11 };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    sheet.getCell('A4').value = 'INSTRUÇÕES: Preencha a coluna "Preço Fornecedor" com os valores atualizados. Não altere as outras colunas!';
    sheet.getCell('A4').font = { bold: true, color: { argb: 'FFF57C00' } };
    sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(4).height = 30;

    // Cabeçalhos das colunas (linha 6)
    const headerRow = sheet.getRow(6);
    headerRow.values = [
      'Código (SKU)',
      'Nome do Material',
      'Unidade',
      'Estoque Atual',
      'Estoque Mínimo',
      'Preço Atual',
      'Preço Fornecedor',
      'Fornecedor Atual',
      'Observações'
    ];

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Adicionar bordas ao header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados (começando da linha 7)
    let rowIndex = 7;
    materiais.forEach((material) => {
      const row = sheet.getRow(rowIndex);
      row.values = [
        material.sku,
        material.nome || material.descricao,
        material.unidadeMedida,
        material.estoque,
        material.estoqueMinimo,
        material.preco || 0,
        null, // Preço Fornecedor vazio
        material.fornecedor?.nome || 'N/A',
        null // Observações
      ];

      // Colorir linhas de estoque zerado
      const fillColor = material.estoque === 0 ? 'FFFFEBEE' : 'FFFFFDE7';
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });

      rowIndex++;
    });

    // Formatação de colunas
    sheet.getColumn(1).width = 15; // SKU
    sheet.getColumn(2).width = 40; // Nome
    sheet.getColumn(3).width = 10; // Unidade
    sheet.getColumn(4).width = 12; // Estoque Atual
    sheet.getColumn(5).width = 15; // Estoque Mínimo
    sheet.getColumn(6).width = 15; // Preço Atual
    sheet.getColumn(7).width = 15; // Preço Fornecedor
    sheet.getColumn(8).width = 25; // Fornecedor
    sheet.getColumn(9).width = 30; // Observações

    // Formato numérico
    sheet.getColumn(4).numFmt = '0';
    sheet.getColumn(5).numFmt = '0';
    sheet.getColumn(6).numFmt = '"R$ "#,##0.00';
    sheet.getColumn(7).numFmt = '"R$ "#,##0.00';

    // Alinhar células de dados
    for (let i = 7; i < rowIndex; i++) {
      const row = sheet.getRow(i);
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // Configurar headers antes de escrever
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-criticos-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Escrever diretamente no response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Erro ao gerar Excel:', error);
    throw error;
  }
}

/**
 * Gerar arquivo CSV para cotação
 */
async function gerarCSVCotacao(res: Response, materiais: any[]) {
  let csv = 'Código (SKU);Nome do Material;Unidade;Estoque Atual;Estoque Mínimo;Preço Atual;Preço Fornecedor;Fornecedor Atual;Observações\n';

  materiais.forEach((material) => {
    csv += `${material.sku};`;
    csv += `${material.nome || material.descricao};`;
    csv += `${material.unidadeMedida};`;
    csv += `${material.estoque};`;
    csv += `${material.estoqueMinimo};`;
    csv += `${(material.preco || 0).toFixed(2)};`;
    csv += `;`; // Preço Fornecedor vazio para preenchimento
    csv += `${material.fornecedor?.nome || 'N/A'};`;
    csv += `\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-criticos-${new Date().toISOString().split('T')[0]}.csv`);
  
  // Adicionar BOM UTF-8 para Excel reconhecer corretamente
  res.write('\uFEFF');
  res.write(csv);
  res.end();
}

/**
 * Gerar arquivo PDF para cotação
 */
async function gerarPDFCotacao(res: Response, materiais: any[]) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-criticos-${new Date().toISOString().split('T')[0]}.pdf`);

  doc.pipe(res);

  // Cabeçalho
  doc.fontSize(16).fillColor('#000000').text('S3E ENGENHARIA ELÉTRICA', 30, 30, { align: 'center', width: 782 });
  doc.fontSize(12).fillColor('#333333').text('Solicitação de Cotação - Materiais Críticos', 30, 50, { align: 'center', width: 782 });
  doc.fontSize(9).fillColor('#666666').text(
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    30, 70, { align: 'center', width: 782 }
  );

  // Instruções
  doc.fontSize(8).fillColor('#FF6600').text(
    'INSTRUÇÕES: Preencha a coluna "Novo Preço" e retorne este documento',
    30, 90, { align: 'center', width: 782 }
  );

  let yPos = 110;

  // Tabela - Header
  doc.fontSize(8).fillColor('#FFFFFF');
  doc.rect(30, yPos, 782, 20).fill('#4CAF50');

  const headers = ['SKU', 'Material', 'Un', 'Estq', 'Mín', 'Preço Atual', 'Novo Preço', 'Fornecedor'];
  const colX = [35, 100, 330, 370, 410, 450, 530, 610];
  
  headers.forEach((header, i) => {
    doc.fontSize(8).fillColor('#FFFFFF').text(header, colX[i], yPos + 6);
  });

  yPos += 20;

  // Linhas de materiais
  materiais.forEach((material, index) => {
    if (yPos > 540) {
      doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
      yPos = 30;
      
      // Repetir header na nova página
      doc.rect(30, yPos, 782, 20).fill('#4CAF50');
      headers.forEach((header, i) => {
        doc.fontSize(8).fillColor('#FFFFFF').text(header, colX[i], yPos + 6);
      });
      yPos += 20;
    }

    // Background alternado
    const bgColor = material.estoque === 0 ? '#FFEBEE' : (index % 2 === 0 ? '#FFFFFF' : '#F5F5F5');
    doc.rect(30, yPos, 782, 18).fill(bgColor);

    // Dados
    doc.fontSize(7).fillColor('#000000');
    doc.text(material.sku || '', 35, yPos + 5);
    doc.text((material.nome || material.descricao || '').substring(0, 30), 100, yPos + 5);
    doc.text(material.unidadeMedida || '', 330, yPos + 5);
    doc.text(material.estoque?.toString() || '0', 370, yPos + 5);
    doc.text(material.estoqueMinimo?.toString() || '0', 410, yPos + 5);
    doc.text(`R$ ${(material.preco || 0).toFixed(2)}`, 450, yPos + 5);
    doc.text('_____________', 530, yPos + 5);
    doc.text((material.fornecedor?.nome || 'N/A').substring(0, 22), 610, yPos + 5);

    yPos += 18;
  });

  // Rodapé
  doc.fontSize(7).fillColor('#999999').text(
    `S3E Engenharia - Total de ${materiais.length} materiais críticos`,
    30, 560, { align: 'center', width: 782 }
  );

  doc.end();
}

/**
 * Importar preços atualizados do fornecedor
 * POST /api/materiais/importar-precos
 */
export const importarPrecos = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    console.log(`📥 Importando preços do arquivo: ${file.filename}`);

    const ext = path.extname(file.filename).toLowerCase();
    let dadosImportados: any[] = [];

    if (ext === '.xlsx') {
      dadosImportados = await processarExcel(file.path);
    } else if (ext === '.csv') {
      dadosImportados = await processarCSV(file.path);
    } else {
      res.status(400).json({
        success: false,
        error: 'Formato de arquivo inválido'
      });
      return;
    }

    // Processar atualizações
    let atualizados = 0;
    let erros = 0;
    const detalhes: any[] = [];

    for (const item of dadosImportados) {
      try {
        const { sku, precoFornecedor } = item;

        // Validar dados
        if (!sku || !precoFornecedor || isNaN(parseFloat(precoFornecedor)) || parseFloat(precoFornecedor) <= 0) {
          erros++;
          detalhes.push({
            sku,
            erro: 'Preço inválido ou não informado'
          });
          continue;
        }

        // Buscar material pelo SKU
        const material = await prisma.material.findUnique({
          where: { sku }
        });

        if (!material) {
          erros++;
          detalhes.push({
            sku,
            erro: 'Material não encontrado'
          });
          continue;
        }

        const valorVendaNovo = parseFloat(precoFornecedor);
        const valorVendaAntigo = material.valorVenda || 0;
        
        // Atualizar apenas valorVenda (preço de venda), não o preço de compra
        // O preço de compra deve ser único a cada compra e não deve ser alterado
        await prisma.material.update({
          where: { id: material.id },
          data: {
            valorVenda: valorVendaNovo,
            // Calcular porcentagem de lucro se tiver preço de compra
            porcentagemLucro: material.preco && material.preco > 0 
              ? ((valorVendaNovo - material.preco) / material.preco) * 100 
              : null,
            updatedAt: new Date()
          }
        });

        atualizados++;
        detalhes.push({
          sku,
          nome: material.nome,
          valorVendaAntigo: valorVendaAntigo,
          valorVendaNovo: valorVendaNovo,
          sucesso: true
        });

        console.log(`✅ Material ${sku} - Valor de venda atualizado: R$ ${valorVendaAntigo} → R$ ${valorVendaNovo}`);

      } catch (error) {
        erros++;
        detalhes.push({
          sku: item.sku,
          erro: 'Erro ao atualizar'
        });
        console.error(`❌ Erro ao processar material ${item.sku}:`, error);
      }
    }

    // Limpar arquivo temporário
    try {
      const fs = await import('fs');
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn('Erro ao limpar arquivo temporário:', err);
    }

    const resultado = {
      success: true,
      message: `${atualizados} preços atualizados com sucesso`,
      data: {
        atualizados,
        erros,
        total: dadosImportados.length,
        detalhes
      }
    };

    console.log(`✅ Importação concluída: ${atualizados} atualizados, ${erros} erros`);
    
    res.json(resultado);

  } catch (error) {
    console.error('Erro ao importar preços:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao importar preços',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Processar arquivo Excel
 */
async function processarExcel(filePath: string): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(1);
  const dados: any[] = [];

  if (!sheet) {
    throw new Error('Planilha não encontrada no arquivo');
  }

  // Encontrar linha do header (linha 6 conforme template)
  const headerRowNum = 6;
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > headerRowNum) {
      const sku = row.getCell(1).value?.toString().trim();
      const nome = row.getCell(2).value?.toString().trim();
      const precoFornecedor = row.getCell(7).value;

      if (sku) {
        dados.push({
          sku,
          nome,
          precoFornecedor: precoFornecedor?.toString().replace(',', '.')
        });
      }
    }
  });

  console.log(`📊 ${dados.length} linhas processadas do Excel`);
  return dados;
}

/**
 * Processar arquivo CSV
 */
async function processarCSV(filePath: string): Promise<any[]> {
  const fs = await import('fs');
  const csv = fs.readFileSync(filePath, 'utf-8');
  
  const linhas = csv.split('\n');
  const dados: any[] = [];

  // Pular header (primeira linha)
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const colunas = linha.split(';');
    
    if (colunas.length >= 7) {
      const sku = colunas[0]?.trim();
      const nome = colunas[1]?.trim();
      const precoFornecedor = colunas[6]?.trim();

      if (sku) {
        dados.push({
          sku,
          nome,
          precoFornecedor: precoFornecedor?.replace(',', '.')
        });
      }
    }
  }

  console.log(`📊 ${dados.length} linhas processadas do CSV`);
  return dados;
}

/**
 * Gerar template de importação de preços em JSON
 * GET /api/materiais/template-importacao?formato=json
 */
/**
 * Buscar histórico de preços de um material
 * GET /api/materiais/:id/historico-precos
 */
export const getHistoricoPrecos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const historico = await prisma.historicoPreco.findMany({
      where: { materialId: id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Últimas 50 alterações
    });

    const material = await prisma.material.findUnique({
      where: { id },
      select: {
        nome: true,
        sku: true,
        preco: true,
        ultimaAtualizacaoPreco: true
      }
    });

    res.json({
      success: true,
      data: {
        material,
        historico
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico de preços'
    });
  }
};

export const gerarTemplateImportacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo = 'todos', formato = 'json' } = req.query;
    
    // Buscar materiais para o template
    let materiais;
    if (tipo === 'criticos') {
      // Buscar apenas materiais com estoque crítico
      const todosMateriais = await prisma.material.findMany({
        where: { ativo: true },
        include: {
          fornecedor: {
            select: { id: true, nome: true }
          }
        },
        orderBy: [
          { estoque: 'asc' },
          { nome: 'asc' }
        ]
      });
      materiais = todosMateriais.filter(m => m.estoque === 0 || m.estoque <= m.estoqueMinimo);
    } else {
      // Buscar todos os materiais ativos (limitar para evitar arquivos muito grandes)
      materiais = await prisma.material.findMany({
        where: { ativo: true },
        include: {
          fornecedor: {
            select: { id: true, nome: true }
          }
        },
        orderBy: { nome: 'asc' },
        take: 1000 // Limitar a 1000 materiais para evitar arquivo muito grande
      });
    }

    console.log(`📋 Gerando template ${formato} com ${materiais.length} materiais`);

    if (materiais.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Nenhum material encontrado para gerar template'
      });
      return;
    }

    // Preparar dados dos materiais
    const materiaisData = materiais.map(m => ({
      id: m.id,
      sku: m.sku,
      nome: m.nome,
      descricao: m.descricao || '',
      categoria: m.categoria,
      tipo: m.tipo,
      unidadeMedida: m.unidadeMedida,
      estoque: m.estoque,
      estoqueMinimo: m.estoqueMinimo,
      precoAtual: m.preco || 0,
      precoNovo: m.preco || 0, // Campo a ser atualizado pelo fornecedor
      ultimaAtualizacao: m.ultimaAtualizacaoPreco || m.updatedAt,
      fornecedor: m.fornecedor?.nome || 'N/A',
      localizacao: m.localizacao || '',
      preco: m.preco || 0 // Alias para compatibilidade
    }));

    // Gerar JSON
    if (formato === 'json') {
      const templateData = {
        versao: '1.0',
        geradoEm: new Date().toISOString(),
        empresa: 'S3E Engenharia Elétrica',
        instrucoes: 'Atualize apenas o campo "precoNovo" de cada material. Não altere os demais campos!',
        materiais: materiaisData
      };

      console.log('✅ Gerando template JSON:', {
        totalMateriais: materiaisData.length,
        primeiroMaterial: materiaisData[0]?.sku || 'N/A'
      });

      // NÃO usar Content-Disposition (deixar frontend controlar download)
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(templateData);
      return;
    }

    // Gerar PDF (retornar dados para frontend renderizar em HTML)
    if (formato === 'pdf') {
      res.json({
        success: true,
        materiais: materiaisData,
        geradoEm: new Date().toISOString()
      });
      return;
    }

    // Se não for JSON nem PDF, retorna erro
    res.status(400).json({
      success: false,
      error: 'Formato inválido. Use: json ou pdf'
    });
  } catch (error) {
    console.error('❌ Erro ao gerar template:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar template de importação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};


/**
 * Fazer preview das alterações antes de importar (JSON, XLSX ou CSV)
 * POST /api/materiais/preview-importacao
 */
export const previewImportacao = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📥 Preview - Recebendo arquivo...');
    console.log('📄 Body:', req.body);
    console.log('📄 File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    } : 'Nenhum arquivo');
    
    const file = req.file;

    if (!file) {
      console.error('❌ Nenhum arquivo foi enviado!');
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    console.log(`📥 Preview de importação: ${file.filename}`);

    const ext = path.extname(file.filename).toLowerCase();
    let dadosImportados: any[] = [];

    if (ext === '.json') {
      // Processar JSON
      try {
        console.log('📂 Lendo arquivo JSON do disco:', file.path);
        
        // Verificar se arquivo existe
        if (!fs.existsSync(file.path)) {
          console.error('❌ Arquivo não encontrado no disco:', file.path);
          res.status(400).json({
            success: false,
            error: 'Arquivo não encontrado no servidor'
          });
          return;
        }
        
        const jsonContent = fs.readFileSync(file.path, 'utf-8');
        console.log('📝 Conteúdo do arquivo (primeiros 200 chars):', jsonContent.substring(0, 200));
        
        let jsonData = JSON.parse(jsonContent);
        
        // ✨ CORREÇÃO: Remover wrapper { success, data } se existir
        if (jsonData.success && jsonData.data) {
          console.log('🧹 Detectado wrapper Axios { success, data } - Extraindo data...');
          jsonData = jsonData.data;
        }
        
        console.log('📄 JSON parseado (após limpeza):', {
          versao: jsonData.versao,
          empresa: jsonData.empresa,
          totalMateriais: jsonData.materiais?.length || 0,
          primeiroMaterial: jsonData.materiais?.[0]?.sku || 'N/A'
        });
        
        if (!jsonData.materiais || !Array.isArray(jsonData.materiais)) {
          res.status(400).json({
            success: false,
            error: 'Formato JSON inválido. Deve conter array "materiais"'
          });
          return;
        }
        
        // ✨ VALIDAÇÃO INTELIGENTE: Apenas materiais com preço diferente
        dadosImportados = jsonData.materiais
          .filter((m: any) => {
            // Verificar se precoNovo é diferente de precoAtual
            const precoAtual = parseFloat(m.precoAtual) || 0;
            const precoNovo = parseFloat(m.precoNovo) || 0;
            
            // Apenas incluir se houver mudança real (diferença > 0.01)
            const mudou = Math.abs(precoNovo - precoAtual) > 0.01;
            
            if (!mudou) {
              console.log(`⏭️ Pulando ${m.sku} - Preço não mudou (${precoAtual})`);
            }
            
            return mudou;
          })
          .map((m: any) => ({
            sku: m.sku,
            nome: m.nome,
            precoFornecedor: m.precoNovo,
            id: m.id // Manter ID para referência
          }));
        
        console.log(`✅ ${dadosImportados.length} materiais com alteração de preço detectados`);
      } catch (jsonError) {
        console.error('❌ Erro ao processar JSON:', jsonError);
        res.status(400).json({
          success: false,
          error: 'Erro ao processar JSON: ' + (jsonError instanceof Error ? jsonError.message : 'Formato inválido')
        });
        return;
      }
    } else if (ext === '.xlsx') {
      dadosImportados = await processarExcel(file.path);
    } else if (ext === '.csv') {
      dadosImportados = await processarCSV(file.path);
    } else {
      res.status(400).json({
        success: false,
        error: 'Formato de arquivo inválido. Use JSON, XLSX ou CSV.'
      });
      return;
    }

    // ✨ VALIDAÇÃO: Se nenhum item foi alterado
    if (dadosImportados.length === 0) {
      res.json({
        success: true,
        data: {
          totalItens: 0,
          totalAlteracoes: 0,
          totalErros: 0,
          preview: [],
          mensagem: '✅ Nenhuma alteração detectada. Todos os preços já estão atualizados ou são iguais aos valores no sistema.'
        }
      });
      
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('Erro ao limpar arquivo:', err);
      }
      
      return;
    }

    // Processar preview (sem salvar)
    const preview: any[] = [];
    let totalAlteracoes = 0;
    let totalErros = 0;
    let totalIgnorados = 0;

    for (const item of dadosImportados) {
      try {
        const { sku, precoFornecedor } = item;

        // Validar dados
        if (!sku || !precoFornecedor || isNaN(parseFloat(precoFornecedor)) || parseFloat(precoFornecedor) <= 0) {
          totalErros++;
          preview.push({
            sku,
            nome: item.nome || 'N/A',
            precoAtual: null,
            precoNovo: precoFornecedor,
            status: 'erro',
            mensagem: 'Preço inválido ou não informado'
          });
          continue;
        }

        // Buscar material pelo SKU
        const material = await prisma.material.findUnique({
          where: { sku },
          include: {
            fornecedor: {
              select: { nome: true }
            }
          }
        });

        if (!material) {
          totalErros++;
          preview.push({
            sku,
            nome: item.nome || 'N/A',
            precoAtual: null,
            precoNovo: parseFloat(precoFornecedor),
            status: 'erro',
            mensagem: 'Material não encontrado no sistema'
          });
          continue;
        }

        const precoNovo = parseFloat(precoFornecedor);
        const precoAtual = material.preco || 0;
        const diferenca = precoAtual > 0 ? ((precoNovo - precoAtual) / precoAtual) * 100 : 0;

        totalAlteracoes++;
        preview.push({
          sku: material.sku,
          nome: material.nome,
          unidade: material.unidadeMedida,
          estoque: material.estoque,
          precoAtual: precoAtual,
          precoNovo: precoNovo,
          diferenca: diferenca,
          fornecedor: material.fornecedor?.nome || 'N/A',
          status: precoNovo < precoAtual ? 'reducao' : (precoNovo > precoAtual ? 'aumento' : 'igual'),
          mensagem: 'Pronto para atualizar'
        });

      } catch (error) {
        totalErros++;
        preview.push({
          sku: item.sku,
          nome: item.nome || 'N/A',
          status: 'erro',
          mensagem: 'Erro ao processar item'
        });
        console.error(`❌ Erro ao processar material ${item.sku}:`, error);
      }
    }

    // Limpar arquivo temporário
    try {
      const fs = await import('fs');
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn('Erro ao limpar arquivo temporário:', err);
    }

    const resultado = {
      success: true,
      data: {
        totalItens: dadosImportados.length,
        totalAlteracoes,
        totalErros,
        totalIgnorados,
        preview: preview,
        mensagem: totalAlteracoes > 0 
          ? `✅ ${totalAlteracoes} alteração(ões) detectada(s). Revise antes de confirmar.`
          : '✅ Nenhuma alteração necessária. Todos os preços já estão corretos.'
      }
    };

    console.log(`✅ Preview gerado: ${totalAlteracoes} alterações, ${totalErros} erros, ${totalIgnorados} ignorados`);
    
    res.json(resultado);

  } catch (error) {
    console.error('Erro ao fazer preview de importação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar preview',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

