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
