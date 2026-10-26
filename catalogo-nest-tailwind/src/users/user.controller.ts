import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './user.dto';
import { ApiErros, ApiSucesso, MSG, ok } from '../common/respostas';

@ApiTags('Usuários')
@Controller('usuarios')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({ summary: 'Criar usuário', description: 'Cadastro público: o usuário nasce com o nível de acesso padrão da tabela public.users. Limite: 5/min por IP e 5/15 min por e-mail.' })
  @ApiSucesso(201, 'Usuário criado. Além de `success`/`message`, traz `user: { id, nome, email }`.')
  @ApiErros(400, 429)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('criar')
  async createUser(@Body() dto: CreateUserDto) {
    if (dto.senha !== dto.confirmarSenha) {
      throw new BadRequestException(MSG.SENHAS_DIFERENTES);
    }
    const nome = dto.nome.charAt(0).toUpperCase() + dto.nome.slice(1).toLowerCase();
    const user = await this.userService.createUser(dto.email.trim().toLowerCase(), dto.senha, nome);
    return ok('Usuário criado com sucesso.', { user });
  }
}
