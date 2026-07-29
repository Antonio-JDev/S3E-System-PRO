import PDFDocument from 'pdfkit';
import type { FolhaMesResumo } from './rh.service';
import { decimalHoursToHHmm, minutesToHHmm } from '../utils/time-format.util';
import { calculateTimeDifference } from '../utils/workshift.util';
import { calcularDemonstrativoFolha } from '../utils/rhFolhaDemonstrativo.util';

export type ConferenciaPontoLetterhead = {
  imageBuffer: Buffer;
  opacidade: number;
};

/**
 * Gera PDF buffer da conferência de ponto (todas as batidas por dia).
 *
 * Formato:
 *  - Cabeçalho com nome do colaborador, competência e jornada/tolerância.
 *  - Tabela diária com batidas, almoço, total HH:mm e atraso/saída antecipada.
 *  - Demonstrativo financeiro com horas em HH:mm + descontos AUTO calculados +
 *    lançamentos manuais (bônus/descontos) com valores e quantidades.
 *
 * IMPORTANTE: o cálculo (centesimal/minutos) é feito no backend e preservado.
 * Aqui apenas formatamos para exibição em HH:mm para evitar erros do tipo
 * "1.37 + 1.37 = 2.74" quando o usuário interpreta decimal como sexagesimal.
 *
 * Margens: top 71pt, bottom 75pt, lados 15pt (≈ 95px / 100px / 20px @ 96dpi).
 */
