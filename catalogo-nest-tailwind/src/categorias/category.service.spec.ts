import { CategoryService } from './category.service';
import { MSG } from '../common/respostas';

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

describe('CategoryService.criar', () => {
  function clienteInsert(resultado: { data: any; error: any }) {
    const qb: any = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(resultado),
    };
    return { qb, supabase: { client: { from: jest.fn().mockReturnValue(qb) } } as any };
  }

  it('grava o nome normalizado, ativo por padrão e o autor', async () => {
    const criada = { id: '1', nome: 'Cadeira gamer', ativo: true };
    const { qb, supabase } = clienteInsert({ data: criada, error: null });

    await expect(new CategoryService(supabase).criar({ nome: 'CADEIRA gamer' }, 'user-1')).resolves.toEqual(criada);
    expect(qb.insert).toHaveBeenCalledWith([{ nome: 'Cadeira gamer', ativo: true, created_by: 'user-1' }]);
  });

  it('respeita ativo: false', async () => {
    const { qb, supabase } = clienteInsert({ data: {}, error: null });
    await new CategoryService(supabase).criar({ nome: 'mesa', ativo: false }, 'user-1');
    expect(qb.insert).toHaveBeenCalledWith([{ nome: 'Mesa', ativo: false, created_by: 'user-1' }]);
  });

  it('traduz 23505 em 409 com a mensagem padrão', async () => {
    const { supabase } = clienteInsert({ data: null, error: { code: '23505', message: 'duplicate' } });
    await expect(new CategoryService(supabase).criar({ nome: 'mesa' }, 'u')).rejects.toMatchObject({
      status: 409,
      message: MSG.CATEGORIA_DUPLICADA,
    });
  });

  it('propaga outros erros do banco', async () => {
    const erro = { code: 'XX000', message: 'falhou' };
    const { supabase } = clienteInsert({ data: null, error: erro });
    await expect(new CategoryService(supabase).criar({ nome: 'mesa' }, 'u')).rejects.toBe(erro);
  });
});

describe('CategoryService.alterar', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';

  function clienteUpdate(resultado: { data: any; error: any }) {
    const qb: any = {
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(resultado),
    };
    return { qb, supabase: { client: { from: jest.fn().mockReturnValue(qb) } } as any };
  }

  it('normaliza o nome e grava só os campos enviados', async () => {
    const atual = { id: ID, nome: 'Mesa', ativo: true };
    const { qb, supabase } = clienteUpdate({ data: atual, error: null });

    await expect(new CategoryService(supabase).alterar(ID, { nome: 'MESA' })).resolves.toEqual(atual);
    expect(qb.update).toHaveBeenCalledWith({ nome: 'Mesa' });
    expect(qb.eq).toHaveBeenCalledWith('id', ID);
  });

  it('atualiza só ativo sem mexer no nome', async () => {
    const { qb, supabase } = clienteUpdate({ data: {}, error: null });
    await new CategoryService(supabase).alterar(ID, { ativo: false });
    expect(qb.update).toHaveBeenCalledWith({ ativo: false });
  });

  it('corpo vazio não faz update, só confirma a existência', async () => {
    const { qb, supabase } = clienteUpdate({ data: { id: ID }, error: null });
    await new CategoryService(supabase).alterar(ID, {});
    expect(qb.update).not.toHaveBeenCalled();
  });

  it('categoria inexistente → 404', async () => {
    const { supabase } = clienteUpdate({ data: null, error: null });
    await expect(new CategoryService(supabase).alterar(ID, { nome: 'x' })).rejects.toMatchObject({
      status: 404,
      message: MSG.CATEGORIA_NAO_ENCONTRADA,
    });
  });

  it('nome repetido (23505) → 409', async () => {
    const { supabase } = clienteUpdate({ data: null, error: { code: '23505' } });
    await expect(new CategoryService(supabase).alterar(ID, { nome: 'x' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('CategoryService.contarProdutos', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';

  // Primeira consulta (categorias) termina em maybeSingle; a segunda (produtos) em eq, com count.
  function clienteContagem(categoria: any, contagem: { count: number | null; error: any }) {
    const qbCat: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: categoria, error: null }),
    };
    const qbProd: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue(contagem),
    };
    const from = jest.fn((t: string) => (t === 'categorias' ? qbCat : qbProd));
    return { qbProd, supabase: { client: { from } } as any };
  }

  it('devolve a categoria e a contagem de produtos pela coluna categoriaID', async () => {
    const categoria = { id: ID, nome: 'Mesa' };
    const { qbProd, supabase } = clienteContagem(categoria, { count: 3, error: null });

    await expect(new CategoryService(supabase).contarProdutos(ID)).resolves.toEqual({ categoria, produtosAfetados: 3 });
    expect(qbProd.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(qbProd.eq).toHaveBeenCalledWith('categoriaID', ID);
  });

  it('count nulo vira 0', async () => {
    const { supabase } = clienteContagem({ id: ID, nome: 'Mesa' }, { count: null, error: null });
    await expect(new CategoryService(supabase).contarProdutos(ID)).resolves.toMatchObject({ produtosAfetados: 0 });
  });

  it('categoria inexistente → 404, sem contar produtos', async () => {
    const { qbProd, supabase } = clienteContagem(null, { count: 0, error: null });
    await expect(new CategoryService(supabase).contarProdutos(ID)).rejects.toMatchObject({ status: 404 });
    expect(qbProd.select).not.toHaveBeenCalled();
  });

  it('propaga erro da contagem', async () => {
    const erro = { message: 'falhou' };
    const { supabase } = clienteContagem({ id: ID, nome: 'Mesa' }, { count: null, error: erro });
    await expect(new CategoryService(supabase).contarProdutos(ID)).rejects.toBe(erro);
  });
});

describe('CategoryService.excluir', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';

  it('apaga só a categoria e devolve a contagem de produtos afetados', async () => {
    const qbCat: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: ID, nome: 'Mesa' }, error: null }),
      delete: jest.fn().mockReturnThis(),
    };
    // delete().eq() resolve; select().eq().maybeSingle() é a checagem de existência
    qbCat.eq.mockImplementationOnce(() => qbCat).mockImplementationOnce(() => Promise.resolve({ error: null }));
    const qbProd: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ count: 2, error: null }) };
    const from = jest.fn((t: string) => (t === 'categorias' ? qbCat : qbProd));

    await expect(new CategoryService({ client: { from } } as any).excluir(ID)).resolves.toEqual({
      categoria: { id: ID, nome: 'Mesa' },
      produtosAfetados: 2,
    });
    expect(qbCat.delete).toHaveBeenCalled();
    expect(qbProd.eq).toHaveBeenCalledWith('categoriaID', ID);
  });

  it('inexistente → 404 e nada é apagado', async () => {
    const qbCat: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn(),
    };
    const supabase = { client: { from: jest.fn().mockReturnValue(qbCat) } } as any;
    await expect(new CategoryService(supabase).excluir(ID)).rejects.toMatchObject({ status: 404 });
    expect(qbCat.delete).not.toHaveBeenCalled();
  });
});
