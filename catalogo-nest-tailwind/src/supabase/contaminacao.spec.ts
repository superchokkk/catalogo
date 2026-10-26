import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { AddressInfo } from 'net';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../users/user.service';
import { SupabaseService } from './supabase.service';

// O client administrativo (service_role) é compartilhado por toda a API. Se alguma
// operação gravar uma sessão de usuário nele, as consultas seguintes ao banco passam
// a ir com o token DAQUELE usuário em vez da service_role ("contaminação").
// Estes testes usam o SDK real contra um servidor Supabase falso que registra o
// cabeçalho Authorization de cada chamada.

const CHAVE_SERVICE = 'SERVICE_ROLE_KEY';
const CHAVE_ANON = 'ANON_KEY';

// JWT com formato real (o login lê o payload para extrair nome e nível).
const jwtFalso = (email: string) => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64({ sub: `id-${email}`, email, user_data: { nome: 'Fulano', nivel: 1 } })}.assinatura`;
};

describe('Contaminação do client administrativo', () => {
  let servidor: http.Server;
  let url: string;
  let chamadas: { metodo: string; caminho: string; authorization?: string }[];

  beforeAll(async () => {
    servidor = http.createServer((req, res) => {
      let corpo = '';
      req.on('data', (c) => (corpo += c));
      req.on('end', () => {
        const json = corpo ? JSON.parse(corpo) : {};
        const caminho = (req.url ?? '').split('?')[0];
        chamadas.push({ metodo: req.method ?? '', caminho, authorization: req.headers['authorization'] });
        res.setHeader('content-type', 'application/json');

        const email = json.email ?? 'usuario@x.com';
        const sessao = {
          access_token: jwtFalso(email), token_type: 'bearer', expires_in: 3600, refresh_token: `r-${email}`,
          user: { id: `id-${email}`, email },
        };
        if (caminho === '/auth/v1/token' || caminho === '/auth/v1/signup') return res.end(JSON.stringify(sessao));
        if (caminho === '/auth/v1/user') return res.end(JSON.stringify({ id: 'x', email: 'x@x.com' }));
        if (caminho === '/auth/v1/recover') return res.end('{}');
        if (caminho.startsWith('/rest/v1/')) {
          return res.end(req.method === 'POST' ? JSON.stringify({ id: 'id-1', email, nome: 'Fulano' }) : '[]');
        }
        res.statusCode = 404;
        res.end('{}');
      });
    });
    await new Promise<void>((ok) => servidor.listen(0, ok));
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));

  beforeEach(() => {
    chamadas = [];
  });

  const criar = () => {
    const env: Record<string, string> = {
      SUPABASE_URL: url, SUPABASE_PRIVATE_KEY: CHAVE_SERVICE, SUPABASE_ANON_KEY: CHAVE_ANON,
    };
    const supabase = new SupabaseService({ get: (k: string) => env[k] } as unknown as ConfigService);
    const usuarios = new UserService(supabase);
    const config = { get: (k: string) => (k === 'FRONTEND_URL' ? 'http://localhost:5173' : undefined) } as unknown as ConfigService;
    return { supabase, auth: new AuthService(supabase, usuarios, config), usuarios };
  };

  // Consulta "de admin" feita DEPOIS da operação testada.
  const consultaDeAdmin = async (supabase: SupabaseService) => {
    chamadas = [];
    await supabase.client.from('produtos').select('*');
    expect(chamadas).toHaveLength(1);
    return chamadas[0].authorization;
  };

  it('login não contamina o client administrativo', async () => {
    const { supabase, auth } = criar();

    const resultado = await auth.login('a@x.com', 'senha-correta');

    expect(resultado.success).toBe(true);
    expect(await consultaDeAdmin(supabase)).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('login usa a anon key, nunca a service_role', async () => {
    const { auth } = criar();

    await auth.login('a@x.com', 'senha-correta');

    const token = chamadas.find((c) => c.caminho === '/auth/v1/token');
    expect(token?.authorization).toBe(`Bearer ${CHAVE_ANON}`);
  });

  it('cadastro não contamina o client administrativo', async () => {
    const { supabase, usuarios } = criar();

    await usuarios.createUser('a@x.com', 'senha-segura-1', 'Fulano');

    expect(await consultaDeAdmin(supabase)).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('cadastro: signUp usa a anon key e a gravação em public.users usa a service_role', async () => {
    const { usuarios } = criar();

    await usuarios.createUser('a@x.com', 'senha-segura-1', 'Fulano');

    const signUp = chamadas.find((c) => c.caminho === '/auth/v1/signup');
    const gravacao = chamadas.find((c) => c.caminho === '/rest/v1/users');
    expect(signUp?.authorization).toBe(`Bearer ${CHAVE_ANON}`);
    expect(gravacao?.authorization).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('getUser(token), usado pelo guard, não contamina', async () => {
    const { supabase } = criar();

    await supabase.client.auth.getUser(jwtFalso('a@x.com'));

    expect(await consultaDeAdmin(supabase)).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('resetPasswordForEmail não contamina', async () => {
    const { supabase, auth } = criar();

    await auth.enviarEmailRecuperacao('a@x.com');

    expect(await consultaDeAdmin(supabase)).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('login simultâneo de vários usuários não afeta o client administrativo', async () => {
    const { supabase, auth } = criar();

    await Promise.all(['a', 'b', 'c', 'd'].map((n) => auth.login(`${n}@x.com`, 'senha-correta')));

    expect(await consultaDeAdmin(supabase)).toBe(`Bearer ${CHAVE_SERVICE}`);
  });
});

// Trava estrutural: impede reintroduzir, por descuido, uma operação que grava sessão
// no client compartilhado. Essas operações devem usar supabase.criarClienteAuth().
describe('Uso proibido do client administrativo', () => {
  const PROIBIDAS = /client\s*\.auth\s*\.(signInWith\w+|signInAnonymously|signUp|verifyOtp|setSession|refreshSession|exchangeCodeForSession)\b/;

  const arquivos = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return arquivos(p);
      return p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
    });

  it('nenhum código de produção chama signIn*/signUp/verifyOtp/setSession no client compartilhado', () => {
    const src = path.resolve(__dirname, '..');
    const violacoes = arquivos(src).filter((arq) => {
      // ignora comentários de linha e de bloco
      const codigo = fs.readFileSync(arq, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      return PROIBIDAS.test(codigo);
    });
    expect(violacoes.map((v) => path.relative(src, v))).toEqual([]);
  });
});
