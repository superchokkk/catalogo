import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token não fornecido.');
    }

    const token = authHeader.replace('Bearer ', '');

    // 1. O Supabase verifica se o token é autêntico e válido
    const { data, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // 2. Extrai os dados do payload do JWT para checar o nível
    try {
      const base64Payload = token.split('.')[1];
      const payloadString = Buffer.from(base64Payload, 'base64').toString('utf-8');
      const tokenPayload = JSON.parse(payloadString);
      
      const nivel = tokenPayload.user_data?.nivel;

      // 3. Trava de segurança: Apenas nível 0 ou 1 podem passar
      if (nivel !== 0 && nivel !== 1) {
         throw new ForbiddenException('Acesso negado. Apenas administradores podem criar produtos.');
      }

      // Sucesso! Anexa os dados do usuário à requisição
      request.user = { ...data.user, nivel };
      return true;

    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Erro ao validar permissões do usuário.');
    }
  }
}