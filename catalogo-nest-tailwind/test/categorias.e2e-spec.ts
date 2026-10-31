import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { clienteFalso, criarApp } from './helpers';

describe('GET /categorias (e2e)', () => {
  let app: NestExpressApplication;
  const lista = [{ id: '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11', nome: 'Cadeiras' }];
  let fake: ReturnType<typeof clienteFalso>;

  beforeEach(async () => {
    fake = clienteFalso({ data: lista });
    app = await criarApp(fake.client);
  });

  afterEach(() => app.close());

  it('é público e devolve só as ativas', async () => {
    const res = await request(app.getHttpServer()).get('/api/categorias').expect(200);
    expect(res.body).toEqual({ success: true, message: expect.any(String), categorias: lista });
    expect(fake.qb.eq).toHaveBeenCalledWith('ativo', true);
  });

  it('GET /categorias/todas não existe (404)', async () => {
    await request(app.getHttpServer()).get('/api/categorias/todas').expect(404);
  });
});

describe('POST /categorias (e2e)', () => {
  let app: NestExpressApplication;
  let fake: ReturnType<typeof clienteFalso>;

  const criar = (corpo: object, nivel?: number) => {
    const req = request(app.getHttpServer()).post('/api/categorias');
    if (nivel !== undefined) req.set('x-nivel', String(nivel));
    return req.send(corpo);
  };

  beforeEach(async () => {
    fake = clienteFalso({ data: { id: 'c1', nome: 'Cadeira gamer', ativo: true } });
    app = await criarApp(fake.client);
  });

  afterEach(() => app.close());

  it('admin cria (201) e o nome é gravado normalizado', async () => {
    const res = await criar({ nome: '  CADEIRA gamer ' }, 1).expect(201);
    expect(res.body.categoria).toEqual({ id: 'c1', nome: 'Cadeira gamer', ativo: true });
    expect(fake.qb.insert).toHaveBeenCalledWith([expect.objectContaining({ nome: 'Cadeira gamer', ativo: true })]);
  });

  it('nome duplicado (inclusive com caixa diferente) → 409', async () => {
    await app.close();
    fake = clienteFalso({ error: { code: '23505', message: 'duplicate key' } });
    app = await criarApp(fake.client);
    const res = await criar({ nome: 'CADEIRA' }, 0).expect(409);
    expect(res.body).toMatchObject({ success: false, statusCode: 409, message: 'Já existe uma categoria com esse nome.' });
  });

  it('usuário comum → 403; sem login → 401', async () => {
    await criar({ nome: 'Mesa' }, 99).expect(403);
    await criar({ nome: 'Mesa' }).expect(401);
    expect(fake.qb.insert).not.toHaveBeenCalled();
  });

  it('campo extra (ordem) → 400; nome ausente → 400', async () => {
    await criar({ nome: 'Mesa', ordem: 1 }, 1).expect(400);
    await criar({}, 1).expect(400);
    expect(fake.qb.insert).not.toHaveBeenCalled();
  });
});

describe('PUT /categorias/:id (e2e)', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
  let app: NestExpressApplication;
  let fake: ReturnType<typeof clienteFalso>;

  const alterar = (id: string, corpo: object, nivel?: number) => {
    const req = request(app.getHttpServer()).put(`/api/categorias/${id}`);
    if (nivel !== undefined) req.set('x-nivel', String(nivel));
    return req.send(corpo);
  };

  beforeEach(async () => {
    fake = clienteFalso({ data: { id: ID, nome: 'Mesa', ativo: true } });
    app = await criarApp(fake.client);
  });

  afterEach(() => app.close());

  it.each(['mesa', 'MESA'])('salva o nome %p normalizado como "Mesa"', async (nome) => {
    const res = await alterar(ID, { nome }, 1).expect(200);
    expect(res.body.categoria.nome).toBe('Mesa');
    expect(fake.qb.update).toHaveBeenCalledWith({ nome: 'Mesa' });
  });

  it(':id inválido → 400', async () => {
    await alterar('abc', { nome: 'Mesa' }, 1).expect(400);
  });

  it('inexistente → 404', async () => {
    await app.close();
    fake = clienteFalso({ data: null });
    app = await criarApp(fake.client);
    const res = await alterar(ID, { nome: 'Mesa' }, 1).expect(404);
    expect(res.body.message).toBe('Categoria não encontrada.');
  });

  it('nome repetido → 409', async () => {
    await app.close();
    fake = clienteFalso({ error: { code: '23505' } });
    app = await criarApp(fake.client);
    await alterar(ID, { nome: 'Mesa' }, 1).expect(409);
  });

  it('não admin → 403; sem login → 401; campo extra → 400', async () => {
    await alterar(ID, { nome: 'Mesa' }, 99).expect(403);
    await alterar(ID, { nome: 'Mesa' }).expect(401);
    await alterar(ID, { ordem: 2 }, 1).expect(400);
    expect(fake.qb.update).not.toHaveBeenCalled();
  });
});

