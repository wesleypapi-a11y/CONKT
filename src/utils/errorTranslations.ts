export function translateDatabaseError(error: any): string {
  if (!error) return 'Erro desconhecido';

  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('violates foreign key constraint "quotation_items_request_item_id_fkey"')) {
    return 'Não é possível excluir esta solicitação pois existem cotações vinculadas aos seus itens. Exclua primeiro as cotações relacionadas.';
  }

  if (errorMessage.includes('violates foreign key constraint')) {
    return 'Não é possível excluir este registro pois existem outros dados vinculados a ele.';
  }

  if (errorMessage.includes('duplicate key value')) {
    return 'Já existe um registro com estes dados.';
  }

  if (errorMessage.includes('permission denied')) {
    return 'Você não tem permissão para realizar esta operação.';
  }

  if (errorMessage.includes('not found')) {
    return 'Registro não encontrado.';
  }

  if (errorMessage.includes('network')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  return errorMessage;
}
