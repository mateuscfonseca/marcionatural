/**
 * Enums para IDs de activity types
 * 
 * Usado para evitar hardcoded de IDs em todo o código
 */
export const ActivityTypeId = {
  /** Alimentação Limpa/Saudável (+10 pontos) */
  ALIMENTACAO_LIMPA: 1,
  /** Alimentação Suja/Não saudável (-10 pontos) */
  ALIMENTACAO_SUJA: 2,
  /** Exercício Físico (+5 pontos) */
  EXERCICIO_FISICO: 3,
  /** Usar Tabaco (-5 pontos) */
  USAR_TABACO: 4,
} as const;

export type ActivityTypeId = (typeof ActivityTypeId)[keyof typeof ActivityTypeId];

/**
 * Mapa de nomes de activity types para exibição
 */
export const ActivityTypeNames: Record<ActivityTypeId, string> = {
  [ActivityTypeId.ALIMENTACAO_LIMPA]: 'Alimentação Limpa',
  [ActivityTypeId.ALIMENTACAO_SUJA]: 'Alimentação Suja',
  [ActivityTypeId.EXERCICIO_FISICO]: 'Exercício Físico',
  [ActivityTypeId.USAR_TABACO]: 'Usar Tabaco',
};
