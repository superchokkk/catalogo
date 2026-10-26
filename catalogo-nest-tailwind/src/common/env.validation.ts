// Variáveis sem as quais a API não pode subir. Sem esta checagem, um valor ausente só
// apareceria depois (ex.: todo login falhando por falta da SUPABASE_ANON_KEY).
const OBRIGATORIAS = ['SUPABASE_URL', 'SUPABASE_PRIVATE_KEY', 'SUPABASE_ANON_KEY', 'FRONTEND_URL'] as const;

function urlValida(valor: string): boolean {
  try {
    const { protocol } = new URL(valor);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Lista separada por vírgulas -> origens normalizadas (sem barra final).
export function listaDeOrigens(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function validarEnv(config: Record<string, unknown>): Record<string, unknown> {
  const erros: string[] = [];

  for (const nome of OBRIGATORIAS) {
    const valor = config[nome];
    if (typeof valor !== 'string' || !valor.trim()) erros.push(`${nome} não definida.`);
  }

  for (const nome of ['SUPABASE_URL', 'FRONTEND_URL']) {
    const valor = config[nome];
    if (typeof valor === 'string' && valor.trim() && !urlValida(valor)) erros.push(`${nome} não é uma URL http(s) válida.`);
  }

  for (const origem of listaDeOrigens(config['CORS_ORIGINS'] as string | undefined)) {
    if (!urlValida(origem)) erros.push(`CORS_ORIGINS contém uma origem inválida: "${origem}".`);
  }

  if (erros.length) {
    throw new Error(`Configuração de ambiente inválida:\n - ${erros.join('\n - ')}`);
  }
  return config;
}

// Origens autorizadas a chamar a API: o front principal mais as extras de CORS_ORIGINS.
export function origensPermitidas(get: (chave: string) => string | undefined): string[] {
  const frontend = listaDeOrigens(get('FRONTEND_URL'));
  const extras = listaDeOrigens(get('CORS_ORIGINS'));
  return [...new Set([...frontend, ...extras])];
}