export function gerarBufferPdfConferenciaPonto(
  folha: FolhaMesResumo,
  letterhead?: ConferenciaPontoLetterhead | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 71, bottom: 75, left: 15, right: 15 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const paintLetterhead = () => {
        if (!letterhead?.imageBuffer?.length) return;
        doc.save();
        // Folha timbrada A4: opacidade total (não usar opacidade da marca d'água S3E ~0.05).
        doc.opacity(1);
        doc.image(letterhead.imageBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
        doc.restore();
      };
      doc.on('pageAdded', paintLetterhead);
      paintLetterhead();

      const ref = folha.referencia;
      const COLOR_RED = '#b91c1c';
      const COLOR_MUTED = '#6b7280';
      const COLOR_LIGHT_BG = '#f3f4f6';
      const COLOR_VIOLET = '#7c3aed';
      const COLOR_GREEN = '#15803d';
      const COLOR_YELLOW_BG = '#fef9c3';
      const COLOR_RED_BG = '#fee2e2';
      const COLOR_VIOLET_BG = '#ede9fe';

      // ===== Cabeçalho =====
      doc.font('Helvetica-Bold').fontSize(16).fillColor('black')
        .text('Conferência de ponto', { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(11)
        .text(`${folha.nome} — ${String(ref.mes).padStart(2, '0')}/${ref.ano}`, { align: 'center' });
      if (folha.jornada?.nome) {
        const j = folha.jornada;
        const jornadaTxt =
          `Jornada: ${j.nome} (` +
          `${j.entrada1 ?? '--'}-${j.saida1 ?? '--'} / ` +
          `${j.entrada2 ?? '--'}-${j.saida2 ?? '--'}) · ` +
          `Tolerância ${j.toleranciaMinutos} min`;
        doc.fontSize(9).fillColor(COLOR_MUTED).text(jornadaTxt, { align: 'center' });
        doc.fillColor('black');
      }
      doc.moveDown(0.8);

      // ===== Resumo (numérico, topo) =====
      const diasFaltados = folha.resumoPonto?.diasFaltados ?? 0;
      const diasFaltadosDetalhe = folha.resumoPonto?.diasFaltadosDetalhe ?? [];
      const horasTrabalhadas = folha.resumoPonto?.horasTrabalhadas ?? folha.horas.total ?? 0;
      const folgasH = folha.folgas?.horasFolgaAcumuladas ?? 0;
      const saldoBancoTotal = folha.registrado?.saldoBancoHorasAtual ?? 0;
      const saldoBancoNormais = folha.registrado?.saldoBancoHorasNormaisAtual ?? 0;
      const saldoBanco100 = folha.registrado?.saldoBancoHorasExtras100Atual ?? 0;
      const permitirHE = folha.permitirHorasExtras100 === true;
      const mostrarBancoHoras = folha.tipoContrato === 'REGISTRADO' && !permitirHE;

      const fmtBRL = (v: number): string =>
        Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      doc.font('Helvetica-Bold').fontSize(10).text('Resumo do mês');
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9);
      doc.text(
        `Horas TOTAIS TRABALHADAS: ${decimalHoursToHHmm(horasTrabalhadas)} ` +
          `(${Number(horasTrabalhadas).toFixed(2)} h)`,
      );
      doc.text(`Dias faltados (úteis, sem registro): ${diasFaltados}`);
      if (diasFaltadosDetalhe.length > 0) {
        const listaFaltas = diasFaltadosDetalhe
          .map(
            (f) =>
              `${String(f.dia).padStart(2, '0')}/${String(ref.mes).padStart(2, '0')} (${f.diaSemanaLabel})`,
          )
          .join(' · ');
        doc.fontSize(8).fillColor(COLOR_MUTED).text(`   ${listaFaltas}`, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
        doc.fillColor('black').fontSize(9);
      }
      doc.text(
        `Folgas (crédito acumulado): ${decimalHoursToHHmm(folgasH)} ` +
          `(${Number(folgasH).toFixed(2)} h)`,
      );
      if (mostrarBancoHoras) {
        doc.text(
          `Banco de horas: ${decimalHoursToHHmm(saldoBancoTotal)} ` +
            `(normais ${decimalHoursToHHmm(saldoBancoNormais)} · 100% ${decimalHoursToHHmm(saldoBanco100)})`,
        );
      }
      doc.moveDown(0.8);

      // ===== Tabela diária =====
      const pageRight = doc.page.width - doc.page.margins.right;
      const tableLeft = doc.page.margins.left;
      const widthAvailable = pageRight - tableLeft;

      // Larguras (somam ~widthAvailable). Total horas + Atraso destacados.
      const colDiaW = 22;
      const colSemW = 28;
      const colFerW = 80;
      const colAlmW = 70;
      const colHorasW = 60;
      const colAtrasoW = 56;
      const colSitW = 70;
      const colCompW = 48;
      const colBatW =
        widthAvailable - (colDiaW + colSemW + colFerW + colAlmW + colHorasW + colAtrasoW + colCompW + colSitW);

      const colDia = tableLeft;
      const colSem = colDia + colDiaW;
      const colFer = colSem + colSemW;
      const colBat = colFer + colFerW;
      const colAlm = colBat + colBatW;
      const colHoras = colAlm + colAlmW;
      const colAtraso = colHoras + colHorasW;
      const colComp = colAtraso + colAtrasoW;
      const colSit = colComp + colCompW;

      const drawHeader = (yStart: number): number => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('black');
        const headerH = 22;
        doc.rect(tableLeft, yStart, widthAvailable, headerH).fill(COLOR_LIGHT_BG);
        doc.fillColor('black');
        doc.text('Dia', colDia + 2, yStart + 6, { width: colDiaW - 2 });
        doc.text('Sem.', colSem + 2, yStart + 6, { width: colSemW - 2 });
        doc.text('Feriado', colFer + 2, yStart + 6, { width: colFerW - 2 });
        doc.text('Batidas (todas)', colBat + 2, yStart + 6, { width: colBatW - 2 });
        doc.text('Almoço', colAlm + 2, yStart + 6, { width: colAlmW - 2, align: 'center' });
        doc.text('Total Horas\n(HH:mm)', colHoras + 2, yStart + 2, {
          width: colHorasW - 2,
          align: 'center',
        });
        doc.text('Atraso /\nSaída ant.', colAtraso + 2, yStart + 2, {
          width: colAtrasoW - 2,
          align: 'center',
        });
        doc.text('Comp.\n(HH:mm)', colComp + 2, yStart + 2, {
          width: colCompW - 2,
          align: 'center',
        });
        doc.text('Sit.', colSit + 2, yStart + 6, { width: colSitW - 2, align: 'center' });
        doc.font('Helvetica');
        return yStart + headerH + 2;
      };

      let y = doc.y;
      y = drawHeader(y);

      // Acumuladores para Demonstrativo
      let somaAtrasoMin = 0;
      let somaSaidaAntMin = 0;

      const lineHBase = 11;

      for (const row of folha.conferenciaPonto) {
        const batidasTxt =
          row.batidas && row.batidas.length > 0 ? row.batidas.join(' · ') : '—';
        const almTxt =
          row.intervaloAlmocoInicio && row.intervaloAlmocoFim
            ? `${row.intervaloAlmocoInicio}-${row.intervaloAlmocoFim}`
            : '—';
        const ferTxt =
          row.ehFeriado && row.nomeFeriado
            ? row.nomeFeriado
            : row.ehFeriado
              ? 'Sim'
              : '—';

        const minAtraso = row.ehFeriado ? 0 : row.minutosAtraso ?? 0;
        const minSaidaAnt = row.ehFeriado ? 0 : row.minutosHorasDevidas ?? 0;
        const minExtraDia = row.minutosExtra20 ?? 0;
        somaAtrasoMin += Math.max(0, minAtraso);
        somaSaidaAntMin += Math.max(0, minSaidaAnt);

        const temAtraso = minAtraso > 0 || minSaidaAnt > 0;
        const temExtraDia = minExtraDia > 0;
        const inconsistente = row.situacao === 'Inconsistente';
        const okParcial = row.situacao === 'OK_PARCIAL';
        const ehFaltaDia =
          !row.temRegistro && !row.ehFimDeSemana && !row.ehFeriado && !row.faltaJustificada;
        const ehFds = row.ehFimDeSemana;
        const ehFeriadoUtil = row.ehFeriado && !ehFds;
        const temJornada =
          !!folha.jornada?.entrada1 &&
          !!folha.jornada?.saida2 &&
          Number.isFinite(Number(folha.jornada?.toleranciaMinutos));

        const compensadoMin = (() => {
          if (folha.tipoContrato !== 'REGISTRADO') return 0;
          if (!temJornada) return 0;
          const bat0 = row.batidas?.[0] ?? row.entrada ?? '';
          const batN = row.batidas?.[row.batidas.length - 1] ?? row.saida ?? '';
          if (!/^\d{1,2}:\d{2}$/.test(bat0) || !/^\d{1,2}:\d{2}$/.test(batN)) return 0;

          const toDate = (hhmm: string): Date => {
            const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
            return new Date(ref.ano, ref.mes - 1, row.dia, h, m, 0, 0);
          };

          try {
            const diff = calculateTimeDifference({
              batidaEntrada: toDate(bat0),
              batidaSaida: toDate(batN),
              shiftEntrada: folha.jornada!.entrada1!,
              shiftSaida: folha.jornada!.saida2!,
              toleranceMin: folha.jornada!.toleranciaMinutos ?? 5,
            });

            let atrasoBruto = Math.max(0, diff.minutosAtrasoEntrada);
            let saidaAntBruto = Math.max(0, diff.minutosSaidaAntecipada);
            let pool = Math.max(0, diff.minutosExtraTotal);

            const abatEntrada = Math.min(atrasoBruto, pool);
            atrasoBruto -= abatEntrada;
            pool -= abatEntrada;

            const abatSaida = Math.min(saidaAntBruto, pool);
            // saidaAntBruto -= abatSaida; // não usado

            return abatEntrada + abatSaida;
          } catch {
            return 0;
          }
        })();

        // Calcula altura da linha com base no maior conteúdo (precisa setar fontSize antes)
        doc.fontSize(8.5).font('Helvetica');
        const heightBat = doc.heightOfString(batidasTxt, { width: colBatW - 4 });
        const heightFer = doc.heightOfString(ferTxt, { width: colFerW - 4 });
        const linhasAtrasoCol =
          (minAtraso > 0 ? 1 : 0) + (minSaidaAnt > 0 ? 1 : 0) + (temExtraDia ? 1 : 0);
        const heightAtrasoCol = linhasAtrasoCol > 0 ? linhasAtrasoCol * 9 + 4 : lineHBase + 4;
        const rowH = Math.max(lineHBase + 4, heightBat + 4, heightFer + 4, heightAtrasoCol);

        // Quebra de página
        if (y + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          y = drawHeader(y);
        }

        // Fundo por tipo de dia (falta, fim de semana, feriado em dia útil)
        if (ehFaltaDia) {
          doc.rect(tableLeft, y - 1, widthAvailable, rowH).fillColor(COLOR_RED_BG).fill();
        } else if (ehFds) {
          doc.rect(tableLeft, y - 1, widthAvailable, rowH).fillColor(COLOR_YELLOW_BG).fill();
        } else if (ehFeriadoUtil) {
          doc.rect(tableLeft, y - 1, widthAvailable, rowH).fillColor(COLOR_VIOLET_BG).fill();
        }
        doc.fillColor('black');

        doc.fontSize(8.5).font('Helvetica').fillColor('black');
        doc.text(String(row.dia).padStart(2, '0'), colDia + 2, y + 2, { width: colDiaW - 2 });
        doc.text(row.diaSemanaLabel.slice(0, 3), colSem + 2, y + 2, { width: colSemW - 2 });

        if (row.ehFeriado) {
          doc.fillColor(COLOR_VIOLET);
        }
        doc.text(ferTxt, colFer + 2, y + 2, { width: colFerW - 2 });
        doc.fillColor('black');

        doc.text(batidasTxt, colBat + 2, y + 2, { width: colBatW - 4 });
        doc.text(almTxt, colAlm + 2, y + 2, { width: colAlmW - 2, align: 'center' });

        // Total Horas (HH:mm) — destaque vermelho/negrito se inconsistente
        const horasTxt = row.temRegistro ? decimalHoursToHHmm(row.horasLiquidas) : '—';
        if (inconsistente) {
          doc.font('Helvetica-Bold').fillColor(COLOR_RED);
        } else {
          doc.font('Helvetica-Bold');
        }
        doc.text(horasTxt, colHoras + 2, y + 2, { width: colHorasW - 2, align: 'center' });
        doc.font('Helvetica').fillColor('black');

        // Coluna combinada Atraso / Saída ant. / Extra do dia
        const partesAtraso: string[] = [];
        if (minAtraso > 0) partesAtraso.push(`${minutesToHHmm(minAtraso)}↓`);
        if (minSaidaAnt > 0) partesAtraso.push(`−${minutesToHHmm(minSaidaAnt)}`);
        if (temAtraso) {
          doc.font('Helvetica-Bold').fillColor(COLOR_RED);
          doc.text(partesAtraso.join('\n'), colAtraso + 2, y + 2, {
            width: colAtrasoW - 2,
            align: 'center',
          });
          doc.font('Helvetica').fillColor('black');
        }
        if (temExtraDia) {
          const extraY = y + 2 + (temAtraso ? partesAtraso.length * 9 : 0);
          doc.font('Helvetica-Bold').fillColor(COLOR_GREEN);
          doc.text(`+${minutesToHHmm(minExtraDia)}`, colAtraso + 2, extraY, {
            width: colAtrasoW - 2,
            align: 'center',
          });
          doc.font('Helvetica').fillColor('black');
        }
        if (!temAtraso && !temExtraDia) {
          doc.font('Helvetica').fillColor(COLOR_MUTED);
          doc.text('—', colAtraso + 2, y + 2, { width: colAtrasoW - 2, align: 'center' });
          doc.fillColor('black');
        }

        // Compensação diária (minutos extras que abateram atraso/saída antecipada)
        const compTxt = compensadoMin > 0 ? minutesToHHmm(compensadoMin) : '—';
        if (compensadoMin > 0) {
          doc.font('Helvetica-Bold').fillColor(COLOR_GREEN);
        } else {
          doc.font('Helvetica').fillColor(COLOR_MUTED);
        }
        doc.text(compTxt, colComp + 2, y + 2, { width: colCompW - 2, align: 'center' });
        doc.font('Helvetica').fillColor('black');

        // Situação
        let sitTxt: string = row.situacao;
        if (row.situacao === 'OK_PARCIAL') sitTxt = 'OK (abaixo meta)';
        if (inconsistente || ehFaltaDia) {
          doc.fillColor(COLOR_RED).font('Helvetica-Bold');
        } else if (okParcial) {
          doc.fillColor('#b45309').font('Helvetica-Bold');
        } else if (row.situacao === 'OK') {
          doc.fillColor(COLOR_GREEN).font('Helvetica-Bold');
        } else if (temAtraso) {
          doc.fillColor(COLOR_RED);
        }
        doc.text(sitTxt, colSit + 2, y + 2, { width: colSitW - 2, align: 'center' });
        doc.font('Helvetica').fillColor('black');

        // Linha separadora
        doc.strokeColor('#e5e7eb').lineWidth(0.5)
          .moveTo(tableLeft, y + rowH)
          .lineTo(tableLeft + widthAvailable, y + rowH)
          .stroke();
        doc.strokeColor('black');

        y += rowH;
      }

      doc.moveDown(1);

      // ===== Demonstrativo de Horas e Valores =====
      const demonstrativo = folha.demonstrativo ?? calcularDemonstrativoFolha(folha);

      // Garante espaço (se não, nova página)
      if (y + 200 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      } else {
        y = doc.y;
      }

      doc.font('Helvetica-Bold').fontSize(11).text('Demonstrativo de Horas e Valores', tableLeft, y);
      y = doc.y + 4;
      doc.strokeColor('#9ca3af').lineWidth(0.7)
        .moveTo(tableLeft, y).lineTo(tableLeft + widthAvailable, y).stroke();
      doc.strokeColor('black');
      y += 6;

      // Helper para imprimir 3 colunas: descrição | quantidade (HH:mm) | valor
      const colDescX = tableLeft + 2;
      const colQtdX = tableLeft + widthAvailable - 200;
      const colValX = tableLeft + widthAvailable - 90;

      const linhaResumo = (
        descricao: string,
        qtdTexto: string,
        valor: string | null,
        opts?: { bold?: boolean; color?: string; sub?: boolean },
      ): void => {
        const fontSize = opts?.sub ? 8.5 : 9.5;
        const font = opts?.bold ? 'Helvetica-Bold' : 'Helvetica';
        if (y + fontSize + 4 > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
        }
        doc.font(font).fontSize(fontSize).fillColor(opts?.color ?? 'black');
        doc.text(descricao, colDescX, y, { width: colQtdX - colDescX - 4 });
        if (qtdTexto) {
          doc.text(qtdTexto, colQtdX, y, { width: colValX - colQtdX - 4, align: 'right' });
        }
        if (valor) {
          doc.text(valor, colValX, y, { width: tableLeft + widthAvailable - colValX - 2, align: 'right' });
        }
        doc.fillColor('black');
        y += fontSize + 4;
      };

      // ----- Bloco horas ganhas (por tipo de dia) -----
      linhaResumo(
        'Horas Normais (dias úteis)',
        decimalHoursToHHmm(demonstrativo.horasNormais.horas),
        fmtBRL(Number(demonstrativo.horasNormais.valor ?? 0)),
        { bold: true },
      );
      linhaResumo(
        'Horas Extras (dias úteis seg-sex)',
        decimalHoursToHHmm(demonstrativo.horasExtrasSegSex50.horas),
        fmtBRL(Number(demonstrativo.horasExtrasSegSex50.valor ?? 0)),
        { bold: true },
      );
      linhaResumo(
        'Horas Extras (50%) — Sábado',
        decimalHoursToHHmm(demonstrativo.horasExtrasSabado50.horas),
        fmtBRL(Number(demonstrativo.horasExtrasSabado50.valor ?? 0)),
        { bold: true },
      );
      linhaResumo(
        'Horas Extras (100%) — Domingo e feriados',
        decimalHoursToHHmm(demonstrativo.horasExtras100.horas),
        fmtBRL(Number(demonstrativo.horasExtras100.valor ?? 0)),
        { bold: true },
      );
      linhaResumo(
        'Horas Noturnas (+20%)',
        decimalHoursToHHmm(demonstrativo.horasNoturnas20.horas),
        fmtBRL(Number(demonstrativo.horasNoturnas20.valor ?? 0)),
        { bold: true },
      );
      linhaResumo(
        'Total horas do mês (soma)',
        decimalHoursToHHmm(horasTrabalhadas),
        null,
        { color: COLOR_MUTED, sub: true },
      );

      y += 4;
      doc.strokeColor('#e5e7eb').lineWidth(0.5)
        .moveTo(tableLeft, y).lineTo(tableLeft + widthAvailable, y).stroke();
      doc.strokeColor('black');
      y += 6;

      // ----- Descontos / Bônus AUTOMÁTICOS (informativos, derivados do ponto) -----
      linhaResumo('Descontos automáticos (referência – ponto)', '', '', { bold: true, color: COLOR_MUTED });

      if (somaAtrasoMin > 0) {
        linhaResumo(
          '   Desconto Atraso',
          decimalHoursToHHmm(demonstrativo.descontoAtraso.horas),
          fmtBRL(Number(demonstrativo.descontoAtraso.valor ?? 0)),
          { color: COLOR_RED },
        );
      } else {
        linhaResumo('   Desconto Atraso', '00:00', fmtBRL(0), { color: COLOR_MUTED, sub: true });
      }
      if (somaSaidaAntMin > 0) {
        linhaResumo(
          '   Desconto Saída Antecipada',
          decimalHoursToHHmm(demonstrativo.descontoSaidaAntecipada.horas),
          fmtBRL(Number(demonstrativo.descontoSaidaAntecipada.valor ?? 0)),
          { color: COLOR_RED },
        );
      } else {
        linhaResumo('   Desconto Saída Antecipada', '00:00', fmtBRL(0), {
          color: COLOR_MUTED,
          sub: true,
        });
      }
      if (diasFaltados > 0) {
        linhaResumo(
          `   Desconto Falta — ${demonstrativo.descontoFalta.dias} dia(s)`,
          `${decimalHoursToHHmm(demonstrativo.descontoFalta.horas)}`,
          fmtBRL(Number(demonstrativo.descontoFalta.valor ?? 0)),
          { color: COLOR_RED },
        );
      } else {
        linhaResumo('   Desconto Falta', '0 dia(s)', fmtBRL(0), {
          color: COLOR_MUTED,
          sub: true,
        });
      }

      linhaResumo(
        '   Total a descontar (referência)',
        decimalHoursToHHmm(demonstrativo.totalDescontosRef.horas),
        fmtBRL(Number(demonstrativo.totalDescontosRef.valor ?? 0)),
        { bold: true, color: COLOR_RED },
      );

      linhaResumo(
        '   * Valores informativos. Aplicação efetiva via lançamentos manuais abaixo.',
        '',
        '',
        { color: COLOR_MUTED, sub: true },
      );

      y += 4;
      doc.strokeColor('#e5e7eb').lineWidth(0.5)
        .moveTo(tableLeft, y).lineTo(tableLeft + widthAvailable, y).stroke();
      doc.strokeColor('black');
      y += 6;

      // ----- Lançamentos manuais -----
      linhaResumo('Lançamentos manuais (RH)', '', '', { bold: true, color: COLOR_MUTED });

      const lancamentos = Array.isArray(folha.lancamentos) ? folha.lancamentos : [];
      const acrescimos = lancamentos.filter((l) => l.categoria === 'ACRESCIMO');
      const subtracoes = lancamentos.filter((l) => l.categoria !== 'ACRESCIMO');

      if (acrescimos.length === 0 && subtracoes.length === 0) {
        linhaResumo('   (sem lançamentos manuais)', '', '', { color: COLOR_MUTED, sub: true });
      } else {
        for (const l of acrescimos) {
          const desc = l.descricao ? `Bônus — ${l.descricao}` : 'Bônus';
          const qtd = l.quantidadeHoras != null ? decimalHoursToHHmm(Number(l.quantidadeHoras)) : '';
          linhaResumo(`   ${desc}`, qtd, `+ ${fmtBRL(Number(l.valor))}`, { color: '#15803d' });
        }
        for (const l of subtracoes) {
          const tipoLabel = (() => {
            switch (l.categoria) {
              case 'ADIANTAMENTO':
                return 'Adiantamento';
              case 'FALTA':
                return 'Falta';
              case 'FALTA_JUSTIFICADA':
                return 'Falta justificada';
              case 'DESCONTO_OUTRO':
                return 'Desconto';
              case 'PAGAMENTO_BANCO_HORAS':
                return 'Pagamento banco de horas';
              default:
                return String(l.categoria);
            }
          })();
          const desc = l.descricao ? `${tipoLabel} — ${l.descricao}` : tipoLabel;
          const qtd = l.quantidadeHoras != null ? decimalHoursToHHmm(Number(l.quantidadeHoras)) : '';
          const sinal = l.categoria === 'PAGAMENTO_BANCO_HORAS' ? '+' : '−';
          const corLinha = l.categoria === 'PAGAMENTO_BANCO_HORAS' ? '#15803d' : COLOR_RED;
          linhaResumo(`   ${desc}`, qtd, `${sinal} ${fmtBRL(Number(l.valor))}`, { color: corLinha });
        }
      }

      y += 6;
      doc.strokeColor('#9ca3af').lineWidth(0.7)
        .moveTo(tableLeft, y).lineTo(tableLeft + widthAvailable, y).stroke();
      doc.strokeColor('black');
      y += 6;

      // ----- Totais finais -----
      const totalAPagarPdf = Number(demonstrativo.totalAPagar ?? 0);

      linhaResumo(
        'TOTAL A PAGAR (com lançamentos)',
        '',
        fmtBRL(totalAPagarPdf),
        { bold: true },
      );
      linhaResumo(
        '   Composição: horas + benefícios + lanç. manuais − descontos ref.',
        '',
        '',
        { color: COLOR_MUTED, sub: true },
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
