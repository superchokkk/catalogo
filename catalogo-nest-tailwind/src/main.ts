import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  //prefixo
  app.setGlobalPrefix('api');

  //ativar o Cookie Parser
  app.use(cookieParser());

  //CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'https://dgconcept-catalogo.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();