import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './category.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Nivel } from '../auth/nivel.enum';
import { ApiErros, ApiSucesso, ok } from '../common/respostas';

@ApiTags('Categorias')
@Controller('categorias')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Listar categorias', description: 'Público. Apenas categorias ativas, em ordem alfabética.' })
  @ApiSucesso(200, 'Traz `categorias: [{ id, nome }]`.')
  @ApiErros(429, 500)
  @Get()
  async listar() {
    const categorias = await this.categoryService.listarAtivas();
    return ok('Categorias carregadas com sucesso.', { categorias });
  }

  @ApiOperation({ summary: 'Criar categoria', description: 'Requer login com nível 0 ou 1. O nome é salvo em minúsculas com a inicial maiúscula; repetido (sem diferenciar caixa) → 409.' })
  @ApiCookieAuth('cookie')
  @ApiSucesso(201, 'Categoria criada. Traz `categoria: { id, nome, ativo }`.')
  @ApiErros(400, 401, 403, 409, 429)
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
  async criar(@Body() dto: CreateCategoryDto, @Req() req: any) {
    const categoria = await this.categoryService.criar(dto, req.user.id);
    return ok('Categoria criada com sucesso.', { categoria });
  }
}
