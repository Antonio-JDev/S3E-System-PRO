# 🧪 Guia de Testes Unitários com Jest

Este documento explica como criar e executar testes unitários no backend usando Jest e TypeScript.

## 📋 Índice

1. [Configuração do Jest](#configuração-do-jest)
2. [Estrutura de Testes](#estrutura-de-testes)
3. [Escrevendo Testes](#escrevendo-testes)
4. [Executando Testes](#executando-testes)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Boas Práticas](#boas-práticas)

---

## ⚙️ Configuração do Jest

### 1. Instalação

O Jest já está instalado no projeto. Se precisar reinstalar:

```bash
cd backend
npm install --save-dev jest ts-jest @types/jest
```

### 2. Arquivo de Configuração

O arquivo `jest.config.js` já está configurado:

```javascript
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
```

### 3. TypeScript Configuration

O `tsconfig.json` já inclui o tipo `jest`:

```json
{
  "compilerOptions": {
    "types": ["node", "jest"],
    ...
  }
}
```

---

## 📁 Estrutura de Testes

### Convenção de Nomenclatura

- Arquivos de teste devem terminar com `.test.ts` ou `.spec.ts`
- Coloque os testes na mesma pasta do arquivo testado ou em uma pasta `__tests__`

**Exemplo:**
```
backend/src/
  services/
    jwt.service.ts
    jwt.service.test.ts  ← Teste do jwt.service.ts
    nfe.service.ts
    __tests__/
      nfe.service.test.ts  ← Teste alternativo
```

---

## ✍️ Escrevendo Testes

### Estrutura Básica

```typescript
import { minhaFuncao } from './meu-arquivo';

describe('Nome do Módulo', () => {
  describe('nomeDaFuncao', () => {
    it('deve fazer algo específico', () => {
      // Arrange (Preparar)
      const input = 'valor de teste';
      
      // Act (Executar)
      const resultado = minhaFuncao(input);
      
      // Assert (Verificar)
      expect(resultado).toBe('valor esperado');
    });

    it('deve lidar com casos de erro', () => {
      expect(() => {
        minhaFuncao(null);
      }).toThrow('Erro esperado');
    });
  });
});
```

### Matchers Comuns do Jest

```typescript
// Igualdade
expect(valor).toBe(5);                    // === (igualdade estrita)
expect(valor).toEqual({ a: 1 });           // Igualdade profunda (objetos)
expect(valor).not.toBe(10);                // Negação

// Verdadeiro/Falso
expect(valor).toBeTruthy();
expect(valor).toBeFalsy();
expect(valor).toBeDefined();
expect(valor).toBeUndefined();
expect(valor).toBeNull();

// Números
expect(valor).toBeGreaterThan(10);
expect(valor).toBeLessThan(20);
expect(valor).toBeGreaterThanOrEqual(10);
expect(valor).toBeLessThanOrEqual(20);

// Strings
expect(string).toMatch(/regex/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(5);

// Objetos
expect(obj).toHaveProperty('chave');
expect(obj).toHaveProperty('chave', 'valor');

// Exceções
expect(() => funcao()).toThrow();
expect(() => funcao()).toThrow('mensagem de erro');

// Promises/Async
await expect(promise).resolves.toBe(valor);
await expect(promise).rejects.toThrow();
```

---

## 🚀 Executando Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (re-executa ao salvar arquivos)
npm test -- --watch

# Executar um arquivo específico
npm test -- jwt.service.test.ts

# Executar testes que correspondem a um padrão
npm test -- --testNamePattern="deve gerar token"

# Executar com cobertura de código
npm test -- --coverage

# Executar em modo verbose (mostra todos os testes)
npm test -- --verbose
```

### Exemplo de Saída

```
PASS  src/services/jwt.service.test.ts
  JWT Service
    generateToken
      ✓ deve gerar um token válido (5 ms)
      ✓ deve gerar tokens diferentes para payloads diferentes (2 ms)
      ✓ deve incluir userId e role no payload (1 ms)
    verifyToken
      ✓ deve verificar e decodificar token válido (3 ms)
      ✓ deve rejeitar token inválido (1 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        2.345 s
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Teste de Função Simples

```typescript
// arquivo: src/utils/calculadora.ts
export function somar(a: number, b: number): number {
  return a + b;
}

export function dividir(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Divisão por zero não permitida');
  }
  return a / b;
}
```

```typescript
// arquivo: src/utils/calculadora.test.ts
import { somar, dividir } from './calculadora';

describe('Calculadora', () => {
  describe('somar', () => {
    it('deve somar dois números positivos', () => {
      expect(somar(2, 3)).toBe(5);
    });

    it('deve somar números negativos', () => {
      expect(somar(-1, -2)).toBe(-3);
    });

    it('deve somar zero', () => {
      expect(somar(5, 0)).toBe(5);
    });
  });

  describe('dividir', () => {
    it('deve dividir dois números', () => {
      expect(dividir(10, 2)).toBe(5);
    });

    it('deve lançar erro ao dividir por zero', () => {
      expect(() => dividir(10, 0)).toThrow('Divisão por zero não permitida');
    });
  });
});
```

### Exemplo 2: Teste de Serviço com Mock

```typescript
// arquivo: src/services/nfe-validator.service.test.ts
import { NFeXMLValidatorService } from './nfe-xml-validator.service';

describe('NFeXMLValidatorService', () => {
  describe('validarCompleto', () => {
    it('deve validar XML válido', () => {
      const xmlValido = `<?xml version="1.0"?>
        <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
          <infNFe Id="NFe42191234567890123456789012345678901234567890">
            <ide>
              <cUF>42</cUF>
              <natOp>Venda</natOp>
            </ide>
          </infNFe>
        </NFe>`;

      const resultado = NFeXMLValidatorService.validarCompleto(xmlValido);

      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar XML sem tag NFe', () => {
      const xmlInvalido = '<?xml version="1.0"?><outraTag></outraTag>';

      const resultado = NFeXMLValidatorService.validarCompleto(xmlInvalido);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros.length).toBeGreaterThan(0);
    });

    it('deve rejeitar XML sem chave de acesso', () => {
      const xmlSemChave = `<?xml version="1.0"?>
        <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
          <infNFe Id="NFe">
            <ide><cUF>42</cUF></ide>
          </infNFe>
        </NFe>`;

      const resultado = NFeXMLValidatorService.validarCompleto(xmlSemChave);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.includes('chave de acesso'))).toBe(true);
    });
  });
});
```

### Exemplo 3: Teste Assíncrono

```typescript
// arquivo: src/services/nfe.service.test.ts
import { NFeService } from './nfe.service';
import { PrismaClient } from '@prisma/client';

// Mock do Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    empresaFiscal: {
      findUnique: jest.fn(),
    },
    notaFiscal: {
      create: jest.fn(),
    },
  })),
}));

describe('NFeService', () => {
  let nfeService: NFeService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    nfeService = new NFeService();
  });

  describe('cancelarNFe', () => {
    it('deve cancelar NF-e com sucesso', async () => {
      // Arrange
      const chaveAcesso = '42191234567890123456789012345678901234567890';
      const justificativa = 'Erro na digitação dos dados';
      const empresaId = 'uuid-empresa';
      const ambiente = '2' as const;

      mockPrisma.empresaFiscal.findUnique.mockResolvedValue({
        id: empresaId,
        certificadoPath: '/path/to/cert.pfx',
        certificadoSenha: 'encrypted-password',
      } as any);

      // Act
      const resultado = await nfeService.cancelarNFe(
        chaveAcesso,
        justificativa,
        empresaId,
        ambiente
      );

      // Assert
      expect(resultado.status).toBe('sucesso');
      expect(mockPrisma.empresaFiscal.findUnique).toHaveBeenCalledWith({
        where: { id: empresaId },
      });
    });

    it('deve lançar erro se justificativa for muito curta', async () => {
      const chaveAcesso = '42191234567890123456789012345678901234567890';
      const justificativa = 'curta'; // Menos de 15 caracteres
      const empresaId = 'uuid-empresa';
      const ambiente = '2' as const;

      await expect(
        nfeService.cancelarNFe(chaveAcesso, justificativa, empresaId, ambiente)
      ).rejects.toThrow('Justificativa deve ter no mínimo 15 caracteres');
    });
  });
});
```

### Exemplo 4: Teste com Mocks de Módulos Externos

```typescript
// arquivo: src/services/nfe-soap.service.test.ts
import { NFeSoapService } from './nfe-soap.service';
import * as soap from 'soap';

// Mock do módulo soap
jest.mock('soap');

describe('NFeSoapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('consultarStatusServico', () => {
    it('deve retornar online quando SEFAZ está operacional', async () => {
      // Mock do cliente SOAP
      const mockClient = {
        nfeStatusServicoNFAsync: jest.fn().mockResolvedValue([
          {
            nfeResultMsg: {
              _xml: '<retConsStatServ><cStat>107</cStat><xMotivo>Serviço em Operação</xMotivo></retConsStatServ>',
            },
          },
        ]),
      };

      (soap.createClientAsync as jest.Mock).mockResolvedValue(mockClient);

      const resultado = await NFeSoapService.consultarStatusServico(
        '2',
        'cert-pem',
        'key-pem',
        'NORMAL'
      );

      expect(resultado.online).toBe(true);
      expect(resultado.codigoStatus).toBe('107');
    });

    it('deve retornar offline quando SEFAZ está indisponível', async () => {
      const mockClient = {
        nfeStatusServicoNFAsync: jest.fn().mockResolvedValue([
          {
            nfeResultMsg: {
              _xml: '<retConsStatServ><cStat>108</cStat><xMotivo>Serviço Paralisado</xMotivo></retConsStatServ>',
            },
          },
        ]),
      };

      (soap.createClientAsync as jest.Mock).mockResolvedValue(mockClient);

      const resultado = await NFeSoapService.consultarStatusServico(
        '2',
        'cert-pem',
        'key-pem',
        'NORMAL'
      );

      expect(resultado.online).toBe(false);
      expect(resultado.codigoStatus).toBe('108');
    });
  });
});
```

---

## ✅ Boas Práticas

### 1. Organize seus Testes

```typescript
describe('NomeDoModulo', () => {
  describe('nomeDoMetodo', () => {
    it('deve fazer X quando Y', () => {});
    it('deve fazer A quando B', () => {});
  });

  describe('outroMetodo', () => {
    it('deve fazer C quando D', () => {});
  });
});
```

### 2. Use `beforeEach` e `afterEach`

```typescript
describe('MeuServico', () => {
  let servico: MeuServico;
  let mockDependencia: jest.Mock;

  beforeEach(() => {
    // Configurar antes de cada teste
    mockDependencia = jest.fn();
    servico = new MeuServico(mockDependencia);
  });

  afterEach(() => {
    // Limpar após cada teste
    jest.clearAllMocks();
  });

  it('teste 1', () => {
    // ...
  });
});
```

### 3. Teste Casos de Sucesso e Erro

```typescript
describe('validarChaveAcesso', () => {
  it('deve aceitar chave válida de 44 dígitos', () => {
    expect(validarChaveAcesso('42191234567890123456789012345678901234567890')).toBe(true);
  });

  it('deve rejeitar chave com menos de 44 dígitos', () => {
    expect(validarChaveAcesso('123')).toBe(false);
  });

  it('deve rejeitar chave com caracteres não numéricos', () => {
    expect(validarChaveAcesso('4219123456789012345678901234567890123456789A')).toBe(false);
  });
});
```

### 4. Use Descrições Claras

```typescript
// ❌ Ruim
it('teste 1', () => {});

// ✅ Bom
it('deve retornar erro quando chave de acesso tem menos de 44 dígitos', () => {});
```

### 5. Isole Dependências com Mocks

```typescript
// Mock de banco de dados
jest.mock('@prisma/client');

// Mock de serviços externos
jest.mock('./nfe-soap.service');

// Mock de bibliotecas
jest.mock('soap');
```

### 6. Teste Validações e Regras de Negócio

```typescript
describe('validarJustificativa', () => {
  it('deve aceitar justificativa com 15 ou mais caracteres', () => {
    expect(validarJustificativa('Esta é uma justificativa válida')).toBe(true);
  });

  it('deve rejeitar justificativa com menos de 15 caracteres', () => {
    expect(validarJustificativa('curta')).toBe(false);
  });

  it('deve rejeitar justificativa vazia', () => {
    expect(validarJustificativa('')).toBe(false);
  });
});
```

---

## 📊 Cobertura de Código

### Gerar Relatório de Cobertura

```bash
npm test -- --coverage
```

Isso gera um relatório em `coverage/` mostrando:
- Linhas cobertas
- Funções cobertas
- Branches cobertos
- Statements cobertos

### Configurar Cobertura Mínima

Adicione ao `jest.config.js`:

```javascript
module.exports = {
  // ... outras configurações
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## 🔗 Recursos Adicionais

- [Documentação oficial do Jest](https://jestjs.io/docs/getting-started)
- [Documentação do ts-jest](https://kulshekhar.github.io/ts-jest/)
- [Jest Matchers](https://jestjs.io/docs/using-matchers)
- [Mocking no Jest](https://jestjs.io/docs/mock-functions)

---

**Última atualização:** Janeiro 2025

