import { Controller, Get, Post, UseInterceptors, Body, UploadedFiles, UseGuards, Req, Put, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiExtraModels, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Nivel } from '../auth/nivel.enum';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { MAX_IMAGENS, opcoesUploadImagem } from './image-validation';
import { ApiErros, ApiSucesso, ok } from '../common/respostas';

// Corpo multipart: campos do DTO + arquivos no campo `imagens`.
const corpoMultipart = (dto: Function) => ({
    schema: {
        allOf: [
            { $ref: `#/components/schemas/${dto.name}` },
            {
                type: 'object',
                properties: {
                    imagens: {
                        type: 'array',
                        maxItems: MAX_IMAGENS,
                        items: { type: 'string', format: 'binary' },
                        description: 'JPEG, PNG, WebP ou GIF, até 5 MB cada (o tipo é conferido pelo conteúdo).',
                    },
                },
            },
        ],
    },
});

@ApiTags('Produtos')
@ApiExtraModels(CreateProductDto, UpdateProductDto)
@Controller('produtos')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @ApiOperation({ summary: 'Listar catálogo', description: 'Público. Apenas produtos com `status = true`, do mais novo para o mais antigo, com suas imagens.' })
    @ApiSucesso(200, 'Traz `produtos: [{ ..., categoria, produto_imagens: [{ id, url_path, url_publica }] }]` e `podeAtualizarUI`. `categoria` é o nome da categoria, ou `null` se o produto não tem categoria ou ela está desativada.')
    @ApiErros(429, 500)
    @Get('listagem')
    async listProducts() {
        const produtos = await this.productService.getProductsWithImages();
        return ok('Catálogo carregado com sucesso.', {
            produtos,
            podeAtualizarUI: true, // or derive this from business logic
        });
    }

    @ApiOperation({ summary: 'Criar produto', description: 'Requer login com nível 0 ou 1. Envio em multipart/form-data. `categoriaID` é opcional (categoria ativa; inexistente ou desativada → 400).' })
    @ApiCookieAuth('cookie')
    @ApiConsumes('multipart/form-data')
    @ApiBody(corpoMultipart(CreateProductDto))
    @ApiSucesso(201, 'Produto criado. Os campos do produto (`id`, `nome`, `preco`...) vêm no mesmo nível de `success`/`message`.')
    @ApiErros(400, 401, 403, 429)
    @Post('criar')
    @UseGuards(SupabaseAuthGuard, RolesGuard)
    @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
    @UseInterceptors(FilesInterceptor('imagens', MAX_IMAGENS, opcoesUploadImagem))
    async createProduct(
        @Body() productData: CreateProductDto,
        @UploadedFiles() files: Array<Express.Multer.File>, // Captura os binários das fotos
        @Req() req: any
    ) {
        // Passamos os dados E os arquivos para o Service
        const produto = await this.productService.createProductWithImages(productData, files, req.user.id);
        return ok('Produto criado com sucesso.', produto);
    }

    @ApiOperation({ summary: 'Atualizar produto', description: 'Requer nível 0 ou 1. Imagens atuais que não estiverem em `imagensExistentes` são apagadas; arquivos em `imagens` são acrescentados. `categoriaID`: ausente mantém a categoria; vazio remove; UUID de categoria ativa troca (inexistente ou desativada → 400).' })
    @ApiCookieAuth('cookie')
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiConsumes('multipart/form-data')
    @ApiBody(corpoMultipart(UpdateProductDto))
    @ApiSucesso(200, 'Produto atualizado.')
    @ApiErros(400, 401, 403, 429)
    @Put(':id')
    @UseGuards(SupabaseAuthGuard, RolesGuard)
    @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
    @UseInterceptors(FilesInterceptor('imagens', MAX_IMAGENS, opcoesUploadImagem))
    async updateProduct(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() productData: UpdateProductDto,
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Req() req: any
    ) {
        await this.productService.updateProductWithImages(
            id,
            productData,
            files,
            productData.imagensExistentes ?? [],
            req.user.id
        );
        return ok('Produto atualizado com sucesso.');
    }

    @ApiOperation({ summary: 'Excluir produto', description: 'Requer nível 0 ou 1. Apaga o produto, as referências e os arquivos do storage.' })
    @ApiCookieAuth('cookie')
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiSucesso(200, 'Produto excluído.')
    @ApiErros(400, 401, 403, 429)
    @Delete(':id')
    @UseGuards(SupabaseAuthGuard, RolesGuard)
    @Roles(Nivel.SUPER_ADMIN, Nivel.ADMIN)
    async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
        await this.productService.deleteProduct(id);
        return ok('Produto excluído com sucesso.');
    }
}
