/**
 * Testes do serviço central de folha timbrada (backend).
 * npm test -- pdfLetterhead.service.test.ts
 */

import fs from 'fs';
import path from 'path';
import {
  uploadsRelativeToAbsolute,
  readLetterheadImageBuffer,
  listFolhasTimbradasFiles,
  resolveLetterheadForUser,
  getPdfCustomizationUploadDir,
} from './pdfLetterhead.service';

jest.mock('../lib/prisma', () => ({
  prisma: {},
}));

jest.mock('../utils/orcamentoPdfPersonalization.util', () => ({
  buildMarcaDaguaFromPdfCustomization: jest.fn((customization: { watermark?: { opacity?: number } }) => ({
    tipo: 'template',
    opacidade: customization?.watermark?.opacity ?? 0.05,
    folhaTimbradaUrl: '/uploads/pdf-customization/from-custom.png',
  })),
  resolveMarcaDaguaFromUserTemplate: jest.fn(),
  resolveUploadPathToDataUrl: jest.fn((url: string) => `data:image/png;base64,${Buffer.from(url).toString('base64')}`),
}));

import {
  resolveMarcaDaguaFromUserTemplate,
  resolveUploadPathToDataUrl,
} from '../utils/orcamentoPdfPersonalization.util';

const resolveTemplate = resolveMarcaDaguaFromUserTemplate as jest.Mock;
const resolveDataUrl = resolveUploadPathToDataUrl as jest.Mock;

describe('pdfLetterhead.service', () => {
  const uploadDir = getPdfCustomizationUploadDir();
  const testFile = path.join(uploadDir, 'cornerDesign-test-unit.png');

  beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(testFile, Buffer.from('fake-png'));
  });

  afterAll(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  describe('uploadsRelativeToAbsolute', () => {
    it('resolve caminho relativo /uploads/ para arquivo existente', () => {
      const abs = uploadsRelativeToAbsolute('/uploads/pdf-customization/cornerDesign-test-unit.png');
      expect(abs).toBe(testFile);
    });

    it('retorna null para URL fora de /uploads/', () => {
      expect(uploadsRelativeToAbsolute('https://example.com/logo.png')).toBeNull();
    });

    it('retorna null quando arquivo não existe', () => {
      expect(uploadsRelativeToAbsolute('/uploads/pdf-customization/inexistente.png')).toBeNull();
    });
  });

  describe('listFolhasTimbradasFiles', () => {
    it('lista apenas cornerDesign-* com extensões de imagem', () => {
      const files = listFolhasTimbradasFiles();
      expect(files.some((f) => f.filename === 'cornerDesign-test-unit.png')).toBe(true);
      expect(files.every((f) => f.filename.startsWith('cornerDesign-'))).toBe(true);
    });
  });

  describe('readLetterheadImageBuffer', () => {
    it('lê buffer do absolutePath', () => {
      const buf = readLetterheadImageBuffer({
        opacidade: 0.05,
        absolutePath: testFile,
      });
      expect(buf).not.toBeNull();
      expect(buf!.toString()).toBe('fake-png');
    });

    it('decodifica data URL base64', () => {
      const b64 = Buffer.from('hello').toString('base64');
      const buf = readLetterheadImageBuffer({
        opacidade: 0.05,
        folhaTimbradaDataUrl: `data:image/png;base64,${b64}`,
      });
      expect(buf?.toString()).toBe('hello');
    });
  });

  describe('resolveLetterheadForUser', () => {
    beforeEach(() => {
      resolveTemplate.mockReset();
      resolveDataUrl.mockImplementation((url: string) =>
        url.includes('cornerDesign')
          ? `data:image/png;base64,${Buffer.from('folha').toString('base64')}`
          : undefined
      );
    });

    it('usa customization explícita quando fornecida', async () => {
      const result = await resolveLetterheadForUser('user-1', {
        watermark: { opacity: 0.2 },
      });
      expect(result.opacidade).toBe(0.2);
      expect(result.folhaTimbradaDataUrl).toContain('from-custom.png');
    });

    it('consulta template do usuário quando não há customization', async () => {
      resolveTemplate.mockResolvedValue({
        tipo: 'template',
        opacidade: 0.07,
        folhaTimbradaUrl: '/uploads/pdf-customization/cornerDesign-test-unit.png',
      });

      const result = await resolveLetterheadForUser('user-1');
      expect(resolveTemplate).toHaveBeenCalledWith('user-1');
      expect(result.opacidade).toBe(0.07);
      expect(result.absolutePath).toBe(testFile);
    });

    it('fallback para folha mais recente em disco sem userId', async () => {
      resolveTemplate.mockResolvedValue({ tipo: 'template', opacidade: 0.05 });

      const result = await resolveLetterheadForUser(undefined);
      expect(result.folhaTimbradaDataUrl).toBeDefined();
      expect(result.absolutePath).toBeTruthy();
    });
  });
});
