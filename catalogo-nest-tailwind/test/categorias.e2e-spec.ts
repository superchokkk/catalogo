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
