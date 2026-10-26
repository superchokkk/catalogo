import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';

// AppModule real, com o mesmo ValidationPipe do main.ts. Nenhum corpo válido é
// enviado aqui, então nenhuma chamada de rede ao Supabase acontece.
describe('POST /auth/redefinir-senha (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_PRIVATE_KEY = 'chave-de-teste';
    process.env.SUPABASE_JWT_SECRET = 'segredo-de-teste';
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('rejeita corpo vazio com 400 apontando os três campos', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/redefinir-senha').send({}).expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['Forneça um e-mail válido.', 'Código inválido.', 'A nova senha é obrigatória.']),
    );
  });

  it('rejeita senha curta e código fora do formato com 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/redefinir-senha')
      .send({ email: 'a@x.com', token: 'abc', novaSenha: '123' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['Código inválido.', 'A senha deve ter no mínimo 8 caracteres.']),
    );
  });
});
