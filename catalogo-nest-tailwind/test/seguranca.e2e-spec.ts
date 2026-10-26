import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from './../src/app.module';

// AppModule real com a mesma configuração global do main.ts. Nenhuma requisição
// chega ao Supabase: todas são barradas antes (origem, validação, autenticação).
describe('Proteções de segurança (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('envia headers do helmet', async () => {
    const res = await request(app.getHttpServer()).get('/api');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CSRF: POST vindo de outra origem é barrado com 403, mesmo com cookie', async () => {
    await request(app.getHttpServer())
      .delete('/api/produtos/3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11')
      .set('Origin', 'https://evil.com')
      .set('Cookie', 'access_token=qualquer')
      .expect(403);
  });

  it('CSRF: origem autorizada passa pelo guard (e cai na autenticação, 401)', async () => {
    await request(app.getHttpServer())
      .delete('/api/produtos/3f2b8c1e-1d0a-4c55-9a43-6a1c1f6f0b11')
      .set('Origin', 'http://localhost:5173')
      .expect(401);
  });

  it('rotas de produto exigem autenticação (401) antes de qualquer validação', async () => {
    await request(app.getHttpServer()).post('/api/produtos/criar').send({ nome: 'x', preco: '1' }).expect(401);
  });

  it('set-session rejeita token que não é um JWT, sem gravar cookie', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/set-session').send({ access_token: 'lixo' }).expect(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('login com campos extras é rejeitado (mass assignment)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@x.com', senha: '12345678', nivel: 0 })
      .expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ success: false, statusCode: 400, message: ['property nivel should not exist'] }));
  });

  it('erros internos não vazam: rota inexistente devolve só o formato padrão', async () => {
    const res = await request(app.getHttpServer()).get('/api/nao-existe').expect(404);
    expect(JSON.stringify(res.body)).not.toMatch(/supabase|stack/i);
    expect(res.body).toEqual({ success: false, statusCode: 404, message: expect.any(String), error: 'Not Found' });
  });
});
