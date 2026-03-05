/**
 * Enums para IDs de categorias
 * Espelha os enums do backend para consistência
 */
export const CategoryId = {
  /** Registro de alimentação - limpa ou suja */
  REFEICAO: 1,
  /** Atividades físicas e exercícios */
  EXERCICIO: 2,
  /** Projetos pessoais de longo prazo */
  PROJETO_PESSOAL: 3,
  /** Uso de substâncias entorpecentes */
  ENTORPECENTES: 4,
} as const;

export type CategoryId = (typeof CategoryId)[keyof typeof CategoryId];

/**
 * Mapa de nomes de categorias para exibição
 */
export const CategoryNames: Record<CategoryId, string> = {
  [CategoryId.REFEICAO]: 'Alimentação',
  [CategoryId.EXERCICIO]: 'Exercício',
  [CategoryId.PROJETO_PESSOAL]: 'Projeto Pessoal',
  [CategoryId.ENTORPECENTES]: 'Entorpecentes',
};

/**
 * Verifica se categoria é sempre positiva
 */
export function isCategoryAlwaysPositive(categoryId: number): boolean {
  return categoryId === CategoryId.EXERCICIO;
}

/**
 * Verifica se categoria é sempre negativa
 */
export function isCategoryAlwaysNegative(categoryId: number): boolean {
  return categoryId === CategoryId.ENTORPECENTES;
}

/**
 * Verifica se categoria pode ser positiva ou negativa (depende do activity_type)
 */
export function isCategoryVariable(categoryId: number): boolean {
  return categoryId === CategoryId.REFEICAO;
}
