import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Busca o token no Cookie PRIMEIRO. Se não achar, tenta no cabeçalho (útil para testes no Postman).
    let token = request.cookies?.['access_token'];
    
    if (!token && request.headers.authorization) {
      token = request.headers.authorization.replace('Bearer ', '');
    }

    if (!token) {
      throw new UnauthorizedException('Sessão expirada ou não logado.');
    }

    // 2. O Supabase verifica se o token é autêntico e válido
    const { data, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    // 3. Extrai os dados adicionais do payload
    try {
      const base64Payload = token.split('.')[1];
      const payloadString = Buffer.from(base64Payload, 'base64').toString('utf-8');
      const tokenPayload = JSON.parse(payloadString);
      
      const nivel = tokenPayload.user_data?.nivel;
      const nome = tokenPayload.user_data?.nome; // Extraímos o nome também

      // Sucesso! Anexa os dados do usuário à requisição (Qualquer usuário logado passa)
      request.user = { ...data.user, nivel, nome };
      return true;

    } catch (err) {
      throw new UnauthorizedException('Erro ao processar dados da sessão.');
    }
  }
}