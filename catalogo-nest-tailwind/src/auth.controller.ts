import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body('nome') nome: string,
    @Body('email') email: string,
    @Body('senha') senha: string,
  ) {
    return this.authService.login(nome, email, senha);
  }
}