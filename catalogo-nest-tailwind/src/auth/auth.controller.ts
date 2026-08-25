import { BadRequestException, Body, Controller, Post, Res, Get, Req, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { SupabaseAuthGuard } from './supabase-auth.guard'
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { CreateUserDto } from '../users/user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
              private readonly userService: UserService
  ) { }

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
        sameSite: 'lax', //contra CSRF
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      delete resultado.accessToken;
    }

    return resultado;
  }

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

  @Post('cadastro')
  async registrarCliente(@Body() createUserDto: CreateUserDto) {
    if (createUserDto.senha !== createUserDto.confirmarSenha) {
      throw new BadRequestException('As senhas não coincidem.');
    }
    try {
      return await this.userService.registrarNoBanco(createUserDto.nome, createUserDto.email, createUserDto.senha);
    } catch (error: any) {
      console.log('O MOTIVO DO ERRO 400 FOI:', error.response || error.message);
      throw new BadRequestException(error.message || 'Erro ao criar conta.');
    }
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
    @Body('email') email: string,
    @Body('token') token: string, // Código numérico ou token enviado pelo Supabase
    @Body('novaSenha') novaSenha: string,
  ) {
    if (!email || !token || !novaSenha) {
      throw new BadRequestException('Dados incompletos para redefinição.');
    }
    return await this.authService.atualizarSenhaComToken(email, token, novaSenha);
  }
}