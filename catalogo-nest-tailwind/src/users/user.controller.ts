// controllers/productController.js
import { Controller, Post, InternalServerErrorException, Body, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './user.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('usuarios')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('criar')
    async createUser(
        @Body() dto: CreateUserDto
    ) {
        try {
            if (dto.senha !== dto.confirmarSenha) {
                throw new BadRequestException('As senhas não coincidem.');
            }
            const nomeFormatado = dto.nome.charAt(0).toUpperCase() + dto.nome.slice(1).toLowerCase();

            return await this.userService.createUser(dto.email, dto.senha, nomeFormatado);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Erro no Controller:', message);
            throw new InternalServerErrorException('Erro interno ao criar usuário.');
        }
    }
}