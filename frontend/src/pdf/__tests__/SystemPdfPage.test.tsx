/**
 * Testes do componente de página A4 com timbre.
 * npm test -- SystemPdfPage.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SystemPdfPage from '../SystemPdfPage';

describe('SystemPdfPage', () => {
  it('renderiza conteúdo e marca dágua S3E quando não há folha', () => {
    const { container } = render(
      <SystemPdfPage>
        <p>Conteúdo do relatório</p>
      </SystemPdfPage>
    );

    expect(screen.getByText('Conteúdo do relatório')).toBeInTheDocument();
    expect(container.querySelector('.pdf-page')).toBeTruthy();
    expect(container.querySelector('.watermark-center')).toBeTruthy();
    expect(container.querySelector('.custom-letterhead')).toBeFalsy();
  });

  it('aplica folha timbrada customizada em opacidade total', () => {
    const { container } = render(
      <SystemPdfPage folhaTimbradaUrl="data:image/png;base64,xx" opacidade={0.08}>
        <span>Tabela</span>
      </SystemPdfPage>
    );

    const wm = container.querySelector('.watermark-background.custom-letterhead') as HTMLElement;
    expect(wm).toBeTruthy();
    expect(wm.querySelector('.letterhead-img')).toBeTruthy();
    expect(wm.style.opacity).toBe('');
    expect(container.querySelector('.watermark-center')).toBeFalsy();
  });

  it('exibe numeração de páginas quando informada', () => {
    render(
      <SystemPdfPage pageNumber={2} totalPages={5}>
        <div>Página 2</div>
      </SystemPdfPage>
    );

    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('modo compact adiciona classe page-content--compact', () => {
    const { container } = render(
      <SystemPdfPage compact>
        <div>Dados densos</div>
      </SystemPdfPage>
    );

    expect(container.querySelector('.page-content--compact')).toBeTruthy();
  });
});
