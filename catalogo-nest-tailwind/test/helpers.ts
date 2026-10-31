import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './../src/app.module';
import { SupabaseService } from './../src/supabase/supabase.service';

// Query builder falso: cada método devolve o próprio objeto e é "thenable",
// resolvendo com `resultado`. Registra as chamadas para as asserções.
export function clienteFalso(resultado: { data?: any; error?: any; count?: number | null } = {}) {
  const res = { data: null, error: null, count: null, ...resultado };
  const qb: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.then = (ok: any, ko: any) => Promise.resolve(res).then(ok, ko);
  return { qb, client: { from: jest.fn().mockReturnValue(qb) } };
}

export async function criarApp(client: any) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SupabaseService)
    .useValue({ client })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
