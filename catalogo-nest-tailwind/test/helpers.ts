import { Test } from '@nestjs/testing';
import { CanActivate, ExecutionContext, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './../src/app.module';
import { SupabaseService } from './../src/supabase/supabase.service';
import { SupabaseAuthGuard } from './../src/auth/supabase-auth.guard';

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

// Substitui o SupabaseAuthGuard: sem o header `x-nivel` a requisição é 401; com ele,
// request.user fica com esse nível (0 super admin, 1 admin, 99 usuário). O RolesGuard é o real.
const authFalso: CanActivate = {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const nivel = req.headers['x-nivel'];
    if (nivel === undefined) throw new UnauthorizedException();
    req.user = { id: 'a1b2c3d4-0000-4000-8000-000000000001', nivel: Number(nivel) };
    return true;
  },
};

export async function criarApp(client: any) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SupabaseService)
    .useValue({ client })
    .overrideGuard(SupabaseAuthGuard)
    .useValue(authFalso)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
