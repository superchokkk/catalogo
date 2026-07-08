// controllers/productController.js
import { Controller, Get, Post, InternalServerErrorException, UseInterceptors, Body, UploadedFiles, UseGuards, Req, Put, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('usuarios')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post('criar')
    @UseGuards(SupabaseAuthGuard)
    async createUser(
        @Body() userData: any,
        @Req() req: any
    ) {
        try {
            const userId = req.user.id;
            return await this.userService.createUser(userData);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Erro no Controller:', message);
            throw new InternalServerErrorException('Erro interno ao criar usuário.');
        }
    }
}
