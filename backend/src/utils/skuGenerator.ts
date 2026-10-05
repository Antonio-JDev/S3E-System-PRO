import { prisma } from '../lib/prisma';
import { randomBytes } from 'crypto';

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

/** SKU de material: somente dígitos (sequencial a partir de 100001). */
export const SKU_INICIAL = 100001;
const REGEX_SKU_NUMERICO = /^\d+$/;

export function isSkuNumerico(sku: unknown): boolean {
    return typeof sku === 'string' && REGEX_SKU_NUMERICO.test(sku.trim());
}

async function proximoValorSequenciaSku(tx: any): Promise<number> {
    try {
        const linhas: Array<{ valor: bigint | number }> = await tx.$queryRaw`SELECT nextval('material_sku_seq') AS valor`;
        return Number(linhas[0].valor);
    } catch (error) {
        // Banco sem a sequence (migration ainda não aplicada): usa o maior SKU numérico de 6 dígitos + 1
        console.warn('⚠️ Sequence material_sku_seq indisponível, usando MAX(sku)+1:', (error as Error)?.message);
        const linhas: Array<{ maximo: bigint | number | null }> = await tx.$queryRaw`
            SELECT MAX(sku::bigint) AS maximo FROM materiais WHERE sku ~ '^[0-9]{1,6}$'`;
        return Math.max(SKU_INICIAL - 1, Number(linhas[0]?.maximo ?? 0)) + 1;
    }
}

/**
 * Gera o próximo SKU sequencial e numérico para materiais (100001, 100002, ...).
 * A sequence do Postgres garante que cadastros simultâneos não recebam o mesmo número;
 * números já usados manualmente são pulados.
 *
 * @param prismaTransaction - Transação do Prisma (opcional, usa prisma padrão se não fornecido)
 * @param _ncm - mantido apenas para compatibilidade de assinatura (não entra no SKU)
 * @param maxTentativas - quantos números ocupados podem ser pulados antes de desistir
 */
export async function gerarSKUUnico(
    prismaTransaction?: any,
    _ncm?: string | null,
    maxTentativas: number = 50
): Promise<string> {
    const tx = prismaTransaction || prisma;

    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
        const sku = String(await proximoValorSequenciaSku(tx));
        const existe = await tx.material.findUnique({
            where: { sku },
            select: { id: true }
        });
        if (!existe) return sku;
    }

    throw new Error(`Não foi possível gerar um SKU numérico livre após ${maxTentativas} tentativas`);
}

/**
 * Gera um SKU único para cotações (banco frio)
 * Verifica unicidade tanto em materiais quanto em cotações
 * Formato: COT-XX (onde XX são 3 caracteres aleatórios)
 * 
 * @param prismaTransaction - Transação do Prisma (opcional)
 * @param maxTentativas - Número máximo de tentativas (padrão: 20)
 * @returns SKU único para cotação
 */
export async function gerarSKUCotacao(
    prismaTransaction?: any,
    maxTentativas: number = 20
): Promise<string> {
    const tx = prismaTransaction || prisma;
    let tentativas = 0;
    
    while (tentativas < maxTentativas) {
        // Gerar 3 caracteres aleatórios para o sufixo
        const sufixo = gerarCodigoAleatorio(3);
        const skuCotacao = `COT${sufixo}`; // 6 caracteres total: COT + 3 chars
        
        // Verificar unicidade em ambas as tabelas
        const [existeMaterial, existeCotacao] = await Promise.all([
            tx.material.findUnique({
                where: { sku: skuCotacao },
                select: { id: true }
            }),
            tx.cotacao.findUnique({
                where: { sku: skuCotacao },
                select: { id: true }
            })
        ]);
        
        if (!existeMaterial && !existeCotacao) {
            console.log(`✅ SKU único gerado para cotação: ${skuCotacao}`);
            return skuCotacao;
        }
        
        tentativas++;
    }
    
    // Fallback com timestamp
    const timestamp = Date.now().toString().slice(-3);
    const skuFallback = `COT${timestamp}`;
    
    console.warn(`⚠️ Usando SKU com timestamp para cotação: ${skuFallback}`);
    return skuFallback;
}

/**
 * Valida se um SKU já existe no banco (materiais ou cotações)
 * @param sku - SKU a ser validado
 * @param prismaTransaction - Transação do Prisma (opcional)
 * @returns true se o SKU já existe, false caso contrário
 */
export async function skuExiste(sku: string, prismaTransaction?: any): Promise<boolean> {
    const tx = prismaTransaction || prisma;
    
    // Verificar em ambas as tabelas
    const [material, cotacao] = await Promise.all([
        tx.material.findUnique({
            where: { sku },
            select: { id: true }
        }),
        tx.cotacao.findUnique({
            where: { sku },
            select: { id: true }
        })
    ]);
    
    return !!(material || cotacao);
}

