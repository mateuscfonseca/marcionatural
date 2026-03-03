import { useToast } from '@/composables/useToast';

/**
 * Cria um handler de erros de API que exibe notificações toast
 * 
 * @param defaultMessage - Mensagem padrão se o erro não tiver mensagem específica
 * @returns Função para tratar erros
 * 
 * @example
 * const handleApiError = createApiErrorHandler();
 * try {
 *   await createEntry(data);
 * } catch (error) {
 *   handleApiError(error, 'Erro ao criar entrada');
 * }
 */
export function createApiErrorHandler(defaultMessage = 'Erro ao processar solicitação') {
  const { error } = useToast();

  return (err: unknown, messageOverride?: string) => {
    const finalMessage = messageOverride || defaultMessage;

    if (err instanceof Error) {
      // Usa a mensagem do erro (que vem do servidor via api.ts)
      error(err.message);
    } else {
      error(finalMessage);
    }
    console.error('API Error:', err);
  };
}
