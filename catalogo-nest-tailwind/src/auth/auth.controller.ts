import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('senha') senha: string,
  ) {
    const resultado = await this.authService.login(email, senha);
    return resultado;
  }
}