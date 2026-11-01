import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto, UpdateProductDto, parsePreco } from './product.dto';

describe('parsePreco', () => {
  it.each([
    ['19,90', 19.9],
    ['1.299,90', 1299.9],
    ['19.90', 19.9],
    ['100', 100],
    [25, 25],
  ])('%s -> %s', (entrada, esperado) => {
    expect(parsePreco(entrada)).toBe(esperado);
  });

  it.each(['abc', '', '-5', '1e3', '12,3,4x', null, undefined, {}])('%p -> NaN', (entrada) => {
    expect(parsePreco(entrada)).toBeNaN();
  });
});

const erros = async (cls: any, corpo: object) =>
  (await validate(plainToInstance(cls, corpo), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

describe('CreateProductDto', () => {
  it('aceita um produto válido e converte o preço', async () => {
    const dto = plainToInstance(CreateProductDto, { nome: 'Cadeira', preco: '1.299,90' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.preco).toBe(1299.9);
  });

  it('rejeita preço inválido, nome vazio e campo extra (mass assignment)', async () => {
    const props = await erros(CreateProductDto, { nome: '', preco: 'abc', status: false, created_by: 'x' });
    expect(props).toEqual(expect.arrayContaining(['nome', 'preco', 'status', 'created_by']));
  });

  it('rejeita preço negativo', async () => {
    expect(await erros(CreateProductDto, { nome: 'A', preco: -1 })).toContain('preco');
  });
});

describe('UpdateProductDto', () => {
  it('converte promocao e imagensExistentes vindos de multipart', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      nome: 'A', preco: '10', promocao: 'true', preco_antigo: '15,50', imagensExistentes: '["http://x/a.jpg"]',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ promocao: true, preco_antigo: 15.5, imagensExistentes: ['http://x/a.jpg'] });
  });

  it('rejeita imagensExistentes com JSON inválido (em vez de lançar 500)', async () => {
    expect(await erros(UpdateProductDto, { nome: 'A', preco: '10', imagensExistentes: '{nao-json' })).toContain(
      'imagensExistentes',
    );
  });

  it('rejeita promocao que não seja true/false', async () => {
    expect(await erros(UpdateProductDto, { nome: 'A', preco: '10', promocao: 'talvez' })).toContain('promocao');
  });
});

describe('categoriaID', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
  const base = { nome: 'A', preco: '10' };

  it.each([CreateProductDto, UpdateProductDto])('%p: aceita UUID válido', async (cls) => {
    const dto = plainToInstance(cls, { ...base, categoriaID: ID });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.categoriaID).toBe(ID);
  });

  it.each([CreateProductDto, UpdateProductDto])('%p: rejeita UUID inválido', async (cls) => {
    expect(await erros(cls, { ...base, categoriaID: 'abc' })).toContain('categoriaID');
  });

  it.each([CreateProductDto, UpdateProductDto])('%p: vazio vira null (sem categoria)', async (cls) => {
    const dto = plainToInstance(cls, { ...base, categoriaID: '' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.categoriaID).toBeNull();
  });

  it.each([CreateProductDto, UpdateProductDto])('%p: ausente continua undefined', async (cls) => {
    const dto = plainToInstance(cls, base);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.categoriaID).toBeUndefined();
  });
});
