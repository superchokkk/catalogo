import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RedefinirSenhaDto } from './redefinir-senha.dto';

const campoComErro = async (corpo: Record<string, unknown>) => {
  const erros = await validate(plainToInstance(RedefinirSenhaDto, corpo));
  return erros.map((e) => e.property).sort();
};

const valido = { email: 'a@x.com', token: '123456', novaSenha: 'senha-segura-1' };

describe('RedefinirSenhaDto', () => {
  it('aceita um corpo válido', async () => {
    expect(await campoComErro(valido)).toEqual([]);
  });

  it('rejeita e-mail inválido', async () => {
    expect(await campoComErro({ ...valido, email: 'nao-e-email' })).toEqual(['email']);
  });

  it.each(['12345', 'abcdef', '12345678901', '', 123456])('rejeita código %p', async (token) => {
    expect(await campoComErro({ ...valido, token })).toEqual(['token']);
  });

  it('rejeita senha curta e senha acima de 72 caracteres', async () => {
    expect(await campoComErro({ ...valido, novaSenha: '1234567' })).toEqual(['novaSenha']);
    expect(await campoComErro({ ...valido, novaSenha: 'x'.repeat(73) })).toEqual(['novaSenha']);
  });

  it('rejeita corpo vazio com um erro por campo', async () => {
    expect(await campoComErro({})).toEqual(['email', 'novaSenha', 'token']);
  });
});
