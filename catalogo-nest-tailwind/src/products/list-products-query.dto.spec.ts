import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProductsQueryDto } from './list-products-query.dto';

const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
const props = async (q: object) =>
  (await validate(plainToInstance(ListProductsQueryDto, q), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

describe('ListProductsQueryDto', () => {
  it('sem parâmetros usa página 1 e limite 20', async () => {
    const dto = plainToInstance(ListProductsQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ pagina: 1, limite: 20 });
  });

  it('aceita valores válidos e converte números vindos da query (texto)', async () => {
    const dto = plainToInstance(ListProductsQueryDto, { categoria: ID, ordenar: 'preco', direcao: 'asc', pagina: '2', limite: '50' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ categoria: ID, ordenar: 'preco', direcao: 'asc', pagina: 2, limite: 50 });
  });

  it('rejeita categoria que não é UUID', async () => expect(await props({ categoria: 'abc' })).toContain('categoria'));
  it.each(['created_by', 'preco; drop', ''])('rejeita ordenar=%p', async (v) => expect(await props({ ordenar: v })).toContain('ordenar'));
  it('rejeita direção inválida', async () => expect(await props({ direcao: 'cima' })).toContain('direcao'));
  it.each(['51', '0', '-1', 'abc', '1.5', ''])('rejeita limite=%p', async (v) => expect(await props({ limite: v })).toContain('limite'));
  it.each(['0', '-1', 'abc', '1.5', ''])('rejeita pagina=%p', async (v) => expect(await props({ pagina: v })).toContain('pagina'));
  it('rejeita parâmetro desconhecido', async () => expect(await props({ status: 'false' })).toContain('status'));
});
