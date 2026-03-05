/**
 * Sanitiza nomes para uso em atributos HTML (data-testid, classes, etc.)
 * Remove acentos e caracteres especiais, substitui espaços por hífens
 * 
 * @example
 * sanitizeId('Alimentação Limpa') // 'alimentacao-limpa'
 * sanitizeId('Exercício Físico') // 'exercicio-fisico'
 * sanitizeId('Usar Tabaco') // 'usar-tabaco'
 */
export function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')      // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, '');         // Remove hífens das extremidades
}
