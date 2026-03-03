/**
 * Interface para migrações do banco de dados
 * 
 * Cada migração deve ser idempotente - pode ser executada múltiplas vezes
 * sem causar erros ou efeitos colaterais indesejados.
 */
export interface Migration {
  /**
   * Nome único da migração
   * Usado para rastrear se a migração já foi aplicada
   * Formato sugerido: "NNN-descricao-curta" (ex: "001-add-entry-date")
   */
  readonly name: string;

  /**
   * Descrição do que a migração faz
   * Usado para logging e documentação
   */
  readonly description: string;

  /**
   * Aplica a migração
   * 
   * Deve ser idempotente: não deve lançar erro se já foi aplicada.
   * Deve verificar se as mudanças já existem antes de aplicá-las.
   */
  apply(): void;
}
