import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { MSG, corpoErro } from './respostas';

// Respostas de erro padronizadas (formato em respostas.ts). HttpException carrega
// mensagens que nós mesmos escrevemos para o cliente (validação, 401, 403...) e passa
// como está. Qualquer outro erro (SDK, banco, bug) vira um 500 genérico: o detalhe fica
// só no log do servidor.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) this.logger.error(exception.message, exception.stack);

      // getResponse() é uma string ou { statusCode, message, error } (o formato do Nest)
      const corpo = exception.getResponse();
      const { message, error } =
        typeof corpo === 'string' ? { message: corpo, error: undefined } : (corpo as { message?: string | string[]; error?: string });

      return res.status(status).json(corpoErro(status, message ?? exception.message, error));
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(corpoErro(HttpStatus.INTERNAL_SERVER_ERROR, MSG.ERRO_INTERNO, 'Internal Server Error'));
  }
}
