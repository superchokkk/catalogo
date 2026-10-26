import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../users/user.service';
import { COOKIE_ACESSO } from './cookies';
import { MSG } from '../common/respostas';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.cookies?.[COOKIE_ACESSO];
    if (!token) {
      throw new UnauthorizedException(MSG.TOKEN_AUSENTE);
    }

    // O Supabase verifica se o token é autêntico, válido e não revogado
    const { data, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException(MSG.TOKEN_INVALIDO);
    }

    // Nível e nome vêm do banco, e não de claims do token que a API teria de decodificar à mão
    const perfil = await this.userService.buscarPerfil(data.user.id);

    request.user = { ...data.user, nivel: perfil?.nivel, nome: perfil?.nome };
    return true;
  }
}
