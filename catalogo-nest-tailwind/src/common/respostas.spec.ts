import { ArgumentsHost, BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { corpoErro, ok } from './respostas';

describe('ok', () => {
  it('monta success/message e espalha os dados ao lado', () => {
    expect(ok('Feito.')).toEqual({ success: true, message: 'Feito.' });
    expect(ok('Feito.', { user: { id: 1 }, total: 2 })).toEqual({ success: true, message: 'Feito.', user: { id: 1 }, total: 2 });
  });
});

describe('corpoErro', () => {
  it('inclui error só quando informado', () => {
    expect(corpoErro(401, 'Não.')).toEqual({ success: false, statusCode: 401, message: 'Não.' });
    expect(corpoErro(404, 'Não.', 'Not Found')).toEqual({ success: false, statusCode: 404, message: 'Não.', error: 'Not Found' });
  });
});

describe('AllExceptionsFilter', () => {
  const executar = (erro: unknown) => {
    let status = 0;
    let corpo: unknown;
    const res = { status: (s: number) => ((status = s), res), json: (b: unknown) => ((corpo = b), res) };
    const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    new AllExceptionsFilter().catch(erro, host);
    return { status, corpo };
  };

  it('HttpException vira o formato padrão, preservando status e mensagem', () => {
    expect(executar(new ForbiddenException('Acesso negado.'))).toEqual({
      status: 403,
      corpo: { success: false, statusCode: 403, message: 'Acesso negado.', error: 'Forbidden' },
    });
  });

  it('erro de validação mantém a lista de mensagens', () => {
    const { status, corpo } = executar(new BadRequestException(['campo a inválido', 'campo b inválido']));
    expect(status).toBe(400);
    expect(corpo).toMatchObject({ success: false, message: ['campo a inválido', 'campo b inválido'] });
  });

  it('HttpException criada com string simples também é normalizada', () => {
    expect(executar(new HttpException('Teimosa', 418)).corpo).toMatchObject({ success: false, statusCode: 418, message: 'Teimosa' });
  });

  it('erro desconhecido vira 500 genérico sem vazar o detalhe', () => {
    const { status, corpo } = executar(new Error('senha do banco: 123'));
    expect(status).toBe(500);
    expect(corpo).toEqual({ success: false, statusCode: 500, message: 'Erro interno do servidor.', error: 'Internal Server Error' });
  });
});
