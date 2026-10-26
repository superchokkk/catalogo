import { ThrottlerOptions } from '@nestjs/throttler';

const MINUTO = 60 * 1000;

// Tamanho máximo de um e-mail (RFC 5321). Acima disso não é um e-mail válido.
const EMAIL_MAX = 100;

// Extrai o e-mail do corpo da requisição de forma normalizada (trim + minúsculas),
// para que "A@x.com" e " a@x.com " contem como a mesma conta.
// Retorna null quando não há e-mail utilizável.
export function emailDoBody(req: Record<string, any>): string | null {
  const email = req?.body?.email;
  if (typeof email !== 'string') return null;

  const normalizado = email.trim().toLowerCase();
  if (!normalizado || normalizado.length > EMAIL_MAX) return null;

  return normalizado;
}

export const throttlerOptions: ThrottlerOptions[] = [
  // Limite por IP, aplicado a todas as rotas. Rotas sensíveis sobrescrevem
  // com @Throttle({ default: { ... } }).
  {
    name: 'default',
    ttl: MINUTO,
    limit: 100,
  },
  // Limite por conta (e-mail), independente do IP. Só vale em requisições que
  // trazem "email" no corpo (login, esqueci-senha, cadastro); nas demais é ignorado.
  {
    name: 'email',
    ttl: 15 * MINUTO,
    limit: 5,
    skipIf: (context) => emailDoBody(context.switchToHttp().getRequest()) === null,
    getTracker: (req) => emailDoBody(req) ?? '',
  },
];
