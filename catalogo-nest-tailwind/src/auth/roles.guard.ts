import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Nivel } from './nivel.enum';
import { ROLES_KEY } from './roles.decorator';
import { MSG } from '../common/respostas';

// Deve rodar depois do SupabaseAuthGuard, que preenche request.user.nivel.
// Rota sem @Roles() não exige nível específico.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Nivel[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigidos || exigidos.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user || !exigidos.includes(user.nivel)) {
      throw new ForbiddenException(MSG.ACESSO_NEGADO);
    }
    return true;
  }
}
