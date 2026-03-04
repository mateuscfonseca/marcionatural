/**
 * Enums para IDs de categorias
 * 
 * Usado para evitar hardcoded de IDs em todo o código
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
 * Mapa de tetos diários de pontos por categoria
 * Positivo = máximo de pontos que pode ganhar por dia
 * Negativo = mínimo de pontos que pode perder por dia
 */
export const CategoryDailyCaps: Record<CategoryId, { max: number; min: number }> = {
  [CategoryId.REFEICAO]: { max: 10, min: -10 },
  [CategoryId.EXERCICIO]: { max: 5, min: 0 },
  [CategoryId.PROJETO_PESSOAL]: { max: 50, min: 0 }, // teto semanal, não diário
  [CategoryId.ENTORPECENTES]: { max: 0, min: -5 },
};
