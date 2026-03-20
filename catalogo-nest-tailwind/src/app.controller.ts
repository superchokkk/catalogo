import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard';

@Controller('products')
export class AppController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly appService: AppService) {}

  @Get()
  async getProducts(@Req() req: Request & { user?: { nivel: number } }) {
    const produtos = await this.appService.getProducts();
    const podeAtualizarUI = req.user?.nivel === 0 || req.user?.nivel === 1;

    return { produtos, podeAtualizarUI };
  }
}