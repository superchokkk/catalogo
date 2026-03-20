import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
    constructor(private supabaseService: SupabaseService) { }

    async login(email: string, senha: string) {
      const emailLimpo = (email ?? '').trim();
      const senhaLimpa = senha ?? '';

      if (!emailLimpo || !senhaLimpa) {
        return { success: false, message: 'Preencha email e senha.' };
      }

      try {
        // 1. Faz o login no Supabase
        const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
          email: emailLimpo,
          password: senhaLimpa,
        });
        if (error) {
          console.error('Erro detalhado do Supabase:', error.message);
          throw new UnauthorizedException(`Erro de login: ${error.message}`);
        }

        //extração de dados (JWT)
        const base64Payload = data.session.access_token.split('.')[1];
        const payloadString = Buffer.from(base64Payload, 'base64').toString('utf-8');
        const tokenPayload = JSON.parse(payloadString);
        const nomeUsuario = tokenPayload.user_data?.nome || 'Usuário';
        const nivel = tokenPayload.user_data?.nivel;

        return {
          success: true,
          message: `Bem-vindo!`,
          accessToken: data.session.access_token,
          user: {
            id: data.user.id,
            nome: nomeUsuario,
            email: data.user.email,
            nivel: nivel,
          },
        };

      } catch (err) {
        console.error('Erro ao tentar logar:', err);
        if (err instanceof UnauthorizedException) throw err; 
        throw new UnauthorizedException('Erro de autenticação. Tente novamente.');
      }
  }
}