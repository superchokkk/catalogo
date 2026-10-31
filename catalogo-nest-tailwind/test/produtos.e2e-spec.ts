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
