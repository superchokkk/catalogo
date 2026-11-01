import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

const erros = async (cls: any, corpo: object) =>
  (await validate(plainToInstance(cls, corpo), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

describe('CreateCategoryDto', () => {
  it('aceita só o nome e apara espaços', async () => {
    const dto = plainToInstance(CreateCategoryDto, { nome: '  Cadeiras  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nome).toBe('Cadeiras');
  });

  it('aceita nome com ativo', async () => {
    expect(await erros(CreateCategoryDto, { nome: 'Mesas', ativo: false })).toEqual([]);
  });

  it.each([{}, { nome: '' }, { nome: '   ' }, { nome: 123 }, { nome: 'a'.repeat(101) }])('rejeita nome %p', async (corpo) => {
    expect(await erros(CreateCategoryDto, corpo)).toContain('nome');
  });

  it('rejeita ativo que não é booleano', async () => {
    expect(await erros(CreateCategoryDto, { nome: 'Mesas', ativo: 'sim' })).toContain('ativo');
  });

  it.each(['ordem', 'slug', 'created_by', 'id'])('rejeita o campo desconhecido %s', async (campo) => {
    expect(await erros(CreateCategoryDto, { nome: 'Mesas', [campo]: 1 })).toContain(campo);
  });
});

describe('UpdateCategoryDto', () => {
  it('aceita corpo vazio, só nome ou só ativo', async () => {
    expect(await erros(UpdateCategoryDto, {})).toEqual([]);
    expect(await erros(UpdateCategoryDto, { nome: 'Mesas' })).toEqual([]);
    expect(await erros(UpdateCategoryDto, { ativo: false })).toEqual([]);
  });

  it.each([{ nome: '' }, { nome: '  ' }, { nome: 'a'.repeat(101) }])('rejeita nome %p', async (corpo) => {
    expect(await erros(UpdateCategoryDto, corpo)).toContain('nome');
  });

  it('rejeita ativo inválido e campos desconhecidos', async () => {
    expect(await erros(UpdateCategoryDto, { ativo: 1 })).toContain('ativo');
    expect(await erros(UpdateCategoryDto, { ordem: 1 })).toContain('ordem');
  });
});
