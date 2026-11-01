import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { clienteFalso, criarApp } from './helpers';

const CAT = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
const PROD = '9d1c2b3a-1d0a-4c55-9a43-6a1c1f6f0b22';

// Um query builder falso por tabela.
function bancoFalso(tabelas: Record<string, ReturnType<typeof clienteFalso>>) {
  return { from: jest.fn((t: string) => (tabelas[t] ?? clienteFalso()).client.from(t)) };
}

describe('POST /produtos/criar com categoria (e2e)', () => {
  let app: NestExpressApplication;
  let categorias: ReturnType<typeof clienteFalso>;
  let produtos: ReturnType<typeof clienteFalso>;

  const montar = async (cat: object) => {
    categorias = clienteFalso(cat);
    produtos = clienteFalso({ data: { id: PROD, nome: 'Cadeira', preco: 10 } });
    app = await criarApp(bancoFalso({ categorias, produtos }));
  };
  const criar = (campos: Record<string, string>) => {
    const req = request(app.getHttpServer()).post('/api/produtos/criar').set('x-nivel', '1');
    for (const [k, v] of Object.entries(campos)) req.field(k, v);
    return req;
  };

  afterEach(() => app.close());

  it('sem categoria continua funcionando e não grava categoriaID', async () => {
    await montar({ data: { id: CAT } });
    await criar({ nome: 'Cadeira', preco: '10' }).expect(201);
    expect(categorias.client.from).not.toHaveBeenCalled();
    expect(produtos.qb.insert.mock.calls[0][0][0]).not.toHaveProperty('categoriaID');
  });

  it('categoria vazia equivale a sem categoria', async () => {
    await montar({ data: { id: CAT } });
    await criar({ nome: 'Cadeira', preco: '10', categoriaID: '' }).expect(201);
    expect(produtos.qb.insert.mock.calls[0][0][0]).not.toHaveProperty('categoriaID');
  });

  it('categoria ativa é validada e gravada', async () => {
    await montar({ data: { id: CAT } });
    await criar({ nome: 'Cadeira', preco: '10', categoriaID: CAT }).expect(201);
    expect(categorias.qb.eq).toHaveBeenCalledWith('id', CAT);
    expect(categorias.qb.eq).toHaveBeenCalledWith('ativo', true);
    expect(produtos.qb.insert.mock.calls[0][0][0]).toMatchObject({ categoriaID: CAT });
  });

  it('categoria inexistente ou desativada → 400 e nada é gravado', async () => {
    await montar({ data: null });
    const res = await criar({ nome: 'Cadeira', preco: '10', categoriaID: CAT }).expect(400);
    expect(res.body.message).toBe('Categoria informada não existe.');
    expect(produtos.qb.insert).not.toHaveBeenCalled();
  });

  it('categoriaID que não é UUID → 400', async () => {
    await montar({ data: { id: CAT } });
    await criar({ nome: 'Cadeira', preco: '10', categoriaID: 'abc' }).expect(400);
  });
});

describe('PUT /produtos/:id com categoria (e2e)', () => {
  let app: NestExpressApplication;
  let categorias: ReturnType<typeof clienteFalso>;
  let produtos: ReturnType<typeof clienteFalso>;

  const montar = async (cat: object) => {
    categorias = clienteFalso(cat);
    produtos = clienteFalso({ data: [] });
    app = await criarApp(bancoFalso({ categorias, produtos, produto_imagens: clienteFalso({ data: [] }) }));
  };
  const alterar = (campos: Record<string, string>) => {
    const req = request(app.getHttpServer()).put(`/api/produtos/${PROD}`).set('x-nivel', '1');
    for (const [k, v] of Object.entries({ nome: 'Cadeira', preco: '10', ...campos })) req.field(k, v);
    return req;
  };

  afterEach(() => app.close());

  it('sem o campo mantém a categoria (não envia categoriaID)', async () => {
    await montar({ data: { id: CAT } });
    await alterar({}).expect(200);
    expect(produtos.qb.update.mock.calls[0][0]).not.toHaveProperty('categoriaID');
    expect(categorias.client.from).not.toHaveBeenCalled();
  });

  it('campo vazio remove a categoria (null)', async () => {
    await montar({ data: { id: CAT } });
    await alterar({ categoriaID: '' }).expect(200);
    expect(produtos.qb.update.mock.calls[0][0]).toHaveProperty('categoriaID', null);
    expect(categorias.client.from).not.toHaveBeenCalled();
  });

  it('com id troca a categoria', async () => {
    await montar({ data: { id: CAT } });
    await alterar({ categoriaID: CAT }).expect(200);
    expect(produtos.qb.update.mock.calls[0][0]).toMatchObject({ categoriaID: CAT });
  });

  it('categoria inexistente ou desativada → 400 sem atualizar', async () => {
    await montar({ data: null });
    await alterar({ categoriaID: CAT }).expect(400);
    expect(produtos.qb.update).not.toHaveBeenCalled();
  });
});