describe('GET /categorias/:id/exclusao (e2e)', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
  let app: NestExpressApplication;
  let fake: ReturnType<typeof clienteFalso>;

  const confirmar = (nivel?: number) => {
    const req = request(app.getHttpServer()).get(`/api/categorias/${ID}/exclusao`);
    if (nivel !== undefined) req.set('x-nivel', String(nivel));
    return req;
  };

  beforeEach(async () => {
    fake = clienteFalso({ data: { id: ID, nome: 'Mesa' }, count: 3 });
    app = await criarApp(fake.client);
  });

  afterEach(() => app.close());

  it('devolve a categoria e a contagem sem alterar nada', async () => {
    const res = await confirmar(1).expect(200);
    expect(res.body).toMatchObject({ success: true, categoria: { id: ID, nome: 'Mesa' }, produtosAfetados: 3 });
    expect(fake.qb.update).not.toHaveBeenCalled();
    expect(fake.qb.delete).not.toHaveBeenCalled();
    expect(fake.qb.insert).not.toHaveBeenCalled();
  });

  it('inexistente → 404', async () => {
    await app.close();
    fake = clienteFalso({ data: null });
    app = await criarApp(fake.client);
    await confirmar(1).expect(404);
  });

  it('não admin → 403; sem login → 401; id inválido → 400', async () => {
    await confirmar(99).expect(403);
    await confirmar().expect(401);
    await request(app.getHttpServer()).get('/api/categorias/abc/exclusao').set('x-nivel', '1').expect(400);
  });
});

describe('DELETE /categorias/:id (e2e)', () => {
  const ID = '3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11';
  let app: NestExpressApplication;
  let fake: ReturnType<typeof clienteFalso>;

  const excluir = (nivel?: number) => {
    const req = request(app.getHttpServer()).delete(`/api/categorias/${ID}`);
    if (nivel !== undefined) req.set('x-nivel', String(nivel));
    return req;
  };

  beforeEach(async () => {
    fake = clienteFalso({ data: { id: ID, nome: 'Mesa' }, count: 3 });
    app = await criarApp(fake.client);
  });

  afterEach(() => app.close());

  it('exclui a categoria, informa os produtos afetados e não toca em produtos', async () => {
    const res = await excluir(1).expect(200);
    expect(res.body).toMatchObject({ success: true, categoria: { id: ID, nome: 'Mesa' }, produtosAfetados: 3 });
    expect(fake.qb.delete).toHaveBeenCalledTimes(1);
    // o delete é o último passo e só na tabela categorias; produtos é apenas consultado (a FK faz set null)
    expect(fake.client.from.mock.calls.at(-1)?.[0]).toBe('categorias');
  });

  it('inexistente → 404 sem apagar', async () => {
    await app.close();
    fake = clienteFalso({ data: null });
    app = await criarApp(fake.client);
    await excluir(1).expect(404);
    expect(fake.qb.delete).not.toHaveBeenCalled();
  });

  it('não admin → 403; sem login → 401', async () => {
    await excluir(99).expect(403);
    await excluir().expect(401);
    expect(fake.qb.delete).not.toHaveBeenCalled();
  });

  it('OriginGuard cobre a rota: origem desconhecida → 403', async () => {
    await excluir(1).set('Origin', 'https://evil.com').expect(403);
    expect(fake.qb.delete).not.toHaveBeenCalled();
  });
});
