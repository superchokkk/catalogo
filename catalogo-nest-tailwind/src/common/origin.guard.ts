import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { origensPermitidas } from './env.validation';
import { MSG } from './respostas';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Defesa contra CSRF: o cookie de sessão usa sameSite 'none' (front e API em sites
// diferentes), então o navegador o anexa também a requisições disparadas por outros
// sites. Toda requisição que altera dados precisa vir de uma origem autorizada.
// Navegadores sempre enviam Origin em POST/PUT/PATCH/DELETE entre origens; clientes
// sem Origin nem Referer (curl, Postman) não carregam o cookie de um navegador.
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (METODOS_SEGUROS.has(req.method)) return true;

    const origem = this.origemDaRequisicao(req);
    if (origem === undefined) return true;

    const permitidas = origensPermitidas((k) => this.config.get<string>(k));
    if (!permitidas.includes(origem)) {
      throw new ForbiddenException(MSG.ORIGEM_NAO_AUTORIZADA);
    }
    return true;
  }

  // Origin tem prioridade; sem ele, usa a origem do Referer. undefined = nenhum dos dois.
  private origemDaRequisicao(req: { headers: Record<string, any> }): string | undefined {
    const origin = req.headers['origin'];
    if (typeof origin === 'string') return origin.replace(/\/+$/, '');

    const referer = req.headers['referer'];
    if (typeof referer === 'string') {
      try {
        return new URL(referer).origin;
      } catch {
        return 'invalido';
      }
    }
    return undefined;
  }
}
