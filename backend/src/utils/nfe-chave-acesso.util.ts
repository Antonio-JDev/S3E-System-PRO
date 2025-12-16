/**
 * Utilitário para geração e validação de Chave de Acesso da NF-e
 * Implementa o algoritmo Módulo 11 para cálculo do dígito verificador
 */
export class NFeChaveAcessoUtil {
  /**
   * Calcula o dígito verificador usando Módulo 11
   */
  static calcularDigitoVerificador(chaveSemDV: string): string {
    let soma = 0;
    let peso = 2;

    // Percorre a chave de trás para frente
    for (let i = chaveSemDV.length - 1; i >= 0; i--) {
      const digito = parseInt(chaveSemDV[i], 10);
      soma += digito * peso;
      peso++;

      // Se peso > 9, volta para 2
      if (peso > 9) {
        peso = 2;
      }
    }

    // Calcula o resto da divisão por 11
    const resto = soma % 11;

    // Se resto < 2, dígito = 0, senão dígito = 11 - resto
    const digitoVerificador = resto < 2 ? 0 : 11 - resto;

    return digitoVerificador.toString();
  }

  /**
   * Gera chave de acesso completa da NF-e (44 dígitos)
   * Formato: UF (2) + AAMM (4) + CNPJ (14) + mod (2) + serie (3) + nNF (9) + tpEmis (1) + cNF (8) + dv (1)
   */
  static gerarChaveAcesso(
    uf: string,
    cnpj: string,
    modelo: string,
    serie: string,
    numero: string,
    tipoEmissao: string,
    cNF: string
  ): string {
    // Limpar e formatar dados
    const ufFormatada = uf.padStart(2, '0');
    const anoMes = new Date().toISOString().slice(2, 7).replace('-', '');
    const cnpjLimpo = cnpj.replace(/\D/g, '').padStart(14, '0');
    const modeloFormatado = modelo.padStart(2, '0');
    const serieFormatada = serie.padStart(3, '0');
    const numeroFormatado = numero.padStart(9, '0');
    const tipoEmissaoFormatado = tipoEmissao.padStart(1, '0');
    const cNFFormatado = cNF.padStart(8, '0');

    // Montar chave sem dígito verificador (43 dígitos)
    const chaveSemDV = `${ufFormatada}${anoMes}${cnpjLimpo}${modeloFormatado}${serieFormatada}${numeroFormatado}${tipoEmissaoFormatado}${cNFFormatado}`;

    // Validar tamanho
    if (chaveSemDV.length !== 43) {
      throw new Error(`Chave de acesso deve ter 43 dígitos antes do DV. Encontrado: ${chaveSemDV.length}`);
    }

    // Calcular dígito verificador
    const digitoVerificador = this.calcularDigitoVerificador(chaveSemDV);

    // Retornar chave completa (44 dígitos)
    return `${chaveSemDV}${digitoVerificador}`;
  }

  /**
   * Valida uma chave de acesso
   */
  static validarChaveAcesso(chave: string): {
    valida: boolean;
    erro?: string;
  } {
    // Remover espaços e caracteres especiais
    const chaveLimpa = chave.replace(/\D/g, '');

    // Verificar tamanho
    if (chaveLimpa.length !== 44) {
      return {
        valida: false,
        erro: `Chave de acesso deve ter 44 dígitos. Encontrado: ${chaveLimpa.length}`
      };
    }

    // Verificar se contém apenas números
    if (!/^\d+$/.test(chaveLimpa)) {
      return {
        valida: false,
        erro: 'Chave de acesso deve conter apenas números'
      };
    }

    // Separar chave e dígito verificador
    const chaveSemDV = chaveLimpa.slice(0, 43);
    const dvInformado = chaveLimpa.slice(43, 44);

    // Calcular dígito verificador correto
    const dvCalculado = this.calcularDigitoVerificador(chaveSemDV);

    // Comparar
    if (dvInformado !== dvCalculado) {
      return {
        valida: false,
        erro: `Dígito verificador inválido. Esperado: ${dvCalculado}, Informado: ${dvInformado}`
      };
    }

    return { valida: true };
  }

  /**
   * Extrai informações da chave de acesso
   */
  static extrairInformacoes(chave: string): {
    uf: string;
    anoMes: string;
    cnpj: string;
    modelo: string;
    serie: string;
    numero: string;
    tipoEmissao: string;
    cNF: string;
    digitoVerificador: string;
  } {
    const chaveLimpa = chave.replace(/\D/g, '');

    if (chaveLimpa.length !== 44) {
      throw new Error('Chave de acesso inválida');
    }

    return {
      uf: chaveLimpa.slice(0, 2),
      anoMes: chaveLimpa.slice(2, 6),
      cnpj: chaveLimpa.slice(6, 20),
      modelo: chaveLimpa.slice(20, 22),
      serie: chaveLimpa.slice(22, 25),
      numero: chaveLimpa.slice(25, 34),
      tipoEmissao: chaveLimpa.slice(34, 35),
      cNF: chaveLimpa.slice(35, 43),
      digitoVerificador: chaveLimpa.slice(43, 44)
    };
  }
}

