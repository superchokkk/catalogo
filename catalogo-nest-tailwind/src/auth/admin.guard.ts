import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Este dado vem do SupabaseAuthGuard

    // Verifica se o usuário existe e se o nível é 0 ou 1
    if (!user || (user.nivel !== 0 && user.nivel !== 1)) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem gerenciar produtos.');
    }
    
    return true; // É admin, pode passar!
  }
}