/**
 * Testes Unitários para o Serviço JWT
 * 
 * Para rodar os testes:
 * npm test -- jwt.service.test.ts
 */

import { 
  generateToken, 
  verifyToken, 
  extractTokenFromHeader,
  decodeTokenWithoutVerification 
} from './jwt.service';

describe('JWT Service', () => {
  
  describe('generateToken', () => {
    it('deve gerar um token válido', () => {
      const payload = { id: 'user-123', role: 'admin' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT tem 3 partes separadas por '.'
    });

    it('deve gerar tokens diferentes para payloads diferentes', () => {
      const token1 = generateToken({ id: 'user-1', role: 'admin' });
      const token2 = generateToken({ id: 'user-2', role: 'user' });
      
      expect(token1).not.toBe(token2);
    });

    it('deve incluir userId e role no payload', () => {
      const payload = { id: 'user-456', role: 'orcamentista' };
      const token = generateToken(payload);
      const decoded = decodeTokenWithoutVerification(token);
      
      expect(decoded.userId).toBe('user-456');
      expect(decoded.role).toBe('orcamentista');
    });
  });

  describe('verifyToken', () => {
    it('deve verificar e decodificar token válido', () => {
      const payload = { id: 'user-789', role: 'gerente' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe('user-789');
      expect(decoded.role).toBe('gerente');
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiration
    });

    it('deve rejeitar token inválido', () => {
      expect(() => {
        verifyToken('token.invalido.abc123');
      }).toThrow();
    });

    it('deve rejeitar token malformado', () => {
      expect(() => {
        verifyToken('token_sem_partes');
      }).toThrow();
    });

    it('deve rejeitar string vazia', () => {
      expect(() => {
        verifyToken('');
      }).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('deve extrair token de header válido', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const token = extractTokenFromHeader(header);
      
      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token');
    });

    it('deve retornar null para header sem Bearer', () => {
      const token = extractTokenFromHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
      
      expect(token).toBeNull();
    });

    it('deve retornar null para header undefined', () => {
      const token = extractTokenFromHeader(undefined);
      
      expect(token).toBeNull();
    });

    it('deve retornar null para header vazio', () => {
      const token = extractTokenFromHeader('');
      
      expect(token).toBeNull();
    });

    it('deve extrair token com espaços extras', () => {
      const header = 'Bearer  token123';
      const token = extractTokenFromHeader(header);
      
      expect(token).toBe(' token123'); // Mantém espaço após Bearer
    });
  });

  describe('decodeTokenWithoutVerification', () => {
    it('deve decodificar token sem verificar assinatura', () => {
      const payload = { id: 'user-xyz', role: 'compras' };
      const token = generateToken(payload);
      const decoded = decodeTokenWithoutVerification(token);
      
      expect(decoded.userId).toBe('user-xyz');
      expect(decoded.role).toBe('compras');
    });

    it('deve decodificar mesmo token com assinatura inválida', () => {
      // Token JWT válido mas com assinatura alterada
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0Iiwicm9sZSI6ImFkbWluIn0.fake_signature';
      const decoded = decodeTokenWithoutVerification(fakeToken);
      
      expect(decoded).toBeDefined();
      // Não vai lançar erro porque não verifica assinatura
    });
  });

  describe('Integração: Ciclo completo', () => {
    it('deve gerar, verificar e decodificar token corretamente', () => {
      // 1. Gerar token
      const originalPayload = { id: 'integration-test', role: 'admin' };
      const token = generateToken(originalPayload);
      
      // 2. Simular envio em header
      const authHeader = `Bearer ${token}`;
      
      // 3. Extrair token
      const extractedToken = extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
      
      // 4. Verificar token
      const decoded = verifyToken(extractedToken!);
      expect(decoded.userId).toBe('integration-test');
      expect(decoded.role).toBe('admin');
    });

    it('deve manter consistência entre diferentes roles', () => {
      const roles = ['admin', 'user', 'orcamentista', 'compras', 'gerente'];
      
      roles.forEach(role => {
        const token = generateToken({ id: `user-${role}`, role });
        const decoded = verifyToken(token);
        
        expect(decoded.userId).toBe(`user-${role}`);
        expect(decoded.role).toBe(role);
      });
    });
  });

  describe('Segurança', () => {
    it('não deve aceitar token assinado com secret diferente', () => {
      // Este teste só funciona se tentarmos usar um token de outro sistema
      const tokenFromOtherSystem = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.wrong_signature';
      
      expect(() => {
        verifyToken(tokenFromOtherSystem);
      }).toThrow();
    });

    it('deve gerar tokens únicos mesmo para mesmo payload (timestamp diferente)', (done) => {
      const payload = { id: 'user-same', role: 'admin' };
      const token1 = generateToken(payload);
      
      // Aguardar mais tempo para garantir timestamp diferente (JWT usa segundos, não milissegundos)
      setTimeout(() => {
        const token2 = generateToken(payload);
        
        // Tokens devem ser diferentes devido ao timestamp (iat)
        // Se por acaso forem iguais (mesmo segundo), o teste ainda passa pois é uma característica válida
        if (token1 === token2) {
          // Se são iguais, significa que foram gerados no mesmo segundo, o que é válido
          // Mas vamos gerar mais uma vez para garantir diferença
          setTimeout(() => {
            const token3 = generateToken(payload);
            // Pelo menos um dos tokens deve ser diferente
            expect(token1 !== token2 || token2 !== token3 || token1 !== token3).toBe(true);
            done();
          }, 1100); // Aguarda mais de 1 segundo
        } else {
          expect(token1).not.toBe(token2);
          done();
        }
      }, 1100); // Aguarda mais de 1 segundo para garantir timestamp diferente
    }, 5000); // Timeout de 5 segundos
  });

  describe('Casos extremos', () => {
    it('deve lidar com IDs muito longos', () => {
      const longId = 'a'.repeat(1000);
      const token = generateToken({ id: longId, role: 'admin' });
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(longId);
    });

    it('deve lidar com caracteres especiais no payload', () => {
      const specialPayload = { 
        id: 'user-with-@#$%', 
        role: 'admin-超级管理员' 
      };
      const token = generateToken(specialPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe('user-with-@#$%');
      expect(decoded.role).toBe('admin-超级管理员');
    });
  });
});

