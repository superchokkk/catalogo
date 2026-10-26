import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';

// ---------------------------------------------------------------------------------------
// Formato único de resposta da API
//
//   Sucesso: { success: true,  message: string, ...dados }
//   Erro:    { success: false, statusCode: number, message: string | string[], error?: string }
//
// `dados` ficam no mesmo nível de `success`/`message` (sem envelope `data`), para não
// quebrar quem já lê campos como `user` ou `produtos`. `message` é string, exceto em erro
// de validação (400), que traz uma lista com uma mensagem por campo inválido.
// ---------------------------------------------------------------------------------------

export class RespostaSucessoDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Operação realizada com sucesso.' })
  message!: string;
}

export class RespostaErroDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Descrição do erro.',
    description: 'Texto, ou lista de textos (um por campo) nos erros de validação.',
  })
  message!: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request', description: 'Nome HTTP do status.' })
  error?: string;
}

// Monta a resposta de sucesso. Os `dados` são espalhados ao lado de success/message.
export function ok<T extends object = {}>(message: string, dados?: T): { success: true; message: string } & T {
  return { success: true, message, ...(dados as T) };
}

// Monta o corpo de qualquer resposta de erro (usado pelo AllExceptionsFilter).
export function corpoErro(statusCode: number, message: string | string[], error?: string): RespostaErroDto {
  return { success: false, statusCode, message, ...(error ? { error } : {}) };
}

// Mensagens que aparecem em mais de um ponto do código (uma única fonte de verdade).
export const MSG = {
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha inválidos.',
  SESSAO_EXPIRADA: 'Sessão expirada. Faça login novamente.',
  TOKEN_AUSENTE: 'Token não encontrado nos cookies.',
  TOKEN_INVALIDO: 'Token inválido ou expirado.',
  ACESSO_NEGADO: 'Acesso negado.',
  ORIGEM_NAO_AUTORIZADA: 'Origem não autorizada.',
  ERRO_INTERNO: 'Erro interno do servidor.',
  SOMENTE_IMAGENS: 'Apenas imagens JPEG, PNG, WebP ou GIF são aceitas.',
  SENHAS_DIFERENTES: 'As senhas não coincidem.',
  USUARIO_CRIAR_FALHOU: 'Não foi possível criar o usuário. Verifique os dados informados.',
  PRODUTO_ATUALIZAR_FALHOU: 'Erro ao atualizar produto.',
  PRODUTO_DELETAR_FALHOU: 'Erro ao deletar produto.',
} as const;

// Erros que qualquer rota pode devolver, com o significado de cada um.
export const ERROS_PADRAO: Record<number, string> = {
  400: 'Dados inválidos (corpo, parâmetro ou arquivo). `message` pode ser uma lista, uma entrada por campo.',
  401: 'Não autenticado: sem cookie, token inválido/expirado ou credenciais erradas.',
  403: 'Sem permissão: nível de acesso insuficiente ou origem não autorizada (CSRF).',
  404: 'Rota ou recurso não encontrado.',
  429: 'Limite de requisições excedido (rate limiting).',
  500: 'Erro interno. O detalhe fica só no log do servidor.',
};

// @ApiErros(400, 401, 403): documenta os erros da rota com o formato padrão. Por ser
// declarado uma vez aqui, as rotas não repetem @ApiResponse nem o texto de cada status.
export function ApiErros(...status: number[]) {
  return applyDecorators(
    ...status.map((s) => ApiResponse({ status: s, description: ERROS_PADRAO[s] ?? 'Erro.', type: RespostaErroDto })),
  );
}

// @ApiSucesso(201, 'texto'): resposta de sucesso no formato padrão (`dados` extras entram na descrição).
export function ApiSucesso(status: number, descricao: string) {
  return ApiResponse({ status, description: descricao, type: RespostaSucessoDto });
}
