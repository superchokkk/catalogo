import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Se antes usava NestExpressApplication, mude apenas para create(AppModule)
  const app = await NestFactory.create(AppModule);

  // 1. Cria um prefixo global. Suas rotas agora serão /api/products, /api/users, etc.
  app.setGlobalPrefix('api');

  // 2. Habilita o CORS. Isso permite que o seu frontend (rodando em outra porta) acesse a API.
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();