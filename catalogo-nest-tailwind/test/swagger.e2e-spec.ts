import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configurarSwagger, swaggerHabilitado } from './../src/common/swagger';

describe('Swagger (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    configurarSwagger(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('publica o documento OpenAPI com todas as rotas e o prefixo /api', async () => {
    const { body } = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        '/api/auth/login',
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/auth/me',
        '/api/auth/esqueci-senha',
        '/api/auth/redefinir-senha',
        '/api/auth/set-session',
        '/api/produtos/listagem',
        '/api/produtos/criar',
        '/api/produtos/{id}',
      ]),
    );
    expect(body.components.schemas).toEqual(
      expect.objectContaining({ LoginDto: expect.anything(), CreateProductDto: expect.anything(), RespostaErroDto: expect.anything(), RespostaSucessoDto: expect.anything(), UpdateProductDto: expect.anything() }),
    );
    expect(body.components.securitySchemes.cookie).toMatchObject({ in: 'cookie', name: 'access_token' });
  });

  it('serve a interface em /docs', async () => {
    await request(app.getHttpServer()).get('/docs').expect(200);
  });
});

describe('swaggerHabilitado', () => {
  it('liga fora de produção e desliga em produção', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerHabilitado({})).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'production' })).toBe(false);
  });

  it('SWAGGER_ENABLED sobrepõe o NODE_ENV', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })).toBe(false);
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: '' })).toBe(false);
  });
});
