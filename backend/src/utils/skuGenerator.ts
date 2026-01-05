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
 * Formato: XXXXXX (6 caracteres alfanuméricos)
 * 
 * Esta função garante que cada material terá um SKU único, mesmo quando há muitos
 * materiais com nomes parecidos. A aleatoriedade é alta para evitar colisões.
 * 
 * IMPORTANTE: O NCM fornecido NÃO é alterado - ele é apenas usado como referência
 * opcional. O NCM original do material deve ser salvo separadamente no campo 'ncm' do material.
 * 
 * @param prismaTransaction - Transação do Prisma (opcional, usa prisma padrão se não fornecido)
 * @param ncm - NCM do material (opcional, não usado mais no SKU - mantido apenas para compatibilidade)
 * @param maxTentativas - Número máximo de tentativas para gerar SKU único (padrão: 20)
 * @returns SKU único e válido com 6 caracteres
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
        // Gerar 6 caracteres aleatórios alfanuméricos
        // Isso gera 36^6 = 2.176 bilhões de combinações possíveis
        const skuGerado = gerarCodigoAleatorio(6);
        
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
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
    const parteAleatoria = gerarCodigoAleatorio(3);
    const skuFallback = `${timestamp}${parteAleatoria}`.slice(0, 6); // Garantir exatamente 6 caracteres
    
    // Verificar uma última vez se o fallback não existe (extremamente improvável)
    const existeFallback = await tx.material.findUnique({
        where: { sku: skuFallback },
        select: { id: true }
    });
    
    if (existeFallback) {
        // Último recurso: usar apenas aleatório com mais tentativas
        let ultimoRecurso = '';
        for (let i = 0; i < 10; i++) {
            ultimoRecurso = gerarCodigoAleatorio(6);
            const existeUltimo = await tx.material.findUnique({
                where: { sku: ultimoRecurso },
                select: { id: true }
            });
            if (!existeUltimo) {
                console.warn(`⚠️ SKU fallback duplicado! Usando último recurso: ${ultimoRecurso}`);
                return ultimoRecurso;
            }
        }
        // Se ainda assim não conseguir, usar timestamp completo
        ultimoRecurso = Date.now().toString().slice(-6);
        console.warn(`⚠️ Usando timestamp como último recurso: ${ultimoRecurso}`);
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

