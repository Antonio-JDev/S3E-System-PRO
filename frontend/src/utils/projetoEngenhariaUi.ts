/** Rótulo padrão da ação de atribuição no menu da OS. */
export function getProjetoEngenhariaActionLabel(atribuido: boolean): string {
  return atribuido ? 'Alterar projetista' : 'Atribuir à Engenharia';
}
