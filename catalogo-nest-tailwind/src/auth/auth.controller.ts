import { Body, Controller, Post, Res, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AuthService } from './auth.service';
import { EsqueciSenhaDto, LoginDto, SetSessionDto } from './auth.dto';
import { RedefinirSenhaDto } from './redefinir-senha.dto';
import { COOKIE_ACESSO, COOKIE_REFRESH, gravarSessao, limparSessao } from './cookies';
import { ApiErros, ApiSucesso, MSG, ok } from '../common/respostas';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({ summary: 'Login', description: 'Grava os cookies httpOnly `access_token` (~1 h) e `refresh_token` (30 dias, só em /api/auth/refresh). Limite: 5/min por IP e 5/15 min por e-mail.' })
  @ApiSucesso(201, 'Login realizado. Além de `success`/`message`, traz `user: { id, nome, email, nivel }`.')
  @ApiErros(400, 401, 429)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, expiresIn, ...resposta } = await this.authService.login(dto.email, dto.senha);
    gravarSessao(res, accessToken, expiresIn, refreshToken);
    return resposta;
  }

  @ApiOperation({ summary: 'Renovar sessão', description: 'Usa o cookie `refresh_token` e grava um novo par de cookies. Chamar ao receber 401.' })
  @ApiSucesso(201, 'Sessão renovada.')
  @ApiErros(401, 429)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[COOKIE_REFRESH];
    if (!refreshToken) {
      throw new UnauthorizedException(MSG.SESSAO_EXPIRADA);
    }
    try {
      const sessao = await this.authService.renovarSessao(refreshToken);
      gravarSessao(res, sessao.accessToken, sessao.expiresIn, sessao.refreshToken);
    } catch (err) {
      limparSessao(res);
      throw err;
    }
    return ok('Sessão renovada com sucesso.');
  }

  @ApiOperation({ summary: 'Logout', description: 'Revoga a sessão no Supabase (melhor esforço) e limpa os cookies.' })
  @ApiSucesso(201, 'Logout realizado.')
  @ApiErros(429)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.revogarSessao(req.cookies?.[COOKIE_ACESSO]);
    limparSessao(res);
    return ok('Logout realizado com sucesso.');
  }

  @ApiOperation({ summary: 'Usuário logado', description: 'Devolve o usuário do Supabase acrescido de `nivel` e `nome` (lidos de public.users). Único retorno que não usa o formato `success`/`message`: é o próprio objeto do usuário.' })
  @ApiCookieAuth('cookie')
  @ApiErros(401)
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getMe(@Req() req: Request) {
    //id, email, nivel pro front montar a interface
    return req['user'];
  }

  @ApiOperation({ summary: 'Esqueci a senha', description: 'Envia o e-mail de recuperação. A resposta é sempre a mesma, exista ou não a conta. Limite: 3/min por IP e 3/15 min por e-mail.' })
  @ApiSucesso(201, 'Mensagem genérica de que, se o e-mail existir, as instruções foram enviadas.')
  @ApiErros(400, 429)
  @Throttle({ default: { limit: 3, ttl: 60000 }, email: { limit: 3, ttl: 15 * 60000 } })
  @Post('esqueci-senha')
  async esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return await this.authService.enviarEmailRecuperacao(dto.email);
  }

  @ApiOperation({ summary: 'Redefinir senha com código (OTP)', description: 'Valida o código recebido por e-mail e troca a senha; as sessões abertas são revogadas.' })
  @ApiSucesso(201, 'Senha alterada.')
  @ApiErros(400, 429)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('redefinir-senha')
  async redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return await this.authService.atualizarSenhaComToken(dto.email, dto.token, dto.novaSenha);
  }

  @ApiOperation({ summary: 'Gravar sessão a partir de um token', description: 'Fluxo de recuperação por link: o front entrega o token do Supabase, a API o valida e grava os cookies.' })
  @ApiSucesso(201, 'Sessão configurada.')
  @ApiErros(400, 401, 429)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('set-session')
  async setSession(@Body() dto: SetSessionDto, @Res({ passthrough: true }) res: Response) {
    // Só grava o cookie se o Supabase reconhecer o token; a vida do cookie segue a do token.
    const { expiresIn } = await this.authService.validarToken(dto.access_token);
    gravarSessao(res, dto.access_token, expiresIn, dto.refresh_token);

    return ok('Sessão configurada com sucesso.');
  }
}
