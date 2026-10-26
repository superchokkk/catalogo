import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { origensPermitidas } from './common/env.validation';
import { configurarSwagger, swaggerHabilitado, SWAGGER_PATH } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  app.set('trust proxy', 1);

  //headers de segurança (a API só serve JSON; as imagens vêm do storage do Supabase)
  const helmetPadrao = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } });
  // A interface do Swagger usa scripts/estilos inline, que a CSP padrão do helmet bloquearia.
  const helmetDocs = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false });
  app.use((req, res, next) => (req.path.startsWith('/' + SWAGGER_PATH) ? helmetDocs : helmetPadrao)(req, res, next));

  //limites de corpo (os uploads de imagem são limitados à parte, no multer)
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: true });

  //prefixo
  app.setGlobalPrefix('api');

  //ativar o Cookie Parser
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  //documentação (desligada em produção, salvo SWAGGER_ENABLED=true)
  if (swaggerHabilitado()) configurarSwagger(app);

  //CORS (origens vêm de FRONTEND_URL e CORS_ORIGINS)
  app.enableCors({
    origin: origensPermitidas((k) => config.get<string>(k)),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
