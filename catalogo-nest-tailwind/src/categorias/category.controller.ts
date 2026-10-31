import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
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
}
