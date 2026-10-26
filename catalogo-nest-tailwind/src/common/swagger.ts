import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

// A documentação lista todas as rotas e o formato dos dados: em produção fica desligada,
// a menos que SWAGGER_ENABLED=true seja definido explicitamente.
export function swaggerHabilitado(env: Record<string, string | undefined> = process.env): boolean {
  if (env.SWAGGER_ENABLED) return env.SWAGGER_ENABLED === 'true';
  return env.NODE_ENV !== 'production';
}

export function configurarSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API do Catálogo')
    .setDescription(
      'API de catálogo de produtos (NestJS + Supabase). A autenticação é por cookie httpOnly ' +
        '`access_token`, gravado por `POST /auth/login`. Rotas que alteram dados só aceitam ' +
        'requisições vindas de origens autorizadas (FRONTEND_URL / CORS_ORIGINS).',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie', name: 'access_token' }, 'cookie')
    .build();

  const documento = SwaggerModule.createDocument(app, config);
  // Sem prefixo global: o setup do Swagger fica em /docs (e /docs-json), fora de /api.
  SwaggerModule.setup(SWAGGER_PATH, app, documento, { jsonDocumentUrl: `${SWAGGER_PATH}-json` });
}
