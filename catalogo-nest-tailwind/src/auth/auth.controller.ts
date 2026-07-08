import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
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
  ) {
    const resultado = await this.authService.login(email, senha);
    return resultado;
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
}