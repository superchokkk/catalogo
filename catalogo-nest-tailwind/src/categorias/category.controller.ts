import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
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

  @ApiOperation({ summary: 'Confirmar exclusão de categoria', description: 'Requer nível 0 ou 1. Só leitura: informa quantos produtos ficariam sem categoria se ela fosse excluída.' })
  @ApiCookieAuth('cookie')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSucesso(200, 'Traz `categoria: { id, nome }` e `produtosAfetados`.')
  @ApiErros(400, 401, 403, 404, 429)
  @Get(':id/exclusao')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
  async confirmarExclusao(@Param('id', ParseUUIDPipe) id: string) {
    const resultado = await this.categoryService.contarProdutos(id);
    return ok('Confirme a exclusão da categoria.', resultado);
  }

  @ApiOperation({ summary: 'Atualizar categoria', description: 'Requer nível 0 ou 1. Campos omitidos são mantidos. O nome é salvo em minúsculas com a inicial maiúscula.' })
  @ApiCookieAuth('cookie')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSucesso(200, 'Categoria atualizada. Traz `categoria: { id, nome, ativo }`.')
  @ApiErros(400, 401, 403, 404, 409, 429)
  @Put(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
  async alterar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    const categoria = await this.categoryService.alterar(id, dto);
    return ok('Categoria atualizada com sucesso.', { categoria });
  }

  @ApiOperation({ summary: 'Excluir categoria', description: 'Requer nível 0 ou 1. Os produtos da categoria não são apagados: ficam sem categoria. Use `GET /categorias/:id/exclusao` antes, para confirmar.' })
  @ApiCookieAuth('cookie')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSucesso(200, 'Categoria excluída. Traz `categoria: { id, nome }` e `produtosAfetados` (quantos produtos ficaram sem categoria).')
  @ApiErros(400, 401, 403, 404, 429)
  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
  async excluir(@Param('id', ParseUUIDPipe) id: string) {
    const resultado = await this.categoryService.excluir(id);
    return ok('Categoria excluída com sucesso.', resultado);
  }
}
