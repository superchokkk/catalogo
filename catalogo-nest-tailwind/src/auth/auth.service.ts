import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
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

  async enviarEmailRecuperacao(email: string) {
    // O Supabase gera o link/código de recuperação e dispara o email automaticamente
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000', // URL para onde o usuário voltará se usar link (opcional se usar código)
    });

    if (error) {
      throw new BadRequestException(`Erro ao enviar email de recuperação: ${error.message}`);
    }

    return { success: true, message: 'E-mail de recuperação enviado com sucesso!' };
  }

  async atualizarSenhaComToken(email: string, token: string, novaSenha: string) {
    // 1. Valida o OTP (One-Time Password / Código enviado por email)
    const { data, error: verifyError } = await this.supabaseService.client.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (verifyError || !data.session) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    // 2. Com a sessão temporária ativa, atualiza a senha do usuário
    const { error: updateError } = await this.supabaseService.client.auth.updateUser({
      password: novaSenha,
    });

    if (updateError) {
      throw new InternalServerErrorException('Não foi possível atualizar a senha.');
    }

    return { success: true, message: 'Senha alterada com sucesso!' };
  }
}