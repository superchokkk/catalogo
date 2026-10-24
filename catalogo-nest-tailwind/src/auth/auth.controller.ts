import { BadRequestException, Body, Controller, Post, Res, Get, Req, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { SupabaseAuthGuard } from './supabase-auth.guard'
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('senha') senha: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const resultado = await this.authService.login(email, senha);
    if (resultado.success) {
      res.cookie('access_token', resultado.accessToken, {
        httpOnly: true, //contra XXS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      delete resultado.accessToken;
    }

    return resultado;
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { success: true, message: 'Logout realizado com sucesso' };
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getMe(@Req() req: Request) {
    //id, email, nivel pro front montar a interface
    return req['user'];
  }

  @Post('esqueci-senha')
  async esqueciSenha(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('E-mail é obrigatório.');
    }
    return await this.authService.enviarEmailRecuperacao(email);
  }

  @Post('redefinir-senha')
  async redefinirSenha(
    @Body('novaSenha') novaSenha: string,
  ) {
    return await this.authService.atualizarSenha(novaSenha);
  }

  @Post('set-session')
  setSession(@Body('access_token') token: string, @Res({ passthrough: true }) res: Response) {
    // Cria o cookie seguro
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true apenas se estiver usando HTTPS
      sameSite: 'none',
      maxAge: 3600 * 1000, // 1 hora (tempo de vida do token do Supabase)
    });

    return { message: 'Sessão configurada com sucesso' };
  }
}