import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../users/user.service';
import { MSG, ok } from '../common/respostas';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private userService: UserService,
    private configService: ConfigService,
  ) { }

  async login(email: string, senha: string) {
    const emailLimpo = email.trim();

    // Client descartável: a sessão do usuário não pode ficar guardada no client
    // administrativo compartilhado.
    const auth = this.supabaseService.criarClienteAuth();
    const { data, error } = await auth.auth.signInWithPassword({
      email: emailLimpo,
      password: senha,
    });

    // Mensagem única para qualquer falha (senha errada, e-mail inexistente ou não
    // confirmado): o detalhe do Supabase permitiria descobrir quais contas existem.
    if (error || !data.session) {
      this.logger.warn(`Falha de login: ${error?.message ?? 'sem sessão'}`);
      throw new UnauthorizedException(MSG.CREDENCIAIS_INVALIDAS);
    }

    const perfil = await this.userService.buscarPerfil(data.user.id);

    return ok('Bem-vindo!', {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.user.id,
        nome: perfil?.nome || 'Usuário',
        email: data.user.email,
        nivel: perfil?.nivel,
      },
    });
  }

  // Troca o refresh token (cookie httpOnly) por uma sessão nova. O Supabase rotaciona o
  // refresh token a cada uso, então o chamador deve gravar os dois de novo.
  async renovarSessao(refreshToken: string) {
    const auth = this.supabaseService.criarClienteAuth();
    const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw new UnauthorizedException(MSG.SESSAO_EXPIRADA);
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  // Valida um token recebido do front (fluxo de recuperação de senha) com a mesma
  // checagem do SupabaseAuthGuard e devolve quanto tempo ele ainda vale.
  async validarToken(token: string): Promise<{ expiresIn: number }> {
    const { data, error } = await this.supabaseService.client.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException(MSG.TOKEN_INVALIDO);
    }

    let exp: number | undefined;
    try {
      exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8')).exp;
    } catch {
      // o getUser já validou o token; sem exp usamos a vida padrão de 1 hora
    }
    const restante = typeof exp === 'number' ? exp - Math.floor(Date.now() / 1000) : 3600;
    if (restante <= 0) throw new UnauthorizedException(MSG.TOKEN_INVALIDO);
    return { expiresIn: restante };
  }

  // Revoga a sessão no Supabase (sem isso o token continuaria válido até expirar).
  // Melhor esforço: o logout local não deve falhar por causa disso.
  async revogarSessao(token: string | undefined) {
    if (!token) return;
    const { error } = await this.supabaseService.client.auth.admin.signOut(token);
    if (error) this.logger.warn(`Não foi possível revogar a sessão: ${error.message}`);
  }

  async enviarEmailRecuperacao(email: string) {
    const frontend = this.configService.get<string>('FRONTEND_URL')!.replace(/\/+$/, '');
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontend}/update-password`,
    });

    // Resposta idêntica exista ou não a conta: um erro aqui não pode ser distinguível
    // de um sucesso para o cliente (evita enumeração de e-mails). Fica só no log.
    if (error) {
      this.logger.warn(`Falha ao enviar e-mail de recuperação: ${error.message}`);
    }

    return ok('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.');
  }

  async atualizarSenhaComToken(email: string, token: string, novaSenha: string) {
    // Client exclusivo desta requisição: a sessão criada pelo verifyOtp fica só nele
    // e é descartada ao final, sem tocar no client administrativo compartilhado.
    const auth = this.supabaseService.criarClienteAuth();

    // 1. Valida o OTP (One-Time Password / Código enviado por email)
    const { data, error: verifyError } = await auth.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (verifyError || !data.session) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    // 2. Com a sessão temporária ativa (neste mesmo client), atualiza a senha do usuário
    const { error: updateError } = await auth.auth.updateUser({
      password: novaSenha,
    });

    if (updateError) {
      // O usuário já provou ser o dono da conta (OTP válido), então estes dois erros
      // podem ser explicados a ele sem risco de enumeração.
      if (updateError.code === 'same_password') {
        throw new BadRequestException('A nova senha deve ser diferente da atual.');
      }
      if (updateError.code === 'weak_password') {
        throw new BadRequestException('A senha informada é muito fraca.');
      }
      this.logger.error(`Erro ao atualizar a senha: ${updateError.message}`);
      throw new InternalServerErrorException('Não foi possível atualizar a senha.');
    }

    // 3. Quem tinha a senha antiga (possível invasor) perde as sessões abertas.
    // Feito na sessão do próprio usuário (client descartável), sem usar a service_role.
    const { error: signOutError } = await auth.auth.signOut({ scope: 'global' });
    if (signOutError) this.logger.warn(`Não foi possível revogar as sessões: ${signOutError.message}`);

    return ok('Senha alterada com sucesso!');
  }
}
