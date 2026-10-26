import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

// Usa o AppModule real. O login com senha vazia é barrado pela validação (400) antes de chamar o
// Supabase, então nenhuma chamada de rede acontece nestes testes.
describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_PRIVATE_KEY = 'chave-de-teste';
    process.env.SUPABASE_JWT_SECRET = 'segredo-de-teste';
  });

  // App novo a cada teste: o contador do throttler fica em memória por instância.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1); // mesmo ajuste do main.ts: IP real vem de X-Forwarded-For
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(() => app.close());

  const login = (email: string, ip: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email, senha: '' });

  it('bloqueia o 6º login do mesmo IP (limite por IP)', async () => {
    for (let i = 1; i <= 5; i++) {
      await login(`user${i}@x.com`, '10.0.0.1').expect(400);
    }
    await login('user6@x.com', '10.0.0.1').expect(429);
  });

  it('bloqueia o 6º login contra o mesmo e-mail mesmo trocando de IP', async () => {
    for (let i = 1; i <= 5; i++) {
      await login('vitima@x.com', `10.0.1.${i}`).expect(400);
    }
    await login('vitima@x.com', '10.0.1.99').expect(429);
  });

  it('trata e-mail com maiúsculas e espaços como a mesma conta', async () => {
    for (let i = 1; i <= 5; i++) {
      await login('vitima@x.com', `10.0.2.${i}`).expect(400);
    }
    await login('  VITIMA@X.com ', '10.0.2.99').expect(429);
  });

  it('não bloqueia outro e-mail vindo de um IP novo', async () => {
    for (let i = 1; i <= 5; i++) {
      await login('vitima@x.com', `10.0.3.${i}`).expect(400);
    }
    await login('outra@x.com', '10.0.3.99').expect(400);
  });

  it('não aplica o limite por e-mail em rotas sem e-mail no corpo', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer()).get('/api').set('X-Forwarded-For', '10.0.4.1').expect(200);
    }
  });

  it('esqueci-senha tem limite próprio mais baixo (3 por e-mail)', async () => {
    const pedir = (ip: string) =>
      request(app.getHttpServer())
        .post('/api/auth/esqueci-senha')
        .set('X-Forwarded-For', ip)
        .send({ email: 'alvo@x.com' });

    // Resposta não importa (o Supabase não está acessível); só não pode ser 429.
    for (let i = 1; i <= 3; i++) {
      const res = await pedir(`10.0.5.${i}`);
      expect(res.status).not.toBe(429);
    }
    await pedir('10.0.5.99').expect(429);
  });
});
