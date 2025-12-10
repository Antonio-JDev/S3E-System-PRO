import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Gera uma string aleatória de caracteres alfanuméricos
 * Usa crypto.randomBytes para maior segurança e aleatoriedade
 * @param length - Tamanho da string (padrão: 8)
 * @returns String aleatória com letras maiúsculas e números
 */
function gerarCodigoAleatorio(length: number = 8): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    
    try {
        // Usar crypto.randomBytes para maior aleatoriedade e segurança
        // Gera bytes aleatórios criptograficamente seguros
        const bytesAleatorios = randomBytes(length);
        
        for (let i = 0; i < length; i++) {
            const indiceAleatorio = bytesAleatorios[i] % caracteres.length;
            resultado += caracteres[indiceAleatorio];
        }
    } catch (error) {
        // Fallback para Math.random() se crypto não estiver disponível
        console.warn('⚠️ crypto.randomBytes não disponível, usando Math.random() como fallback');
        for (let i = 0; i < length; i++) {
            const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
            resultado += caracteres[indiceAleatorio];
        }
    }
    
    return resultado;
}

/**
 * Gera um SKU único e aleatório para materiais
 * Formato: SKU-XXXX-XXXX (8 caracteres aleatórios divididos em 2 grupos)
 * 
 * Esta função garante que cada material terá um SKU único, mesmo quando há muitos
 * materiais com nomes parecidos. A aleatoriedade é alta para evitar colisões.
 * 
 * IMPORTANTE: O NCM fornecido NÃO é alterado - ele é apenas usado como referência
 * opcional para incluir no SKU (últimos 4 dígitos). O NCM original do material
 * deve ser salvo separadamente no campo 'ncm' do material.
 * 
 * @param prismaTransaction - Transação do Prisma (opcional, usa prisma padrão se não fornecido)
 * @param ncm - NCM do material (opcional, usado apenas como referência para o SKU - NÃO altera o NCM)
 * @param maxTentativas - Número máximo de tentativas para gerar SKU único (padrão: 20)
 * @returns SKU único e válido
 */
export async function gerarSKUUnico(
    prismaTransaction?: any,
    ncm?: string | null,
    maxTentativas: number = 20
): Promise<string> {
    const tx = prismaTransaction || prisma;
    let tentativas = 0;
    
    // Adicionar um pequeno delay aleatório entre tentativas para aumentar variabilidade
    const delayAleatorio = () => new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    while (tentativas < maxTentativas) {
        // Gerar três partes aleatórias para maior variabilidade
        // Parte 1: 4 caracteres aleatórios
        // Parte 2: 4 caracteres aleatórios
        // Isso gera 36^8 = 2.8 trilhões de combinações possíveis
        const parte1 = gerarCodigoAleatorio(4);
        const parte2 = gerarCodigoAleatorio(4);
        
        // Se tem NCM, usar apenas os últimos 4 dígitos como identificador adicional
        // mas manter a aleatoriedade como principal garantia de unicidade
        const skuGerado = ncm && ncm.length >= 4
            ? `SKU-${parte1}-${parte2}-${ncm.slice(-4)}` // SKU-XXXX-XXXX-NNNN (NCM)
            : `SKU-${parte1}-${parte2}`; // Formato padrão: SKU-XXXX-XXXX
        
        // Verificar se já existe no banco
        const existe = await tx.material.findUnique({
            where: { sku: skuGerado },
            select: { id: true }
        });
        
        if (!existe) {
            if (tentativas > 0) {
                console.log(`✅ SKU único gerado após ${tentativas + 1} tentativa(s): ${skuGerado}`);
            }
            return skuGerado;
        }
        
        tentativas++;
        
        // Pequeno delay para aumentar variabilidade entre tentativas
        if (tentativas < maxTentativas) {
            await delayAleatorio();
        }
    }
    
    // Se não conseguiu em maxTentativas, usar timestamp + aleatório como fallback
    // Isso garante unicidade absoluta mesmo em casos extremos
    const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos do timestamp
    const parteAleatoria1 = gerarCodigoAleatorio(4);
    const parteAleatoria2 = gerarCodigoAleatorio(4);
    const skuFallback = ncm && ncm.length >= 4
        ? `SKU-${timestamp}-${parteAleatoria1}-${ncm.slice(-4)}`
        : `SKU-${timestamp}-${parteAleatoria1}-${parteAleatoria2}`;
    
    // Verificar uma última vez se o fallback não existe (extremamente improvável)
    const existeFallback = await tx.material.findUnique({
        where: { sku: skuFallback },
        select: { id: true }
    });
    
    if (existeFallback) {
        // Último recurso: adicionar mais aleatoriedade
        const ultimoRecurso = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        console.warn(`⚠️ SKU fallback também duplicado! Usando último recurso: ${ultimoRecurso}`);
        return ultimoRecurso;
    }
    
    console.warn(`⚠️ Usando SKU com timestamp como fallback após ${maxTentativas} tentativas: ${skuFallback}`);
    return skuFallback;
}

/**
 * Valida se um SKU já existe no banco
 * @param sku - SKU a ser validado
 * @param prismaTransaction - Transação do Prisma (opcional)
 * @returns true se o SKU já existe, false caso contrário
 */
export async function skuExiste(sku: string, prismaTransaction?: any): Promise<boolean> {
    const tx = prismaTransaction || prisma;
    const material = await tx.material.findUnique({
        where: { sku },
        select: { id: true }
    });
    return !!material;
}

