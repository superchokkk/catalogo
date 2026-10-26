import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { OriginGuard } from './origin.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Nivel } from '../auth/nivel.enum';
import { validarEnv } from './env.validation';

const contexto = (req: object, handler: Function = () => undefined, classe: Function = class {}) =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => classe,
  }) as unknown as ExecutionContext;

describe('OriginGuard (CSRF)', () => {
  const config = new ConfigService({ FRONTEND_URL: 'https://app.exemplo.com/', CORS_ORIGINS: 'http://localhost:5173' });
  const guard = new OriginGuard(config);

  it('libera métodos de leitura de qualquer origem', () => {
    expect(guard.canActivate(contexto({ method: 'GET', headers: { origin: 'https://evil.com' } }))).toBe(true);
  });

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('%s: bloqueia origem desconhecida', (method) => {
    expect(() => guard.canActivate(contexto({ method, headers: { origin: 'https://evil.com' } }))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it('bloqueia Origin "null" (iframe sandbox)', () => {
    expect(() => guard.canActivate(contexto({ method: 'POST', headers: { origin: 'null' } }))).toThrow();
  });

  it('aceita as origens configuradas', () => {
    for (const origin of ['https://app.exemplo.com', 'http://localhost:5173']) {
      expect(guard.canActivate(contexto({ method: 'POST', headers: { origin } }))).toBe(true);
    }
  });

  it('sem Origin, usa o Referer', () => {
    expect(guard.canActivate(contexto({ method: 'POST', headers: { referer: 'https://app.exemplo.com/produtos' } }))).toBe(true);
    expect(() => guard.canActivate(contexto({ method: 'POST', headers: { referer: 'https://evil.com/x' } }))).toThrow();
  });

  it('sem Origin nem Referer (cliente não-navegador) passa', () => {
    expect(guard.canActivate(contexto({ method: 'POST', headers: {} }))).toBe(true);
  });
});

describe('RolesGuard', () => {
  class Rota {
    @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
    admin() {}
    livre() {}
  }
  const guard = new RolesGuard(new Reflector());
  const chama = (nivel: unknown, metodo: 'admin' | 'livre') =>
    guard.canActivate(contexto({ user: { nivel } }, Rota.prototype[metodo], Rota));

  it.each([0, 1])('nível %s acessa rota de admin', (n) => expect(chama(n, 'admin')).toBe(true));
  it.each([99, undefined, null, '1'])('nível %p é barrado', (n) => {
    expect(() => chama(n, 'admin')).toThrow(expect.objectContaining({ status: 403 }));
  });
  it('rota sem @Roles() não exige nível', () => expect(chama(99, 'livre')).toBe(true));
});

describe('validarEnv', () => {
  const ok = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_PRIVATE_KEY: 'k', SUPABASE_ANON_KEY: 'a', FRONTEND_URL: 'https://app.com' };

  it('aceita configuração completa', () => expect(validarEnv(ok)).toBe(ok));
  it('falha listando o que falta, incluindo a SUPABASE_ANON_KEY', () => {
    expect(() => validarEnv({ ...ok, SUPABASE_ANON_KEY: '' })).toThrow(/SUPABASE_ANON_KEY/);
    expect(() => validarEnv({})).toThrow(/FRONTEND_URL/);
  });
  it('rejeita URL e origem de CORS inválidas', () => {
    expect(() => validarEnv({ ...ok, FRONTEND_URL: 'localhost' })).toThrow(/FRONTEND_URL/);
    expect(() => validarEnv({ ...ok, CORS_ORIGINS: 'https://a.com,xxx' })).toThrow(/CORS_ORIGINS/);
  });
});