describe('GET /produtos/listagem com categoria (e2e)', () => {
  let app: NestExpressApplication;
  afterEach(() => app.close());

  it('devolve só o nome da categoria; sem categoria ou desativada → null', async () => {
    const linhas = [
      { id: '1', nome: 'A', categorias: { nome: 'Cadeira', ativo: true }, produto_imagens: [] },
      { id: '2', nome: 'B', categorias: null, produto_imagens: [] },
      { id: '3', nome: 'C', categorias: { nome: 'Mesa', ativo: false }, produto_imagens: [] },
    ];
    const fake = clienteFalso({ data: linhas });
    app = await criarApp(fake.client);

    const res = await request(app.getHttpServer()).get('/api/produtos/listagem').expect(200);
    expect(res.body.produtos.map((p: any) => p.categoria)).toEqual(['Cadeira', null, null]);
    for (const p of res.body.produtos) {
      expect(p).not.toHaveProperty('categorias');
      expect(p).not.toHaveProperty('categoriaID');
    }
    expect(fake.qb.select.mock.calls[0][0]).not.toMatch(/\*|categoriaID/);
  });
});

describe('GET /produtos/listagem filtro, ordenação e paginação (e2e)', () => {
  let app: NestExpressApplication;
  let fake: ReturnType<typeof clienteFalso>;
  const linha = (id: string) => ({ id, nome: id, categorias: null, produto_imagens: [] });

  const subir = async (resultado: object) => {
    fake = clienteFalso(resultado);
    app = await criarApp(fake.client);
  };
  const listar = (q = '') => request(app.getHttpServer()).get(`/api/produtos/listagem${q}`);

  afterEach(() => app.close());

  it('sem parâmetros: página 1, limite 20 e metadados', async () => {
    await subir({ data: [linha('a')], count: 41 });
    const res = await listar().expect(200);
    expect(res.body).toMatchObject({ total: 41, pagina: 1, limite: 20, totalPaginas: 3, podeAtualizarUI: true });
    expect(fake.qb.range).toHaveBeenCalledWith(0, 19);
    expect(fake.qb.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(fake.qb.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
  });

  it('paginação calcula o intervalo', async () => {
    await subir({ data: [], count: 100 });
    const res = await listar('?pagina=3&limite=10').expect(200);
    expect(fake.qb.range).toHaveBeenCalledWith(20, 29);
    expect(res.body).toMatchObject({ pagina: 3, limite: 10, totalPaginas: 10 });
  });

  it('página além do fim: 200, lista vazia e total correto', async () => {
    // 1ª consulta (com range) falha com 416; a 2ª (só contagem) responde o total
    const fora = clienteFalso({ error: { code: 'PGRST103', message: 'Requested range not satisfiable' } });
    const contagem = clienteFalso({ count: 5 });
    fake = fora;
    fora.client.from.mockReturnValueOnce(fora.qb).mockReturnValueOnce(contagem.qb);
    app = await criarApp(fora.client);
    const res = await listar('?pagina=9').expect(200);
    expect(res.body).toMatchObject({ produtos: [], total: 5, pagina: 9, totalPaginas: 1 });
  });

  it('filtra por categoria', async () => {
    await subir({ data: [linha('a')], count: 1 });
    await listar(`?categoria=${CAT}`).expect(200);
    expect(fake.qb.eq).toHaveBeenCalledWith('categoriaID', CAT);
  });

  it('sem categoria não filtra por categoriaID', async () => {
    await subir({ data: [], count: 0 });
    await listar().expect(200);
    expect(fake.qb.eq).not.toHaveBeenCalledWith('categoriaID', expect.anything());
  });

  it('ordena por preço ascendente', async () => {
    await subir({ data: [], count: 0 });
    await listar('?ordenar=preco&direcao=asc').expect(200);
    expect(fake.qb.order).toHaveBeenNthCalledWith(1, 'preco', { ascending: true });
  });

  it.each([
    'categoria=abc',
    'ordenar=created_by',
    'direcao=cima',
    'pagina=0',
    'limite=0',
    'limite=51',
    'status=false',
  ])('%s → 400 sem consultar o banco', async (q) => {
    await subir({ data: [], count: 0 });
    await listar(`?${q}`).expect(400);
    expect(fake.client.from).not.toHaveBeenCalled();
  });
});

describe('Autorização das rotas de produto com categoria (e2e)', () => {
  let app: NestExpressApplication;
  beforeEach(async () => {
    app = await criarApp(clienteFalso({ data: [] }).client);
  });
  afterEach(() => app.close());

  it('usuário comum (99) não cria nem edita produto → 403', async () => {
    await request(app.getHttpServer()).post('/api/produtos/criar').set('x-nivel', '99').field('nome', 'A').field('preco', '1').field('categoriaID', CAT).expect(403);
    await request(app.getHttpServer()).put(`/api/produtos/${PROD}`).set('x-nivel', '99').field('nome', 'A').field('preco', '1').expect(403);
  });

  it('listagem combina filtro, ordenação e paginação', async () => {
    const fake = clienteFalso({ data: [], count: 0 });
    await app.close();
    app = await criarApp(fake.client);
    await request(app.getHttpServer()).get(`/api/produtos/listagem?categoria=${CAT}&ordenar=nome&direcao=desc&pagina=2&limite=5`).expect(200);
    expect(fake.qb.eq).toHaveBeenCalledWith('categoriaID', CAT);
    expect(fake.qb.order).toHaveBeenNthCalledWith(1, 'nome', { ascending: false });
    expect(fake.qb.range).toHaveBeenCalledWith(5, 9);
  });
});
