import * as crypto from 'crypto';

/**
 * Utilitário de Criptografia AES para dados sensíveis
 * Usa AES-256-GCM para criptografia reversível
 */
export class CryptoUtil {
  // Chave de criptografia (deve estar em variável de ambiente em produção)
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 16 bytes para AES
  private static readonly SALT_LENGTH = 64; // 64 bytes para salt
  private static readonly TAG_LENGTH = 16; // 16 bytes para GCM tag
  private static readonly KEY_LENGTH = 32; // 32 bytes para AES-256

  /**
   * Obtém a chave de criptografia fixa
   * Usa uma chave fixa para que funcione automaticamente em dev e produção
   * A senha do certificado é criptografada apenas para não ficar em texto plano no banco
   */
  private static getEncryptionKey(): Buffer {
    // Chave fixa derivada do nome do sistema - funciona em todos os ambientes
    const secretKey = 's3e-engenharia-certificado-digital-encryption-key-2024';
    
    // Deriva uma chave de 32 bytes usando SHA-256
    return crypto.createHash('sha256').update(secretKey).digest();
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   */
  static encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Retorna: iv:tag:encrypted (tudo em hex)
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      console.error('Erro ao criptografar:', error);
      throw new Error(`Erro ao criptografar dados: ${error.message}`);
    }
  }

  /**
   * Descriptografa um texto criptografado com AES-256-GCM
   */
  static decrypt(encryptedText: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedText.split(':');

      if (parts.length !== 3) {
        throw new Error('Formato de texto criptografado inválido');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      console.error('Erro ao descriptografar:', error);
      throw new Error(`Erro ao descriptografar dados: ${error.message}`);
    }
  }

  /**
   * Verifica se uma string está criptografada (formato correto)
   */
  static isEncrypted(text: string): boolean {
    try {
      const parts = text.split(':');
      return parts.length === 3 && 
             parts[0].length === this.IV_LENGTH * 2 && // IV em hex
             parts[1].length === this.TAG_LENGTH * 2;  // Tag em hex
    } catch {
      return false;
    }
  }
}

