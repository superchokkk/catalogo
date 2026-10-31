import { CategoryService } from './category.service';

// Encadeamento do query builder do Supabase: cada método devolve o próprio objeto
// e o último (`order`) resolve com o resultado.
function clienteFalso(resultado: { data: any; error: any }) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resultado),
  };
  return { qb, supabase: { client: { from: jest.fn().mockReturnValue(qb) } } as any };
}

describe('CategoryService.listarAtivas', () => {
  it('consulta só id e nome das ativas, ordenadas por nome', async () => {
    const lista = [{ id: '1', nome: 'Cadeiras' }];
    const { qb, supabase } = clienteFalso({ data: lista, error: null });

    await expect(new CategoryService(supabase).listarAtivas()).resolves.toEqual(lista);
    expect(supabase.client.from).toHaveBeenCalledWith('categorias');
    expect(qb.select).toHaveBeenCalledWith('id, nome');
    expect(qb.eq).toHaveBeenCalledWith('ativo', true);
    expect(qb.order).toHaveBeenCalledWith('nome', { ascending: true });
  });

  it('devolve lista vazia quando não há dados', async () => {
    const { supabase } = clienteFalso({ data: null, error: null });
    await expect(new CategoryService(supabase).listarAtivas()).resolves.toEqual([]);
  });

  it('propaga o erro do banco', async () => {
    const erro = { message: 'falhou' };
    const { supabase } = clienteFalso({ data: null, error: erro });
    await expect(new CategoryService(supabase).listarAtivas()).rejects.toBe(erro);
  });
});
