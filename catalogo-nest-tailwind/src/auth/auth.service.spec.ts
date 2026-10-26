import * as http from 'http';
import { AddressInfo } from 'net';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';

// Servidor Supabase FALSO: registra o cabeçalho Authorization de cada chamada,
// o que permite provar "em nome de quem" cada operação foi executada.
type Chamada = { metodo: string; caminho: string; authorization?: string; corpo: any };

const CHAVE_SERVICE = 'SERVICE_ROLE_KEY';
const CHAVE_ANON = 'ANON_KEY';

describe('AuthService › atualizarSenhaComToken', () => {
  let servidor: http.Server;
  let url: string;
  let chamadas: Chamada[];
  let erroNoUpdate: { status: number; error_code: string; msg: string } | null;

  beforeAll(async () => {
    servidor = http.createServer((req, res) => {
      let corpo = '';
      req.on('data', (c) => (corpo += c));
      req.on('end', () => {
        const json = corpo ? JSON.parse(corpo) : {};
        const caminho = (req.url ?? '').split('?')[0];
        chamadas.push({ metodo: req.method ?? '', caminho, authorization: req.headers['authorization'], corpo: json });
        res.setHeader('content-type', 'application/json');

        if (caminho === '/auth/v1/verify') {
          // Atraso para as duas requisições ficarem em andamento ao mesmo tempo.
          return setTimeout(() => {
            if (json.token !== '000000') {
              res.statusCode = 403;
              return res.end(JSON.stringify({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }));
            }
            res.end(JSON.stringify({
              access_token: `jwt-${json.email}`, token_type: 'bearer', expires_in: 3600,
              refresh_token: `r-${json.email}`, user: { id: `id-${json.email}`, email: json.email },
            }));
          }, 20);
        }
        if (caminho === '/auth/v1/user') {
          if (erroNoUpdate) {
            res.statusCode = erroNoUpdate.status;
            return res.end(JSON.stringify({ code: erroNoUpdate.status, error_code: erroNoUpdate.error_code, msg: erroNoUpdate.msg }));
          }
          return res.end(JSON.stringify({ id: 'x', email: 'x' }));
        }
        if (caminho.startsWith('/rest/v1/')) return res.end('[]');
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
    erroNoUpdate = null;
  });

  const criar = (env: Record<string, string | undefined> = {}) => {
    const valores: Record<string, string | undefined> = {
      SUPABASE_URL: url,
      SUPABASE_PRIVATE_KEY: CHAVE_SERVICE,
      SUPABASE_ANON_KEY: CHAVE_ANON,
      ...env,
    };
    const supabase = new SupabaseService({ get: (k: string) => valores[k] } as unknown as ConfigService);
    return { supabase, auth: new AuthService(supabase, new UserService(supabase), new ConfigService({ FRONTEND_URL: 'http://localhost:5173' })) };
  };

  const updates = () => chamadas.filter((c) => c.metodo === 'PUT' && c.caminho === '/auth/v1/user');

  it('REGRESSÃO: redefinições simultâneas não se misturam (cada senha vai para a conta do seu dono)', async () => {
    const { auth } = criar();

    await Promise.all([
      auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-da-a'),
      auth.atualizarSenhaComToken('b@x.com', '000000', 'senha-da-b'),
    ]);

    const pares = updates()
      .map((c) => `${c.corpo.password} -> ${c.authorization}`)
      .sort();
    expect(pares).toEqual(['senha-da-a -> Bearer jwt-a@x.com', 'senha-da-b -> Bearer jwt-b@x.com']);
  });

  it('não contamina o client administrativo: o banco continua sendo acessado com a service_role', async () => {
    const { auth, supabase } = criar();

    await auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-da-a');
    chamadas = [];
    await supabase.client.from('produtos').select('*');

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].authorization).toBe(`Bearer ${CHAVE_SERVICE}`);
  });

  it('usa a anon key (e não a service_role) no fluxo de redefinição', async () => {
    const { auth } = criar();

    await auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-da-a');

    const verificar = chamadas.find((c) => c.caminho === '/auth/v1/verify');
    expect(verificar?.authorization).toBe(`Bearer ${CHAVE_ANON}`);
    expect(chamadas.some((c) => c.authorization === `Bearer ${CHAVE_SERVICE}`)).toBe(false);
  });

  it('devolve 400 genérico para código inválido e não tenta trocar a senha', async () => {
    const { auth } = criar();

    await expect(auth.atualizarSenhaComToken('a@x.com', '999999', 'senha-nova-123')).rejects.toMatchObject({
      status: 400,
      message: 'Código inválido ou expirado.',
    });
    expect(updates()).toHaveLength(0);
  });

  it.each([
    ['same_password', 'A nova senha deve ser diferente da atual.'],
    ['weak_password', 'A senha informada é muito fraca.'],
  ])('traduz o erro %s do Supabase para 400', async (codigo, mensagem) => {
    erroNoUpdate = { status: 422, error_code: codigo, msg: 'detalhe interno do Supabase' };
    const { auth } = criar();

    await expect(auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-nova-123')).rejects.toMatchObject({
      status: 400,
      message: mensagem,
    });
  });

  it('esconde detalhes de erros inesperados do Supabase (500 genérico)', async () => {
    erroNoUpdate = { status: 500, error_code: 'unexpected_failure', msg: 'detalhe interno do Supabase' };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { auth } = criar();

    const erro = await auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-nova-123').catch((e) => e);

    expect(erro.status).toBe(500);
    expect(erro.message).toBe('Não foi possível atualizar a senha.');
    expect(JSON.stringify(erro.getResponse())).not.toContain('detalhe interno');
    jest.restoreAllMocks();
  });

  it('falha sem chamar o Supabase quando SUPABASE_ANON_KEY não está definida', async () => {
    const { auth } = criar({ SUPABASE_ANON_KEY: undefined });

    await expect(auth.atualizarSenhaComToken('a@x.com', '000000', 'senha-nova-123')).rejects.toThrow(/SUPABASE_ANON_KEY/);
    expect(chamadas).toHaveLength(0);
  });
});
