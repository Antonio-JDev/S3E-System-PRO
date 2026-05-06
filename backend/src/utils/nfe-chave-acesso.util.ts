/**
 * Utilitário para geração e validação de Chave de Acesso da NF-e
 * Implementa o algoritmo Módulo 11 para cálculo do dígito verificador
 */
export class NFeChaveAcessoUtil {
  /**
   * Calcula o dígito verificador usando Módulo 11
   * CORREÇÃO 5: CÁLCULO RIGOROSO DO DÍGITO VERIFICADOR
   */
  static calcularDigitoVerificador(chaveSemDV: string): string {
    console.log('🔧 [Fix cDV] Calculando dígito verificador para chave:', chaveSemDV);
    console.log('🔧 [Fix cDV] Tamanho da chave sem DV:', chaveSemDV.length, '(deve ser 43)');
    
    if (chaveSemDV.length !== 43) {
      throw new Error(`Chave sem DV deve ter exatamente 43 dígitos. Encontrado: ${chaveSemDV.length}`);
    }
    
    let soma = 0;
    let peso = 2;
    let detalhamento = '';

    // Percorre a chave de trás para frente aplicando Módulo 11
    for (let i = chaveSemDV.length - 1; i >= 0; i--) {
      const digito = parseInt(chaveSemDV[i], 10);
      const multiplicacao = digito * peso;
      soma += multiplicacao;
      
      // Debug detalhado do cálculo
      detalhamento += `[${chaveSemDV[i]} × ${peso} = ${multiplicacao}] `;
      
      peso++;
      // Se peso > 9, volta para 2 (padrão Módulo 11 SEFAZ)
      if (peso > 9) {
        peso = 2;
      }
    }

    console.log('🔧 [Fix cDV] Detalhamento do cálculo:', detalhamento);
    console.log('🔧 [Fix cDV] Soma total:', soma);

    // Calcula o resto da divisão por 11
    const resto = soma % 11;
    console.log('🔧 [Fix cDV] Resto da divisão por 11:', resto);

    // Se resto < 2, dígito = 0, senão dígito = 11 - resto
    const digitoVerificador = resto < 2 ? 0 : 11 - resto;
    
    console.log('🔧 [Fix cDV] Dígito verificador calculado:', digitoVerificador);
    console.log('✅ [Fix cDV] Cálculo concluído');

    return digitoVerificador.toString();
  }

  /**
   * Gera chave de acesso completa da NF-e (44 dígitos)
   * Formato: UF (2) + AAMM (4) + CNPJ (14) + mod (2) + serie (3) + nNF (9) + tpEmis (1) + cNF (8) + dv (1)
   * CORREÇÃO 5: GERAÇÃO RIGOROSA DA CHAVE DE ACESSO
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
    console.log('🔧 [Fix Chave] Gerando chave de acesso com parâmetros:');
    console.log('🔧 [Fix Chave] UF:', uf, '| CNPJ:', cnpj, '| Modelo:', modelo);
    console.log('🔧 [Fix Chave] Serie:', serie, '| Numero:', numero, '| TipoEmis:', tipoEmissao, '| cNF:', cNF);
    
    // Limpar e formatar dados com validação rigorosa
    const ufFormatada = uf.padStart(2, '0');
    const anoMes = new Date().toISOString().slice(2, 7).replace('-', '');
    const cnpjLimpo = cnpj.replace(/\D/g, '').padStart(14, '0');
    const modeloFormatado = modelo.padStart(2, '0');
    const serieFormatada = serie.padStart(3, '0');
    const numeroFormatado = numero.padStart(9, '0');
    const tipoEmissaoFormatado = tipoEmissao.padStart(1, '0');
    const cNFFormatado = cNF.padStart(8, '0');

    console.log('🔧 [Fix Chave] Componentes formatados:');
    console.log(`🔧 [Fix Chave] UF: ${ufFormatada} (${ufFormatada.length})`);
    console.log(`🔧 [Fix Chave] AAMM: ${anoMes} (${anoMes.length})`);
    console.log(`🔧 [Fix Chave] CNPJ: ${cnpjLimpo} (${cnpjLimpo.length})`);
    console.log(`🔧 [Fix Chave] Modelo: ${modeloFormatado} (${modeloFormatado.length})`);
    console.log(`🔧 [Fix Chave] Serie: ${serieFormatada} (${serieFormatada.length})`);
    console.log(`🔧 [Fix Chave] Numero: ${numeroFormatado} (${numeroFormatado.length})`);
    console.log(`🔧 [Fix Chave] TpEmis: ${tipoEmissaoFormatado} (${tipoEmissaoFormatado.length})`);
    console.log(`🔧 [Fix Chave] cNF: ${cNFFormatado} (${cNFFormatado.length})`);

    // Montar chave sem dígito verificador (43 dígitos)
    const chaveSemDV = `${ufFormatada}${anoMes}${cnpjLimpo}${modeloFormatado}${serieFormatada}${numeroFormatado}${tipoEmissaoFormatado}${cNFFormatado}`;

    console.log('🔧 [Fix Chave] Chave sem DV:', chaveSemDV);
    console.log('🔧 [Fix Chave] Tamanho chave sem DV:', chaveSemDV.length, '(deve ser 43)');

    // Validar tamanho rigorosamente
    if (chaveSemDV.length !== 43) {
      throw new Error(`Chave de acesso deve ter exatamente 43 dígitos antes do DV. Encontrado: ${chaveSemDV.length}`);
    }

    // Calcular dígito verificador
    const digitoVerificador = this.calcularDigitoVerificador(chaveSemDV);

    // Retornar chave completa (44 dígitos)
    const chaveCompleta = `${chaveSemDV}${digitoVerificador}`;
    
    console.log('✅ [Fix Chave] Chave completa gerada:', chaveCompleta);
    console.log('✅ [Fix Chave] Tamanho final:', chaveCompleta.length, '(deve ser 44)');
    console.log('✅ [Fix Chave] Dígito verificador final:', digitoVerificador);

    return chaveCompleta;
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

